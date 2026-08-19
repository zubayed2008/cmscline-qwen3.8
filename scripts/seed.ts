/**
 * Database Seed Script
 *
 * This script clears the database and inserts:
 * - One default Admin user
 * - One default placeholder Homepage
 *
 * Usage: npm run seed
 * Or: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms';

// Default admin credentials
const DEFAULT_ADMIN = {
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'admin123', // Change this in production!
  role: 'Admin' as const,
};

// Default homepage content
const DEFAULT_HOMEPAGE = {
  title: 'Welcome to Our Website',
  slug: 'home',
  content: `
# Welcome to Our Enterprise CMS

This is the default homepage. Edit this content through the admin panel.

## About Us

We provide enterprise-grade content management solutions.

## Our Services

- Web Development
- Content Management
- Digital Solutions

Contact us to learn more!
  `.trim(),
  isDefaultHomepage: true,
  isActive: true,
};

async function seed(): Promise<void> {
  console.log('🌱 Starting database seed...');
  console.log(`📡 Connecting to: ${MONGODB_URI}`);

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear all collections
    console.log('🗑️  Clearing database...');
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
      console.log(`   - Cleared: ${collection.collectionName}`);
    }

    // Create Admin user
    console.log('👤 Creating default Admin user...');
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);

    const userSchema = new mongoose.Schema(
      {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ['Admin', 'Editor'], default: 'Editor' },
        isActive: { type: Boolean, default: true },
      },
      { timestamps: true }
    );

    const User = mongoose.models.User || mongoose.model('User', userSchema);

    const adminUser = await User.create({
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      passwordHash,
      role: DEFAULT_ADMIN.role,
      isActive: true,
    });
    console.log(`   ✅ Admin created: ${adminUser.email}`);

    // Create default Homepage
    console.log('📄 Creating default Homepage...');

    const pageSchema = new mongoose.Schema(
      {
        title: { type: String, required: true },
        slug: { type: String, required: true, unique: true, lowercase: true },
        content: { type: String, required: true },
        isDefaultHomepage: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
      },
      { timestamps: true }
    );

    const Page = mongoose.models.Page || mongoose.model('Page', pageSchema);

    const homepage = await Page.create(DEFAULT_HOMEPAGE);
    console.log(`   ✅ Homepage created: ${homepage.slug}`);

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('🎉 Database seeded successfully!');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('Admin Login Credentials:');
    console.log(`  Email:    ${DEFAULT_ADMIN.email}`);
    console.log(`  Password: ${DEFAULT_ADMIN.password}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password in production!');
    console.log('');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seed();
