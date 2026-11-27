import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PwaProvider } from './context/PwaContext';
import { RideProvider } from './context/RideContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './layouts/AppLayout';
import { AddVehiclePage } from './pages/AddVehiclePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { FuelPage } from './pages/FuelPage';
import { GpsTrackingPage } from './pages/GpsTrackingPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { TripsPage } from './pages/TripsPage';
import { VehicleDetailsPage } from './pages/VehicleDetailsPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { PublicOnlyRoute } from './routes/PublicOnlyRoute';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PwaProvider>
          <AuthProvider>
          <RideProvider>
            <BrowserRouter>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/vehicles" element={<VehiclesPage />} />
                <Route path="/vehicles/new" element={<AddVehiclePage />} />
                <Route path="/vehicles/:id" element={<VehicleDetailsPage />} />
                <Route path="/trips" element={<TripsPage />} />
                <Route path="/gps-tracking" element={<GpsTrackingPage />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/fuel" element={<FuelPage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/insights" element={<AnalyticsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/budgets" element={<BudgetsPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/settings" element={<ProfilePage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </BrowserRouter>
          </RideProvider>
        </AuthProvider>
      </PwaProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
