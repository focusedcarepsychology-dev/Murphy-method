-- Phase 2A: Supabase / Auth / Database / RLS
-- Extensions used across the schema. `gen_random_uuid()` is built into
-- PostgreSQL 13+ core (no extension required), but `pgcrypto` is enabled
-- for parity with Supabase's own project defaults and any future need for
-- its other functions (e.g. digest/hmac in a future Edge Function context).
create extension if not exists pgcrypto with schema extensions;
