/**
 * i18n Text Index Migration (Phase 15.5)
 *
 * MongoDB only allows ONE text index per collection. The Phase 12 indexes
 * ({ title: 'text', content: 'text' }) must be REPLACED with the extended
 * Bangla-aware indexes ({ title, content, translations.bn.title,
 * translations.bn.content }) defined in the current models.
 *
 * Mongoose will NOT drop the old index automatically — it logs an error and
 * keeps using the old one. Run this script ONCE after deploying Phase 15.5:
 *
 *   npm run migrate:i18n-indexes
 */

import mongoose from 'mongoose';
import { PageSchema } from '../src/models/page-model';
import { BlogSchema } from '../src/models/blog-model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms';

async function migrateCollection(
  collectionName: string,
  schema: mongoose.Schema
): Promise<void> {
  const collection = mongoose.connection.collection(collectionName);

  // Find every existing text index on the collection
  const indexes = await collection.indexes();
  const textIndexes = indexes.filter((idx) =>
    Object.values(idx).some((v) => v === 'text')
  );

  // Compute the desired text index from the current schema definition
  const desiredTextIndex = schema
    .indexes()
    .find(([, opts]) => (opts as Record<string, unknown>).weights);

  for (const oldIndex of textIndexes) {
    const name = oldIndex.name as string;
    if (desiredTextIndex && name === (desiredTextIndex[1] as { name?: string }).name) {
      console.log(`✔ ${collectionName}: text index "${name}" already up to date`);
      continue;
    }
    console.log(`… ${collectionName}: dropping outdated text index "${name}"`);
    await collection.dropIndex(name);
  }

  if (!desiredTextIndex) {
    console.warn(`! ${collectionName}: no text index found in schema — skipped creation`);
    return;
  }

  const [fields, options] = desiredTextIndex;
  console.log(`… ${collectionName}: creating text index "${(options as { name?: string }).name}"`);
  await collection.createIndex(
    fields as Parameters<typeof collection.createIndex>[0],
    options as never
  );
}

async function main(): Promise<void> {
  console.log('Connecting to', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  try {
    await migrateCollection('pages', PageSchema);
    await migrateCollection('blogs', BlogSchema);
    console.log('\n✅ i18n text-index migration complete.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
