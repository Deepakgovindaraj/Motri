import mongoose from 'mongoose';
import { env } from './env';
import { ExpenseCategory } from '../models/ExpenseCategory';
import { TripPurpose } from '../models/TripPurpose';
import { SubscriptionPlan } from '../models/SubscriptionPlan';

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Fuel', slug: 'fuel', icon: 'fuel', color: '#2563EB', isSystem: true },
  { name: 'EV Charging', slug: 'ev-charging', icon: 'zap', color: '#0EA5E9', isSystem: true },
  { name: 'Maintenance', slug: 'maintenance', icon: 'wrench', color: '#0F172A', isSystem: true },
  { name: 'Repairs', slug: 'repairs', icon: 'hammer', color: '#DC2626', isSystem: true },
  { name: 'Engine Oil', slug: 'engine-oil', icon: 'droplet', color: '#D97706', isSystem: true },
  { name: 'Tyres', slug: 'tyres', icon: 'circle-dot', color: '#475569', isSystem: true },
  { name: 'Toll', slug: 'toll', icon: 'ticket', color: '#7C3AED', isSystem: true },
  { name: 'Parking', slug: 'parking', icon: 'parking-square', color: '#0D9488', isSystem: true },
  { name: 'Insurance', slug: 'insurance', icon: 'shield-check', color: '#16A34A', isSystem: true },
  { name: 'Vehicle Documents', slug: 'vehicle-documents', icon: 'file-text', color: '#4F46E5', isSystem: true },
  { name: 'Cleaning', slug: 'cleaning', icon: 'sparkles', color: '#0284C7', isSystem: true },
  { name: 'Miscellaneous', slug: 'miscellaneous', icon: 'more-horizontal', color: '#64748B', isSystem: true },
];

const DEFAULT_TRIP_PURPOSES = [
  { name: 'Commute', slug: 'commute', isSystem: true },
  { name: 'Business', slug: 'business', isSystem: true },
  { name: 'Personal', slug: 'personal', isSystem: true },
  { name: 'Delivery', slug: 'delivery', isSystem: true },
  { name: 'Road Trip', slug: 'road-trip', isSystem: true },
  { name: 'Errand', slug: 'errand', isSystem: true },
];

const DEFAULT_SUBSCRIPTION_PLANS = [
  {
    code: 'FREE',
    name: 'Free Starter',
    description: 'Essential vehicle, trip, and expense tracking for personal rides.',
    monthlyPrice: mongoose.Types.Decimal128.fromString('0.00'),
    annualPrice: mongoose.Types.Decimal128.fromString('0.00'),
    currency: 'USD',
    maxVehicles: 2,
    features: ['Up to 2 vehicles', 'Manual & GPS trip logs', 'Basic analytics'],
    isActive: true,
  },
  {
    code: 'PRO',
    name: 'Motri Pro',
    description: 'Unlimited vehicles, advanced analytics, budget alerts, and receipt storage.',
    monthlyPrice: mongoose.Types.Decimal128.fromString('9.99'),
    annualPrice: mongoose.Types.Decimal128.fromString('99.00'),
    currency: 'USD',
    maxVehicles: 25,
    features: ['Up to 25 vehicles', 'Cloud receipt backups', 'Budget & service alerts', 'CSV/PDF exports'],
    isActive: true,
  },
];

export async function ensureCollectionsAndDefaults(): Promise<void> {
  // Ensure all registered Mongoose collections exist in MongoDB
  const existingCollections = await mongoose.connection.db?.listCollections().toArray();
  const existingNames = new Set((existingCollections ?? []).map((c) => c.name));

  for (const model of Object.values(mongoose.models)) {
    const collectionName = model.collection.collectionName;
    if (!existingNames.has(collectionName)) {
      await model.createCollection();
    }
    await model.syncIndexes();
  }

  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    await ExpenseCategory.updateOne({ slug: cat.slug }, { $setOnInsert: cat }, { upsert: true });
  }

  for (const purpose of DEFAULT_TRIP_PURPOSES) {
    await TripPurpose.updateOne({ slug: purpose.slug }, { $setOnInsert: purpose }, { upsert: true });
  }

  for (const plan of DEFAULT_SUBSCRIPTION_PLANS) {
    await SubscriptionPlan.updateOne({ code: plan.code }, { $setOnInsert: plan }, { upsert: true });
  }
}

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  await ensureCollectionsAndDefaults();
  return conn;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
