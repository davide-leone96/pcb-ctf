// src/components/features/settings/PinPopup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, type DraftPin, type ValueMode, type PinType } from '@/store/settingsStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PIN_TYPE_OPTIONS: { value: PinType; label: string; group: string; color: string }[] = [
  { value: 'custom', label: 'Custom', group: 'General', color: '#60A5FA' },
  { value: 'tx', label: 'TX', group: 'UART', color: '#4ADE80' },
  { value: 'rx', label: 'RX', group: 'UART', color: '#FB923C' },
  { value: 'gnd', label: 'GND', group: 'Common', color: '#6B7280' },
  { value: 'vcc', label: 'VCC', group: 'Common', color: '#EF4444' },
  { value: 'cs', label: 'CS', group: 'SPI', color: '#A855F7' },
  { value: 'clk', label: 'CLK', group: 'SPI', color: '#3B82F6' },
  { value: 'mosi', label: 'MOSI', group: 'SPI', color: '#22C55E' },
  { value: 'miso', label: 'MISO', group: 'SPI', color: '#FACC15' },
];

interface PinPopupProps {
  pin: DraftPin;
  containerDims: { width: number; height: number };
}

const PinPopup = ({ pin, containerDims }: PinPopupProps) => {
  const { savePin, updatePin, liveUpdatePin, cancelPinEdit } = useSettingsStore();

  const isNew = pin.label === '';

  const [pinType, setPinType] = useState<PinType>(pin.pinType);
  const [label, setLabel] = useState(pin.label);
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

  const handleReset = () => {
    setPinType('custom');
    setLabel('');
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
      label: label || (pinType === 'custom' ? 'Pin' : pinType.toUpperCase()),
      shape: pin.shape,
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

      {/* Pin Type */}
      <div className="mb-3">
        <label className={labelCls}>Type</label>
        <div className="flex flex-wrap gap-1">
          {PIN_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setPinType(opt.value);
                if (!label || PIN_TYPE_OPTIONS.some(o => o.label === label)) {
                  setLabel(opt.value === 'custom' ? '' : opt.label);
                }
              }}
              className={cn(
                'px-2 py-1 rounded text-xs font-mono transition-colors border',
                pinType === opt.value
                  ? 'border-white/30 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              )}
              style={{
                backgroundColor: pinType === opt.value ? `${opt.color}33` : undefined,
                color: pinType === opt.value ? opt.color : undefined,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Label */}
      <div className="mb-3">
        <label className={labelCls}>Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. R69, C48..."
          className={inputCls}
          autoFocus
        />
      </div>

      {/* Size slider */}
      <div className="mb-3">
        <label className={labelCls}>Size: {size.toFixed(1)}%</label>
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

      {/* Voltage */}
      <div className="mb-3">
        <label className={labelCls}>Voltage (V)</label>
        <div className="flex gap-2 mb-1.5">
          <button
            onClick={() => setVoltageMode('fixed')}
            className={cn('px-2 py-1 rounded text-xs transition-colors', voltageMode === 'fixed' ? 'bg-blue-600/50 text-white' : 'bg-gray-700/50 text-gray-400')}
          >
            Fixed
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
        <label className={labelCls}>Resistance (Ohm)</label>
        <div className="flex gap-2 mb-1.5">
          <button
            onClick={() => setResistanceMode('fixed')}
            className={cn('px-2 py-1 rounded text-xs transition-colors', resistanceMode === 'fixed' ? 'bg-blue-600/50 text-white' : 'bg-gray-700/50 text-gray-400')}
          >
            Fixed
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

      {/* Description */}
      <div className="mb-3">
        <label className={labelCls}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Pin description..."
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
          placeholder="Hint..."
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
            Cancel
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
