-- Migration: Add lazy slice support
-- This enables on-demand document processing without upfront storage

-- Make r2_key optional (documents fetched on-demand from source)
ALTER TABLE documents ALTER COLUMN r2_key DROP NOT NULL;

-- Add slices_generated flag to track lazy slice generation
ALTER TABLE documents ADD COLUMN IF NOT EXISTS slices_generated BOOLEAN DEFAULT false NOT NULL;

-- Change default processing status from 'pending' to 'discovered'
ALTER TABLE documents ALTER COLUMN processing_status SET DEFAULT 'discovered';

-- Add page range columns to tasks for slice support
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS page_start INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS page_end INTEGER;

-- Change default required_submissions from 2 to 1 (faster processing)
ALTER TABLE tasks ALTER COLUMN required_submissions SET DEFAULT 1;

-- Add index for finding documents needing slice generation
CREATE INDEX IF NOT EXISTS idx_documents_needs_slicing
ON documents (slices_generated, processing_status)
WHERE slices_generated = false;

-- Add index for finding available slice tasks
CREATE INDEX IF NOT EXISTS idx_tasks_available_slices
ON tasks (status, priority, created_at)
WHERE status = 'AVAILABLE';
