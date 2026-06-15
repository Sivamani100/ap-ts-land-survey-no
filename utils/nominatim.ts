export interface NominatimResult {
  village: string;
  hamlet: string;
  suburb: string;
  displayName: string;
  lat: number;
  lng: number;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;

  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    fetchOptions.signal = AbortSignal.timeout(timeout);
  } else if (typeof AbortController !== "undefined") {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;
    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }
  return fetch(url, fetchOptions);
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<NominatimResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&zoom=18&format=json&addressdetails=1&accept-language=en`;

  const resp = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": "APLandApp/1.0 (land records lookup for Andhra Pradesh)",
    },
    timeout: 10000,
  });

  if (!resp.ok) throw new Error(`Nominatim error: ${resp.status}`);

  const data = await resp.json();
  const addr = data.address ?? {};

  // Fine-grained location (zoom 18 gives street/place level)
  const village =
    addr.village ||
    addr.hamlet ||
    addr.neighbourhood ||
    addr.quarter ||
    addr.city_block ||
    addr.town ||
    addr.city ||
    "";

  const hamlet = addr.hamlet || addr.isolated_dwelling || "";
  const suburb = addr.suburb || addr.quarter || "";

  return {
    village,
    hamlet,
    suburb,
    displayName: data.display_name || "",
    lat: parseFloat(data.lat ?? String(lat)),
    lng: parseFloat(data.lon ?? String(lng)),
  };
}

export interface GeocodeResult {
  name: string;
  lat: number;
  lng: number;
  state: string;
  district: string;
  type: string;
}

export async function searchVillages(query: string): Promise<GeocodeResult[]> {
  const sanitize = query.trim();
  if (sanitize.length < 3) return [];

  // Single query inside the AP and Telangana bounding box (viewbox) restricted to country code IN
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(sanitize)}&viewbox=76.5,20.0,85.0,12.5&bounded=1&format=json&addressdetails=1&countrycodes=in&limit=45&accept-language=en`;

  const headers = {
    "User-Agent": "APLandApp/1.0 (village lookup for Andhra Pradesh and Telangana)",
  };

  try {
    const resp = await fetchWithTimeout(url, { headers, timeout: 10000 });
    if (!resp.ok) throw new Error(`Nominatim error: ${resp.status}`);

    const data = await resp.json();
    const results: GeocodeResult[] = [];

    for (const item of data) {
      const addr = item.address ?? {};
      const state = addr.state || "";
      const isAP = state.toLowerCase().includes("andhra pradesh");
      const isTG = state.toLowerCase().includes("telangana");

      // Filter to keep only AP/TG results
      if (!isAP && !isTG) continue;

      const name =
        addr.village ||
        addr.town ||
        addr.hamlet ||
        addr.suburb ||
        addr.city ||
        item.display_name.split(",")[0];

      const district = addr.district || addr.county || addr.city || "";

      results.push({
        name: district ? `${name}, ${district}` : name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        state: isAP ? "Andhra Pradesh" : "Telangana",
        district,
        type: item.type,
      });
    }

    // Remove duplicates by name
    const seen = new Set();
    return results.filter((item) => {
      const key = item.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch (err) {
    console.error("Village search failed:", err);
    return [];
  }
}
