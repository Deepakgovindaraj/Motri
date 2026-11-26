import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { connectDatabase, disconnectDatabase } from '../config/db';

const app = createApp();
const TEST_MONGODB_URI =
  process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/rideexpense_docs_test';

describe('Notifications & Documents API', () => {
  beforeAll(async () => {
    await connectDatabase(TEST_MONGODB_URI);
  });

  beforeEach(async () => {
    const db = mongoose.connection.db;
    if (!db) return;
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      if (!['expenseCategories', 'tripPurposes', 'subscriptionPlans'].includes(col.name)) {
        await db.collection(col.name).deleteMany({});
      }
    }
  });

  afterAll(async () => {
    const db = mongoose.connection.db;
    if (db) await db.dropDatabase();
    await disconnectDatabase();
  });

  it('creates, lists, and deletes vehicle documents and handles notifications read state', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Doc Owner',
      email: 'docs@example.com',
      password: 'Password123',
    });
    const token = regRes.body.data.accessToken as string;

    const vehRes = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleName: 'Sedan',
        vehicleType: 'Car',
        registrationNumber: 'DL01AB1234',
        brand: 'VW',
        model: 'Virtus',
        manufacturingYear: 2024,
        fuelType: 'Petrol',
        currentOdometer: 2000,
      });
    const vehicleId = vehRes.body.data._id as string;

    const createDoc = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId,
        documentType: 'Insurance',
        title: 'Comprehensive Policy',
        documentNumber: 'POL-2026-01',
        expiryDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      });
    expect(createDoc.status).toBe(201);
    const docId = createDoc.body.data._id as string;

    const listDocs = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${token}`);
    expect(listDocs.status).toBe(200);
    expect(listDocs.body.data).toHaveLength(1);

    const delDoc = await request(app)
      .delete(`/api/v1/documents/${docId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delDoc.status).toBe(200);

    // Budget alert creates a notification, test read-all
    const now = new Date();
    await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId,
        amount: 100,
        period: 'monthly',
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString(),
      });

    await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId,
        categorySlug: 'toll',
        amount: 90,
        expenseDate: now.toISOString(),
      });

    const notifRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.meta.unreadCount).toBe(1);

    const readAllRes = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);
    expect(readAllRes.status).toBe(200);

    const afterReadRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(afterReadRes.body.meta.unreadCount).toBe(0);
  });
});
