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
          const loadedData = result.data as Exercise;
          if (loadedData.steps && Array.isArray(loadedData.steps) && loadedData.steps.length > 0) {
            setConfig(loadedData);
          } else {
            console.warn('Loaded config missing steps structure, using defaults');
            setConfig(defaultData);
          }
        } else {
          setConfig(defaultData);
        }
      } catch (error) {
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
