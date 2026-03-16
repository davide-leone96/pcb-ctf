// src/components/features/exercise/HintButton.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lightbulb, Download, FileIcon } from 'lucide-react';

interface HintButtonProps {
  hintText: string;
  hintFiles?: string[];
}

/** Extracts the original file name from the stored path (strips hint-<timestamp>- prefix). */
function displayName(filePath: string): string {
  const name = filePath.split('/').pop() || filePath;
  return name.replace(/^hint-[a-z0-9]+-/, '');
}

const HintButton = ({ hintText, hintFiles }: HintButtonProps) => {
  const files = hintFiles?.filter(Boolean) || [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Lightbulb className="mr-2 h-4 w-4" />
          Hint
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-yellow-400" />
            Hint
          </DialogTitle>
          <DialogDescription className="pt-4 text-base">
            {hintText}
          </DialogDescription>
        </DialogHeader>

        {files.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-gray-300">Attachments</p>
            <div className="space-y-1.5">
              {files.map(f => (
                <a
                  key={f}
                  href={f}
                  download={displayName(f)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-800/50 hover:bg-gray-700/50 transition-colors group"
                >
                  <FileIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300 truncate flex-1">
                    {displayName(f)}
                  </span>
                  <Download className="h-4 w-4 text-gray-500 group-hover:text-gray-300 transition-colors flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HintButton;
