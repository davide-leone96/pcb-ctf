'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';

interface StepCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onValidate: (flag: string) => boolean;
  currentStepNumber: number;
}

const StepCompletionDialog = ({
  isOpen,
  onClose,
  onValidate,
  currentStepNumber,
}: StepCompletionDialogProps) => {
  const [inputFlag, setInputFlag] = useState('');
  const [validationMessage, setValidationMessage] = useState<{
    type: 'success' | 'error' | null;
    text: string;
  }>({ type: null, text: '' });

  const handleValidate = () => {
    const isValid = onValidate(inputFlag.trim());

    if (isValid) {
      setValidationMessage({
        type: 'success',
        text: 'Flag corretta! Passaggio allo step successivo...',
      });
      setTimeout(() => {
        setInputFlag('');
        setValidationMessage({ type: null, text: '' });
        onClose();
      }, 1500);
    } else {
      setValidationMessage({
        type: 'error',
        text: 'Flag errata. Riprova.',
      });
    }
  };

  const handleClose = () => {
    setInputFlag('');
    setValidationMessage({ type: null, text: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 text-white border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-yellow-400 text-xl">
            Completa Step {currentStepNumber}
          </DialogTitle>
          <DialogDescription className="text-gray-400 mt-2">
            Inserisci la flag che hai raccolto per sbloccare lo step successivo.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="flag-input" className="block text-sm font-medium text-gray-300 mb-2">
              Flag
            </label>
            <input
              id="flag-input"
              type="text"
              value={inputFlag}
              onChange={(e) => setInputFlag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
              placeholder="flag{...}"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              autoFocus
            />
          </div>

          {validationMessage.type && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                validationMessage.type === 'success'
                  ? 'bg-green-900/30 border border-green-700 text-green-400'
                  : 'bg-red-900/30 border border-red-700 text-red-400'
              }`}
            >
              {validationMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span className="text-sm">{validationMessage.text}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleValidate}
              disabled={!inputFlag.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Valida
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Annulla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StepCompletionDialog;
