-- ============================================
-- Migrate status values to new set
-- Run this in Supabase SQL Editor
-- ============================================

-- Add status column if it doesn't exist yet
alter table ekv_records add column if not exists status text not null default 'Pending';
alter table letter_records add column if not exists status text not null default 'Pending';

-- Drop old check constraints
alter table ekv_records drop constraint if exists ekv_records_status_check;
alter table letter_records drop constraint if exists letter_records_status_check;

-- Add new check constraints
alter table ekv_records
  add constraint ekv_records_status_check
  check (status in ('Pending', 'Approved', 'Rejected', 'Error', 'Closed Lost'));

alter table letter_records
  add constraint letter_records_status_check
  check (status in ('Pending', 'Approved', 'Rejected', 'Error', 'Closed Lost'));

-- Update default values
alter table ekv_records alter column status set default 'Pending';
alter table letter_records alter column status set default 'Pending';

-- Update existing seed data to new status values
update ekv_records set status = 'Approved'     where status = 'success';
update ekv_records set status = 'Pending'      where status = 'pending';
update ekv_records set status = 'Error'        where status = 'failed';

update letter_records set status = 'Approved'  where status = 'success';
update letter_records set status = 'Pending'   where status = 'pending';
update letter_records set status = 'Error'     where status = 'failed';
