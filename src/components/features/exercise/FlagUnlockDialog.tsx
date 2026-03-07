'use client';

import { useState } from 'react';
import { useExerciseStore } from '@/store/exerciseStore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FlagUnlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  toolId: 'multimeter' | 'probes' | 'terminal';
  toolName: string;
}

const FlagUnlockDialog = ({ isOpen, onClose, toolId, toolName }: FlagUnlockDialogProps) => {
  const { validateFlag } = useExerciseStore();
  const [inputFlag, setInputFlag] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const isValid = validateFlag(inputFlag, toolId);
    if (isValid) {
      setInputFlag('');
      setError('');
      onClose();
    } else {
      setError('Incorrect flag. Try again!');
    }
  };

  const handleClose = () => {
    setInputFlag('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unlock {toolName}</DialogTitle>
          <DialogDescription>
            Enter the flag found in the previous steps to unlock this tool.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="flag-input" className="text-sm font-medium text-gray-300">
              Flag:
            </label>
            <input
              id="flag-input"
              type="text"
              value={inputFlag}
              onChange={(e) => {
                setInputFlag(e.target.value);
                setError('');
              }}
              onPaste={(e) => {
                // Supporto esplicito per Ctrl+V
                const pastedText = e.clipboardData.getData('text');
                setInputFlag(pastedText);
                setError('');
                e.preventDefault();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              placeholder="flag{...}"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FlagUnlockDialog;
