-- ============================================================
-- Phase 18 Accounting Engine - PostgreSQL bootstrap
--
-- Runs automatically by the postgres entrypoint ONLY when the
-- data volume is created for the first time. It creates:
--   1. Login role : cms_accounting
--   2. Database   : cms_accounting (owned by that role)
--
-- EXISTING VOLUMES: init scripts are skipped. Apply manually:
--   npm run db:accounting:create
-- (or docker exec -it umami-database psql -U umami -f - < this file)
-- ============================================================

CREATE ROLE cms_accounting WITH LOGIN PASSWORD 'change-me-accounting';

CREATE DATABASE cms_accounting OWNER cms_accounting;
