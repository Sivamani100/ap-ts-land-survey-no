/**
 * Geometry & Geodesic Survey Utilities
 */

// Earth's radius in meters
const EARTH_RADIUS = 6371000;

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Calculates the distance between two coordinates in meters using the Haversine formula.
 */
export function calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLatRad = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLngRad = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) *
      Math.sin(deltaLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS * c;
}

/**
 * Calculates the perimeter/length of a path of coordinates in meters.
 */
export function calculatePathLength(coords: Coordinate[]): number {
  if (coords.length < 2) return 0;
  let totalDist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    totalDist += calculateDistance(coords[i], coords[i + 1]);
  }
  return totalDist;
}

/**
 * Calculates the area of a closed polygon in square meters.
 * Uses a local transverse Mercator planar projection centered at the polygon centroid,
 * then applies the planar Shoelace formula. Highly accurate for local land parcels.
 */
export function calculatePolygonArea(coords: Coordinate[]): number {
  if (coords.length < 3) return 0;

  // Calculate centroid
  let sumLat = 0;
  let sumLng = 0;
  for (const c of coords) {
    sumLat += c.latitude;
    sumLng += c.longitude;
  }
  const centroidLat = sumLat / coords.length;
  const centroidLng = sumLng / coords.length;

  const centroidLatRad = (centroidLat * Math.PI) / 180;

  // Conversion factors
  const metersPerDegreeLat = 111132.95;
  const metersPerDegreeLng = 111132.95 * Math.cos(centroidLatRad);

  // Project spherical coordinates to local planar meters
  const points = coords.map((c) => ({
    x: (c.longitude - centroidLng) * metersPerDegreeLng,
    y: (c.latitude - centroidLat) * metersPerDegreeLat,
  }));

  // Apply Shoelace formula
  let areaSum = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const current = points[i];
    const next = points[(i + 1) % n];
    areaSum += current.x * next.y - next.x * current.y;
  }

  return Math.abs(areaSum) / 2;
}

// Unit conversion constants
export const SQ_METER_TO_ACRE = 0.00024710538;
export const ACRE_TO_GUNTA = 40;
export const ACRE_TO_CENT = 100;
export const ACRE_TO_SQ_YARD = 4840;
export const ACRE_TO_HECTARE = 0.40468564;

export interface AreaUnits {
  sqMeters: number;
  acres: number;
  guntas: number;
  cents: number;
  sqYards: number;
  hectares: number;
}

/**
 * Converts an area in square meters to other common units.
 */
export function convertSqMeters(sqMeters: number): AreaUnits {
  const acres = sqMeters * SQ_METER_TO_ACRE;
  return {
    sqMeters,
    acres,
    guntas: acres * ACRE_TO_GUNTA,
    cents: acres * ACRE_TO_CENT,
    sqYards: acres * ACRE_TO_SQ_YARD,
    hectares: acres * ACRE_TO_HECTARE,
  };
}

/**
 * Converts an area from a specified source unit to square meters.
 */
export function toSqMeters(value: number, unit: keyof Omit<AreaUnits, "sqMeters">): number {
  if (value <= 0 || isNaN(value)) return 0;

  let acres = 0;
  switch (unit) {
    case "acres":
      acres = value;
      break;
    case "guntas":
      acres = value / ACRE_TO_GUNTA;
      break;
    case "cents":
      acres = value / ACRE_TO_CENT;
      break;
    case "sqYards":
      acres = value / ACRE_TO_SQ_YARD;
      break;
    case "hectares":
      acres = value / ACRE_TO_HECTARE;
      break;
  }

  return acres / SQ_METER_TO_ACRE;
}
