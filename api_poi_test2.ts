import { createNorikaeClient } from "./api-client/src/index.ts";

const client = createNorikaeClient({});

// Test: all codes
const codes = [
  "22715",
  "22916",
  "23043",
  "22741",
  "22730",
  "22790",
  "23019",
  "22513",
];
for (const code of codes) {
  const r = (await client.poi.searchByStationId(code)) as any;
  const feat = r?.Feature?.[0];
  const name = feat?.Name;
  const yomi = feat?.Yomi;
  // Also check TransitSearchInfo for line info
  const tsi = feat?.TransitSearchInfo;
  console.log(
    `${code}: ${name} (${yomi}) | Station.LineName: ${JSON.stringify(feat?.Station?.LineName?.slice?.(0, 2))} | TransitSearchInfo:`,
    JSON.stringify(tsi)?.slice(0, 200),
  );
}
