import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-white/20 transition-all ${className}`}
      aria-label="Toggle Dark Mode"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
};

export default ThemeToggle;
