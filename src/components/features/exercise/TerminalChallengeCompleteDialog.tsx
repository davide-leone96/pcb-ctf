'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download, ArrowRight } from 'lucide-react';
import type { CompletionDialogConfig } from '@/data/exercise';

interface TerminalChallengeCompleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  flag: string;
  config?: CompletionDialogConfig;
}

const defaultConfig: CompletionDialogConfig = {
  title: 'Challenge Completed!',
  description: 'You have discovered all flag parts by analyzing the embedded system.',
  redirectUrl: '',
  redirectLabel: 'Next Challenge',
  downloadFilePath: '',
  downloadLabel: 'Download Report',
  downloadFileName: '',
  showCopyFlag: true,
};

const TerminalChallengeCompleteDialog = ({
  isOpen,
  onClose,
  flag,
  config,
}: TerminalChallengeCompleteDialogProps) => {
  const [copied, setCopied] = useState(false);
  const c = { ...defaultConfig, ...config };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(flag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy flag:', err);
    }
  };

  const handleRedirect = () => {
    if (c.redirectUrl) {
      window.location.href = c.redirectUrl;
    }
  };

  const handleDownload = () => {
    if (!c.downloadFilePath) return;
    const link = document.createElement('a');
    link.href = c.downloadFilePath;
    link.download = c.downloadFileName || c.downloadFilePath.split('/').pop() || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasRedirect = !!c.redirectUrl;
  const hasDownload = !!c.downloadFilePath;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl text-green-400">{c.title}</DialogTitle>
          <DialogDescription>
            {c.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Flag Display */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Flag:
            </label>
            <div
              onClick={c.showCopyFlag ? handleCopy : undefined}
              className={`flex items-center justify-between rounded-lg bg-black p-4 font-mono text-sm text-green-400 transition-colors group relative border border-green-500/30 ${c.showCopyFlag ? 'cursor-pointer hover:bg-gray-950' : ''}`}
            >
              <p className="break-all flex-1">
                <span className="text-gray-500">{'> '}</span>
                {flag}
              </p>
              {c.showCopyFlag && (
                <div className="ml-3 flex-shrink-0">
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500 group-hover:text-green-400 transition-colors" />
                  )}
                </div>
              )}
              {copied && (
                <div className="absolute -top-8 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-lg">
                  Copied!
                </div>
              )}
            </div>
          </div>
        </div>

        {(hasRedirect || hasDownload) && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {hasDownload && (
              <Button
                variant="outline"
                onClick={handleDownload}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                {c.downloadLabel}
              </Button>
            )}
            {hasRedirect && (
              <Button
                onClick={handleRedirect}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              >
                {c.redirectLabel}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TerminalChallengeCompleteDialog;
