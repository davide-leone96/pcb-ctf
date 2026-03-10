// src/components/features/exercise/LensContentLayer.tsx
'use client';

import React, { useMemo } from 'react';
import type { AdapterPin, UartConnection, FirmwareDumpConnection, Tool } from '@/store/exerciseStore';
import { WIRE_COLORS } from './UartProbesAdapter';
import { SPI_WIRE_COLORS } from './FirmwareDumper';
import type { SpiRole } from '@/data/exercise';
import {
  type LensViewport,
  type Point,
  isPointInLens,
  isBezierCurveIntersectingLens,
  transformToLensSpace,
  transformSVGPath,
  extractPathPoints,
} from '@/lib/lensUtils';

interface LensContentLayerProps {
  lensViewport: LensViewport;
  containerDims: { width: number; height: number };

  // Tool attivo
  activeTool: Tool;

  // Multimetro
  probe1Pos: Point | null;
  probe2Pos: Point | null;
  activeProbePos: Point | null;
  wireOrigin1: Point | null;
  wireOrigin2: Point | null;
  activeProbe: 'first' | 'second' | null;
  snapTargetPos: Point | null;

  // UART
  uartConnections: UartConnection[];
  activeAdapterPin: AdapterPin | null;
  activeUartProbePos: Point | null;
  adapterPosition: Point | null;
  uartSnapTargetPos: Point | null;

  // Firmware dump
  firmwareDumpConnections?: FirmwareDumpConnection[];
  activeFirmwareProbeId?: string | null;
  firmwareDumpSnapTargetPos?: Point | null;
  dumperPosition?: Point | null;
  firmwareDumpProbes?: Array<{ id: string; role: SpiRole; color: string }>;
  getFirmwareDumpWireOrigin?: (probeId: string) => Point | null;

  // Funzioni helper
  getCurvePath: (
    start: { x: number; y: number } | null,
    end: { x: number; y: number } | null
  ) => string;
  getUartWireOrigin: (adapterPin: AdapterPin) => Point | null;
  getPinPosition: (pinId: string) => Point | null;
}

type VisibleElement =
  | {
      type: 'wire';
      color: string;
      pathD: string;
      strokeWidth: number;
    }
  | {
      type: 'ball';
      color: string;
      position: Point;
      size: number;
    }
  | {
      type: 'snap-indicator';
      color: string;
      position: Point;
      size: number;
    };

const LensContentLayer: React.FC<LensContentLayerProps> = ({
  lensViewport,
  activeTool,
  probe1Pos,
  probe2Pos,
  activeProbePos,
  wireOrigin1,
  wireOrigin2,
  activeProbe,
  snapTargetPos,
  uartConnections,
  activeAdapterPin,
  activeUartProbePos,
  adapterPosition,
  uartSnapTargetPos,
  firmwareDumpConnections,
  activeFirmwareProbeId,
  firmwareDumpSnapTargetPos,
  dumperPosition,
  firmwareDumpProbes,
  getFirmwareDumpWireOrigin,
  getCurvePath,
  getUartWireOrigin,
  getPinPosition,
}) => {
  // Filtra e identifica elementi visibili nella lente
  const visibleElements = useMemo(() => {
    const elements: VisibleElement[] = [];

    // === MULTIMETRO ===
    if (activeTool === 'multimeter') {
      // Cavo sonda 1 (rosso) - fisso
      if (probe1Pos && wireOrigin1) {
        const pathD = getCurvePath(wireOrigin1, probe1Pos);
        const points = extractPathPoints(pathD);
        if (
          points &&
          isBezierCurveIntersectingLens(
            points.start,
            points.control,
            points.end,
            lensViewport
          )
        ) {
          elements.push({
            type: 'wire',
            color: '#EF4444', // Rosso
            pathD,
            strokeWidth: 4,
          });
        }
      }

      // Cavo sonda 2 (nero) - fisso
      if (probe2Pos && wireOrigin2) {
        const pathD = getCurvePath(wireOrigin2, probe2Pos);
        const points = extractPathPoints(pathD);
        if (
          points &&
          isBezierCurveIntersectingLens(
            points.start,
            points.control,
            points.end,
            lensViewport
          )
        ) {
          elements.push({
            type: 'wire',
            color: '#000000', // Nero
            pathD,
            strokeWidth: 4,
          });
        }
      }

      // Cavo attivo (in movimento)
      if (activeProbe && activeProbePos) {
        const wireOrigin = activeProbe === 'first' ? wireOrigin1 : wireOrigin2;
        const color = activeProbe === 'first' ? '#EF4444' : '#000000';
        if (wireOrigin) {
          const pathD = getCurvePath(wireOrigin, activeProbePos);
          const points = extractPathPoints(pathD);
          if (
            points &&
            isBezierCurveIntersectingLens(
              points.start,
              points.control,
              points.end,
              lensViewport
            )
          ) {
            elements.push({
              type: 'wire',
              color,
              pathD,
              strokeWidth: 4,
            });
          }
        }
      }

      // Snap indicator (pallino animato durante drag)
      if (activeProbe && snapTargetPos && isPointInLens(snapTargetPos, lensViewport)) {
        elements.push({
          type: 'snap-indicator',
          color: activeProbe === 'first' ? '#EF4444' : '#000000',
          position: snapTargetPos,
          size: 24, // w-6 h-6
        });
      }

      // Pallini fissi sonde
      if (probe1Pos && isPointInLens(probe1Pos, lensViewport)) {
        elements.push({
          type: 'ball',
          color: '#EF4444',
          position: probe1Pos,
          size: 24,
        });
      }

      if (probe2Pos && isPointInLens(probe2Pos, lensViewport)) {
        elements.push({
          type: 'ball',
          color: '#000000',
          position: probe2Pos,
          size: 24,
        });
      }
    }

    // === UART ===
    const showUartOverlay = activeTool === 'probes' || activeTool === 'terminal';
    if (showUartOverlay && adapterPosition) {
      // Cavi UART connessi (fissi)
      uartConnections.forEach((conn) => {
        if (!conn.pcbPinId) return;

        const wireOrigin = getUartWireOrigin(conn.adapterPin);
        const pinPos = getPinPosition(conn.pcbPinId);

        if (wireOrigin && pinPos) {
          const pathD = getCurvePath(wireOrigin, pinPos);
          const points = extractPathPoints(pathD);
          if (
            points &&
            isBezierCurveIntersectingLens(
              points.start,
              points.control,
              points.end,
              lensViewport
            )
          ) {
            elements.push({
              type: 'wire',
              color: WIRE_COLORS[conn.adapterPin as AdapterPin],
              pathD,
              strokeWidth: 4,
            });
          }
        }

        // Pallini UART connessi
        if (pinPos && isPointInLens(pinPos, lensViewport)) {
          elements.push({
            type: 'ball',
            color: WIRE_COLORS[conn.adapterPin as AdapterPin],
            position: pinPos,
            size: 20, // w-5 h-5
          });
        }
      });

      // Cavo UART attivo (in movimento)
      if (activeAdapterPin && activeUartProbePos) {
        const wireOrigin = getUartWireOrigin(activeAdapterPin);
        if (wireOrigin) {
          const pathD = getCurvePath(wireOrigin, activeUartProbePos);
          const points = extractPathPoints(pathD);
          if (
            points &&
            isBezierCurveIntersectingLens(
              points.start,
              points.control,
              points.end,
              lensViewport
            )
          ) {
            elements.push({
              type: 'wire',
              color: WIRE_COLORS[activeAdapterPin],
              pathD,
              strokeWidth: 4,
            });
          }
        }
      }

      // Snap indicator UART
      if (
        activeAdapterPin &&
        uartSnapTargetPos &&
        isPointInLens(uartSnapTargetPos, lensViewport)
      ) {
        elements.push({
          type: 'snap-indicator',
          color: WIRE_COLORS[activeAdapterPin],
          position: uartSnapTargetPos,
          size: 20,
        });
      }
    }

    // === FIRMWARE DUMP ===
    if (activeTool === 'firmware-dump' && dumperPosition && firmwareDumpConnections && getFirmwareDumpWireOrigin) {
      firmwareDumpConnections.forEach((conn) => {
        if (!conn.pinId) return;
        const wireOrigin = getFirmwareDumpWireOrigin(conn.probeId);
        const pinPos = getPinPosition(conn.pinId);
        const probe = firmwareDumpProbes?.find(p => p.id === conn.probeId);
        const color = probe ? (SPI_WIRE_COLORS[probe.role] || probe.color) : '#888';

        if (wireOrigin && pinPos) {
          const pathD = getCurvePath(wireOrigin, pinPos);
          const points = extractPathPoints(pathD);
          if (points && isBezierCurveIntersectingLens(points.start, points.control, points.end, lensViewport)) {
            elements.push({ type: 'wire', color, pathD, strokeWidth: 4 });
          }
        }
        if (pinPos && isPointInLens(pinPos, lensViewport)) {
          elements.push({ type: 'ball', color, position: pinPos, size: 20 });
        }
      });

      if (firmwareDumpSnapTargetPos && activeFirmwareProbeId && isPointInLens(firmwareDumpSnapTargetPos, lensViewport)) {
        const probe = firmwareDumpProbes?.find(p => p.id === activeFirmwareProbeId);
        const color = probe ? (SPI_WIRE_COLORS[probe.role] || probe.color) : '#A855F7';
        elements.push({ type: 'snap-indicator', color, position: firmwareDumpSnapTargetPos, size: 20 });
      }
    }

    return elements;
  }, [
    lensViewport,
    activeTool,
    probe1Pos,
    probe2Pos,
    activeProbePos,
    wireOrigin1,
    wireOrigin2,
    activeProbe,
    snapTargetPos,
    uartConnections,
    activeAdapterPin,
    activeUartProbePos,
    adapterPosition,
    uartSnapTargetPos,
    firmwareDumpConnections,
    activeFirmwareProbeId,
    firmwareDumpSnapTargetPos,
    dumperPosition,
    firmwareDumpProbes,
    getFirmwareDumpWireOrigin,
    getCurvePath,
    getUartWireOrigin,
    getPinPosition,
  ]);

  // Separa elementi per tipo
  const wires = visibleElements.filter((el) => el.type === 'wire') as Array<
    Extract<VisibleElement, { type: 'wire' }>
  >;
  const balls = visibleElements.filter((el) => el.type === 'ball') as Array<
    Extract<VisibleElement, { type: 'ball' }>
  >;
  const snapIndicators = visibleElements.filter(
    (el) => el.type === 'snap-indicator'
  ) as Array<Extract<VisibleElement, { type: 'snap-indicator' }>>;

  return (
    <div className="absolute pointer-events-none" style={{ left: 0, top: 0, width: lensViewport.radius * 2, height: lensViewport.radius * 2, overflow: 'hidden' }}>
      {/* SVG per cavi */}
      <svg
        width={lensViewport.radius * 2}
        height={lensViewport.radius * 2}
        className="absolute"
        style={{ left: 0, top: 0, filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.4))' }}
      >
        <defs>
          <clipPath id="lens-clip">
            <circle
              cx={lensViewport.radius}
              cy={lensViewport.radius}
              r={lensViewport.radius}
            />
          </clipPath>
        </defs>

        <g clipPath="url(#lens-clip)">
          {wires.map((wire, idx) => (
            <path
              key={`wire-${idx}`}
              d={transformSVGPath(wire.pathD, lensViewport)}
              stroke={wire.color}
              strokeWidth={wire.strokeWidth * lensViewport.zoomLevel}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </g>
      </svg>

      {/* Pallini fissi */}
      {balls.map((ball, idx) => {
        const transformed = transformToLensSpace(ball.position, lensViewport);
        return (
          <div
            key={`ball-${idx}`}
            className="absolute rounded-full border-2 border-white/50 shadow-md"
            style={{
              left: transformed.x,
              top: transformed.y,
              transform: 'translate(-50%, -50%)',
              width: ball.size * lensViewport.zoomLevel,
              height: ball.size * lensViewport.zoomLevel,
              backgroundColor: ball.color,
            }}
          />
        );
      })}

      {/* Snap indicators (pallini animati) */}
      {snapIndicators.map((indicator, idx) => {
        const transformed = transformToLensSpace(indicator.position, lensViewport);
        return (
          <div
            key={`snap-${idx}`}
            className="absolute"
            style={{
              left: transformed.x,
              top: transformed.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="rounded-full border-2 bg-white/20 animate-probe-pulse"
              style={{
                borderColor: indicator.color,
                width: indicator.size * lensViewport.zoomLevel,
                height: indicator.size * lensViewport.zoomLevel,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(LensContentLayer);
