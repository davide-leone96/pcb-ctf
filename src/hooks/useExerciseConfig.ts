// src/hooks/useExerciseConfig.ts
'use client';

import { useState, useEffect } from 'react';
import { exerciseData as defaultData } from '@/data/exercise';
import type { Exercise } from '@/data/exercise';

export function useExerciseConfig() {
  const [config, setConfig] = useState<Exercise>(defaultData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch('/api/config/load');
        const result = await response.json();

        if (result.success && result.data) {
          // Usa la configurazione salvata su file
          setConfig(result.data);
        } else {
          // Usa la configurazione di default
          setConfig(defaultData);
        }
      } catch (error) {
        // In caso di errore, usa la configurazione di default
        console.warn('Failed to load config from file, using defaults:', error);
        setConfig(defaultData);
      } finally {
        setIsLoading(false);
      }
    }

    loadConfig();
  }, []);

  return { config, isLoading };
}
