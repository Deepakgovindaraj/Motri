import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Bell,
  Check,
  Download,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Shield,
  Sliders,
  Smartphone,
  Sun,
  User,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { useAuth } from '../context/AuthContext';
import { usePwa } from '../context/PwaContext';
import { ThemePreference, useTheme } from '../context/ThemeContext';
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
  const { theme, resolvedTheme, isDark, setTheme } = useTheme();
  const {
    canInstall,
    isInstalled,
    isIosInstallable,
    updateReady,
    installApp,
    applyUpdate,
  } = usePwa();
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
        <h1 className="text-2xl font-extrabold tracking-tight text-[#171A18] dark:text-[#F4F3ED]">Settings</h1>
        <p className="mt-1 text-sm text-[#5C615A] dark:text-[#B0B4AD]">
          Manage your account profile, currency &amp; measurement units, notifications, and appearance.
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
                    ? 'bg-[#171A18] text-[#C5F467] dark:bg-[#C5F467] dark:text-[#171A18]'
                    : 'text-[#5C615A] hover:bg-[#F4F3ED] hover:text-[#171A18] dark:text-[#B0B4AD] dark:hover:bg-[#232724] dark:hover:text-[#F4F3ED]'
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
            <div className="mb-5 rounded-[10px] border border-[#C5D8B3] bg-[#DCE8D0] px-4 py-3 text-sm font-medium text-[#23331A] dark:border-[#2F4726] dark:bg-[#1E2E18] dark:text-[#C5F467]">
              {statusMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-5 rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318] dark:border-[#5C2320] dark:bg-[#2B1514] dark:text-[#FCA5A5]">
              {errorMessage}
            </div>
          )}

          {(activeTab === 'account' ||
            activeTab === 'preferences' ||
            activeTab === 'notifications') && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {activeTab === 'account' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#ECEAE2] pb-3 dark:border-[#262B27]">
                    <h2 className="text-base font-bold text-[#171A18] dark:text-[#F4F3ED]">Account Settings</h2>
                    <StatusIndicator tone="positive" label={user?.role || 'USER'} />
                  </div>
                  <Input label="Full Name" {...register('name', { required: true })} />
                  <Input label="Email Address" value={user?.email ?? ''} disabled />
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-4">
                  <h2 className="border-b border-[#ECEAE2] pb-3 text-base font-bold text-[#171A18] dark:border-[#262B27] dark:text-[#F4F3ED]">
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
                  <h2 className="border-b border-[#ECEAE2] pb-3 text-base font-bold text-[#171A18] dark:border-[#262B27] dark:text-[#F4F3ED]">
                    Notification Preferences
                  </h2>
                  <label className="flex items-center justify-between rounded-[10px] border border-[#E4E2D9] bg-[#FAF9F5] p-4 dark:border-[#2B302C] dark:bg-[#1E221F]">
                    <div>
                      <p className="text-sm font-semibold text-[#171A18] dark:text-[#F4F3ED]">
                        Budget &amp; Service Alerts
                      </p>
                      <p className="text-xs text-[#5C615A] dark:text-[#B0B4AD]">
                        Generate in-app notifications when budgets cross thresholds.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#171A18] dark:accent-[#C5F467]"
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

              <div className="flex justify-end border-t border-[#ECEAE2] pt-5 dark:border-[#262B27]">
                <Button type="submit" isLoading={isSubmitting}>
                  Save Changes
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <div className="space-y-5">
              <h2 className="border-b border-[#ECEAE2] pb-3 text-base font-bold text-[#171A18] dark:border-[#262B27] dark:text-[#F4F3ED]">
                Security &amp; Session
              </h2>
              <div className="rounded-[10px] border border-[#E4E2D9] bg-[#FAF9F5] p-4 text-sm dark:border-[#2B302C] dark:bg-[#1E221F]">
                <p className="font-semibold text-[#171A18] dark:text-[#F4F3ED]">Active JWT Session</p>
                <p className="mt-1 text-xs text-[#5C615A] dark:text-[#B0B4AD]">
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
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECEAE2] pb-3 dark:border-[#262B27]">
                <div>
                  <h2 className="text-base font-bold text-[#171A18] dark:text-[#F4F3ED]">
                    Appearance &amp; Night Mode
                  </h2>
                  <p className="mt-0.5 text-xs text-[#5C615A] dark:text-[#B0B4AD]">
                    Choose Warm Ivory for daytime clarity or Night Mode for low-glare rides.
                  </p>
                </div>
                <StatusIndicator
                  tone={isDark ? 'active' : 'positive'}
                  label={isDark ? 'Night Mode Active' : 'Day Mode Active'}
                />
              </div>

              {/* Interactive Theme Mode Selector */}
              <div className="grid gap-3.5 sm:grid-cols-3">
                {(
                  [
                    {
                      id: 'light',
                      title: 'Warm Ivory (Day)',
                      description: 'Crisp warm ivory canvas with white surfaces & graphite ink.',
                      icon: Sun,
                      previewBg: '#F4F3ED',
                      previewCard: '#FFFFFF',
                      previewAccent: '#171A18',
                    },
                    {
                      id: 'dark',
                      title: 'Night Mode (Graphite)',
                      description: 'Deep obsidian graphite surfaces with high-contrast electric lime.',
                      icon: Moon,
                      previewBg: '#0E100F',
                      previewCard: '#171A18',
                      previewAccent: '#C5F467',
                    },
                    {
                      id: 'system',
                      title: 'System Default',
                      description: `Automatically matches device theme (currently ${resolvedTheme}).`,
                      icon: Monitor,
                      previewBg: 'linear-gradient(135deg, #F4F3ED 50%, #0E100F 50%)',
                      previewCard: '#232724',
                      previewAccent: '#C5F467',
                    },
                  ] as {
                    id: ThemePreference;
                    title: string;
                    description: string;
                    icon: typeof Sun;
                    previewBg: string;
                    previewCard: string;
                    previewAccent: string;
                  }[]
                ).map((option) => {
                  const Icon = option.icon;
                  const selected = theme === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTheme(option.id)}
                      aria-pressed={selected}
                      className={`group flex flex-col justify-between rounded-[12px] border p-4 text-left transition-all ${
                        selected
                          ? 'border-[#171A18] bg-[#FAF9F5] ring-2 ring-[#C5F467] dark:border-[#C5F467] dark:bg-[#1E221F]'
                          : 'border-[#E4E2D9] bg-white hover:border-[#A6AAA3] dark:border-[#2B302C] dark:bg-[#171A18] dark:hover:border-[#49514B]'
                      }`}
                    >
                      <div>
                        {/* Mini Visual Preview */}
                        <div
                          className="mb-3.5 flex h-16 items-end justify-between rounded-[8px] border border-[#E4E2D9]/60 p-2.5 dark:border-[#2B302C]"
                          style={{ background: option.previewBg }}
                        >
                          <div
                            className="h-7 w-2/3 rounded-[5px] border border-black/10 p-1.5"
                            style={{ backgroundColor: option.previewCard }}
                          >
                            <div
                              className="h-1.5 w-1/2 rounded-full"
                              style={{ backgroundColor: option.previewAccent }}
                            />
                          </div>
                          <span
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: '#C5F467' }}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#171A18] dark:text-[#F4F3ED]">
                            <Icon className="h-4 w-4 text-[#171A18] dark:text-[#C5F467]" />
                            {option.title}
                          </span>
                          {selected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C5F467] text-[#171A18]">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#5C615A] dark:text-[#B0B4AD]">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Night Mode Toggle Row */}
              <div className="flex items-center justify-between rounded-[12px] border border-[#E4E2D9] bg-[#FAF9F5] p-4 dark:border-[#2B302C] dark:bg-[#1E221F]">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#171A18] text-[#C5F467] dark:bg-[#C5F467] dark:text-[#171A18]">
                    {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#171A18] dark:text-[#F4F3ED]">Night Mode</p>
                    <p className="text-xs text-[#5C615A] dark:text-[#B0B4AD]">
                      Instantly switch between Warm Ivory day palette and Graphite night palette.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDark}
                  aria-label="Toggle Night Mode"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
                    isDark
                      ? 'border-[#C5F467] bg-[#C5F467]'
                      : 'border-[#DCDAD0] bg-[#E4E2D9]'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-[#171A18] transition-transform ${
                      isDark ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Installable Mobile / Desktop App (PWA) */}
              <div className="space-y-3 border-t border-[#ECEAE2] pt-5 dark:border-[#262B27]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#171A18] dark:text-[#F4F3ED]">
                      Mobile &amp; Desktop App (PWA)
                    </h3>
                    <p className="text-xs text-[#5C615A] dark:text-[#B0B4AD]">
                      Run Vehixa full-screen from your home screen with offline shell caching.
                    </p>
                  </div>
                  <StatusIndicator
                    tone={isInstalled ? 'positive' : 'neutral'}
                    label={isInstalled ? 'Installed App' : 'Browser Mode'}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#E4E2D9] bg-[#FAF9F5] p-4 dark:border-[#2B302C] dark:bg-[#1E221F]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#171A18] text-[#C5F467]">
                      <Smartphone className="h-4 w-4" />
                    </span>
                    <div className="text-xs">
                      {isInstalled ? (
                        <p className="font-semibold text-[#171A18] dark:text-[#F4F3ED]">
                          Vehixa is installed and running in standalone app mode.
                        </p>
                      ) : isIosInstallable ? (
                        <p className="text-[#5C615A] dark:text-[#B0B4AD]">
                          On iPhone/iPad Safari, tap <strong>Share</strong> then{' '}
                          <strong>Add to Home Screen</strong> to install Vehixa.
                        </p>
                      ) : canInstall ? (
                        <p className="font-semibold text-[#171A18] dark:text-[#F4F3ED]">
                          Ready to install on this device.
                        </p>
                      ) : (
                        <p className="text-[#5C615A] dark:text-[#B0B4AD]">
                          Use Chrome/Edge menu → <strong>Add to Home screen / Install app</strong> if not prompted automatically.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {updateReady && (
                      <Button size="sm" variant="outline" onClick={applyUpdate}>
                        <RefreshCw className="h-3.5 w-3.5" /> Update App
                      </Button>
                    )}
                    {canInstall && (
                      <Button size="sm" onClick={() => void installApp()}>
                        <Smartphone className="h-3.5 w-3.5" /> Install App
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Design System Identity Swatches */}
              <div className="space-y-3 border-t border-[#ECEAE2] pt-5 dark:border-[#262B27]">
                <h3 className="text-sm font-bold text-[#171A18] dark:text-[#F4F3ED]">
                  Design System Identity
                </h3>
                <p className="text-xs text-[#5C615A] dark:text-[#B0B4AD]">
                  Vehixa uses the finalized <strong>Graphite × Warm Ivory × Electric Lime</strong>{' '}
                  automotive-finance palette across both Day and Night modes.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { name: 'Graphite', hex: '#171A18', dark: true },
                    { name: 'Night Obsidian', hex: '#0E100F', dark: true },
                    { name: 'Warm Ivory', hex: '#F4F3ED', dark: false },
                    { name: 'Electric Lime', hex: '#C5F467', dark: false },
                    { name: 'Muted Grey', hex: '#A6AAA3', dark: false },
                    { name: 'Soft Sage', hex: '#DCE8D0', dark: false },
                  ].map((c) => (
                    <div
                      key={c.hex}
                      className="rounded-[10px] border border-[#E4E2D9] p-3 dark:border-[#2B302C]"
                      style={{ backgroundColor: c.hex, color: c.dark ? '#FFFFFF' : '#171A18' }}
                    >
                      <p className="text-xs font-bold">{c.name}</p>
                      <p className="text-[11px] opacity-80">{c.hex}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-5">
              <h2 className="border-b border-[#ECEAE2] pb-3 text-base font-bold text-[#171A18] dark:border-[#262B27] dark:text-[#F4F3ED]">
                Privacy &amp; Data Export
              </h2>
              <p className="text-sm text-[#5C615A] dark:text-[#B0B4AD]">
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
