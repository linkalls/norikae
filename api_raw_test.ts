import { createNorikaeClient } from "./api-client/src/index.ts";

const client = createNorikaeClient({});
const result = await client.navi.search({
  from: "渋谷",
  to: "新宿",
  date: "202602251425",
  type: 1,
});

// 最初のルートのみ詳細表示
const f = (result.Feature ?? [])[0];
const raw = f as any;
const ri = raw?.RouteInfo;
const prop = ri?.Property;

console.log("=== RouteInfo keys:", Object.keys(ri ?? {}));
console.log("=== Property keys:", Object.keys(prop ?? {}));

if (prop?.Section) {
  const secs = prop.Section;
  console.log(
    "Section count:",
    Array.isArray(secs) ? secs.length : "not array",
  );
  if (Array.isArray(secs)) {
    secs.forEach((s: any, i: number) => {
      console.log(`Section[${i}]:`, JSON.stringify(s, null, 2).slice(0, 800));
    });
  }
} else {
  console.log("Section: NOT FOUND");
}

// Full dump first 4000 chars
console.log("=== Full Property:", JSON.stringify(prop, null, 2).slice(0, 4000));
