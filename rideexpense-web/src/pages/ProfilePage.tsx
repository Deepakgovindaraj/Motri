import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Bell, Download, Lock, LogOut, Palette, Shield, Sliders, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { documentService } from '../services/documentService';
import { expenseService } from '../services/expenseService';
import { tripService } from '../services/tripService';
import { vehicleService } from '../services/vehicleService';
import { getApiErrorMessage } from '../utils/formatters';

interface SettingsFormValues {
  name: string;
  currency: string;
  distanceUnit: 'km' | 'mi';
  fuelUnit: 'L' | 'kWh' | 'kg';
  pushNotificationsEnabled: boolean;
  budgetAlertThresholdPercent: number;
}

type SettingsTab = 'account' | 'preferences' | 'notifications' | 'security' | 'appearance' | 'privacy';

export function ProfilePage() {
  const { user, preferences, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SettingsFormValues>({
    defaultValues: {
      name: user?.name ?? '',
      currency: preferences?.currency ?? 'USD',
      distanceUnit: preferences?.distanceUnit ?? 'km',
      fuelUnit: preferences?.fuelUnit ?? 'L',
      pushNotificationsEnabled: preferences?.pushNotificationsEnabled ?? true,
      budgetAlertThresholdPercent: preferences?.budgetAlertThresholdPercent ?? 75,
    },
  });

  const onSubmit = async (values: SettingsFormValues) => {
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await authService.updateProfile({
        name: values.name,
        preferences: {
          currency: values.currency,
          distanceUnit: values.distanceUnit,
          fuelUnit: values.fuelUnit,
          pushNotificationsEnabled: Boolean(values.pushNotificationsEnabled),
          budgetAlertThresholdPercent: Number(values.budgetAlertThresholdPercent),
        },
      });
      await refreshProfile();
      setStatusMessage('Settings updated and saved to MongoDB.');
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Failed to save settings'));
    }
  };

  const handleExportAccountData = async () => {
    setExporting(true);
    try {
      const [vehicles, trips, expenses, documents] = await Promise.all([
        vehicleService.list({ limit: 100 }),
        tripService.list({ limit: 100 }),
        expenseService.list({ limit: 100 }),
        documentService.list(),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        user,
        preferences,
        vehicles: vehicles.items,
        trips: trips.items,
        expenses: expenses.items,
        documents,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vehixa-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy & Data', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#171A18]">Settings</h1>
        <p className="mt-1 text-sm text-[#5C615A]">
          Manage your account profile, currency &amp; measurement units, notifications, and data privacy.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Settings Navigation */}
        <Card className="h-fit p-2 lg:col-span-3">
          <nav className="space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex w-full items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                  activeTab === id
                    ? 'bg-[#171A18] text-[#C5F467]'
                    : 'text-[#5C615A] hover:bg-[#F4F3ED] hover:text-[#171A18]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </Card>

        {/* Settings Content */}
        <Card className="p-6 sm:p-8 lg:col-span-9">
          {statusMessage && (
            <div className="mb-5 rounded-[10px] border border-[#C5D8B3] bg-[#DCE8D0] px-4 py-3 text-sm font-medium text-[#23331A]">
              {statusMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-5 rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318]">
              {errorMessage}
            </div>
          )}

          {(activeTab === 'account' ||
            activeTab === 'preferences' ||
            activeTab === 'notifications') && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {activeTab === 'account' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#ECEAE2] pb-3">
                    <h2 className="text-base font-bold text-[#171A18]">Account Settings</h2>
                    <StatusIndicator tone="positive" label={user?.role || 'USER'} />
                  </div>
                  <Input label="Full Name" {...register('name', { required: true })} />
                  <Input label="Email Address" value={user?.email ?? ''} disabled />
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-4">
                  <h2 className="border-b border-[#ECEAE2] pb-3 text-base font-bold text-[#171A18]">
                    Regional &amp; Unit Preferences
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Select
                      label="Currency"
                      options={[
                        { label: 'USD ($)', value: 'USD' },
                        { label: 'INR (₹)', value: 'INR' },
                        { label: 'EUR (€)', value: 'EUR' },
                        { label: 'GBP (£)', value: 'GBP' },
                      ]}
                      {...register('currency')}
                    />
                    <Select
                      label="Distance Unit"
                      options={[
                        { label: 'Kilometres (km)', value: 'km' },
                        { label: 'Miles (mi)', value: 'mi' },
                      ]}
                      {...register('distanceUnit')}
                    />
                    <Select
                      label="Fuel / Energy Unit"
                      options={[
                        { label: 'Litres (L)', value: 'L' },
                        { label: 'Kilowatt-hours (kWh)', value: 'kWh' },
                        { label: 'Kilograms (kg)', value: 'kg' },
                      ]}
                      {...register('fuelUnit')}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <h2 className="border-b border-[#ECEAE2] pb-3 text-base font-bold text-[#171A18]">
                    Notification Preferences
                  </h2>
                  <label className="flex items-center justify-between rounded-[10px] border border-[#E4E2D9] bg-[#FAF9F5] p-4">
                    <div>
                      <p className="text-sm font-semibold text-[#171A18]">
                        Budget &amp; Service Alerts
                      </p>
                      <p className="text-xs text-[#5C615A]">
                        Generate in-app notifications when budgets cross thresholds.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#171A18]"
                      {...register('pushNotificationsEnabled')}
                    />
                  </label>
                  <Input
                    label="Primary Alert Threshold (%)"
                    type="number"
                    min={1}
                    max={100}
                    {...register('budgetAlertThresholdPercent')}
                  />
                </div>
              )}

              <div className="flex justify-end border-t border-[#ECEAE2] pt-5">
                <Button type="submit" isLoading={isSubmitting}>
                  Save Changes
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <div className="space-y-5">
              <h2 className="border-b border-[#ECEAE2] pb-3 text-base font-bold text-[#171A18]">
                Security &amp; Session
              </h2>
              <div className="rounded-[10px] border border-[#E4E2D9] bg-[#FAF9F5] p-4 text-sm">
                <p className="font-semibold text-[#171A18]">Active JWT Session</p>
                <p className="mt-1 text-xs text-[#5C615A]">
                  Your session uses short-lived JWT access tokens and rotated SHA-256 hashed refresh
                  tokens stored securely in MongoDB.
                </p>
              </div>
              <Button
                variant="danger"
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
              >
                <LogOut className="h-4 w-4" /> Sign Out of Session
              </Button>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-5">
              <h2 className="border-b border-[#ECEAE2] pb-3 text-base font-bold text-[#171A18]">
                Design System Identity
              </h2>
              <p className="text-sm text-[#5C615A]">
                Vehixa uses the finalized <strong>Graphite × Warm Ivory × Electric Lime</strong>{' '}
                automotive-finance palette.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { name: 'Graphite', hex: '#171A18', dark: true },
                  { name: 'Warm Ivory', hex: '#F4F3ED', dark: false },
                  { name: 'Electric Lime', hex: '#C5F467', dark: false },
                  { name: 'Pure White', hex: '#FFFFFF', dark: false },
                  { name: 'Muted Grey', hex: '#A6AAA3', dark: false },
                  { name: 'Soft Sage', hex: '#DCE8D0', dark: false },
                ].map((c) => (
                  <div
                    key={c.hex}
                    className="rounded-[10px] border border-[#E4E2D9] p-3"
                    style={{ backgroundColor: c.hex, color: c.dark ? '#FFFFFF' : '#171A18' }}
                  >
                    <p className="text-xs font-bold">{c.name}</p>
                    <p className="text-[11px] opacity-80">{c.hex}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-5">
              <h2 className="border-b border-[#ECEAE2] pb-3 text-base font-bold text-[#171A18]">
                Privacy &amp; Data Export
              </h2>
              <p className="text-sm text-[#5C615A]">
                Download a complete JSON snapshot of your vehicles, trips, expenses, and documents
                from MongoDB.
              </p>
              <Button variant="secondary" isLoading={exporting} onClick={handleExportAccountData}>
                <Download className="h-4 w-4" /> Export My Data (JSON)
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
