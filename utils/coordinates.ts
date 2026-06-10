/**
 * Utility to format coordinates in either Decimal Degrees (DD)
 * or Degrees, Minutes, Seconds (DMS) format.
 */
export function formatCoordinate(
  lat: number,
  lng: number,
  format: "DD" | "DMS"
): string {
  if (format === "DD") {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  // Convert to DMS
  const convert = (val: number, isLat: boolean) => {
    const absolute = Math.abs(val);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.round((minutesNotTruncated - minutes) * 60);

    const direction = isLat
      ? val >= 0
        ? "N"
        : "S"
      : val >= 0
      ? "E"
      : "W";

    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
  };

  return `${convert(lat, true)}, ${convert(lng, false)}`;
}
