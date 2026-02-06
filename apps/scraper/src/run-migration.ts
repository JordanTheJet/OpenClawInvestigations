import 'dotenv/config';
import postgres from 'postgres';

async function runMigration() {
  const sql = postgres(process.env.DATABASE_URL!);

  console.log('Running lazy slices migration...\n');

  // Run each statement individually
  const statements = [
    `ALTER TABLE documents ALTER COLUMN r2_key DROP NOT NULL`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS slices_generated BOOLEAN DEFAULT false NOT NULL`,
    `ALTER TABLE documents ALTER COLUMN processing_status SET DEFAULT 'discovered'`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS page_start INTEGER`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS page_end INTEGER`,
    `ALTER TABLE tasks ALTER COLUMN required_submissions SET DEFAULT 1`,
    `CREATE INDEX IF NOT EXISTS idx_documents_needs_slicing ON documents (slices_generated, processing_status) WHERE slices_generated = false`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_available_slices ON tasks (status, priority, created_at) WHERE status = 'AVAILABLE'`,
  ];

  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement.substring(0, 70)}...`);
      await sql.unsafe(statement);
      console.log('  ✓ Success\n');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('already exists') || msg.includes('does not exist')) {
        console.log(`  ⚠ Skipped (already applied)\n`);
      } else {
        console.error(`  ✗ Error: ${msg}\n`);
      }
    }
  }

  console.log('Migration complete!');
  await sql.end();
  process.exit(0);
}

runMigration().catch(console.error);
