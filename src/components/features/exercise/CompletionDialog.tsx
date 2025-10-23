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
import { Download, PartyPopper, RotateCcw, Copy, Check } from 'lucide-react';

interface CompletionDialogProps {
  isOpen: boolean;
  flag: string;
  onReset: () => void;
}

const CompletionDialog = ({ isOpen, flag, onReset }: CompletionDialogProps) => {
  // --- NUOVO: Stato per il feedback del pulsante "Copia" ---
  const [isCopied, setIsCopied] = useState(false);

  const handleDownload = () => {
    // 1. Specifica il percorso del tuo file custom nella cartella `public`.
    const customFilePath = '/downloads/custom-file.txt'; // <-- MODIFICA QUI IL NOME DEL FILE

    // 2. Crea un elemento link <a> invisibile.
    const a = document.createElement('a');
    a.href = customFilePath;
    a.download = 'challenge-completed.txt'; // <-- MODIFICA QUI IL NOME DEL FILE SCARICATO
    
    // 3. Aggiungi il link, cliccalo, e rimuovilo.
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRestart = () => {
    // --- Funzione per il redirect ---
    // Prima resetta lo stato dell'esercizio per non tornare alla dialog
    onReset();
    // Poi reindirizza l'utente.
    // MODIFICA QUESTO URL con la tua destinazione.
    window.location.href = 'https://www.google.com'; // <-- MODIFICA QUI L'URL DI REDIRECT
  };

  const handleCopy = () => {
    // --- Funzione per copiare la flag ---
    navigator.clipboard.writeText(flag).then(() => {
      setIsCopied(true);
      // Resetta l'icona dopo 2 secondi
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    });
  };

  return (
    // Quando la dialog viene chiusa, resetta anche lo stato 'isCopied'
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onReset(); setIsCopied(false); } }}>
      <DialogContent className="sm:max-w-md bg-gray-800 border-green-500 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <PartyPopper className="mr-3 h-8 w-8 text-yellow-400" />
            Esercizio Completato!
          </DialogTitle>
          <DialogDescription className="pt-2 text-gray-400">
            Congratulazioni, hai identificato e analizzato con successo tutti i componenti.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4">
          <p className="text-sm text-gray-300 mb-2">La tua flag sbloccata è:</p>
          <div className="flex items-center gap-2 bg-black p-3 rounded-md">
            <code className="font-mono text-green-400 text-sm break-all flex-grow">
              {flag}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8 flex-shrink-0"
              aria-label="Copia flag"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <DialogFooter className="sm:justify-between gap-2">
          <Button type="button" variant="secondary" onClick={handleRestart}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Prossimo Esercizio
          </Button>
          <Button type="button" onClick={handleDownload} className="bg-green-600 hover:bg-green-500">
            <Download className="mr-2 h-4 w-4" />
            Scarica File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompletionDialog;