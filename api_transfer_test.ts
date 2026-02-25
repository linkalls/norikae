import { createNorikaeClient } from "./api-client/src/index.ts";

const client = createNorikaeClient({});

// 乗換ありルート（渋谷→池袋）to see if transfer route has more data
console.log("=== NAVI SEARCH WITH TRANSFER (渋谷→池袋) ===");
const result = await client.navi.search({
  from: "渋谷",
  to: "池袋",
  date: "202602251425",
  type: 1,
});

// Route with transfer
const features = result.Feature ?? [];
console.log("Total routes:", features.length);
for (const f of features.slice(0, 2)) {
  const raw = f as any;
  const ri = raw?.RouteInfo;
  const prop = ri?.Property;
  console.log("\n--- Route:", raw.Name, "---");
  console.log("Property keys:", Object.keys(prop ?? {}));
  console.log("Transfer count:", prop?.TransferCount);
  // Check if there's any Link data
  if (prop?.Link) {
    console.log(
      "Link found!!!:",
      JSON.stringify(prop.Link, null, 2).slice(0, 3000),
    );
  }
  if (prop?.Section) {
    console.log(
      "Section found!!!:",
      JSON.stringify(prop.Section, null, 2).slice(0, 3000),
    );
  }
  // Print full passStation
  console.log("PassStation:", JSON.stringify(prop?.PassStation));
  console.log("Full Property:", JSON.stringify(prop, null, 2).slice(0, 1500));
}

// Also check geometry coordinates for 8 station route
console.log("\n=== Route 2 Geometry Coordinates:");
const f2 = (result.Feature ?? [])[1] as any;
console.log("Coords:", f2?.Geometry?.Coordinates);
