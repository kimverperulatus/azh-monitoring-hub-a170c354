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

-- Update seed data with sample values
update ekv_records set
  kv_angelegt        = now()::date - (random() * 30)::int,
  kv_entschieden     = now()::date - (random() * 10)::int,
  kvnr_noventi       = 'NOV-' || floor(random() * 90000 + 10000)::text,
  kvnr_le            = 'LE-' || floor(random() * 90000 + 10000)::text,
  le_ik              = '10' || floor(random() * 9000000 + 1000000)::text,
  le_kdnr            = 'KD-' || floor(random() * 9000 + 1000)::text,
  versichertenvorname  = (array['Hans', 'Maria', 'Klaus', 'Anna', 'Peter'])[floor(random()*5+1)::int],
  versichertennachname = (array['Müller', 'Schmidt', 'Weber', 'Fischer', 'Meyer'])[floor(random()*5+1)::int],
  versicherten_nr    = 'A' || floor(random() * 900000000 + 100000000)::text,
  kassen_ik          = '10' || floor(random() * 9000000 + 1000000)::text,
  kassenname         = (array['AOK Bayern', 'Barmer', 'TK', 'DAK', 'IKK'])[floor(random()*5+1)::int],
  reasons            = case when status = 'Rejected' then 'Fehlende Unterlagen'
                            when status = 'Error'    then 'Systemfehler'
                            else null end;
