// Using global fetch


async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "APLandLookup/1.0" },
  });
  const data = await resp.json();
  const addr = data.address || {};
  return {
    displayName: data.display_name || "",
    village: addr.village || addr.suburb || addr.neighbourhood || addr.city || "",
  };
}

async function getAdminHierarchy(lat, lng) {
  const query = `
    [out:json][timeout:15];
    is_in(${lat},${lng})->.a;
    area.a["admin_level"="4"]->.s;
    area.a["admin_level"="6"]->.d;
    area.a["admin_level"="8"]->.m;
    area.a["admin_level"="10"]->.v;
    (
      relation(pivot.s);
      relation(pivot.d);
      relation(pivot.m);
      relation(pivot.v);
    );
    out tags;
  `;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const resp = await fetch(url);
  const data = await resp.json();
  
  let state = "";
  let district = "";
  let mandal = "";
  let village = "";

  if (data.elements) {
    for (const el of data.elements) {
      const tags = el.tags || {};
      const adminLevel = tags.admin_level;
      const name = tags["name:en"] || tags.name || "";
      if (adminLevel === "4") state = name;
      else if (adminLevel === "6") district = name;
      else if (adminLevel === "8") mandal = name;
      else if (adminLevel === "10") village = name;
    }
  }

  return { state, district, mandal, village };
}

const LAYER_MAP = [
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

function resolveLayer(district) {
  const d = district.toLowerCase();
  for (const [key, layer] of LAYER_MAP) {
    if (d.includes(key)) return layer;
  }
  return null;
}

function parseParNum(html) {
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

async function getSurveyNo(lat, lng, district) {
  const layer = resolveLayer(district);
  console.log("Resolved Layer for district", district, "is:", layer);
  if (!layer) return null;

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

  console.log("Fetching from Bhuvan WMS URL:", url);
  const resp = await fetch(url, {
    headers: { Referer: "https://bhuvan-app1.nrsc.gov.in/bhuvan2d2.0/" },
  });
  const html = await resp.text();
  console.log("HTML length:", html.length);
  return parseParNum(html);
}

async function main() {
  const lat = 15.250400;
  const lng = 80.020294;
  
  console.log("1. Running reverse geocode...");
  const geo = await reverseGeocode(lat, lng);
  console.log("Result:", geo);

  console.log("2. Running admin hierarchy lookup...");
  const admin = await getAdminHierarchy(lat, lng);
  console.log("Result:", admin);

  console.log("3. Running survey number lookup...");
  const surveyNo = await getSurveyNo(lat, lng, admin.district);
  console.log("Result:", surveyNo);
}

main().catch(console.error);
