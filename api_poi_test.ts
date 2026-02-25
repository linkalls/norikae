import { createNorikaeClient } from "./api-client/src/index.ts";

const client = createNorikaeClient({});

// Test: searchByStationId for known station codes
const codes = ["22715", "22916", "23043", "22741"];
for (const code of codes) {
  console.log(`\n=== searchByStationId("${code}") ===`);
  const r = (await client.poi.searchByStationId(code)) as any;
  const feat = r?.Feature?.[0];
  console.log("Feature[0] keys:", Object.keys(feat ?? {}));
  console.log("Name:", feat?.Name);
  console.log("Yomi:", feat?.Yomi);
  console.log("Geometry:", feat?.Geometry);
  console.log("Property keys:", Object.keys(feat?.Property ?? {}));
  console.log(
    "Property.Detail:",
    JSON.stringify(feat?.Property?.Detail, null, 2).slice(0, 500),
  );
}

// Also try searchStationExact
console.log("\n=== searchStationExact('渋谷') ===");
const r2 = (await client.poi.searchStationExact("渋谷")) as any;
const feat2 = r2?.Feature?.[0];
console.log("Feature[0] keys:", Object.keys(feat2 ?? {}));
console.log("Name:", feat2?.Name);
console.log("Yomi:", feat2?.Yomi);
console.log("Property.StationCode:", feat2?.Property?.Detail?.StationCode);
console.log("Property.RailCode:", feat2?.Property?.Detail?.RailCode);
console.log(
  "Full Property.Detail:",
  JSON.stringify(feat2?.Property?.Detail, null, 2).slice(0, 1000),
);
