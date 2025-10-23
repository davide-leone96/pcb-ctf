// src/components/features/exercise/Terminal.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useExerciseStore } from '@/store/exerciseStore';
import { X, Terminal as TerminalIcon } from 'lucide-react';

// --- NUOVO: Simulazione di un semplice file system ---
const fileSystem = {
  '/': ['home', 'logs', 'system'],
  '/home': ['user'],
  '/home/user': ['documents', 'secret.txt'],
  '/logs': ['access.log', 'error.log'],
  '/system': ['firmware.bin'],
};

// Definiamo i tipi per la cronologia
type HistoryLine =
  | { type: 'output'; content: string }
  | { type: 'input'; path: string; content: string }; // Il path viene salvato con l'input

const Terminal = () => {
  const { setActiveTool } = useExerciseStore();
  const [history, setHistory] = useState<HistoryLine[]>([
    { type: 'output', content: 'ARTIC Web Platform Shell v1.0' },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  
  // --- NUOVO: Stato per la directory e l'utente corrente ---
  const [currentUser] = useState('user');
  const [currentPath, setCurrentPath] = useState('/home/user');
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll automatico e focus
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    inputRef.current?.focus();
  }, [history]);
  
  // Gestore principale dei comandi
  const handleCommandSubmit = (command: string) => {
    const trimmedCommand = command.trim();
    const [cmd, ...args] = trimmedCommand.toLowerCase().split(' ');

    const newHistory: HistoryLine[] = [...history, { type: 'input', path: currentPath, content: trimmedCommand }];
    
    // --- GESTIONE DEI COMANDI CHE MODIFICANO LO STATO ---
    if (cmd === 'clear') {
      setHistory([]);
      setCurrentInput('');
      return;
    }
    
    if (cmd === 'cd') {
      const targetDir = args[0] || '/home/user';
      let newPath = '';

      if (targetDir === '..') {
        newPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
      } else if (targetDir.startsWith('/')) {
        newPath = targetDir;
      } else {
        newPath = `${currentPath === '/' ? '' : currentPath}/${targetDir}`;
      }

      // @ts-expect-error - Controlliamo se la directory esiste
      if (fileSystem[newPath]) {
        setCurrentPath(newPath);
        setHistory(newHistory); // Aggiunge solo l'input, senza output
      } else {
        setHistory([...newHistory, { type: 'output', content: `cd: no such file or directory: ${targetDir}` }]);
      }
      setCurrentInput('');
      return;
    }
    
    // --- GESTIONE DEI COMANDI CHE PRODUCONO OUTPUT ---
    const response = getSimulatedResponse(trimmedCommand, currentPath, currentUser);
    
    if (response) {
      setHistory([...newHistory, { type: 'output', content: response }]);
    } else {
      setHistory(newHistory); // Aggiunge solo l'input se non c'è risposta
    }
    
    setCurrentInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommandSubmit(currentInput);
    }
  };

  // Componente per il prompt, ora dinamico
  const Prompt = ({ path }: { path: string }) => {
    const displayPath = path.replace('/home/user', '~');
    return (
      <span className="flex-shrink-0">
        <span className="text-green-400">{currentUser}@artic-shell</span>
        <span className="text-gray-500">:</span>
        <span className="text-blue-400">{displayPath}</span>
        <span className="text-gray-500">$ </span>
      </span>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-1/3 bg-black/80 backdrop-blur-sm z-40 text-white font-mono text-sm p-2 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
      {/* Header */}
      <div className="flex items-center bg-gray-800/50 p-2 rounded-t-md select-none flex-shrink-0">
        <TerminalIcon className="h-4 w-4 mr-2 text-gray-400" />
        <span className="flex-grow text-gray-300">{currentUser}@artic-shell</span>
        <button onClick={() => setActiveTool('pointer')} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
      </div>

      {/* Corpo del Terminale */}
      <div className="flex-grow p-2 overflow-y-auto cursor-text" onClick={() => inputRef.current?.focus()}>
        {history.map((line, index) => (
          <div key={index}>
            {line.type === 'input' ? (
              <div className="flex">
                <Prompt path={line.path} />
                <span>{line.content}</span>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{line.content}</p>
            )}
          </div>
        ))}

        <div className="flex">
          <Prompt path={currentPath} />
          {/* FIX: L'input ora ha un margine sinistro per lo spazio */}
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-none text-white w-full focus:outline-none focus:ring-0 p-0 ml-1"
            autoComplete="off"
            autoFocus
          />
        </div>
        
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};

// Funzione helper per le risposte, ora accetta il path corrente
const getSimulatedResponse = (command: string, path: string, user: string): string => {
  const [cmd, ...args] = command.toLowerCase().trim().split(' ');
  switch (cmd) {
    case 'help':
      return 'Comandi disponibili:\n  ls, cd, sudo, whoami, info, clear, help';
    case 'info':
      return 'Device Firmware v1.2.3 - ARTIC Secure Chipset\nStatus: IDLE';
    case 'whoami':
      return user;
    case 'ls':
      // @ts-expect-error - Recuperiamo il contenuto della directory
      const content = fileSystem[path] || [];
      return content.join('   ');
    case 'sudo':
      return `[sudo] password for ${user}:`; // Simula la richiesta di password
    case '':
      return '';
    default:
      return `sh: command not found: ${command}`;
  }
};

export default Terminal;