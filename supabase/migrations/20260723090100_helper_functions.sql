-- Shared trigger function that maintains `updated_at` on every mutable
-- table (docs/DATABASE_SCHEMA.md Conventions). `security invoker` (the
-- default) is fine here since it only ever touches the row already being
-- written by the calling role — no elevated privilege is needed.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger function: stamps NEW.updated_at = now() on every UPDATE. Attached per-table to every mutable table.';
