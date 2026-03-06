-- ============================================
-- Add UNIQUE constraint on kvnr_noventi
-- Run this in Supabase SQL Editor
-- ============================================

alter table ekv_records
  add constraint ekv_records_kvnr_noventi_unique unique (kvnr_noventi);
