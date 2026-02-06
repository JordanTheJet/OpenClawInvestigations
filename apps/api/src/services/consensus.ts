import { eq, and } from 'drizzle-orm';
import { tasks, taskSubmissions, documentSummaries, agents, documents } from '@openclaw/db';
import type { Database } from '@openclaw/db';

interface EntityMention {
  name: string;
  type: string;
}

// Calculate Jaccard similarity for entity sets
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size > 0 ? intersection.size / union.size : 1;
}

// Normalize entity name for comparison
function normalizeEntityName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Extract normalized entity keys from submission
function extractEntityKeys(entities: EntityMention[]): Set<string> {
  return new Set(entities.map((e) => `${e.type}:${normalizeEntityName(e.name)}`));
}

export async function checkConsensus(
  db: Database,
  taskId: string
): Promise<{ agreed: boolean; consensusScore: number }> {
  const submissions = await db
    .select()
    .from(taskSubmissions)
    .where(eq(taskSubmissions.taskId, taskId));

  if (submissions.length < 2) {
    return { agreed: false, consensusScore: 0 };
  }

  // Compare entity sets using Jaccard similarity
  const entitySets = submissions.map((s) =>
    extractEntityKeys((s.entities as EntityMention[]) || [])
  );

  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < entitySets.length; i++) {
    for (let j = i + 1; j < entitySets.length; j++) {
      totalSimilarity += jaccardSimilarity(entitySets[i]!, entitySets[j]!);
      comparisons++;
    }
  }

  const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;
  const CONSENSUS_THRESHOLD = 0.7;

  return {
    agreed: avgSimilarity >= CONSENSUS_THRESHOLD,
    consensusScore: avgSimilarity,
  };
}

export async function validateAndMerge(db: Database, taskId: string): Promise<void> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

  if (!task || task.status !== 'SUBMITTED') {
    return;
  }

  const submissions = await db
    .select()
    .from(taskSubmissions)
    .where(eq(taskSubmissions.taskId, taskId));

  // Auto-validate if only 1 submission required and we have it
  const autoValidate = task.requiredSubmissions === 1 && submissions.length >= 1;

  const { agreed, consensusScore } = autoValidate
    ? { agreed: true, consensusScore: 1 }
    : await checkConsensus(db, taskId);

  if (agreed) {
    // Use the submission with highest credibility score
    const bestSubmission = submissions.reduce((best, current) => {
      const bestScore = parseFloat(best.credibilityScore || '0');
      const currentScore = parseFloat(current.credibilityScore || '0');
      return currentScore > bestScore ? current : best;
    });

    const summary = bestSubmission.summary as Record<string, unknown> | null;

    // Create or update document summary
    await db
      .insert(documentSummaries)
      .values({
        documentId: task.documentId,
        fullText: bestSubmission.fullText,
        tldr: summary?.tldr as string,
        detailedSummary: summary?.detailed as string,
        keyTopics: (summary?.keyTopics as string[]) || [],
        documentType: summary?.documentType as string,
        dateRange: summary?.dateRange as string,
        significance: summary?.significance as string,
        extractedTitle: summary?.extractedTitle as string,
        spiceRating: bestSubmission.spiceRating,
        credibilityScore: bestSubmission.credibilityScore,
      })
      .onConflictDoUpdate({
        target: documentSummaries.documentId,
        set: {
          fullText: bestSubmission.fullText,
          tldr: summary?.tldr as string,
          detailedSummary: summary?.detailed as string,
          keyTopics: (summary?.keyTopics as string[]) || [],
          documentType: summary?.documentType as string,
          dateRange: summary?.dateRange as string,
          significance: summary?.significance as string,
          extractedTitle: summary?.extractedTitle as string,
          spiceRating: bestSubmission.spiceRating,
          credibilityScore: bestSubmission.credibilityScore,
          updatedAt: new Date(),
        },
      });

    // Mark submissions as accepted and award bonus points
    for (const submission of submissions) {
      await db
        .update(taskSubmissions)
        .set({ validationStatus: 'accepted', updatedAt: new Date() })
        .where(eq(taskSubmissions.id, submission.id));

      // Award consensus bonus
      const bonusPoints = 20;
      await db
        .update(agents)
        .set({
          pointsBalance: agents.pointsBalance,
          consensusRate: agents.consensusRate, // Would need proper calculation
          updatedAt: new Date(),
        })
        .where(eq(agents.id, submission.agentId));
    }

    // Mark task as validated
    await db
      .update(tasks)
      .set({ status: 'VALIDATED', updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    // Mark document as completed
    await db
      .update(documents)
      .set({ processingStatus: 'completed', updatedAt: new Date() })
      .where(eq(documents.id, task.documentId));
  } else {
    // Mark as disputed for manual review
    await db
      .update(tasks)
      .set({ status: 'DISPUTED', updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    await db
      .update(taskSubmissions)
      .set({ validationStatus: 'disputed', updatedAt: new Date() })
      .where(eq(taskSubmissions.taskId, taskId));
  }
}
