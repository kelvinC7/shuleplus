-- Allow multiple developer partners to share Saint Theo School as sandbox org
--   psql $DATABASE_URL -f prisma/migrations/manual_developer_portal/migration_shared_sandbox_school.sql

DROP INDEX IF EXISTS "developer_partners_sandbox_organization_id_key";
