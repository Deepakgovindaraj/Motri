export const VEHIXA_COLORS = {
  graphite: '#171A18',
  graphiteSoft: '#232724',
  ivory: '#F4F3ED',
  ivoryBorder: '#E4E2D9',
  electricLime: '#C5F467',
  electricLimeHover: '#B4E94D',
  white: '#FFFFFF',
  mutedGrey: '#A6AAA3',
  mutedText: '#686D66',
  softSage: '#DCE8D0',
  softSageText: '#23331A',
  danger: '#B42318',
  dangerSoft: '#FEE4E2',
} as const;

export const VEHIXA_TYPOGRAPHY = {
  fontFamily: "'Manrope', 'Inter', system-ui, sans-serif",
  heroNumber: 'text-4xl sm:text-5xl font-bold tracking-tight tabular-nums',
  sectionTitle: 'text-lg font-semibold tracking-tight text-[#171A18] dark:text-[#F4F3ED]',
  label: 'text-xs font-semibold uppercase tracking-[0.08em] text-[#7D827A] dark:text-[#8E938B]',
} as const;

export const VEHIXA_SPACING = {
  pageMaxWidth: 'max-w-[1360px]',
  pagePadding: 'px-4 sm:px-6 lg:px-10 py-6 sm:py-8',
  sectionGap: 'space-y-8',
  panelRadius: 'rounded-[12px]',
} as const;
