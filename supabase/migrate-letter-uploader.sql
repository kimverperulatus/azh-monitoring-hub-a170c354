-- Add uploader_name and uploaded_at to letter_records
ALTER TABLE letter_records
  ADD COLUMN IF NOT EXISTS uploader_name text,
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz;
