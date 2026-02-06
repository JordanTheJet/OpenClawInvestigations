-- Add extracted_title column to document_summaries
ALTER TABLE document_summaries ADD COLUMN IF NOT EXISTS extracted_title VARCHAR(200);
