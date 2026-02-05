import { eq, and, sql, lt, isNull, or, desc, asc } from 'drizzle-orm';
import { tasks, documents, agents, taskSubmissions } from '@openclaw/db';
import type { Database } from '@openclaw/db';
import type { TaskWithDocument } from '@openclaw/shared';

const CLAIM_TTL_MINUTES = 30;
const HEARTBEAT_EXTENSION_MINUTES = 20;

export async function claimNextTask(
  db: Database,
  agentId: string,
  bucket: R2Bucket
): Promise<{ task: TaskWithDocument; claimExpiresAt: Date } | null> {
  // Atomic claim using FOR UPDATE SKIP LOCKED
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

  // Now claim the next available task
  const claimExpiresAt = new Date(Date.now() + CLAIM_TTL_MINUTES * 60 * 1000);

  // Use a subquery approach for atomic claiming
  const availableTasks = await db
    .select({
      id: tasks.id,
      documentId: tasks.documentId,
      taskType: tasks.taskType,
      status: tasks.status,
      priority: tasks.priority,
      requiredSubmissions: tasks.requiredSubmissions,
      submissionCount: tasks.submissionCount,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(eq(tasks.status, 'AVAILABLE'))
    .orderBy(desc(tasks.priority), asc(tasks.createdAt))
    .limit(1);

  if (availableTasks.length === 0) {
    return null;
  }

  const taskToClaim = availableTasks[0]!;

  // Attempt to claim it
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
    // Race condition - try again
    return claimNextTask(db, agentId, bucket);
  }

  // Get document details
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, claimedTask.documentId));

  if (!doc) {
    throw new Error('Document not found');
  }

  // Generate R2 URL
  const r2Url = `https://r2.openclaw.dev/${doc.r2Key}`;

  return {
    task: {
      id: claimedTask.id,
      documentId: claimedTask.documentId,
      taskType: claimedTask.taskType as 'full_analysis',
      status: claimedTask.status as 'CLAIMED',
      priority: claimedTask.priority,
      claimedBy: agentId,
      claimExpiresAt,
      requiredSubmissions: claimedTask.requiredSubmissions,
      submissionCount: claimedTask.submissionCount,
      createdAt: claimedTask.createdAt,
      updatedAt: claimedTask.updatedAt,
      document: {
        id: doc.id,
        r2Key: doc.r2Key,
        fileName: doc.fileName,
        fileType: doc.fileType,
        pageCount: doc.pageCount,
        source: doc.source,
      },
      r2Url,
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

  // Award initial points (more on validation)
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
