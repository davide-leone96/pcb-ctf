// src/components/features/exercise/CompletionDialog.tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, PartyPopper, ArrowRight, Copy, Check } from 'lucide-react';
import type { CompletionDialogConfig } from '@/data/exercise';

interface CompletionDialogProps {
  isOpen: boolean;
  flag: string;
  onReset: () => void;
  config?: CompletionDialogConfig;
}

const defaultConfig: CompletionDialogConfig = {
  title: 'Exercise Completed!',
  description: 'Congratulations, you have successfully completed all objectives.',
  redirectUrl: '',
  redirectLabel: 'Next Exercise',
  downloadFilePath: '',
  downloadLabel: 'Download File',
  downloadFileName: '',
  showCopyFlag: true,
};

const CompletionDialog = ({ isOpen, flag, onReset, config }: CompletionDialogProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const c = { ...defaultConfig, ...config };

  const handleDownload = () => {
    if (!c.downloadFilePath) return;
    const a = document.createElement('a');
    a.href = c.downloadFilePath;
    a.download = c.downloadFileName || c.downloadFilePath.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRedirect = () => {
    onReset();
    if (c.redirectUrl) {
      window.location.href = c.redirectUrl;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(flag).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const hasRedirect = !!c.redirectUrl;
  const hasDownload = !!c.downloadFilePath;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onReset(); setIsCopied(false); } }}>
      <DialogContent className="sm:max-w-md bg-gray-800 border-green-500 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <PartyPopper className="mr-3 h-8 w-8 text-yellow-400" />
            {c.title}
          </DialogTitle>
          <DialogDescription className="pt-2 text-gray-400">
            {c.description}
          </DialogDescription>
        </DialogHeader>
        <div className="my-4">
          <p className="text-sm text-gray-300 mb-2">Flag:</p>
          <div className="flex items-center gap-2 bg-black p-3 rounded-md">
            <code className="font-mono text-green-400 text-sm break-all flex-grow">
              {flag}
            </code>
            {c.showCopyFlag && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-8 w-8 flex-shrink-0"
                aria-label="Copy flag"
              >
                {isCopied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        {(hasRedirect || hasDownload) && (
          <DialogFooter className="sm:justify-between gap-2">
            {hasRedirect && (
              <Button type="button" variant="secondary" onClick={handleRedirect}>
                <ArrowRight className="mr-2 h-4 w-4" />
                {c.redirectLabel}
              </Button>
            )}
            {hasDownload && (
              <Button type="button" onClick={handleDownload} className="bg-green-600 hover:bg-green-500">
                <Download className="mr-2 h-4 w-4" />
                {c.downloadLabel}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CompletionDialog;
