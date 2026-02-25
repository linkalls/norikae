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

console.log("=== Feature top-level keys:", Object.keys(raw ?? {}));

// Check if Link exists anywhere recursively
const findLinks = (obj: any, path: string = ""): void => {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (key === "Link") {
      console.log(
        `Found Link at ${path}.${key}:`,
        JSON.stringify(obj[key], null, 2).slice(0, 3000),
      );
    } else if (typeof obj[key] === "object") {
      findLinks(obj[key], `${path}.${key}`);
    }
  }
};
findLinks(raw, "Feature[0]");

// Full Feature dump
console.log("\n=== Full Feature[0] JSON (first 8000 chars):");
console.log(JSON.stringify(raw, null, 2).slice(0, 8000));
