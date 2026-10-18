import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { AppTheme } from '../constants/app-colors';

export type ScanItem = {
  id: string;
  data: string;
  date: string;
};

type AppContextData = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => Promise<void>;
  pauseHistory: boolean;
  setPauseHistory: (pause: boolean) => Promise<void>;
  hasSeenOnboarding: boolean | null;
  completeOnboarding: () => Promise<void>;
  history: ScanItem[];
  addScan: (data: string) => Promise<boolean>;
  removeScans: (ids: string[]) => Promise<void>;
  clearHistory: () => Promise<void>;
  isLoaded: boolean;
};

const AppContext = createContext<AppContextData>({} as AppContextData);

const STORAGE_KEYS = {
  THEME: '@theme',
  PAUSE_HISTORY: '@pause_history',
  HAS_SEEN_ONBOARDING: '@has_seen_onboarding',
  HISTORY: '@history',
};

function isScanItem(value: unknown): value is ScanItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ScanItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.data === 'string' &&
    item.data.trim().length > 0 &&
    typeof item.date === 'string' &&
    !Number.isNaN(Date.parse(item.date))
  );
}

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const systemTheme = useColorScheme();
  const [theme, setThemeState] = useState<AppTheme>(systemTheme === 'dark' ? 'dark' : 'light');
  const [pauseHistory, setPauseHistoryState] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState<boolean | null>(null);
  const [history, setHistoryState] = useState<ScanItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [storedTheme, storedPause, storedOnboarding, storedHistory] =
          await AsyncStorage.multiGet([
            STORAGE_KEYS.THEME,
            STORAGE_KEYS.PAUSE_HISTORY,
            STORAGE_KEYS.HAS_SEEN_ONBOARDING,
            STORAGE_KEYS.HISTORY,
          ]);

        const themeValue = storedTheme[1];
        if (themeValue === 'light' || themeValue === 'dark') setThemeState(themeValue);

        const pauseValue = storedPause[1];
        setPauseHistoryState(pauseValue === 'true');
        setHasSeenOnboardingState(storedOnboarding[1] === 'true');

        const historyValue = storedHistory[1];
        if (historyValue) {
          const parsedHistory: unknown = JSON.parse(historyValue);
          if (Array.isArray(parsedHistory)) {
            setHistoryState(parsedHistory.filter(isScanItem));
          }
        }
      } catch (error) {
        console.error('Não foi possível carregar os dados locais.', error);
        setHasSeenOnboardingState(false);
      } finally {
        setIsLoaded(true);
      }
    };

    void loadSettings();
  }, []);

  const setTheme = useCallback(async (newTheme: AppTheme) => {
    setThemeState(newTheme);
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, newTheme);
  }, []);

  const setPauseHistory = useCallback(async (pause: boolean) => {
    setPauseHistoryState(pause);
    await AsyncStorage.setItem(STORAGE_KEYS.PAUSE_HISTORY, JSON.stringify(pause));
  }, []);

  const completeOnboarding = useCallback(async () => {
    setHasSeenOnboardingState(true);
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING, 'true');
  }, []);

  const addScan = useCallback(async (data: string) => {
    const normalizedData = data.trim();
    if (pauseHistory || !normalizedData) return false;

    const newItem: ScanItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      data: normalizedData,
      date: new Date().toISOString(),
    };

    const updatedHistory = [newItem, ...history];
    setHistoryState(updatedHistory);
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
    return true;
  }, [history, pauseHistory]);

  const removeScans = useCallback(async (ids: string[]) => {
    const idsToRemove = new Set(ids);
    const updatedHistory = history.filter((item) => !idsToRemove.has(item.id));
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
    setHistoryState(updatedHistory);
  }, [history]);

  const clearHistory = useCallback(async () => {
    setHistoryState([]);
    await AsyncStorage.removeItem(STORAGE_KEYS.HISTORY);
  }, []);

  const contextValue = useMemo(
    () => ({
      theme,
      setTheme,
      pauseHistory,
      setPauseHistory,
      hasSeenOnboarding,
      completeOnboarding,
      history,
      addScan,
      removeScans,
      clearHistory,
      isLoaded,
    }),
    [
      addScan,
      clearHistory,
      completeOnboarding,
      hasSeenOnboarding,
      history,
      isLoaded,
      pauseHistory,
      removeScans,
      setPauseHistory,
      setTheme,
      theme,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
