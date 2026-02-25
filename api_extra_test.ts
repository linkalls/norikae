import { createNorikaeClient } from "./api-client/src/index.ts";

const client = createNorikaeClient({});

// Test 1: try assist with station code
console.log("=== ASSIST with code 22715 ===");
try {
  const r1 = (await client.navi.assist({ query: "22715" })) as any;
  console.log(JSON.stringify(r1?.Feature?.slice(0, 2), null, 2));
} catch (e) {
  console.log("Error:", e);
}

// Test 2: try trainSearch to get detailed line info
console.log("\n=== trainSearch ===");
try {
  const r2 = (await client.navi.trainSearch({ haiku: "1" })) as any;
  console.log("trainSearch top keys:", Object.keys(r2 ?? {}));
  const tFeature = r2?.Feature?.[0];
  console.log("Feature[0] keys:", Object.keys(tFeature ?? {}));
  console.log("Feature[0]:", JSON.stringify(tFeature, null, 2).slice(0, 1500));
} catch (e) {
  console.log("trainSearch Error:", String(e).slice(0, 200));
}

// Test 3: look at full diainfo message for delayed entries
console.log("\n=== DIAINFO full delayed entries ===");
const diainfo = (await client.diainfo.check()) as any;
const delayed = (diainfo.detail ?? []).filter(
  (d: any) => d.diainfo?.serviceCondition !== "0",
);
console.log("Delayed count:", delayed.length);
delayed.forEach((d: any, i: number) => {
  console.log(`\nDelayed[${i}]:`, JSON.stringify(d, null, 2));
});
