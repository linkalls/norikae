import { createNorikaeClient } from "./api-client/src/index.ts";

const client = createNorikaeClient({});

// Test: assist with station names to see if passStation codes match
const stations = [
  "渋谷",
  "代々木",
  "原宿",
  "新宿",
  "恵比寿",
  "目黒",
  "五反田",
  "大崎",
];
for (const name of stations) {
  const r = (await client.navi.assist({ query: name })) as any;
  const feat = r?.Feature?.find((f: any) => f?.Gid || f?.gid);
  if (feat) {
    console.log(
      `${name}: Gid=${feat?.Gid ?? feat?.gid}, Name=${feat?.Name ?? feat?.name}`,
    );
    console.log("  Full feat keys:", Object.keys(feat));
    console.log("  Property keys:", Object.keys(feat?.Property ?? {}));
  } else {
    // Maybe it's inside Feature differently
    const f0 = r?.Feature?.[0];
    console.log(
      `${name}: F0 keys:`,
      Object.keys(f0 ?? {}),
      "| Name:",
      f0?.Name,
    );
    console.log(
      "  F0 Property:",
      JSON.stringify(f0?.Property, null, 2).slice(0, 500),
    );
  }
}
