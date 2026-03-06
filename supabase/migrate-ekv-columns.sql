-- ============================================
-- Add EKV-specific columns to ekv_records
-- Run this in Supabase SQL Editor
-- ============================================

alter table ekv_records
  add column if not exists kv_angelegt date,
  add column if not exists kv_entschieden date,
  add column if not exists kvnr_noventi text,
  add column if not exists kvnr_le text,
  add column if not exists le_ik text,
  add column if not exists le_kdnr text,
  add column if not exists versichertenvorname text,
  add column if not exists versichertennachname text,
  add column if not exists versicherten_nr text,
  add column if not exists kassen_ik text,
  add column if not exists kassenname text,
  add column if not exists reasons text;

