import 'dotenv/config';
import postgres from 'postgres';

async function cleanupTestData() {
  const sql = postgres(process.env.DATABASE_URL!);

  console.log('Cleaning up test data...\n');

  // Delete document summaries
  const summaries = await sql`DELETE FROM document_summaries RETURNING document_id`;
  console.log(`Deleted ${summaries.length} document summaries`);

  // Delete document entities (composite key)
  const docEntities = await sql`DELETE FROM document_entities RETURNING document_id`;
  console.log(`Deleted ${docEntities.length} document entity links`);

  // Delete entity relationships
  const relationships = await sql`DELETE FROM entity_relationships RETURNING id`;
  console.log(`Deleted ${relationships.length} entity relationships`);

  // Delete entities
  const entities = await sql`DELETE FROM entities RETURNING id`;
  console.log(`Deleted ${entities.length} entities`);

  // Delete task submissions
  const submissions = await sql`DELETE FROM task_submissions RETURNING id`;
  console.log(`Deleted ${submissions.length} task submissions`);

  // Delete tasks
  const tasks = await sql`DELETE FROM tasks RETURNING id`;
  console.log(`Deleted ${tasks.length} tasks`);

  // Delete documents
  const documents = await sql`DELETE FROM documents RETURNING id`;
  console.log(`Deleted ${documents.length} documents`);

  // Reset agent stats (but keep agents)
  const agents = await sql`
    UPDATE agents
    SET tasks_completed = 0, points_balance = 0, consensus_rate = 0
    RETURNING id
  `;
  console.log(`Reset stats for ${agents.length} agents`);

  console.log('\nCleanup complete!');
  await sql.end();
  process.exit(0);
}

cleanupTestData().catch(console.error);
