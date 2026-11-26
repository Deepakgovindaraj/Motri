import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { connectDatabase, disconnectDatabase } from '../config/db';

const app = createApp();
const TEST_MONGODB_URI =
  process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/rideexpense_phase4_test';

async function setupUserAndVehicle(email = 'rider@example.com') {
  const userRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Test Rider',
    email,
    password: 'Password123',
  });
  const token = userRes.body.data.accessToken as string;

  const vehicleRes = await request(app)
    .post('/api/v1/vehicles')
    .set('Authorization', `Bearer ${token}`)
    .send({
      vehicleName: 'Touring Bike',
      vehicleType: 'Bike',
      registrationNumber: `MH14XY${Math.floor(1000 + Math.random() * 8999)}`,
      brand: 'Royal Enfield',
      model: 'Himalayan',
      manufacturingYear: 2024,
      fuelType: 'Petrol',
      tankCapacity: 17,
      expectedMileage: 30,
      currentOdometer: 1000,
    });

  return { token, vehicleId: vehicleRes.body.data._id as string };
}

describe('RideExpense Phase 4 API (Trips, Expenses, Fuel, Maintenance)', () => {
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

  it('creates manual trips, calculates distance, updates vehicle odometer, and validates range', async () => {
    const { token, vehicleId } = await setupUserAndVehicle();

    // Invalid odometer range
    const badRes = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId,
        trackingType: 'manual',
        startLocation: 'Home',
        endLocation: 'Office',
        startOdometer: 1050,
        endOdometer: 1020,
      });
    expect(badRes.status).toBe(400);

    // Valid manual trip
    const tripRes = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId,
        trackingType: 'manual',
        startLocation: 'Pune',
        endLocation: 'Lonavala',
        startOdometer: 1000,
        endOdometer: 1068.5,
        purpose: 'Road Trip',
        duration: 85,
        notes: 'Morning ride',
      });

    expect(tripRes.status).toBe(201);
    expect(tripRes.body.data.distance).toBe(68.5);
    expect(tripRes.body.data.status).toBe('completed');

    // Vehicle odometer updated
    const vehicleRes = await request(app)
      .get(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(vehicleRes.body.data.currentOdometer).toBe(1068.5);
  });

  it('tracks GPS trips with accuracy filtering, jump rejection, and completion', async () => {
    const { token, vehicleId } = await setupUserAndVehicle('gps@example.com');

    const startRes = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId,
        trackingType: 'gps',
        startLocation: 'Camp',
        purpose: 'Commute',
      });

    expect(startRes.status).toBe(201);
    const tripId = startRes.body.data._id;
    expect(startRes.body.data.status).toBe('in_progress');

    const t0 = new Date('2026-11-25T09:00:00Z');
    const t1 = new Date('2026-11-25T09:05:00Z');
    const t2 = new Date('2026-11-25T09:05:10Z'); // 10 seconds later

    const locRes = await request(app)
      .post(`/api/v1/trips/${tripId}/locations`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        locations: [
          { latitude: 18.5204, longitude: 73.8567, accuracy: 10, recordedAt: t0 },
          { latitude: 18.5314, longitude: 73.8446, accuracy: 15, recordedAt: t1 }, // valid ~1.76 km
          { latitude: 18.54, longitude: 73.85, accuracy: 250, recordedAt: t2 }, // poor accuracy -> filtered
          { latitude: 19.076, longitude: 72.8777, accuracy: 8, recordedAt: t2 }, // impossible jump in 10s -> filtered
        ],
      });

    expect(locRes.status).toBe(200);
    expect(locRes.body.data.acceptedCount).toBe(2);
    expect(locRes.body.data.filteredOutCount).toBe(2);
    expect(locRes.body.data.totalDistance).toBeGreaterThan(1);
    expect(locRes.body.data.totalDistance).toBeLessThan(3);

    const completeRes = await request(app)
      .post(`/api/v1/trips/${tripId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        endLocation: 'Shivajinagar',
        endTime: new Date(Date.now() + 10 * 60000),
      });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('completed');
    expect(completeRes.body.data.endLocation).toBe('Shivajinagar');
    expect(completeRes.body.data.rideSummary).toBeDefined();
    expect(completeRes.body.data.rideSummary.distanceKm).toBeGreaterThan(1);
  });

  it('auto-calculates fuel litres from totalAmount and petrol unitPrice', async () => {
    const { token, vehicleId } = await setupUserAndVehicle('petrolamount@example.com');

    const res = await request(app)
      .post('/api/v1/fuel')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId,
        fuelType: 'Petrol',
        totalAmount: 500,
        unitPrice: 100,
        odometer: 1050,
        isFullTank: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.expense.amount).toBe(500);
    expect(res.body.data.fuelLog.quantity).toBe(5);
  });

  it('records unified expenses, fuel logs with full-tank mileage, and maintenance reminders', async () => {
    const { token, vehicleId } = await setupUserAndVehicle('finance@example.com');

    // General toll expense
    const tollRes = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId,
        categorySlug: 'toll',
        amount: 125.5,
        paymentMethod: 'UPI',
        description: 'Expressway toll',
      });
    expect(tollRes.status).toBe(201);
    expect(tollRes.body.data.amount).toBe(125.5);

    // Fuel 1 (Full tank at 1000 km)
    const fuel1Res = await request(app)
      .post('/api/v1/expenses/fuel')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId,
        fuelType: 'Petrol',
        quantity: 10,
        unitPrice: 100,
        odometer: 1000,
        isFullTank: true,
      });
    expect(fuel1Res.status).toBe(201);
    expect(fuel1Res.body.data.expense.amount).toBe(1000);

    // Fuel 2 (Partial tank 5L at 1200 km)
    const fuel2Res = await request(app)
      .post('/api/v1/fuel')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId,
        fuelType: 'Petrol',
        quantity: 5,
        unitPrice: 102,
        odometer: 1200,
        isFullTank: false,
      });
    expect(fuel2Res.status).toBe(201);

    // Fuel 3 (Full tank 10L at 1450 km -> 450 km / (5+10)L = 30 km/L)
    const fuel3Res = await request(app)
      .post('/api/v1/fuel')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId,
        fuelType: 'Petrol',
        quantity: 10,
        unitPrice: 100,
        odometer: 1450,
        isFullTank: true,
      });
    expect(fuel3Res.status).toBe(201);

    const fuelListRes = await request(app)
      .get(`/api/v1/fuel?vehicleId=${vehicleId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(fuelListRes.status).toBe(200);
    expect(fuelListRes.body.meta.summary.averageMileage).toBe(30);
    expect(fuelListRes.body.meta.summary.totalFuelCost).toBe(2510);

    // Maintenance record with upcoming reminder (nextServiceOdometer = 2000, current = 1450 -> 550km remaining -> due_soon)
    const maintRes = await request(app)
      .post('/api/v1/expenses/maintenance')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId,
        serviceType: 'Engine oil',
        amount: 850,
        odometer: 1450,
        nextServiceOdometer: 2000,
        notes: 'Synthetic oil change',
      });
    expect(maintRes.status).toBe(201);
    expect(maintRes.body.data.expense.amount).toBe(850);

    const remindersRes = await request(app)
      .get('/api/v1/maintenance/reminders')
      .set('Authorization', `Bearer ${token}`);
    expect(remindersRes.status).toBe(200);
    expect(remindersRes.body.data).toHaveLength(1);
    expect(remindersRes.body.data[0].status).toBe('due_soon');

    // Single source of truth: expenses collection has 1 toll + 3 fuel + 1 maintenance = 5 entries
    const expensesListRes = await request(app)
      .get('/api/v1/expenses')
      .set('Authorization', `Bearer ${token}`);
    expect(expensesListRes.status).toBe(200);
    expect(expensesListRes.body.meta.pagination.total).toBe(5);
    expect(expensesListRes.body.meta.totalAmount).toBe(3485.5);
  });
});
