async function run() {
  const url = "https://bhuvan-app1.nrsc.gov.in/vec1wms/wms?service=WMS&version=1.1.1&request=GetCapabilities";
  console.log("Fetching GetCapabilities from:", url);
  try {
    const resp = await fetch(url, {
      headers: { Referer: "https://bhuvan-app1.nrsc.gov.in/bhuvan2d2.0/" }
    });
    console.log("Status:", resp.status);
    const xml = await resp.text();
    console.log("XML length:", xml.length);
    
    // Find all <Name> tags matching cadastral:...
    const matches = [...xml.matchAll(/<Name>(cadastral:[^<]*)<\/Name>/gi)].map(m => m[1]);
    console.log(`Found ${matches.length} layers in cadastral namespace.`);
    
    // Print all layers
    console.log("All Cadastral Layers:");
    matches.sort().forEach(name => {
      console.log(" -", name);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
