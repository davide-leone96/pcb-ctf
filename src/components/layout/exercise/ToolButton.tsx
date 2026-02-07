// src/components/features/exercise/ToolButton.tsx

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// VERIFICA CHE QUESTA INTERFACCIA SIA ESATTAMENTE COSÌ
interface ToolButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  isActive: boolean;
}

const ToolButton = ({ label, icon: Icon, isActive, onClick }: ToolButtonProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg text-gray-400 transition-all',
              'hover:bg-gray-600 hover:text-white',
              isActive ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-800 scale-105' : 'bg-gray-700'
            )}
          >
            <Icon className="h-6 w-6" />
            <span className="sr-only">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ToolButton;