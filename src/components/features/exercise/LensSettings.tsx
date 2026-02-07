'use client';

import { useExerciseStore } from '@/store/exerciseStore';

const LensSettings = () => {
  const { lensRadius, lensZoomLevel, lensIsAnchored, setLensRadius, setLensZoomLevel } = useExerciseStore();

  return (
    <div className="w-64 bg-gray-900/95 border border-gray-700 rounded-lg p-4 space-y-4 flex-shrink-0">
      <h3 className="text-sm font-semibold text-white mb-3">Impostazioni Lente</h3>

      <div className="space-y-2">
        <label className="block text-xs text-gray-300">
          Raggio: <span className="text-white font-mono">{lensRadius}px</span>
        </label>
        <input
          type="range"
          min="50"
          max="200"
          step="10"
          value={lensRadius}
          onChange={(e) => setLensRadius(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>50px</span>
          <span>200px</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-gray-300">
          Zoom: <span className="text-white font-mono">{lensZoomLevel.toFixed(1)}x</span>
        </label>
        <input
          type="range"
          min="1.5"
          max="5"
          step="0.5"
          value={lensZoomLevel}
          onChange={(e) => setLensZoomLevel(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>1.5x</span>
          <span>5.0x</span>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-700">
        <div className="text-xs text-gray-400 space-y-1">
          <p>💡 <strong>Click sull'immagine</strong> per ancorare la lente</p>
          <p>🖱️ <strong>Drag & Drop</strong> per spostare lente ancorata</p>
          {lensIsAnchored && (
            <p className="text-green-400 font-semibold">✓ Lente ancorata</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LensSettings;
