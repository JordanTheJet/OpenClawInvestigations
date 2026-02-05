import { Hono } from 'hono';
import { eq, sql, count, desc } from 'drizzle-orm';
import {
  documents,
  tasks,
  entities,
  entityRelationships,
  agents,
  taskSubmissions,
  documentSummaries,
} from '@openclaw/db';
import type { Env, Variables } from '../types.js';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/v1/stats - Get processing stats and leaderboard
app.get('/', async (c) => {
  const db = c.var.db;

  // Document stats
  const [totalDocs] = await db.select({ count: count() }).from(documents);
  const [completedDocs] = await db
    .select({ count: count() })
    .from(documents)
    .where(eq(documents.processingStatus, 'completed'));
  const [pendingDocs] = await db
    .select({ count: count() })
    .from(documents)
    .where(eq(documents.processingStatus, 'pending'));
  const [failedDocs] = await db
    .select({ count: count() })
    .from(documents)
    .where(eq(documents.processingStatus, 'failed'));

  // Task stats
  const [totalTasks] = await db.select({ count: count() }).from(tasks);
  const [completedTasks] = await db
    .select({ count: count() })
    .from(tasks)
    .where(eq(tasks.status, 'VALIDATED'));
  const [inProgressTasks] = await db
    .select({ count: count() })
    .from(tasks)
    .where(eq(tasks.status, 'CLAIMED'));

  // Entity stats
  const [totalEntities] = await db.select({ count: count() }).from(entities);
  const [totalRelationships] = await db.select({ count: count() }).from(entityRelationships);

  // Agent stats
  const [totalAgents] = await db.select({ count: count() }).from(agents);
  const [activeAgents] = await db
    .select({ count: count() })
    .from(agents)
    .where(eq(agents.status, 'active'));

  // Leaderboard (top 10)
  const leaderboard = await db
    .select({
      id: agents.id,
      name: agents.name,
      tasksCompleted: agents.tasksCompleted,
      pointsBalance: agents.pointsBalance,
      consensusRate: agents.consensusRate,
    })
    .from(agents)
    .where(eq(agents.status, 'active'))
    .orderBy(desc(agents.pointsBalance))
    .limit(10);

  // Recent submissions
  const recentSubmissions = await db
    .select({
      id: taskSubmissions.id,
      taskId: taskSubmissions.taskId,
      agentId: taskSubmissions.agentId,
      summary: taskSubmissions.summary,
      spiceRating: taskSubmissions.spiceRating,
      createdAt: taskSubmissions.createdAt,
      agentName: agents.name,
      documentId: tasks.documentId,
    })
    .from(taskSubmissions)
    .innerJoin(agents, eq(taskSubmissions.agentId, agents.id))
    .innerJoin(tasks, eq(taskSubmissions.taskId, tasks.id))
    .orderBy(desc(taskSubmissions.createdAt))
    .limit(10);

  return c.json({
    totalDocuments: totalDocs?.count || 0,
    documentsProcessed: completedDocs?.count || 0,
    documentsPending: pendingDocs?.count || 0,
    documentsFailed: failedDocs?.count || 0,
    totalTasks: totalTasks?.count || 0,
    tasksCompleted: completedTasks?.count || 0,
    tasksInProgress: inProgressTasks?.count || 0,
    totalEntities: totalEntities?.count || 0,
    totalRelationships: totalRelationships?.count || 0,
    totalAgents: totalAgents?.count || 0,
    activeAgents: activeAgents?.count || 0,
    leaderboard: leaderboard.map((a, index) => ({
      rank: index + 1,
      agentId: a.id,
      agentName: a.name,
      tasksCompleted: a.tasksCompleted,
      pointsBalance: a.pointsBalance,
      consensusRate: parseFloat(a.consensusRate),
    })),
    recentSubmissions: recentSubmissions.map((s) => ({
      id: s.id,
      taskId: s.taskId,
      documentId: s.documentId,
      agentName: s.agentName,
      tldr: (s.summary as Record<string, unknown> | null)?.tldr || null,
      spiceRating: s.spiceRating,
      createdAt: s.createdAt,
    })),
  });
});

export default app;
