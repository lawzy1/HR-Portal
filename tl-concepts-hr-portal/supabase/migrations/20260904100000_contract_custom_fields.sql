-- Allow each contract to carry its own optional key/value terms without
-- changing the relational contract schema for every new business need.

alter table public.contracts
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

alter table public.contracts
  drop constraint if exists contracts_custom_fields_object_check;

alter table public.contracts
  add constraint contracts_custom_fields_object_check
  check (jsonb_typeof(custom_fields) = 'object');
