// src/components/features/exercise/FlagDisplay.tsx

'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface FlagDisplayProps {
  flag: string;
}

const FlagDisplay = ({ flag }: FlagDisplayProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(flag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy flag:', err);
    }
  };

  return (
    <div
      onClick={handleCopy}
      className="flex items-center justify-between rounded-lg bg-black p-4 font-mono text-sm text-green-400 h-full cursor-pointer hover:bg-gray-950 transition-colors group relative"
      title="Click per copiare la flag"
    >
      <p className="break-all flex-1">
        <span className="text-gray-500">{'> '}</span>
        {flag}
      </p>
      <div className="ml-3 flex-shrink-0">
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-gray-500 group-hover:text-green-400 transition-colors" />
        )}
      </div>
      {copied && (
        <div className="absolute -top-8 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-lg">
          Copiato!
        </div>
      )}
    </div>
  );
};

export default FlagDisplay;
