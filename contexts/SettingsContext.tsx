
import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { AppSettings } from '../types';

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (newSettings: AppSettings) => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
    appName: 'DisciplineApp',
    appLogo: null,
    pointThresholds: {
        aman: 10,
        perhatian: 40,
    },
    kopSurat: {
        logo: null,
        line1: '',
        line2: '',
        line3: '',
        line4: '',
        line5: '',
        line6: '',
        line7: '',
        line8: '',
    },
    spSignatoryUsername: null,
};

const SETTINGS_STORAGE_KEY = 'appSettings';

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                // Merge stored settings with defaults to ensure all keys are present
                const parsedSettings = JSON.parse(storedSettings);
                // Deep merge for nested objects
                const mergedSettings = {
                    ...DEFAULT_SETTINGS,
                    ...parsedSettings,
                    pointThresholds: {
                        ...DEFAULT_SETTINGS.pointThresholds,
                        ...(parsedSettings.pointThresholds || {})
                    },
                    kopSurat: {
                        ...DEFAULT_SETTINGS.kopSurat,
                        ...(parsedSettings.kopSurat || {})
                    }
                };
                setSettings(mergedSettings);
            }
        } catch (error) {
            console.error("Failed to parse settings from localStorage", error);
            localStorage.removeItem(SETTINGS_STORAGE_KEY);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateSettings = useCallback(async (newSettings: AppSettings): Promise<void> => {
        return new Promise((resolve) => {
            setSettings(newSettings);
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
            resolve();
        });
    }, []);

    const value = useMemo(() => ({
        settings,
        loading,
        updateSettings
    }), [settings, loading, updateSettings]);

    return (
        <SettingsContext.Provider value={value}>
            {!loading && children}
        </SettingsContext.Provider>
    );
};
