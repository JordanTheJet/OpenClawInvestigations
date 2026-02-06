import { eq, and, sql, lt, desc, asc } from 'drizzle-orm';
import { tasks, documents, agents, taskSubmissions } from '@openclaw/db';
import type { Database } from '@openclaw/db';
import { generateSliceTasks, fetchPageCount } from './document-queue.js';

const CLAIM_TTL_MINUTES = 30;
const HEARTBEAT_EXTENSION_MINUTES = 20;
const DEFAULT_SLICE_SIZE = 25;

export interface ClaimedTask {
  id: string;
  documentId: string;
  taskType: string;
  pageStart: number | null;
  pageEnd: number | null;
  document: {
    id: string;
    fileName: string | null;
    fileType: string;
    pageCount: number | null;
    source: string;
    sourceUrl: string;
  };
}

/**
 * Claim the next available task
 * If claiming a document without slices, generates slices first
 */
export async function claimNextTask(
  db: Database,
  agentId: string,
  sliceSize: number = DEFAULT_SLICE_SIZE
): Promise<{ task: ClaimedTask; claimExpiresAt: Date } | null> {
  // First, expire any stale claims
  await db
    .update(tasks)
    .set({
      status: 'AVAILABLE',
      claimedBy: null,
      claimExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.status, 'CLAIMED'), lt(tasks.claimExpiresAt, new Date())));

  const claimExpiresAt = new Date(Date.now() + CLAIM_TTL_MINUTES * 60 * 1000);

  // Try to claim an existing slice task first
  const availableTasks = await db
    .select({
      id: tasks.id,
      documentId: tasks.documentId,
      taskType: tasks.taskType,
      pageStart: tasks.pageStart,
      pageEnd: tasks.pageEnd,
      priority: tasks.priority,
    })
    .from(tasks)
    .where(eq(tasks.status, 'AVAILABLE'))
    .orderBy(desc(tasks.priority), asc(tasks.createdAt))
    .limit(1);

  if (availableTasks.length === 0) {
    // No tasks available - check for documents needing slice generation
    const unslicedDocs = await db
      .select({ id: documents.id, sourceUrl: documents.sourceUrl })
      .from(documents)
      .where(and(
        eq(documents.slicesGenerated, false),
        eq(documents.processingStatus, 'discovered')
      ))
      .limit(1);

    if (unslicedDocs.length === 0) {
      return null; // Nothing to do
    }

    // Generate slices for this document
    const doc = unslicedDocs[0]!;
    try {
      const pageCount = await fetchPageCount(doc.sourceUrl!);
      await generateSliceTasks(db, doc.id, pageCount, sliceSize);

      // Now try to claim again
      return claimNextTask(db, agentId, sliceSize);
    } catch (error) {
      console.error(`Failed to generate slices for ${doc.id}:`, error);
      // Mark document as failed
      await db
        .update(documents)
        .set({ processingStatus: 'failed', updatedAt: new Date() })
        .where(eq(documents.id, doc.id));
      return null;
    }
  }

  const taskToClaim = availableTasks[0]!;

  // Attempt to claim it atomically
  const [claimedTask] = await db
    .update(tasks)
    .set({
      status: 'CLAIMED',
      claimedBy: agentId,
      claimExpiresAt,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskToClaim.id), eq(tasks.status, 'AVAILABLE')))
    .returning();

  if (!claimedTask) {
    // Race condition - another worker claimed it, try again
    return claimNextTask(db, agentId, sliceSize);
  }

  // Get document details
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, claimedTask.documentId));

  if (!doc) {
    throw new Error('Document not found');
  }

  return {
    task: {
      id: claimedTask.id,
      documentId: claimedTask.documentId,
      taskType: claimedTask.taskType,
      pageStart: claimedTask.pageStart,
      pageEnd: claimedTask.pageEnd,
      document: {
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        pageCount: doc.pageCount,
        source: doc.source,
        sourceUrl: doc.sourceUrl!,
      },
    },
    claimExpiresAt,
  };
}

export async function extendClaim(
  db: Database,
  taskId: string,
  agentId: string
): Promise<{ success: boolean; claimExpiresAt: Date }> {
  const newExpiry = new Date(Date.now() + HEARTBEAT_EXTENSION_MINUTES * 60 * 1000);

  const [updated] = await db
    .update(tasks)
    .set({
      claimExpiresAt: newExpiry,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.claimedBy, agentId), eq(tasks.status, 'CLAIMED')))
    .returning();

  return {
    success: !!updated,
    claimExpiresAt: newExpiry,
  };
}

export async function submitTask(
  db: Database,
  taskId: string,
  agentId: string,
  submission: {
    fullText: string;
    entities: unknown[];
    relationships: unknown[];
    summary: Record<string, unknown>;
    credibilityScore: number;
    spiceRating: number;
    processingMetadata: Record<string, unknown>;
  }
): Promise<{ submissionId: string; validationStatus: string; pointsAwarded: number }> {
  // Verify task is claimed by this agent
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

  if (!task) {
    throw new Error('Task not found');
  }

  if (task.claimedBy !== agentId) {
    throw new Error('Task not claimed by this agent');
  }

  if (task.status !== 'CLAIMED') {
    throw new Error('Task is not in CLAIMED status');
  }

  // Create submission
  const [newSubmission] = await db
    .insert(taskSubmissions)
    .values({
      taskId,
      agentId,
      fullText: submission.fullText,
      entities: submission.entities,
      relationships: submission.relationships,
      summary: submission.summary,
      credibilityScore: String(submission.credibilityScore),
      spiceRating: submission.spiceRating,
      processingMetadata: submission.processingMetadata,
      validationStatus: 'pending',
    })
    .returning();

  // Update task
  const newSubmissionCount = task.submissionCount + 1;
  const newStatus = newSubmissionCount >= task.requiredSubmissions ? 'SUBMITTED' : 'CLAIMED';

  await db
    .update(tasks)
    .set({
      submissionCount: newSubmissionCount,
      status: newStatus,
      claimedBy: newStatus === 'SUBMITTED' ? null : task.claimedBy,
      claimExpiresAt: newStatus === 'SUBMITTED' ? null : task.claimExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));

  // Award initial points
  const initialPoints = 10;
  await db
    .update(agents)
    .set({
      tasksCompleted: sql`${agents.tasksCompleted} + 1`,
      pointsBalance: sql`${agents.pointsBalance} + ${initialPoints}`,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, agentId));

  return {
    submissionId: newSubmission!.id,
    validationStatus: 'pending',
    pointsAwarded: initialPoints,
  };
}

export async function releaseTask(db: Database, taskId: string, agentId: string): Promise<boolean> {
  const [released] = await db
    .update(tasks)
    .set({
      status: 'AVAILABLE',
      claimedBy: null,
      claimExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.claimedBy, agentId)))
    .returning();

  return !!released;
}
