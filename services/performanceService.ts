import { PerformanceRecord } from '../types';
import { getCurrentUser } from './authService';

const getStorageKey = (): string | null => {
    const user = getCurrentUser();
    return user ? `drut-performance-history-${user.email}` : null;
};

export const getPerformanceHistory = (): PerformanceRecord[] => {
  try {
    const key = getStorageKey();
    if (typeof window !== 'undefined' && key) {
        const historyJson = localStorage.getItem(key);
        return historyJson ? JSON.parse(historyJson) : [];
    }
    return [];
  } 
  // Fix: Explicitly type the error variable to resolve a potential scope resolution issue.
  catch (error: any) {
    console.error("Failed to parse performance history:", error);
    return [];
  }
};

export const savePerformanceRecord = (record: Omit<PerformanceRecord, 'id' | 'timestamp'>) => {
  const key = getStorageKey();
  if (!key) return;
  
  const history = getPerformanceHistory();
  const newRecord: PerformanceRecord = {
    ...record,
    id: `${Date.now()}-${record.questionText}`,
    timestamp: Date.now(),
  };

  const alreadyExists = history.some(r => r.id === newRecord.id);
  if (alreadyExists) return; // Prevent duplicates if user somehow re-answers

  history.push(newRecord);
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(history));
  }
};

export const clearPerformanceHistory = (): void => {
  const key = getStorageKey();
  if (typeof window !== 'undefined' && key) {
    localStorage.removeItem(key);
  }
};