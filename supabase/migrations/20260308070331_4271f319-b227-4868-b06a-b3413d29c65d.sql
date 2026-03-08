-- Add missing columns from old schema
ALTER TABLE public.ekv_records ADD COLUMN IF NOT EXISTS audit_date date;

ALTER TABLE public.letter_records ADD COLUMN IF NOT EXISTS ai_summary text;

ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT false;