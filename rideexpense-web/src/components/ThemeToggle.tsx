import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to night mode'}
      title={isDark ? 'Switch to Warm Ivory (Day)' : 'Switch to Night Mode'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#E4E2D9] bg-white text-[#171A18] transition-colors hover:bg-[#FAF9F5] dark:border-[#2B302C] dark:bg-[#171A18] dark:text-[#C5F467] dark:hover:bg-[#1E221F]"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
