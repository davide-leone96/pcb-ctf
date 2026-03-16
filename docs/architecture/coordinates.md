# Coordinate System

## Coordinate Normalizzate

Tutte le coordinate PCB sono **normalizzate** (0-100) per essere indipendenti dalla risoluzione dell'immagine.

```
PCB Image (500x300px)

(0, 0) ────────────── (100, 0)
  │                       │
  │                       │
  │   Component at (25, 50, 10, 15)
  │   represents:
  │   - X: 25% from left
  │   - Y: 50% from top
  │   - Width: 10% of image
  │   - Height: 15% of image
  │                       │
  │                       │
(0, 100) ──────────── (100, 100)
```

## Conversione Pixel

```typescript
// Da coordinate normalizzate a pixel:
actualPixel = (normalizedValue / 100) * imageDimension

// Esempio (immagine 500x300):
x_pixel = (25 / 100) * 500 = 125
y_pixel = (50 / 100) * 300 = 150
width_pixel = (10 / 100) * 500 = 50
height_pixel = (15 / 100) * 300 = 45
```

## Posizionamento Componenti

Quando posizioni componenti/pin in Settings:

1. **Drag-and-drop** → il sistema converte pixel a coordinate normalizzate
2. **Input manuale** → inserisci direttamente valori 0-100
3. **Salvataggio** → sempre in coordinate normalizzate

## PCBViewer Rendering

In `PCBViewer.tsx`:

```typescript
const { containerWidth, containerHeight } = getContainerDims()

// Posizionare componente
const pixelX = (component.coords[0] / 100) * containerWidth
const pixelY = (component.coords[1] / 100) * containerHeight
const pixelW = (component.coords[2] / 100) * containerWidth
const pixelH = (component.coords[3] / 100) * containerHeight

// Render in absolute position
<div style={{
  position: 'absolute',
  left: pixelX,
  top: pixelY,
  width: pixelW,
  height: pixelH
}}>
```

## Vantaggi Coordinate Normalizzate

✅ Indipendenti dalla risoluzione PCB
✅ Riutilizzabili con immagini diverse
✅ Scalabili
✅ Responsive

