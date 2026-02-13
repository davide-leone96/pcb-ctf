// src/components/features/settings/CanvasToolbar.tsx
'use client';

import { useRef, useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';
import {
  Upload, Trash2, ZoomIn, ZoomOut, Crosshair,
  RotateCw, RotateCcw, RefreshCw, Save, Check,
} from 'lucide-react';

const CanvasToolbar = () => {
  const {
    canvasZoom, canvasRotation, pcbImagePath, canvasPanMode, canvasPanX, canvasPanY,
    zoomIn, zoomOut,
    setCanvasRotation, rotateBy,
    togglePanMode, resetCanvasTransform,
    uploadImage, deleteImage, applyImageTransformations,
  } = useSettingsStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const result = await uploadImage(file);
    if (!result.success) {
      console.error('Upload failed:', result.error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleApplyTransformations = async () => {
    setIsSaving(true);
    const result = await applyImageTransformations();
    setIsSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert(`Errore: ${result.error}`);
    }
  };

  const isDefaultImage = pcbImagePath === '/images/pcb_v2.jpg';
  const displayAngle = (((canvasRotation % 360) + 360) % 360);
  const hasTransformations = canvasZoom !== 1 || canvasRotation !== 0 || canvasPanX !== 0 || canvasPanY !== 0;

  return (
    <div className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-2 py-1.5 mb-2 flex-wrap">
      {/* Upload zone */}
      <div
        className={cn(
          'flex items-center border border-dashed rounded px-1.5 py-0.5 transition-colors',
          isDragOver ? 'border-blue-400 bg-blue-500/10' : 'border-gray-600',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 text-xs text-gray-300 hover:text-white transition-colors px-1 py-0.5"
          title="Carica immagine PCB"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Immagine</span>
        </button>
      </div>

      {/* Delete */}
      <button
        onClick={deleteImage}
        disabled={isDefaultImage}
        className={cn(
          'p-1 rounded transition-colors',
          isDefaultImage ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-red-400',
        )}
        title="Elimina immagine e ripristina default"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <div className="w-px h-5 bg-gray-700" />

      {/* Zoom */}
      <button onClick={zoomOut} className="p-1 text-gray-300 hover:text-white transition-colors" title="Zoom out">
        <ZoomOut className="h-3.5 w-3.5" />
      </button>
      <span className="text-[11px] text-gray-400 min-w-[36px] text-center font-mono select-none">
        {Math.round(canvasZoom * 100)}%
      </span>
      <button onClick={zoomIn} className="p-1 text-gray-300 hover:text-white transition-colors" title="Zoom in">
        <ZoomIn className="h-3.5 w-3.5" />
      </button>

      {/* Pan mode toggle */}
      <button
        onClick={togglePanMode}
        className={cn(
          'p-1 rounded transition-colors',
          canvasPanMode ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white',
        )}
        title={canvasPanMode ? 'Disattiva trascinamento' : 'Trascina per posizionare'}
      >
        <Crosshair className="h-3.5 w-3.5" />
      </button>

      <div className="w-px h-5 bg-gray-700" />

      {/* Rotation */}
      <button onClick={() => rotateBy(-90)} className="p-1 text-gray-300 hover:text-white transition-colors" title="Ruota -90°">
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => rotateBy(-1)}
        className="px-1 py-0.5 text-[10px] font-mono text-gray-400 hover:text-white transition-colors"
        title="Ruota -1°"
      >
        -1°
      </button>
      <input
        type="range"
        min="0" max="360" step="1"
        value={Math.round(displayAngle)}
        onChange={(e) => setCanvasRotation(parseFloat(e.target.value))}
        className="w-16 accent-blue-500 h-1"
        title={`${displayAngle.toFixed(1)}°`}
      />
      <span className="text-[10px] text-gray-400 min-w-[28px] text-center font-mono select-none">
        {Math.round(displayAngle)}°
      </span>
      <button
        onClick={() => rotateBy(1)}
        className="px-1 py-0.5 text-[10px] font-mono text-gray-400 hover:text-white transition-colors"
        title="Ruota +1°"
      >
        +1°
      </button>
      <button onClick={() => rotateBy(90)} className="p-1 text-gray-300 hover:text-white transition-colors" title="Ruota +90°">
        <RotateCw className="h-3.5 w-3.5" />
      </button>

      <div className="w-px h-5 bg-gray-700" />

      {/* Reset */}
      <button onClick={resetCanvasTransform} className="p-1 text-gray-400 hover:text-white transition-colors" title="Reset trasformazioni">
        <RefreshCw className="h-3.5 w-3.5" />
      </button>

      {/* Apply transformations */}
      <button
        onClick={handleApplyTransformations}
        disabled={!hasTransformations || isSaving}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
          hasTransformations && !isSaving
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        )}
        title="Salva le trasformazioni in modo permanente"
      >
        {isSaving ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Salvataggio...</span>
          </>
        ) : saved ? (
          <>
            <Check className="h-3.5 w-3.5" />
            <span>Salvato!</span>
          </>
        ) : (
          <>
            <Save className="h-3.5 w-3.5" />
            <span>Salva trasformazioni</span>
          </>
        )}
      </button>
    </div>
  );
};

export default CanvasToolbar;
