// src/components/features/exercise/PCBViewer.tsx

import Image from 'next/image';
import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { exerciseData } from '@/data/exercise';
import { useExerciseStore } from '@/store/exerciseStore';
import { cn } from '@/lib/utils';
import { Wrench } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';

const LENS_RADIUS = 120;
const ZOOM_LEVEL = 2.5;

const PCBViewer = () => {
  const {
    currentStep,
    foundComponents,
    selectComponent,
    isFinished,
    activeTool,
    mousePosition,
    updateMousePosition,
    measuredComponentId,
    measureComponent,
    clearMeasurement,
  } = useExerciseStore();

  const pcbContainerRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (pcbContainerRef.current) {
        setContainerDims({
          width: pcbContainerRef.current.offsetWidth,
          height: pcbContainerRef.current.offsetHeight,
        });
      }
    };
    setImageUrl(window.location.origin + exerciseData.pcbImage);
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleHotspotClick = (componentId: string) => {
    if (activeTool === 'pointer') selectComponent(componentId);
    else if (activeTool === 'multimeter') measureComponent(componentId);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'magnifier' || !pcbContainerRef.current) return;
    const rect = pcbContainerRef.current.getBoundingClientRect();
    updateMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => updateMousePosition(null);

  const componentToFind = exerciseData.components[currentStep];
  const measuredComponentData = measuredComponentId
    ? exerciseData.components.find((c) => c.id === measuredComponentId)
    : null;

  return (
    <div
      ref={pcbContainerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative', // Pulito da stili di layout
        activeTool === 'magnifier' ? 'cursor-none' : ''
      )}
    >
      <Image
        src={exerciseData.pcbImage}
        alt="Vista di un circuito stampato (PCB) per l'esercizio."
        width={1024}
        height={768}
        priority
        className="h-auto w-full block rounded-lg"
        draggable={false}
      />
      <div className="absolute inset-0">
        {exerciseData.components.map((component) => {
          const [left, top, width, height] = component.coords;
          const isFound = foundComponents.includes(component.id);
          const isTarget = component.id === componentToFind?.id && !isFinished;
          let hotspotClass = 'absolute transition-all duration-300';

          if (activeTool === 'pointer') {
            hotspotClass += ' cursor-pointer';
            if (isFound) hotspotClass += ' bg-green-500/30 border-2 border-green-400';
            else if (isTarget) hotspotClass += ' bg-yellow-400/20 border-2 border-yellow-300 animate-pulse';
            else hotspotClass += ' hover:bg-red-500/20';
          } else if (activeTool === 'multimeter') {
            hotspotClass += ' cursor-crosshair hover:bg-blue-500/20';
          }

          return (
            <div
              key={component.id}
              onClick={() => handleHotspotClick(component.id)}
              className={hotspotClass}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`,
              }}
            />
          );
        })}
        {activeTool === 'magnifier' && mousePosition && imageUrl && containerDims.width > 0 && (
          <div
            className="absolute rounded-full border-4 border-blue-500 shadow-lg pointer-events-none"
            style={{
              // LA MODIFICA CHIAVE È QUI:
              // Posizioniamo l'angolo in alto a sinistra della lente esattamente dove si trova il mouse.
              left: mousePosition.x,
              top: mousePosition.y,
              // E poi usiamo transform per spostare la lente indietro del 50% della sua stessa dimensione.
              transform: 'translate(-50%, -50%)',

              width: LENS_RADIUS * 2,
              height: LENS_RADIUS * 2,
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: `${containerDims.width * ZOOM_LEVEL}px ${containerDims.height * ZOOM_LEVEL}px`,
              // La formula per la posizione dello sfondo deve essere aggiornata di conseguenza.
              backgroundPosition: `-${mousePosition.x * ZOOM_LEVEL - LENS_RADIUS}px -${mousePosition.y * ZOOM_LEVEL - LENS_RADIUS}px`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}
      </div>
      <AlertDialog
        open={!!measuredComponentId}
        onOpenChange={(isOpen) => !isOpen && clearMeasurement()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Wrench className="mr-2 h-5 w-5" />
              Misurazione Rilevata
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4 text-base">
              Hai misurato il componente:
              <strong className="text-white block text-lg mt-1">
                {measuredComponentData?.name || 'Sconosciuto'}
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={clearMeasurement}>OK</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PCBViewer;