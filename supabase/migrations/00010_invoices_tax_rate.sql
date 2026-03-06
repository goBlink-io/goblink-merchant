-- Migration: 00010_invoices_tax_rate
-- Add tax_rate column to invoices table (existing from 00001)

-- Add tax_rate column for storing the percentage
alter table invoices add column if not exists tax_rate numeric(5,2) not null default 0;

-- Add unique constraint on invoice_number per merchant
create unique index if not exists idx_invoices_merchant_number
  on invoices (merchant_id, invoice_number);

-- Additional useful indexes
create index if not exists idx_invoices_status on invoices (status);
create index if not exists idx_invoices_created_desc on invoices (created_at desc);
