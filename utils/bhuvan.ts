import { Platform } from "react-native";

// Bhuvan cadastral survey number lookup via bhuvan-app1.nrsc.gov.in/vec1wms/wms
// Uses WMS GetFeatureInfo on district-specific layers (confirmed working June 2026).
// Returns the par_num (survey/parcel number) for a lat/lng coordinate.

// AP district name keywords → Bhuvan GWC cadastral layer (all via vec1wms proxy)
const LAYER_MAP: [string, string][] = [
  ["anantapur", "cadastral:Anantapur_Cad_sisdp_p2"],
  ["sri sathya sai", "cadastral:Anantapur_Cad_sisdp_p2"],
  ["kurnool", "cadastral:Kurnool_Cad_sisdp_p2"],
  ["nandyal", "cadastral:Kurnool_Cad_sisdp_p2"],
  ["kadapa", "cadastral:Kadapa_Cad_sisdp_p2"],
  ["y.s.r", "cadastral:Kadapa_Cad_sisdp_p2"],
  ["ysr", "cadastral:Kadapa_Cad_sisdp_p2"],
  ["chittoor", "cadastral:Chittoor_Cad_sisdp_p2"],
  ["tirupati", "cadastral:Chittoor_Cad_sisdp_p2"],
  ["nellore", "cadastral:Nellore_Cad_sisdp_p2"],
  ["spsr", "cadastral:Nellore_Cad_sisdp_p2"],
  ["prakasam", "cadastral:Prakasam_Cad_sisdp_p2"],
  ["bapatla", "cadastral:Prakasam_Cad_sisdp_p2"],
  ["west godavari", "cadastral:West_Godavari_Cad_sisdp_p2"],
  ["eluru", "cadastral:West_Godavari_Cad_sisdp_p2"],
  ["east godavari", "cadastral:East_Godavari_Cad_sisdp_p2"],
  ["kakinada", "cadastral:East_Godavari_Cad_sisdp_p2"],
  ["konaseema", "cadastral:East_Godavari_Cad_sisdp_p2"],
  ["alluri", "cadastral:East_Godavari_Cad_sisdp_p2"],
  ["visakhapatnam", "cadastral:Visakhapatnam_Cad_sisdp_p2"],
  ["anakapalli", "cadastral:Visakhapatnam_Cad_sisdp_p2"],
  ["vizianagaram", "cadastral:Visakhapatnam_Cad_sisdp_p2"],
  ["srikakulam", "cadastral:srikakulam_cad"],
  ["parvathipuram", "cadastral:srikakulam_cad"],
];

const TELANGANA_DISTRICTS = new Set([
  "adilabad", "bhadradri kothagudem", "hyderabad", "jagtial", "jangaon",
  "jayashankar bhupalpally", "jogulamba gadwal", "kamareddy", "karimnagar",
  "khammam", "kumuram bheem asifabad", "mahabubabad", "mahabubnagar",
  "mancherial", "medak", "medchal-malkajgiri", "mulugu", "nagarkurnool",
  "nalgonda", "narayanpet", "nirmal", "nizamabad", "peddapalli",
  "rajanna sircilla", "rangareddy", "sangareddy", "siddipet", "suryapet",
  "vikarabad", "wanaparthy", "warangal", "hanmakonda", "yadadri bhuvanagiri",
  "bhadradri", "jayashankar", "jogulamba", "kumuram bheem", "medchal malkajgiri",
  "komaram bheem", "asifabad", "bhupalpally", "gadwal", "kothagudem", "bhuvanagiri"
]);

function resolveLayer(district: string, state?: string): string | null {
  if (state && state.toLowerCase().includes("telangana")) {
    return "cadastral:Telangana_Cad_sisdp_p2";
  }

  const d = district.toLowerCase().trim();
  if (TELANGANA_DISTRICTS.has(d) || TELANGANA_DISTRICTS.has(d.replace(" district", ""))) {
    return "cadastral:Telangana_Cad_sisdp_p2";
  }

  for (const [key, layer] of LAYER_MAP) {
    if (d.includes(key)) return layer;
  }
  return null;
}

function parseParNum(html: string): string | null {
  const headers = [...html.matchAll(/<th[^>]*>([^<]*)<\/th>/gi)].map((m) =>
    m[1].trim()
  );
  const colIdx = headers.indexOf("par_num");
  if (colIdx === -1) return null;

  const values = [...html.matchAll(/<td[^>]*>([^<]*)<\/td>/gi)].map((m) =>
    m[1].trim()
  );
  if (colIdx < values.length && values[colIdx]) {
    return values[colIdx];
  }
  return null;
}

export async function getSurveyNo(
  lat: number,
  lng: number,
  district: string,
  state?: string
): Promise<string | null> {
  const layer = resolveLayer(district, state);
  if (!layer) return null;

  // On Web, use the proxy server to bypass CORS.
  // In development, the proxy is at http://localhost:3000/api/survey.
  // In production, we use the relative path /api/survey.
  if (Platform.OS === "web") {
    const proxyUrl = `/api/survey?lat=${lat}&lng=${lng}&layer=${encodeURIComponent(layer)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    
    try {
      const resp = await fetch(proxyUrl, { signal: controller.signal });
      if (resp.ok) {
        const html = await resp.text();
        const surveyNo = parseParNum(html);
        if (surveyNo) return surveyNo;
      }
    } catch (err) {
      console.warn("Bhuvan proxy lookup failed, falling back to direct query:", err);
    } finally {
      clearTimeout(timeout);
    }
  }

  const d = 0.005;
  const bbox = [lng - d / 2, lat - d / 2, lng + d / 2, lat + d / 2].join(",");

  const url =
    "https://bhuvan-app1.nrsc.gov.in/vec1wms/wms" +
    "?LAYERS=" +
    encodeURIComponent(layer) +
    "&QUERY_LAYERS=" +
    encodeURIComponent(layer) +
    "&STYLES=&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo" +
    "&BBOX=" +
    bbox +
    "&FEATURE_COUNT=1&HEIGHT=256&WIDTH=256" +
    "&FORMAT=text%2Fhtml&INFO_FORMAT=text%2Fhtml&SRS=EPSG%3A4326&X=128&Y=128";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { Referer: "https://bhuvan-app1.nrsc.gov.in/bhuvan2d2.0/" },
    });
    const html = await resp.text();
    return parseParNum(html);
  } catch (err) {
    console.error("Bhuvan WMS fetch failed:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
