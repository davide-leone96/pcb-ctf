/**
 * Utility functions for lens magnification calculations
 */

export interface Point {
  x: number;
  y: number;
}

export interface LensViewport {
  centerX: number;
  centerY: number;
  radius: number;
  zoomLevel: number;
}

/**
 * Verifica se un punto è dentro il cerchio della lente
 */
export function isPointInLens(point: Point, lens: LensViewport): boolean {
  const dx = point.x - lens.centerX;
  const dy = point.y - lens.centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= lens.radius;
}

/**
 * Verifica se una linea (segmento) interseca il cerchio della lente
 * Algoritmo: calcola la distanza minima tra il centro del cerchio e il segmento
 */
export function isLineIntersectingLens(
  start: Point,
  end: Point,
  lens: LensViewport
): boolean {
  // Verifica se uno degli endpoint è dentro il cerchio
  if (isPointInLens(start, lens) || isPointInLens(end, lens)) {
    return true;
  }

  // Calcola la distanza dal centro della lente al segmento
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  // Se il segmento è un punto, abbiamo già verificato sopra
  if (lengthSquared === 0) {
    return isPointInLens(start, lens);
  }

  // Calcola il parametro t della proiezione del centro sul segmento
  const t = Math.max(
    0,
    Math.min(
      1,
      ((lens.centerX - start.x) * dx + (lens.centerY - start.y) * dy) /
        lengthSquared
    )
  );

  // Calcola il punto più vicino sul segmento
  const closestX = start.x + t * dx;
  const closestY = start.y + t * dy;

  // Verifica se il punto più vicino è dentro il raggio
  const distX = lens.centerX - closestX;
  const distY = lens.centerY - closestY;
  const distance = Math.sqrt(distX * distX + distY * distY);

  return distance <= lens.radius;
}

/**
 * Trasforma un punto da coordinate container a coordinate lente (spazio ingrandito)
 */
export function transformToLensSpace(point: Point, lens: LensViewport): Point {
  // Coordinate relative al centro della lente
  const relX = point.x - lens.centerX;
  const relY = point.y - lens.centerY;

  // Scala e ricentra (il centro della lente diventa (radius, radius) nello spazio locale)
  return {
    x: relX * lens.zoomLevel + lens.radius,
    y: relY * lens.zoomLevel + lens.radius,
  };
}

/**
 * Trasforma un path SVG da coordinate container a coordinate lente
 * Supporta comandi M (moveTo) e Q (quadratic bezier) usati da getCurvePath
 */
export function transformSVGPath(pathD: string, lens: LensViewport): string {
  if (!pathD) return "";

  // Regex per estrarre comandi e coordinate
  // Formato atteso: "M x1 y1 Q x2 y2 x3 y3"
  const parts = pathD.trim().split(/\s+/);

  if (parts.length < 7 || parts[0] !== "M" || parts[3] !== "Q") {
    console.warn("transformSVGPath: formato path non supportato", pathD);
    return pathD;
  }

  // Estrai coordinate
  const startX = parseFloat(parts[1]);
  const startY = parseFloat(parts[2]);
  const controlX = parseFloat(parts[4]);
  const controlY = parseFloat(parts[5]);
  const endX = parseFloat(parts[6]);
  const endY = parseFloat(parts[7]);

  // Trasforma ogni punto
  const start = transformToLensSpace({ x: startX, y: startY }, lens);
  const control = transformToLensSpace({ x: controlX, y: controlY }, lens);
  const end = transformToLensSpace({ x: endX, y: endY }, lens);

  // Ricostruisci il path
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

/**
 * Verifica se una curva quadratica bezier interseca il cerchio della lente
 * Approssimazione: campiona la curva in più punti e verifica se qualcuno interseca
 */
export function isBezierCurveIntersectingLens(
  start: Point,
  control: Point,
  end: Point,
  lens: LensViewport
): boolean {
  // Verifica gli endpoint
  if (isPointInLens(start, lens) || isPointInLens(end, lens)) {
    return true;
  }

  // Campiona la curva in 10 punti
  const samples = 10;
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    // Formula quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
    const oneMinusT = 1 - t;
    const x =
      oneMinusT * oneMinusT * start.x +
      2 * oneMinusT * t * control.x +
      t * t * end.x;
    const y =
      oneMinusT * oneMinusT * start.y +
      2 * oneMinusT * t * control.y +
      t * t * end.y;

    if (isPointInLens({ x, y }, lens)) {
      return true;
    }
  }

  return false;
}

/**
 * Estrae i punti da un path SVG nel formato "M x1 y1 Q x2 y2 x3 y3"
 */
export function extractPathPoints(pathD: string): {
  start: Point;
  control: Point;
  end: Point;
} | null {
  if (!pathD) return null;

  const parts = pathD.trim().split(/\s+/);

  if (parts.length < 7 || parts[0] !== "M" || parts[3] !== "Q") {
    return null;
  }

  return {
    start: { x: parseFloat(parts[1]), y: parseFloat(parts[2]) },
    control: { x: parseFloat(parts[4]), y: parseFloat(parts[5]) },
    end: { x: parseFloat(parts[6]), y: parseFloat(parts[7]) },
  };
}
