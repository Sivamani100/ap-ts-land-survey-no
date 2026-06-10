const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url.includes("/api/survey")) {
        console.log("[Proxy] Received survey request:", req.url);
        const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        const lat = url.searchParams.get("lat");
        const lng = url.searchParams.get("lng");
        const layer = url.searchParams.get("layer");

        if (!lat || !lng || !layer) {
          console.error("[Proxy] Missing parameters:", { lat, lng, layer });
          res.writeHead(400, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "Missing lat, lng, or layer" }));
          return;
        }

        const d = 0.005;
        const bbox = [
          Number(lng) - d / 2,
          Number(lat) - d / 2,
          Number(lng) + d / 2,
          Number(lat) + d / 2,
        ].join(",");

        const bhuvanUrl =
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

        console.log("[Proxy] Fetching from Bhuvan WMS:", bhuvanUrl);

        fetch(bhuvanUrl, {
          headers: { Referer: "https://bhuvan-app1.nrsc.gov.in/bhuvan2d2.0/" },
        })
          .then((resp) => {
            console.log("[Proxy] Bhuvan response status:", resp.status);
            return resp.text();
          })
          .then((html) => {
            console.log("[Proxy] Bhuvan response HTML length:", html.length);
            res.writeHead(200, {
              "content-type": "text/html; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
            });
            res.end(html);
          })
          .catch((err) => {
            console.error("[Proxy] Bhuvan fetch error:", err);
            res.writeHead(500, {
              "content-type": "application/json",
              "Access-Control-Allow-Origin": "*",
            });
            res.end(JSON.stringify({ error: err.message }));
          });
        return;
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
