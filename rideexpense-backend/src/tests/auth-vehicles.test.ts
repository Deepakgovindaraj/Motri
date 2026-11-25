import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { connectDatabase, disconnectDatabase } from '../config/db';

const app = createApp();

const TEST_MONGODB_URI =
  process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/rideexpense_test';

describe('RideExpense Phase 1-3 API (Auth & Vehicles)', () => {
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
    if (db) {
      await db.dropDatabase();
    }
    await disconnectDatabase();
  });

  it('creates all 18 MongoDB collections and seeds default reference data', async () => {
    const db = mongoose.connection.db!;
    const collections = await db.listCollections().toArray();
    const names = new Set(collections.map((c) => c.name));

    const expectedCollections = [
      'peoples',
      'refreshTokens',
      'userPreferences',
      'vehicles',
      'odometerReadings',
      'trips',
      'tripLocations',
      'tripPurposes',
      'expenseCategories',
      'expenses',
      'fuelLogs',
      'maintenanceRecords',
      'expenseAttachments',
      'budgets',
      'notifications',
      'subscriptions',
      'subscriptionPlans',
      'auditLogs',
    ];

    for (const expected of expectedCollections) {
      expect(names.has(expected)).toBe(true);
    }

    const categoriesCount = await db.collection('expenseCategories').countDocuments();
    expect(categoriesCount).toBe(12);
  });

  it('GET /api/v1/health returns ok with connected database', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.database).toBe('connected');
  });

  it('registers, logs in, rotates refresh token, accesses /me, and logs out', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Aarav Mehta',
      email: 'aarav@example.com',
      password: 'Password123',
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.user.email).toBe('aarav@example.com');
    expect(registerRes.body.data.user.passwordHash).toBeUndefined();
    expect(registerRes.body.data.accessToken).toBeTruthy();
    expect(registerRes.body.data.refreshToken).toBeTruthy();

    const duplicateRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Aarav Two',
      email: 'aarav@example.com',
      password: 'Password123',
    });
    expect(duplicateRes.status).toBe(409);

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'aarav@example.com',
      password: 'Password123',
    });
    expect(loginRes.status).toBe(200);
    const { accessToken, refreshToken } = loginRes.body.data;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('aarav@example.com');

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();
    expect(refreshRes.body.data.refreshToken).not.toBe(refreshToken);

    // Reusing rotated refresh token must fail
    const reuseRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(reuseRes.status).toBe(401);

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: refreshRes.body.data.refreshToken });
    expect(logoutRes.status).toBe(200);
  });

  it('performs full Vehicle CRUD and enforces user ownership isolation', async () => {
    const user1 = await request(app).post('/api/v1/auth/register').send({
      name: 'Owner One',
      email: 'owner1@example.com',
      password: 'Password123',
    });
    const user2 = await request(app).post('/api/v1/auth/register').send({
      name: 'Owner Two',
      email: 'owner2@example.com',
      password: 'Password123',
    });

    const token1 = user1.body.data.accessToken;
    const token2 = user2.body.data.accessToken;

    // Unauthenticated access rejected
    const unauthRes = await request(app).get('/api/v1/vehicles');
    expect(unauthRes.status).toBe(401);

    // Create vehicle for user1
    const createRes = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        vehicleName: 'City Commuter',
        vehicleType: 'Car',
        registrationNumber: 'MH12AB1234',
        brand: 'Honda',
        model: 'City',
        manufacturingYear: 2022,
        fuelType: 'Petrol',
        tankCapacity: 40,
        expectedMileage: 17.5,
        currentOdometer: 12450,
      });

    expect(createRes.status).toBe(201);
    const vehicleId = createRes.body.data._id;
    expect(createRes.body.data.registrationNumber).toBe('MH12AB1234');

    // List vehicles for user1
    const list1Res = await request(app)
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token1}`);
    expect(list1Res.status).toBe(200);
    expect(list1Res.body.data).toHaveLength(1);

    // User2 cannot see, read, update, or delete User1's vehicle
    const list2Res = await request(app)
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token2}`);
    expect(list2Res.status).toBe(200);
    expect(list2Res.body.data).toHaveLength(0);

    const getOtherRes = await request(app)
      .get(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(getOtherRes.status).toBe(404);

    const updateOtherRes = await request(app)
      .put(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ vehicleName: 'Hacked Name' });
    expect(updateOtherRes.status).toBe(404);

    // User1 updates vehicle
    const updateRes = await request(app)
      .put(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ currentOdometer: 12800, vehicleName: 'City Commuter ZX' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.currentOdometer).toBe(12800);
    expect(updateRes.body.data.vehicleName).toBe('City Commuter ZX');

    // User1 deletes vehicle
    const deleteRes = await request(app)
      .delete(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(deleteRes.status).toBe(200);

    const afterDeleteRes = await request(app)
      .get(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${token1}`);
    expect(afterDeleteRes.status).toBe(404);
  });
});
