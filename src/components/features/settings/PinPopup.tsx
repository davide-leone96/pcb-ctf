// src/components/features/settings/PinPopup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, type DraftPin, type PinType, type PinShape, type ValueMode } from '@/store/settingsStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Circle, Square } from 'lucide-react';

interface PinPopupProps {
  pin: DraftPin;
  containerDims: { width: number; height: number };
}

const PIN_TYPE_OPTIONS: { value: PinType; label: string }[] = [
  { value: 'custom', label: 'Misura (Custom)' },
  { value: 'tx', label: 'UART TX' },
  { value: 'rx', label: 'UART RX' },
  { value: 'gnd', label: 'GND' },
  { value: 'vcc', label: 'VCC' },
];

const UART_DEFAULTS: Record<string, { voltage: number; resistance: number; label: string }> = {
  tx:  { voltage: 3.3, resistance: 0, label: 'TX (3.3V)' },
  rx:  { voltage: 3.3, resistance: 0, label: 'RX (3.3V)' },
  gnd: { voltage: 0,   resistance: 0, label: 'GND (0V)' },
  vcc: { voltage: 5.0, resistance: 0, label: 'VCC (5V)' },
};

const PinPopup = ({ pin, containerDims }: PinPopupProps) => {
  const { savePin, updatePin, liveUpdatePin, cancelPinEdit } = useSettingsStore();

  const isNew = pin.label === '';

  const [pinType, setPinType] = useState<PinType>(pin.pinType);
  const [label, setLabel] = useState(pin.label);
  const [shape, setShape] = useState<PinShape>(pin.shape);
  const [size, setSize] = useState(pin.size);
  const [voltageMode, setVoltageMode] = useState<ValueMode>(pin.voltageMode);
  const [voltageFixed, setVoltageFixed] = useState(pin.voltageFixed);
  const [voltageMin, setVoltageMin] = useState(pin.voltageMin);
  const [voltageMax, setVoltageMax] = useState(pin.voltageMax);
  const [resistanceMode, setResistanceMode] = useState<ValueMode>(pin.resistanceMode);
  const [resistanceFixed, setResistanceFixed] = useState(pin.resistanceFixed);
  const [resistanceMin, setResistanceMin] = useState(pin.resistanceMin);
  const [resistanceMax, setResistanceMax] = useState(pin.resistanceMax);
  const [description, setDescription] = useState(pin.description);
  const [hint, setHint] = useState(pin.hint);

  useEffect(() => {
    setPinType(pin.pinType);
    setLabel(pin.label);
    setShape(pin.shape);
    setSize(pin.size);
    setVoltageMode(pin.voltageMode);
    setVoltageFixed(pin.voltageFixed);
    setVoltageMin(pin.voltageMin);
    setVoltageMax(pin.voltageMax);
    setResistanceMode(pin.resistanceMode);
    setResistanceFixed(pin.resistanceFixed);
    setResistanceMin(pin.resistanceMin);
    setResistanceMax(pin.resistanceMax);
    setDescription(pin.description);
    setHint(pin.hint);
  }, [pin]);

  const isUart = pinType !== 'custom';

  const handleTypeChange = (newType: PinType) => {
    setPinType(newType);
    if (newType !== 'custom') {
      const defaults = UART_DEFAULTS[newType];
      if (defaults) {
        setLabel(defaults.label);
        setVoltageMode('fixed');
        setVoltageFixed(defaults.voltage);
        setResistanceMode('fixed');
        setResistanceFixed(defaults.resistance);
      }
    }
  };

  const handleReset = () => {
    setPinType('custom');
    setLabel('');
    setShape('circle');
    setSize(2);
    setVoltageMode('fixed');
    setVoltageFixed(0);
    setVoltageMin(0);
    setVoltageMax(5);
    setResistanceMode('fixed');
    setResistanceFixed(0);
    setResistanceMin(10);
    setResistanceMax(1000);
    setDescription('');
    setHint('');
  };

  const handleConfirm = () => {
    const data = {
      pinType,
      label: label || (isUart ? UART_DEFAULTS[pinType]?.label ?? pinType.toUpperCase() : 'Pin'),
      shape,
      size,
      voltageMode,
      voltageFixed,
      voltageMin,
      voltageMax,
      resistanceMode,
      resistanceFixed,
      resistanceMin,
      resistanceMax,
      description,
      hint,
    };
    if (isNew) {
      savePin(data);
    } else {
      updatePin(pin.id, data);
    }
  };

  // Position popup: keep inside image bounds with scrollbar if needed
  const popupWidth = 340;
  const popupMaxHeight = Math.min(500, containerDims.height - 16);

  const pinPxX = (pin.coords[0] / 100) * containerDims.width;
  const pinPxY = (pin.coords[1] / 100) * containerDims.height;
  const spaceRight = containerDims.width - pinPxX;

  let posX: number;
  if (spaceRight >= popupWidth + 40) {
    // Prefer right side
    posX = Math.min(pinPxX + 24, containerDims.width - popupWidth - 8);
  } else if (pinPxX >= popupWidth + 40) {
    // Try left side
    posX = Math.max(8, pinPxX - popupWidth - 24);
  } else {
    // Center it, ensuring it stays within bounds
    posX = Math.max(8, Math.min((containerDims.width - popupWidth) / 2, containerDims.width - popupWidth - 8));
  }

  // Vertical positioning: keep within container bounds
  const posY = Math.max(8, Math.min(pinPxY - 20, containerDims.height - popupMaxHeight - 8));

  const inputCls = "w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors";
  const labelCls = "block text-xs text-gray-400 mb-1";

  return (
    <div
      className="absolute bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-lg p-4 text-white shadow-2xl ring-1 ring-white/10 z-40 pointer-events-auto overflow-y-auto"
      style={{ left: posX, top: posY, width: popupWidth, maxHeight: popupMaxHeight }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Coordinates badge */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
        <span className="text-xs font-mono text-gray-400">
          [{pin.coords[0].toFixed(1)}, {pin.coords[1].toFixed(1)}]%
        </span>
        <span className="text-xs text-gray-500">size: {size.toFixed(1)}%</span>
      </div>

      {/* Pin type */}
      <div className="mb-3">
        <label className={labelCls}>Tipo pin</label>
        <select
          value={pinType}
          onChange={(e) => handleTypeChange(e.target.value as PinType)}
          className={cn(inputCls, 'cursor-pointer')}
        >
          {PIN_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Label */}
      <div className="mb-3">
        <label className={labelCls}>Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={isUart ? UART_DEFAULTS[pinType]?.label : 'es. R69, C48...'}
          className={inputCls}
          autoFocus
        />
      </div>

      {/* Shape toggle */}
      <div className="mb-3">
        <label className={labelCls}>Forma</label>
        <div className="flex gap-2">
          <button
            onClick={() => setShape('circle')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors',
              shape === 'circle' ? 'bg-blue-600/50 text-white' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
            )}
          >
            <Circle className="h-3.5 w-3.5" /> Cerchio
          </button>
          <button
            onClick={() => setShape('square')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors',
              shape === 'square' ? 'bg-blue-600/50 text-white' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
            )}
          >
            <Square className="h-3.5 w-3.5" /> Quadrato
          </button>
        </div>
      </div>

      {/* Size slider */}
      <div className="mb-3">
        <label className={labelCls}>Dimensione: {size.toFixed(1)}%</label>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.1"
          value={size}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setSize(v);
            liveUpdatePin(pin.id, { size: v });
          }}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Voltage & Resistance — hidden for UART types */}
      {!isUart && (
        <>
          {/* Voltage */}
          <div className="mb-3">
            <label className={labelCls}>Tensione (V)</label>
            <div className="flex gap-2 mb-1.5">
              <button
                onClick={() => setVoltageMode('fixed')}
                className={cn('px-2 py-1 rounded text-xs transition-colors', voltageMode === 'fixed' ? 'bg-blue-600/50 text-white' : 'bg-gray-700/50 text-gray-400')}
              >
                Fisso
              </button>
              <button
                onClick={() => setVoltageMode('range')}
                className={cn('px-2 py-1 rounded text-xs transition-colors', voltageMode === 'range' ? 'bg-blue-600/50 text-white' : 'bg-gray-700/50 text-gray-400')}
              >
                Range
              </button>
            </div>
            {voltageMode === 'fixed' ? (
              <input type="number" step="0.1" value={voltageFixed} onChange={(e) => setVoltageFixed(parseFloat(e.target.value) || 0)} className={inputCls} />
            ) : (
              <div className="flex gap-2">
                <input type="number" step="0.1" value={voltageMin} onChange={(e) => setVoltageMin(parseFloat(e.target.value) || 0)} placeholder="Min" className={inputCls} />
                <input type="number" step="0.1" value={voltageMax} onChange={(e) => setVoltageMax(parseFloat(e.target.value) || 0)} placeholder="Max" className={inputCls} />
              </div>
            )}
          </div>

          {/* Resistance */}
          <div className="mb-3">
            <label className={labelCls}>Resistenza (Ohm)</label>
            <div className="flex gap-2 mb-1.5">
              <button
                onClick={() => setResistanceMode('fixed')}
                className={cn('px-2 py-1 rounded text-xs transition-colors', resistanceMode === 'fixed' ? 'bg-blue-600/50 text-white' : 'bg-gray-700/50 text-gray-400')}
              >
                Fisso
              </button>
              <button
                onClick={() => setResistanceMode('range')}
                className={cn('px-2 py-1 rounded text-xs transition-colors', resistanceMode === 'range' ? 'bg-blue-600/50 text-white' : 'bg-gray-700/50 text-gray-400')}
              >
                Range
              </button>
            </div>
            {resistanceMode === 'fixed' ? (
              <input type="number" step="1" value={resistanceFixed} onChange={(e) => setResistanceFixed(parseFloat(e.target.value) || 0)} className={inputCls} />
            ) : (
              <div className="flex gap-2">
                <input type="number" step="1" value={resistanceMin} onChange={(e) => setResistanceMin(parseFloat(e.target.value) || 0)} placeholder="Min" className={inputCls} />
                <input type="number" step="1" value={resistanceMax} onChange={(e) => setResistanceMax(parseFloat(e.target.value) || 0)} placeholder="Max" className={inputCls} />
              </div>
            )}
          </div>
        </>
      )}

      {/* Description */}
      <div className="mb-3">
        <label className={labelCls}>Descrizione</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrizione del pin..."
          rows={2}
          className={cn(inputCls, 'resize-none')}
        />
      </div>

      {/* Hint */}
      <div className="mb-4">
        <label className={labelCls}>Hint</label>
        <input
          type="text"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Suggerimento..."
          className={inputCls}
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={handleReset} className="text-gray-400 border-gray-600 hover:text-white hover:bg-gray-700">
          Reset
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={cancelPinEdit} className="text-gray-400 hover:text-white">
            Annulla
          </Button>
          <Button size="sm" onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">
            OK
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PinPopup;
