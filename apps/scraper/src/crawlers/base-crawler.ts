import { S3Client } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { documents, tasks } from '@openclaw/db';
import type { Database } from '@openclaw/db';
import type { DocumentSource } from '@openclaw/shared';
import { uploadToR2, computeHash, generateR2Key } from '../lib/r2-client.js';
import { extractPDFMetadata, getFileType, getMimeType } from '../processors/pdf-splitter.js';

export interface CrawlResult {
  url: string;
  fileName: string;
  success: boolean;
  documentId?: string;
  error?: string;
}

export interface DocumentInfo {
  url: string;
  fileName: string;
}

export abstract class BaseCrawler {
  protected db: Database;
  protected r2: S3Client;
  protected source: DocumentSource;
  protected concurrency: number;
  protected delayMs: number;

  constructor(
    db: Database,
    r2: S3Client,
    source: DocumentSource,
    options: { concurrency?: number; delayMs?: number } = {}
  ) {
    this.db = db;
    this.r2 = r2;
    this.source = source;
    this.concurrency = options.concurrency || 5;
    this.delayMs = options.delayMs || 1000;
  }

  abstract discoverDocuments(): Promise<DocumentInfo[]>;

  async processDocument(info: DocumentInfo): Promise<CrawlResult> {
    try {
      console.log(`Downloading: ${info.url}`);

      // Download document
      const response = await fetch(info.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const hash = computeHash(buffer);

      // Check for duplicate
      const [existing] = await this.db
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.hash, hash));

      if (existing) {
        console.log(`Duplicate found: ${hash}`);
        return {
          url: info.url,
          fileName: info.fileName,
          success: true,
          documentId: existing.id,
        };
      }

      // Get file metadata
      const fileType = getFileType(info.fileName);
      const mimeType = getMimeType(info.fileName);
      let pageCount: number | null = null;

      if (fileType === 'pdf') {
        const metadata = await extractPDFMetadata(buffer);
        pageCount = metadata.pageCount;
      }

      // Upload to R2
      const r2Key = generateR2Key(this.source, hash, info.fileName);
      await uploadToR2(this.r2, r2Key, buffer, mimeType);

      // Insert document record
      const [doc] = await this.db
        .insert(documents)
        .values({
          hash,
          source: this.source,
          sourceUrl: info.url,
          r2Key,
          fileName: info.fileName,
          fileType,
          fileSizeBytes: buffer.length,
          pageCount,
          processingStatus: 'pending',
        })
        .returning();

      // Create processing task
      await this.db.insert(tasks).values({
        documentId: doc!.id,
        taskType: 'full_analysis',
        status: 'AVAILABLE',
        priority: 100,
        requiredSubmissions: 2,
      });

      console.log(`Ingested: ${info.fileName} -> ${doc!.id}`);

      return {
        url: info.url,
        fileName: info.fileName,
        success: true,
        documentId: doc!.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed: ${info.fileName} - ${message}`);
      return {
        url: info.url,
        fileName: info.fileName,
        success: false,
        error: message,
      };
    }
  }

  async crawl(): Promise<CrawlResult[]> {
    console.log(`Starting ${this.source} crawler...`);

    const documentInfos = await this.discoverDocuments();
    console.log(`Discovered ${documentInfos.length} documents`);

    const results: CrawlResult[] = [];
    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(this.concurrency);

    const tasks = documentInfos.map((info) =>
      limit(async () => {
        const result = await this.processDocument(info);
        results.push(result);

        // Delay between requests
        await new Promise((resolve) => setTimeout(resolve, this.delayMs));
        return result;
      })
    );

    await Promise.all(tasks);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    console.log(`Crawl complete: ${successful} successful, ${failed} failed`);

    return results;
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
