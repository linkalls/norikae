import { createNorikaeClient } from "./api-client/src/index.ts";

const client = createNorikaeClient({});

// 1. diainfo raw response
console.log("=== DIAINFO RAW ===");
const diainfo = (await client.diainfo.check()) as any;
// Print full structure
const keys = Object.keys(diainfo ?? {});
console.log("Top level keys:", keys);
if (diainfo?.detail) {
  console.log("detail count:", diainfo.detail.length);
  console.log("detail[0]:", JSON.stringify(diainfo.detail[0], null, 2));
  console.log("detail[1]:", JSON.stringify(diainfo.detail[1], null, 2));
  // Find delayed ones
  const delayed = diainfo.detail.filter(
    (d: any) => d.diainfo?.serviceCondition !== "0",
  );
  console.log(`\nDelayed/issues (${delayed.length}):`);
  delayed.forEach((d: any) => console.log(JSON.stringify(d, null, 2)));
}
