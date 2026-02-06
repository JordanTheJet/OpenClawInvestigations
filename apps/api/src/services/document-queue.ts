import { eq, and } from 'drizzle-orm';
import { documents, tasks } from '@openclaw/db';
import type { Database } from '@openclaw/db';

export interface DiscoveredDocument {
  sourceUrl: string;
  fileName: string;
  source: 'doj' | 'archive' | 'fbi';
  fileType?: string;
}

const DEFAULT_SLICE_SIZE = 25;

/**
 * Generate a hash from the source URL (used for deduplication)
 */
function hashUrl(url: string): string {
  // Simple hash for URL deduplication
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Process a discovered document - create metadata record
 * Called by queue consumer
 */
export async function processDiscoveredDocument(
  db: Database,
  doc: DiscoveredDocument
): Promise<{ documentId: string; isNew: boolean }> {
  const hash = hashUrl(doc.sourceUrl);

  // Check for existing document
  const [existing] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.hash, hash));

  if (existing) {
    return { documentId: existing.id, isNew: false };
  }

  // Create document metadata (no download yet)
  const [newDoc] = await db
    .insert(documents)
    .values({
      hash,
      source: doc.source,
      sourceUrl: doc.sourceUrl,
      fileName: doc.fileName,
      fileType: doc.fileType || 'pdf',
      processingStatus: 'discovered',
      slicesGenerated: false,
    })
    .returning({ id: documents.id });

  return { documentId: newDoc!.id, isNew: true };
}

/**
 * Fetch page count from source URL (called lazily when first worker claims)
 */
export async function fetchPageCount(sourceUrl: string): Promise<number> {
  // Fetch just the first part of PDF to get page count
  // This is a simplified version - in production you'd want proper PDF parsing

  const response = await fetch(sourceUrl, {
    headers: {
      'Range': 'bytes=0-10000', // Just fetch header to get metadata
    },
  });

  if (!response.ok) {
    // If range request fails, fetch full document
    const fullResponse = await fetch(sourceUrl);
    if (!fullResponse.ok) {
      throw new Error(`Failed to fetch document: ${fullResponse.status}`);
    }

    const buffer = await fullResponse.arrayBuffer();
    return estimatePageCount(buffer);
  }

  // For range request, we need to estimate or use a fallback
  // In production, use pdf-lib or similar for accurate count
  return 50; // Default estimate - will be refined
}

/**
 * Estimate page count from PDF buffer
 */
function estimatePageCount(buffer: ArrayBuffer): number {
  // Simple heuristic: ~3KB per page for scanned documents
  const sizeInKb = buffer.byteLength / 1024;
  return Math.max(1, Math.ceil(sizeInKb / 50));
}

/**
 * Generate slice tasks for a document
 * Called when first worker claims a document without slices
 */
export async function generateSliceTasks(
  db: Database,
  documentId: string,
  pageCount: number,
  sliceSize: number = DEFAULT_SLICE_SIZE
): Promise<number> {
  // Check if already generated
  const [doc] = await db
    .select({ slicesGenerated: documents.slicesGenerated })
    .from(documents)
    .where(eq(documents.id, documentId));

  if (doc?.slicesGenerated) {
    return 0; // Already done
  }

  const sliceTasks: Array<{
    documentId: string;
    taskType: string;
    pageStart: number;
    pageEnd: number;
    priority: number;
  }> = [];

  // Generate slice tasks
  for (let start = 1; start <= pageCount; start += sliceSize) {
    const end = Math.min(start + sliceSize - 1, pageCount);
    sliceTasks.push({
      documentId,
      taskType: 'slice_analysis',
      pageStart: start,
      pageEnd: end,
      priority: 100 - Math.floor(start / sliceSize), // Earlier slices have higher priority
    });
  }

  // Insert all slice tasks
  if (sliceTasks.length > 0) {
    await db.insert(tasks).values(sliceTasks);
  }

  // Mark document as slices generated and update page count
  await db
    .update(documents)
    .set({
      slicesGenerated: true,
      pageCount,
      processingStatus: 'processing',
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  return sliceTasks.length;
}

/**
 * Batch process discovered documents from queue
 */
export async function processDocumentBatch(
  db: Database,
  docs: DiscoveredDocument[]
): Promise<{ processed: number; new: number }> {
  let processed = 0;
  let newDocs = 0;

  for (const doc of docs) {
    try {
      const result = await processDiscoveredDocument(db, doc);
      processed++;
      if (result.isNew) newDocs++;
    } catch (error) {
      console.error(`Failed to process ${doc.sourceUrl}:`, error);
    }
  }

  return { processed, new: newDocs };
}
