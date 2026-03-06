-- Migration: 00009_webhooks
-- Tables: webhook_endpoints, webhook_deliveries

create table if not exists webhook_endpoints (
  id          uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  url         text not null,
  secret      text not null,
  events      text[] not null default array['*'],
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists webhook_endpoints_merchant_id_idx on webhook_endpoints(merchant_id);
create index if not exists webhook_endpoints_active_idx on webhook_endpoints(merchant_id, is_active);

create table if not exists webhook_deliveries (
  id                   uuid primary key default gen_random_uuid(),
  webhook_endpoint_id  uuid not null references webhook_endpoints(id) on delete cascade,
  event                text not null,
  payload              jsonb not null,
  response_status      int,
  response_body        text,
  attempt              int not null default 1,
  delivered_at         timestamptz,
  created_at           timestamptz not null default now()
);

create index if not exists webhook_deliveries_endpoint_idx on webhook_deliveries(webhook_endpoint_id);
create index if not exists webhook_deliveries_created_at_idx on webhook_deliveries(created_at desc);
-- Index for retry cron: pending deliveries (delivered_at is null)
create index if not exists webhook_deliveries_pending_idx on webhook_deliveries(webhook_endpoint_id) where delivered_at is null;

-- RLS
alter table webhook_endpoints enable row level security;
alter table webhook_deliveries enable row level security;

-- Merchants can manage their own endpoints
create policy "merchants_own_endpoints"
  on webhook_endpoints
  for all
  using (
    merchant_id in (
      select id from merchants where user_id = auth.uid()
    )
  );

-- Merchants can view deliveries for their own endpoints
create policy "merchants_own_deliveries"
  on webhook_deliveries
  for select
  using (
    webhook_endpoint_id in (
      select we.id from webhook_endpoints we
      join merchants m on m.id = we.merchant_id
      where m.user_id = auth.uid()
    )
  );

-- Service role bypass handled automatically via service client
