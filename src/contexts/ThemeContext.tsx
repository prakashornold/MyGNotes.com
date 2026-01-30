import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Theme, ThemeContextType } from '../types';

const THEME_STORAGE_KEY = 'mygnotes_theme';

const ThemeContext = createContext<ThemeContextType | null>(null);

/**
 * ThemeProvider - Manages application theme state
 * Follows Single Responsibility Principle - only handles theme management
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        // Get stored preference or default to dark
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return stored === 'light' ? 'light' : 'dark';
    });

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    const value: ThemeContextType = {
        theme,
        toggleTheme,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export default ThemeContext;
