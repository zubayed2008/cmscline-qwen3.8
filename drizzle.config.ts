import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit configuration for the dedicated accounting PostgreSQL database.
 *
 * Commands:
 *   npm run db:accounting:generate  - generate SQL migration from schema
 *   npm run db:accounting:migrate   - apply pending migrations
 *   npm run db:accounting:studio    - browse data in Drizzle Studio
 */
export default defineConfig({
  schema: './src/db/schema/accounting/index.ts',
  out: './drizzle/accounting',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.ACCOUNTING_DATABASE_URL ??
      'postgresql://cms_accounting:change-me-accounting@localhost:5432/cms_accounting',
  },
  verbose: true,
  strict: true,
});
