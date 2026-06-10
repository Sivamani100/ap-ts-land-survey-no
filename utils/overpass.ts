export interface AdminHierarchy {
  state: string;
  district: string;
  mandal: string;
  village: string;
}

interface OverpassElement {
  type: string;
  id: number;
  tags: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

const ENDPOINT = "https://overpass-api.de/api/interpreter";

function nameOf(el: OverpassElement): string {
  return (
    el.tags["name:en"] ||
    el.tags["name"] ||
    ""
  );
}

export async function getAdminHierarchy(
  lat: number,
  lng: number
): Promise<AdminHierarchy> {
  // Query admin boundaries at levels 4 (state), 5 (district), 6 (mandal/taluk), 7 (town/village)
  const query = `[out:json][timeout:10];
is_in(${lat},${lng})->.a;
rel(pivot.a)[boundary=administrative][admin_level~"^[4-7]$"];
out tags;`;

  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "APLandApp/1.0",
    },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(12000),
  });

  if (!resp.ok) throw new Error(`Overpass error: ${resp.status}`);

  const data: OverpassResponse = await resp.json();
  const els = data.elements || [];

  const byLevel: Record<number, OverpassElement[]> = {};
  for (const el of els) {
    const lvl = parseInt(el.tags.admin_level ?? "0", 10);
    if (lvl >= 4 && lvl <= 7) {
      if (!byLevel[lvl]) byLevel[lvl] = [];
      byLevel[lvl].push(el);
    }
  }

  const pick = (lvl: number) =>
    byLevel[lvl]?.[0] ? nameOf(byLevel[lvl][0]) : "";

  return {
    state: pick(4),
    district: pick(5),
    mandal: pick(6),
    village: pick(7),
  };
}
