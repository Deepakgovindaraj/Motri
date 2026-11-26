export type UserRole = 'USER' | 'ADMIN';

export interface User {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreference {
  _id: string;
  userId: string;
  currency: string;
  distanceUnit: 'km' | 'mi';
  fuelUnit: 'L' | 'kWh' | 'kg';
  theme: 'light' | 'dark' | 'system';
  pushNotificationsEnabled: boolean;
  budgetAlertThresholdPercent: number;
}

export type VehicleType = 'Bike' | 'Scooter' | 'Car' | 'Electric vehicle' | 'Other';
export type FuelType = 'Petrol' | 'Diesel' | 'CNG' | 'EV charging' | 'Hybrid' | 'Other';

export interface Vehicle {
  _id: string;
  userId: string;
  vehicleName: string;
  vehicleType: VehicleType;
  registrationNumber: string;
  brand: string;
  model: string;
  manufacturingYear: number;
  fuelType: FuelType;
  tankCapacity?: number;
  expectedMileage?: number;
  currentOdometer: number;
  purchaseDate?: string;
  vehicleImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehiclePayload {
  vehicleName: string;
  vehicleType: VehicleType;
  registrationNumber: string;
  brand: string;
  model: string;
  manufacturingYear: number;
  fuelType: FuelType;
  tankCapacity?: number;
  expectedMileage?: number;
  currentOdometer: number;
  purchaseDate?: string;
  vehicleImage?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VehicleRef {
  _id: string;
  vehicleName: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  currentOdometer?: number;
}

export interface RideSummary {
  distanceKm: number;
  durationMinutes: number;
  mileageKmPerUnit: number;
  estimatedFuelUsed: number;
  estimatedFuelCost: number;
  latestFuelPrice: number;
}

export interface Trip {
  _id: string;
  userId: string;
  vehicleId: VehicleRef | string;
  trackingType: 'manual' | 'gps';
  startLocation?: string;
  endLocation?: string;
  startOdometer?: number;
  endOdometer?: number;
  distance: number;
  duration: number;
  purpose?: string;
  notes?: string;
  startTime: string;
  endTime?: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  rideSummary?: RideSummary;
}

export interface TripLocationPoint {
  _id?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  recordedAt: string;
}

export interface ExpenseCategory {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

export type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Wallet' | 'Other';

export interface Expense {
  _id: string;
  userId: string;
  vehicleId: VehicleRef | string;
  tripId?: string;
  categoryId: ExpenseCategory | string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  description?: string;
  expenseDate: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface FuelLog {
  _id: string;
  userId: string;
  vehicleId: VehicleRef | string;
  expenseId: {
    _id: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    expenseDate: string;
    description?: string;
  };
  fuelType: 'Petrol' | 'Diesel' | 'CNG' | 'EV charging';
  quantity: number;
  unitPrice: number;
  odometer: number;
  isFullTank: boolean;
  mileageKmPerUnit?: number | null;
  createdAt: string;
}

export type ServiceType =
  | 'Servicing'
  | 'Engine oil'
  | 'Tyre replacement'
  | 'Battery replacement'
  | 'Repairs'
  | 'Insurance'
  | 'Other';

export interface MaintenanceRecord {
  _id: string;
  userId: string;
  vehicleId: VehicleRef | string;
  expenseId: {
    _id: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    expenseDate: string;
    description?: string;
  };
  serviceType: ServiceType;
  serviceDate: string;
  odometer: number;
  nextServiceDate?: string;
  nextServiceOdometer?: number;
  notes?: string;
}

export interface MaintenanceReminder {
  _id: string;
  vehicle: {
    _id: string;
    vehicleName: string;
    registrationNumber: string;
    currentOdometer: number;
  };
  serviceType: ServiceType;
  serviceDate: string;
  nextServiceDate?: string;
  nextServiceOdometer?: number;
  status: 'overdue' | 'due_soon' | 'scheduled';
  reasons: string[];
}

export interface DashboardAnalytics {
  summary: {
    todayExpenses: number;
    weeklyExpenses: number;
    monthlyExpenses: number;
    annualExpenses: number;
    totalExpenses: number;
    totalDistance: number;
    fuelExpenditure: number;
    maintenanceExpenditure: number;
    averageMileage: number;
    costPerKm: number;
    registeredVehicleCount: number;
  };
  monthlyChart: Array<{ label: string; year: number; month: number; amount: number }>;
  vehicleExpenses: Array<{
    vehicleId: string;
    vehicleName: string;
    registrationNumber: string;
    amount: number;
    count: number;
  }>;
  categoryDistribution: Array<{
    categoryId: string;
    name: string;
    slug: string;
    color: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
}

export interface PeriodReportsResponse {
  year: number;
  monthlyReport: Array<{ month: number; label: string; amount: number; count: number }>;
  dailyReport: Array<{ date: string; amount: number; count: number }>;
  weeklyReport: Array<{ label: string; amount: number; count: number }>;
  annualReport: Array<{ year: number; amount: number; count: number }>;
}

export interface MileageAnalyticsResponse {
  averageMileage: number;
  series: Array<{
    date: string;
    vehicleName: string;
    odometer: number;
    mileage: number;
    unitPrice: number;
    quantity: number;
  }>;
  byVehicleAverage: Array<{
    vehicleId: string;
    vehicleName: string;
    averageMileage: number;
  }>;
}

export interface CostPerKmResponse {
  overallCostPerKm: number;
  totalSpend: number;
  totalDistance: number;
  timeline: Array<{
    label: string;
    spend: number;
    distance: number;
    costPerKm: number;
  }>;
}

export interface VehicleComparisonItem {
  vehicleId: string;
  vehicleName: string;
  vehicleType: VehicleType;
  registrationNumber: string;
  totalSpend: number;
  fuelSpend: number;
  maintenanceSpend: number;
  totalDistance: number;
  tripCount: number;
  expenseCount: number;
  averageMileage: number;
  costPerKm: number;
}

export interface BudgetProgress {
  _id: string;
  period: 'monthly' | 'weekly' | 'annual' | 'custom';
  startDate: string;
  endDate: string;
  category: { _id: string; name: string; slug: string; color: string } | null;
  vehicle: { _id: string; vehicleName: string; registrationNumber: string } | null;
  totalBudget: number;
  amountSpent: number;
  remainingBudget: number;
  spendingPercentage: number;
  alertLevel: 'ok' | 'warning_75' | 'critical_90' | 'exceeded_100';
  triggeredThreshold: number | null;
}

export interface AppNotification {
  _id: string;
  userId: string;
  type: 'budget_alert' | 'maintenance_reminder' | 'insurance_renewal' | 'service_reminder' | 'expense' | 'system';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export type DocumentCategory =
  | 'Insurance'
  | 'Registration'
  | 'Pollution Certificate'
  | 'Licence'
  | 'Warranty'
  | 'Other';

export interface VehicleDocumentItem {
  _id: string;
  userId: string;
  vehicleId?: VehicleRef | string;
  documentType: DocumentCategory;
  title: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl?: string;
  fileName?: string;
  notes?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    totalAmount?: number;
    unreadCount?: number;
    summary?: {
      totalFuelCost: number;
      totalQuantity: number;
      averageMileage: number;
    };
  };
}
