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

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    totalAmount?: number;
    summary?: {
      totalFuelCost: number;
      totalQuantity: number;
      averageMileage: number;
    };
  };
}
