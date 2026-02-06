import 'dotenv/config';
import postgres from 'postgres';

async function backfillSummaries() {
  const sql = postgres(process.env.DATABASE_URL!);
  console.log('Finding submissions without document summaries...');

  // Get all task submissions with their task and document info
  const submissions = await sql`
    SELECT
      ts.id as submission_id,
      ts.task_id,
      ts.full_text,
      ts.summary,
      ts.spice_rating,
      ts.credibility_score,
      t.document_id,
      t.status as task_status
    FROM task_submissions ts
    JOIN tasks t ON ts.task_id = t.id
    LEFT JOIN document_summaries ds ON t.document_id = ds.document_id
    WHERE ds.id IS NULL
  `;

  console.log(`Found ${submissions.length} submissions without summaries`);

  for (const row of submissions) {
    const summary = row.summary as Record<string, unknown> | null;

    console.log(`Processing submission ${row.submission_id} for document ${row.document_id}...`);

    // Create document summary
    await sql`
      INSERT INTO document_summaries (
        document_id,
        full_text,
        tldr,
        detailed_summary,
        key_topics,
        document_type,
        date_range,
        significance,
        spice_rating,
        credibility_score
      ) VALUES (
        ${row.document_id},
        ${row.full_text},
        ${summary?.tldr || null},
        ${summary?.detailed || null},
        ${(summary?.keyTopics as string[]) || []},
        ${summary?.documentType || null},
        ${summary?.dateRange || null},
        ${summary?.significance || null},
        ${row.spice_rating},
        ${row.credibility_score}
      )
      ON CONFLICT (document_id) DO UPDATE SET
        full_text = EXCLUDED.full_text,
        tldr = EXCLUDED.tldr,
        detailed_summary = EXCLUDED.detailed_summary,
        key_topics = EXCLUDED.key_topics,
        document_type = EXCLUDED.document_type,
        date_range = EXCLUDED.date_range,
        significance = EXCLUDED.significance,
        spice_rating = EXCLUDED.spice_rating,
        credibility_score = EXCLUDED.credibility_score,
        updated_at = NOW()
    `;

    // Update task status to VALIDATED
    await sql`
      UPDATE tasks SET status = 'VALIDATED', updated_at = NOW()
      WHERE id = ${row.task_id}
    `;

    // Update document status to completed
    await sql`
      UPDATE documents SET processing_status = 'completed', updated_at = NOW()
      WHERE id = ${row.document_id}
    `;

    // Update submission validation status
    await sql`
      UPDATE task_submissions SET validation_status = 'accepted', updated_at = NOW()
      WHERE id = ${row.submission_id}
    `;

    console.log(`  ✓ Created summary for document ${row.document_id}`);
  }

  console.log('\nDone!');
  await sql.end();
  process.exit(0);
}

backfillSummaries().catch(console.error);
