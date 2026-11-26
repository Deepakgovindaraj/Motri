import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { Notification } from '../models';

const app = createApp();
const TEST_MONGODB_URI =
  process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/rideexpense_phase5_test';

async function setupUserAndTwoVehicles() {
  const userRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Analytics Rider',
    email: 'analytics@example.com',
    password: 'Password123',
  });
  const token = userRes.body.data.accessToken as string;
  const userId = userRes.body.data.user._id as string;

  const v1 = await request(app)
    .post('/api/v1/vehicles')
    .set('Authorization', `Bearer ${token}`)
    .send({
      vehicleName: 'City Car',
      vehicleType: 'Car',
      registrationNumber: 'KA01AA1111',
      brand: 'Hyundai',
      model: 'i20',
      manufacturingYear: 2023,
      fuelType: 'Petrol',
      currentOdometer: 5000,
    });

  const v2 = await request(app)
    .post('/api/v1/vehicles')
    .set('Authorization', `Bearer ${token}`)
    .send({
      vehicleName: 'Commuter Scooter',
      vehicleType: 'Scooter',
      registrationNumber: 'KA01BB2222',
      brand: 'Ather',
      model: '450X',
      manufacturingYear: 2024,
      fuelType: 'EV charging',
      currentOdometer: 1000,
    });

  return {
    token,
    userId,
    carId: v1.body.data._id as string,
    scooterId: v2.body.data._id as string,
  };
}

describe('RideExpense Phase 5 API (Analytics & Budgets)', () => {
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

  it('aggregates dashboard, monthly, mileage, cost-per-km, and comparison metrics from MongoDB', async () => {
    const { token, carId, scooterId } = await setupUserAndTwoVehicles();

    // Trips: Car 200 km, Scooter 50 km -> total 250 km
    await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId: carId,
        trackingType: 'manual',
        startOdometer: 5000,
        endOdometer: 5200,
        purpose: 'Business',
      });

    await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId: scooterId,
        trackingType: 'manual',
        startOdometer: 1000,
        endOdometer: 1050,
        purpose: 'Commute',
      });

    // Car Fuel logs: Full tank at 5000, Full tank 10L at 5200 -> 20 km/L, cost 1000
    await request(app)
      .post('/api/v1/fuel')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId: carId,
        fuelType: 'Petrol',
        quantity: 10,
        unitPrice: 100,
        odometer: 5000,
        isFullTank: true,
      });

    await request(app)
      .post('/api/v1/fuel')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId: carId,
        fuelType: 'Petrol',
        quantity: 10,
        unitPrice: 100,
        odometer: 5200,
        isFullTank: true,
      });

    // Maintenance on Scooter: 500
    await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId: scooterId,
        serviceType: 'Servicing',
        amount: 500,
        odometer: 1050,
      });

    const dashRes = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.summary.registeredVehicleCount).toBe(2);
    expect(dashRes.body.data.summary.totalDistance).toBe(250);
    expect(dashRes.body.data.summary.fuelExpenditure).toBe(2000);
    expect(dashRes.body.data.summary.maintenanceExpenditure).toBe(500);
    expect(dashRes.body.data.summary.totalExpenses).toBe(2500);
    expect(dashRes.body.data.summary.costPerKm).toBe(10);
    expect(dashRes.body.data.summary.averageMileage).toBe(20);
    expect(dashRes.body.data.summary.todayExpenses).toBe(2500);

    const monthlyRes = await request(app)
      .get('/api/v1/analytics/monthly')
      .set('Authorization', `Bearer ${token}`);
    expect(monthlyRes.status).toBe(200);
    expect(monthlyRes.body.data.monthlyReport).toHaveLength(12);

    const mileageRes = await request(app)
      .get('/api/v1/analytics/mileage')
      .set('Authorization', `Bearer ${token}`);
    expect(mileageRes.status).toBe(200);
    expect(mileageRes.body.data.averageMileage).toBe(20);

    const cpkRes = await request(app)
      .get('/api/v1/analytics/cost-per-km')
      .set('Authorization', `Bearer ${token}`);
    expect(cpkRes.status).toBe(200);
    expect(cpkRes.body.data.overallCostPerKm).toBe(10);

    const compRes = await request(app)
      .get('/api/v1/analytics/comparison')
      .set('Authorization', `Bearer ${token}`);
    expect(compRes.status).toBe(200);
    expect(compRes.body.data).toHaveLength(2);

    // Filtered dashboard by specific vehicle (Scooter: 50 km, 500 maintenance, 0 fuel)
    const scooterDash = await request(app)
      .get(`/api/v1/analytics/dashboard?vehicleId=${scooterId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(scooterDash.status).toBe(200);
    expect(scooterDash.body.data.summary.totalDistance).toBe(50);
    expect(scooterDash.body.data.summary.totalExpenses).toBe(500);
    expect(scooterDash.body.data.summary.maintenanceExpenditure).toBe(500);
    expect(scooterDash.body.data.summary.fuelExpenditure).toBe(0);
  });

  it('creates budgets, calculates progress, and triggers 75%, 90%, and 100% alert notifications', async () => {
    const { token, userId, carId } = await setupUserAndTwoVehicles();

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const budgetRes = await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId: carId,
        amount: 1000,
        period: 'monthly',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
    expect(budgetRes.status).toBe(201);
    const budgetId = budgetRes.body.data._id;

    // 78% spend -> warning_75 + notification
    await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId: carId,
        categorySlug: 'toll',
        amount: 780,
        expenseDate: now.toISOString(),
      });

    let progRes = await request(app)
      .get('/api/v1/budgets/progress')
      .set('Authorization', `Bearer ${token}`);
    expect(progRes.status).toBe(200);
    expect(progRes.body.data[0].amountSpent).toBe(780);
    expect(progRes.body.data[0].remainingBudget).toBe(220);
    expect(progRes.body.data[0].spendingPercentage).toBe(78);
    expect(progRes.body.data[0].alertLevel).toBe('warning_75');

    // Push to 92% -> critical_90
    await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId: carId,
        categorySlug: 'parking',
        amount: 140,
        expenseDate: now.toISOString(),
      });

    progRes = await request(app)
      .get('/api/v1/budgets/progress')
      .set('Authorization', `Bearer ${token}`);
    expect(progRes.body.data[0].alertLevel).toBe('critical_90');

    // Push to 105% -> exceeded_100
    await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleId: carId,
        categorySlug: 'cleaning',
        amount: 130,
        expenseDate: now.toISOString(),
      });

    progRes = await request(app)
      .get('/api/v1/budgets/progress')
      .set('Authorization', `Bearer ${token}`);
    expect(progRes.body.data[0].alertLevel).toBe('exceeded_100');
    expect(progRes.body.data[0].triggeredThreshold).toBe(100);

    const notifications = await Notification.find({ userId, type: 'budget_alert' });
    expect(notifications.length).toBe(3);

    // Update and delete budget
    const updRes = await request(app)
      .put(`/api/v1/budgets/${budgetId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1500 });
    expect(updRes.status).toBe(200);

    const delRes = await request(app)
      .delete(`/api/v1/budgets/${budgetId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);
  });
});
