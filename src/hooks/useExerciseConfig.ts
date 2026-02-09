// src/hooks/useExerciseConfig.ts
'use client';

import { useState, useEffect } from 'react';
import { exerciseData as defaultData } from '@/data/exercise';
import type { Exercise } from '@/data/exercise';

/**
 * Unisce la configurazione caricata (che contiene solo Step 1 dal /settings)
 * con gli step di default 2 e 3 (UART + Terminal) che sono sempre uguali.
 */
function mergeWithDefaultSteps(loaded: Exercise): Exercise {
  const defaultSteps = defaultData.steps || [];

  // Trova step di default per tipo (UART = step-2, Terminal = step-3)
  const defaultUartStep = defaultSteps.find(s => s.id === 'step-2');
  const defaultTerminalStep = defaultSteps.find(s => s.id === 'step-3');

  const loadedSteps = loaded.steps || [];

  // Controlla se mancano Step 2 e Step 3
  const hasStep2 = loadedSteps.some(s => s.id === 'step-2');
  const hasStep3 = loadedSteps.some(s => s.id === 'step-3');

  const mergedSteps = [...loadedSteps];
  if (!hasStep2 && defaultUartStep) mergedSteps.push(defaultUartStep);
  if (!hasStep3 && defaultTerminalStep) mergedSteps.push(defaultTerminalStep);

  return { ...loaded, steps: mergedSteps };
}

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
            setConfig(mergeWithDefaultSteps(loadedData));
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
