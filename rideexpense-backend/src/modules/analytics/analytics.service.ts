import mongoose from 'mongoose';
import { Expense, ExpenseCategory, FuelLog, Trip, Vehicle } from '../../models';
import { calculateMileage, decimalToNumber } from '../../utils/calculations';

const FUEL_CATEGORY_SLUGS = new Set(['fuel', 'ev-charging']);
const MAINTENANCE_CATEGORY_SLUGS = new Set([
  'maintenance',
  'repairs',
  'engine-oil',
  'tyres',
  'insurance',
  'vehicle-documents',
]);

function sumDecimal(val: unknown): number {
  return Number(decimalToNumber(val as Parameters<typeof decimalToNumber>[0]).toFixed(2));
}

async function computeMileageData(userObjectId: mongoose.Types.ObjectId, vehicleId?: string) {
  const filter: Record<string, unknown> = { userId: userObjectId };
  if (vehicleId) filter.vehicleId = new mongoose.Types.ObjectId(vehicleId);

  const logs = await FuelLog.find(filter)
    .populate('vehicleId', 'vehicleName registrationNumber')
    .populate('expenseId', 'amount expenseDate')
    .sort({ odometer: 1, createdAt: 1 });

  const byVehicle = new Map<string, typeof logs>();
  for (const log of logs) {
    const veh = log.vehicleId as unknown as { _id: mongoose.Types.ObjectId } | null;
    if (!veh) continue;
    const key = veh._id.toString();
    const arr = byVehicle.get(key) ?? [];
    arr.push(log);
    byVehicle.set(key, arr);
  }

  let totalDistance = 0;
  let totalFuelConsumed = 0;
  const series: Array<{
    date: string;
    vehicleName: string;
    odometer: number;
    mileage: number;
    unitPrice: number;
    quantity: number;
  }> = [];
  const perVehicleMap = new Map<string, { distance: number; fuel: number; vehicleName: string }>();

  for (const [vehId, vehLogs] of byVehicle.entries()) {
    let lastFullOdo: number | null = null;
    let accFuel = 0;

    for (const log of vehLogs) {
      const veh = log.vehicleId as unknown as { vehicleName: string };
      const exp = log.expenseId as unknown as { expenseDate?: Date } | null;

      if (lastFullOdo === null) {
        if (log.isFullTank) {
          lastFullOdo = log.odometer;
          accFuel = 0;
        }
        continue;
      }

      accFuel += log.quantity;
      if (log.isFullTank && log.odometer > lastFullOdo && accFuel > 0) {
        const dist = log.odometer - lastFullOdo;
        const mileage = calculateMileage(dist, accFuel);
        totalDistance += dist;
        totalFuelConsumed += accFuel;

        const existing = perVehicleMap.get(vehId) ?? {
          distance: 0,
          fuel: 0,
          vehicleName: veh.vehicleName,
        };
        existing.distance += dist;
        existing.fuel += accFuel;
        perVehicleMap.set(vehId, existing);

        series.push({
          date: (exp?.expenseDate ?? log.createdAt).toISOString().slice(0, 10),
          vehicleName: veh.vehicleName,
          odometer: log.odometer,
          mileage,
          unitPrice: sumDecimal(log.unitPrice),
          quantity: log.quantity,
        });

        lastFullOdo = log.odometer;
        accFuel = 0;
      }
    }
  }

  const averageMileage =
    totalFuelConsumed > 0 ? calculateMileage(totalDistance, totalFuelConsumed) : 0;

  const byVehicleAverage = Array.from(perVehicleMap.entries()).map(([id, data]) => ({
    vehicleId: id,
    vehicleName: data.vehicleName,
    averageMileage: calculateMileage(data.distance, data.fuel),
  }));

  return { averageMileage, series, byVehicleAverage };
}

export async function getDashboardAnalytics(userId: string, vehicleId?: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const vehicleObjectId = vehicleId ? new mongoose.Types.ObjectId(vehicleId) : undefined;
  const expenseMatch = {
    userId: userObjectId,
    ...(vehicleObjectId ? { vehicleId: vehicleObjectId } : {}),
  };
  const tripMatch = {
    userId: userObjectId,
    ...(vehicleObjectId ? { vehicleId: vehicleObjectId } : {}),
  };
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    periodTotals,
    categoryAgg,
    vehicleSpendAgg,
    monthlyAgg,
    tripDistanceAgg,
    registeredVehicleCount,
    categories,
    vehicles,
    mileageData,
  ] = await Promise.all([
    Expense.aggregate<{
      _id: null;
      today: unknown;
      weekly: unknown;
      monthly: unknown;
      annual: unknown;
      allTime: unknown;
    }>([
      { $match: expenseMatch },
      {
        $group: {
          _id: null,
          today: {
            $sum: { $cond: [{ $gte: ['$expenseDate', startOfToday] }, '$amount', 0] },
          },
          weekly: {
            $sum: { $cond: [{ $gte: ['$expenseDate', startOfWeek] }, '$amount', 0] },
          },
          monthly: {
            $sum: { $cond: [{ $gte: ['$expenseDate', startOfMonth] }, '$amount', 0] },
          },
          annual: {
            $sum: { $cond: [{ $gte: ['$expenseDate', startOfYear] }, '$amount', 0] },
          },
          allTime: { $sum: '$amount' },
        },
      },
    ]),
    Expense.aggregate<{ _id: mongoose.Types.ObjectId; total: unknown; count: number }>([
      { $match: expenseMatch },
      { $group: { _id: '$categoryId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate<{ _id: mongoose.Types.ObjectId; total: unknown; count: number }>([
      { $match: expenseMatch },
      { $group: { _id: '$vehicleId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate<{ _id: { year: number; month: number }; total: unknown }>([
      { $match: { ...expenseMatch, expenseDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$expenseDate' }, month: { $month: '$expenseDate' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Trip.aggregate<{ _id: null; totalDistance: number }>([
      { $match: tripMatch },
      { $group: { _id: null, totalDistance: { $sum: '$distance' } } },
    ]),
    Vehicle.countDocuments({ userId: userObjectId }),
    ExpenseCategory.find({}),
    Vehicle.find({ userId: userObjectId }).select('vehicleName registrationNumber vehicleType'),
    computeMileageData(userObjectId, vehicleId),
  ]);

  const catMap = new Map(categories.map((c) => [c._id.toString(), c]));
  const vehMap = new Map(vehicles.map((v) => [v._id.toString(), v]));

  let fuelExpenditure = 0;
  let maintenanceExpenditure = 0;
  const allTimeSpend = periodTotals[0] ? sumDecimal(periodTotals[0].allTime) : 0;

  const categoryDistribution = categoryAgg
    .map((row) => {
      const cat = catMap.get(row._id?.toString());
      const amount = sumDecimal(row.total);
      if (cat && FUEL_CATEGORY_SLUGS.has(cat.slug)) fuelExpenditure += amount;
      if (cat && MAINTENANCE_CATEGORY_SLUGS.has(cat.slug)) maintenanceExpenditure += amount;
      return {
        categoryId: row._id?.toString(),
        name: cat?.name ?? 'Other',
        slug: cat?.slug ?? 'other',
        color: cat?.color ?? '#64748B',
        amount,
        count: row.count,
        percentage: allTimeSpend > 0 ? Number(((amount / allTimeSpend) * 100).toFixed(1)) : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const vehicleExpenses = vehicleSpendAgg
    .map((row) => {
      const veh = vehMap.get(row._id?.toString());
      return {
        vehicleId: row._id?.toString(),
        vehicleName: veh?.vehicleName ?? 'Deleted Vehicle',
        registrationNumber: veh?.registrationNumber ?? '',
        amount: sumDecimal(row.total),
        count: row.count,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyLookup = new Map(
    monthlyAgg.map((m) => [`${m._id.year}-${m._id.month}`, sumDecimal(m.total)]),
  );
  const monthlyChart = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    monthlyChart.push({
      label: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      amount: monthlyLookup.get(key) ?? 0,
    });
  }

  const totalDistance = Number((tripDistanceAgg[0]?.totalDistance ?? 0).toFixed(2));
  const costPerKm = totalDistance > 0 ? Number((allTimeSpend / totalDistance).toFixed(2)) : 0;

  return {
    summary: {
      todayExpenses: periodTotals[0] ? sumDecimal(periodTotals[0].today) : 0,
      weeklyExpenses: periodTotals[0] ? sumDecimal(periodTotals[0].weekly) : 0,
      monthlyExpenses: periodTotals[0] ? sumDecimal(periodTotals[0].monthly) : 0,
      annualExpenses: periodTotals[0] ? sumDecimal(periodTotals[0].annual) : 0,
      totalExpenses: allTimeSpend,
      totalDistance,
      fuelExpenditure: Number(fuelExpenditure.toFixed(2)),
      maintenanceExpenditure: Number(maintenanceExpenditure.toFixed(2)),
      averageMileage: mileageData.averageMileage,
      costPerKm,
      registeredVehicleCount,
    },
    monthlyChart,
    vehicleExpenses,
    categoryDistribution,
  };
}

export async function getMonthlyAndPeriodReports(
  userId: string,
  year: number,
  vehicleId?: string,
) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const matchBase: Record<string, unknown> = { userId: userObjectId };
  if (vehicleId) matchBase.vehicleId = new mongoose.Types.ObjectId(vehicleId);

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  const twelveWeeksAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 83);

  const [monthlyAgg, dailyAgg, weeklyAgg, annualAgg] = await Promise.all([
    Expense.aggregate<{ _id: number; total: unknown; count: number }>([
      { $match: { ...matchBase, expenseDate: { $gte: yearStart, $lt: yearEnd } } },
      {
        $group: {
          _id: { $month: '$expenseDate' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Expense.aggregate<{ _id: string; total: unknown; count: number }>([
      { $match: { ...matchBase, expenseDate: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$expenseDate' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Expense.aggregate<{ _id: { year: number; week: number }; total: unknown; count: number }>([
      { $match: { ...matchBase, expenseDate: { $gte: twelveWeeksAgo } } },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: '$expenseDate' },
            week: { $isoWeek: '$expenseDate' },
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]),
    Expense.aggregate<{ _id: number; total: unknown; count: number }>([
      { $match: matchBase },
      {
        $group: {
          _id: { $year: '$expenseDate' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]),
  ]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLookup = new Map(monthlyAgg.map((m) => [m._id, { total: sumDecimal(m.total), count: m.count }]));
  const monthlyReport = monthNames.map((name, idx) => {
    const entry = monthLookup.get(idx + 1);
    return {
      month: idx + 1,
      label: name,
      amount: entry?.total ?? 0,
      count: entry?.count ?? 0,
    };
  });

  return {
    year,
    monthlyReport,
    dailyReport: dailyAgg.map((d) => ({
      date: d._id,
      amount: sumDecimal(d.total),
      count: d.count,
    })),
    weeklyReport: weeklyAgg.map((w) => ({
      label: `${w._id.year}-W${String(w._id.week).padStart(2, '0')}`,
      amount: sumDecimal(w.total),
      count: w.count,
    })),
    annualReport: annualAgg.map((a) => ({
      year: a._id,
      amount: sumDecimal(a.total),
      count: a.count,
    })),
  };
}

export async function getMileageAnalytics(userId: string, vehicleId?: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  return computeMileageData(userObjectId, vehicleId);
}

export async function getCostPerKmAnalytics(userId: string, vehicleId?: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const matchBase: Record<string, unknown> = { userId: userObjectId };
  if (vehicleId) matchBase.vehicleId = new mongoose.Types.ObjectId(vehicleId);

  const [expenseByMonth, distanceByMonth, totalExpenseAgg, totalDistAgg] = await Promise.all([
    Expense.aggregate<{ _id: { year: number; month: number }; total: unknown }>([
      { $match: matchBase },
      {
        $group: {
          _id: { year: { $year: '$expenseDate' }, month: { $month: '$expenseDate' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Trip.aggregate<{ _id: { year: number; month: number }; distance: number }>([
      { $match: matchBase },
      {
        $group: {
          _id: { year: { $year: '$startTime' }, month: { $month: '$startTime' } },
          distance: { $sum: '$distance' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Expense.aggregate<{ _id: null; total: unknown }>([
      { $match: matchBase },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Trip.aggregate<{ _id: null; distance: number }>([
      { $match: matchBase },
      { $group: { _id: null, distance: { $sum: '$distance' } } },
    ]),
  ]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const keys = new Set<string>();
  const expMap = new Map<string, number>();
  const distMap = new Map<string, number>();

  for (const e of expenseByMonth) {
    const k = `${e._id.year}-${String(e._id.month).padStart(2, '0')}`;
    keys.add(k);
    expMap.set(k, sumDecimal(e.total));
  }
  for (const t of distanceByMonth) {
    const k = `${t._id.year}-${String(t._id.month).padStart(2, '0')}`;
    keys.add(k);
    distMap.set(k, Number(t.distance.toFixed(2)));
  }

  const timeline = Array.from(keys)
    .sort()
    .map((k) => {
      const [y, m] = k.split('-').map(Number);
      const spend = expMap.get(k) ?? 0;
      const distance = distMap.get(k) ?? 0;
      return {
        label: `${monthNames[m - 1]} ${String(y).slice(-2)}`,
        spend,
        distance,
        costPerKm: distance > 0 ? Number((spend / distance).toFixed(2)) : 0,
      };
    });

  const totalSpend = totalExpenseAgg[0] ? sumDecimal(totalExpenseAgg[0].total) : 0;
  const totalDistance = Number((totalDistAgg[0]?.distance ?? 0).toFixed(2));

  return {
    overallCostPerKm: totalDistance > 0 ? Number((totalSpend / totalDistance).toFixed(2)) : 0,
    totalSpend,
    totalDistance,
    timeline,
  };
}

export async function getVehicleComparisonAnalytics(userId: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [vehicles, categories, expenseAgg, tripAgg, mileageData] = await Promise.all([
    Vehicle.find({ userId: userObjectId }),
    ExpenseCategory.find({}),
    Expense.aggregate<{
      _id: { vehicleId: mongoose.Types.ObjectId; categoryId: mongoose.Types.ObjectId };
      total: unknown;
      count: number;
    }>([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: { vehicleId: '$vehicleId', categoryId: '$categoryId' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    Trip.aggregate<{ _id: mongoose.Types.ObjectId; distance: number; count: number }>([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: '$vehicleId',
          distance: { $sum: '$distance' },
          count: { $sum: 1 },
        },
      },
    ]),
    computeMileageData(userObjectId),
  ]);

  const catMap = new Map(categories.map((c) => [c._id.toString(), c]));
  const tripMap = new Map(tripAgg.map((t) => [t._id.toString(), t]));
  const mileageMap = new Map(
    mileageData.byVehicleAverage.map((m) => [m.vehicleId, m.averageMileage]),
  );

  return vehicles.map((v) => {
    const vId = v._id.toString();
    let totalSpend = 0;
    let fuelSpend = 0;
    let maintenanceSpend = 0;
    let expenseCount = 0;

    for (const row of expenseAgg) {
      if (row._id.vehicleId?.toString() !== vId) continue;
      const amt = sumDecimal(row.total);
      totalSpend += amt;
      expenseCount += row.count;
      const cat = catMap.get(row._id.categoryId?.toString());
      if (cat && FUEL_CATEGORY_SLUGS.has(cat.slug)) fuelSpend += amt;
      if (cat && MAINTENANCE_CATEGORY_SLUGS.has(cat.slug)) maintenanceSpend += amt;
    }

    const tripStats = tripMap.get(vId);
    const totalDistance = Number((tripStats?.distance ?? 0).toFixed(2));
    const costPerKm = totalDistance > 0 ? Number((totalSpend / totalDistance).toFixed(2)) : 0;

    return {
      vehicleId: vId,
      vehicleName: v.vehicleName,
      vehicleType: v.vehicleType,
      registrationNumber: v.registrationNumber,
      totalSpend: Number(totalSpend.toFixed(2)),
      fuelSpend: Number(fuelSpend.toFixed(2)),
      maintenanceSpend: Number(maintenanceSpend.toFixed(2)),
      totalDistance,
      tripCount: tripStats?.count ?? 0,
      expenseCount,
      averageMileage: mileageMap.get(vId) ?? 0,
      costPerKm,
    };
  });
}
