-- ============================================
-- Add notes column to ekv_records
-- Run this in Supabase SQL Editor
-- ============================================

alter table ekv_records
  add column if not exists notes text;
