"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useCurrentUser } from '@/features/auth/api/me';
import { apiClient } from '@/lib/api-client';

export interface ThemeConfig {
    primaryColor: string;
    primaryHover: string;
    accentColor: string;
    bgColor: string;
    cardBg: string;
}

export const defaultTheme: ThemeConfig = {
    primaryColor: '#2563eb',
    primaryHover: '#1d4ed8',
    accentColor: '#4f46e5',
    bgColor: '#f8fafc',
    cardBg: '#ffffff',
};

interface ThemeContextType {
    theme: ThemeConfig;
    updateTheme: (newTheme: Partial<ThemeConfig>) => Promise<void>;
    resetToDefault: () => Promise<void>;
    isUpdating: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: defaultTheme,
    updateTheme: async () => {},
    resetToDefault: async () => {},
    isUpdating: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { data: user } = useCurrentUser();
    const [theme, setTheme] = useState<ThemeConfig>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('hellodesk_saved_theme');
            if (cached) {
                try {
                    return { ...defaultTheme, ...JSON.parse(cached) };
                } catch (e) {}
            }
        }
        return defaultTheme;
    });
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (user?.workspace?.theme) {
            const merged = { ...defaultTheme, ...user.workspace.theme };
            setTheme(merged);
            applyCssVariables(merged);
            if (typeof window !== 'undefined') {
                localStorage.setItem('hellodesk_saved_theme', JSON.stringify(merged));
            }
        } else if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('hellodesk_saved_theme');
            if (cached) {
                try {
                    applyCssVariables({ ...defaultTheme, ...JSON.parse(cached) });
                } catch (e) {
                    applyCssVariables(defaultTheme);
                }
            } else {
                applyCssVariables(defaultTheme);
            }
        }
    }, [user?.workspace?.theme]);

    const applyCssVariables = (themeConfig: ThemeConfig) => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        root.style.setProperty('--primary-color', themeConfig.primaryColor);
        root.style.setProperty('--primary-hover', themeConfig.primaryHover);
        root.style.setProperty('--accent-color', themeConfig.accentColor);
        root.style.setProperty('--bg-color', themeConfig.bgColor);
        root.style.setProperty('--card-bg', themeConfig.cardBg);
    };

    const updateTheme = async (newTheme: Partial<ThemeConfig>) => {
        setIsUpdating(true);
        try {
            const updated = { ...theme, ...newTheme };
            const res = await apiClient.put('/api/v1/theme', updated);
            const savedTheme = { ...defaultTheme, ...res.data.theme };
            setTheme(savedTheme);
            applyCssVariables(savedTheme);
        } catch (err) {
            console.error('Failed to update workspace theme:', err);
        } finally {
            setIsUpdating(false);
        }
    };

    const resetToDefault = async () => {
        await updateTheme(defaultTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, updateTheme, resetToDefault, isUpdating }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
