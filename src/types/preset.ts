// src/types/preset.ts

import type { Exercise } from '@/data/exercise';
import type { TerminalConfig } from '@/types/terminal-config';

export interface PresetMetadata {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Preset {
  metadata: PresetMetadata;
  exerciseConfig: Exercise;
  terminalConfig: TerminalConfig;
}

export interface PresetListItem {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
