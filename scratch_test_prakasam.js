// Using global fetch
const lat = 15.250400;
const lng = 80.020294;
const layer = "cadastral:Prakasam_Cad_sisdp_p2";

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

console.log("Direct WMS URL:", url);

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

async function run() {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.log("TIMEOUT TRIGGERED");
    controller.abort();
  }, 9000);

  try {
    const start = Date.now();
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { Referer: "https://bhuvan-app1.nrsc.gov.in/bhuvan2d2.0/" },
    });
    console.log("Status:", resp.status, "took", Date.now() - start, "ms");
    const html = await resp.text();
    console.log("HTML length:", html.length);
    console.log("Parsed:", parseParNum(html));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    clearTimeout(timeout);
  }
}

run();
