import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { ApiError, createNorikaeClient } from "../../../api-client/src/";

const isProd = process.env.NODE_ENV === "production";

const client = createNorikaeClient({
  accessToken: process.env.NORIKAE_ACCESS_TOKEN,
});

const app = new Hono();

app.use("*", logger());
app.use("/api/*", cors());

// ─── ヘルパー: YYYYMMDDHHmm に分を加算 ─────────────────────────────────
function addMinutesToDateStr(dateStr: string, minutes: number): string {
  if (!dateStr || dateStr.length < 12) return dateStr;
  const y = parseInt(dateStr.slice(0, 4));
  const mo = parseInt(dateStr.slice(4, 6)) - 1;
  const d = parseInt(dateStr.slice(6, 8));
  const h = parseInt(dateStr.slice(8, 10));
  const m = parseInt(dateStr.slice(10, 12));
  const dt = new Date(y, mo, d, h, m + minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}${pad(dt.getHours())}${pad(dt.getMinutes())}`;
}

// ─── ヘルパー: Edge カラー RRRGGGBBB → rgb(R,G,B) ─────────────────────
function decodeEdgeColor(c: string | number): string {
  const s = String(Math.abs(Number(c))).padStart(9, "0");
  const r = parseInt(s.slice(0, 3));
  const g = parseInt(s.slice(3, 6));
  const b = parseInt(s.slice(6, 9));
  return `rgb(${r},${g},${b})`;
}

// ─── ヘルパー: StopStation 時刻 HMM/HHMM → "HH:mm" ─────────────────
function formatStopTime(v: string | number | undefined): string | undefined {
  if (v == null || v === "") return undefined;
  const s = String(v).padStart(4, "0");
  return `${s.slice(0, 2)}:${s.slice(2)}`;
}

// ─── ヘルパー: YYYYMMDDHHmm → "HH:mm" ─────────────────────────────
function formatDatetimeToHHmm(dt: string | undefined): string | undefined {
  if (!dt || dt.length < 12) return undefined;
  return `${dt.slice(8, 10)}:${dt.slice(10, 12)}`;
}

// ─── ルート検索 ───────────────────────────────────────────────────────
app.post("/api/search", async (c) => {
  const body = await c.req.json<{
    from: string;
    to: string;
    /** 出発地の駅/バス停コード (Assist Code) */
    fcode?: string;
    /** 目的地の駅/バス停コード (Assist Code) */
    tcode?: string;
    /** 出発地種別: "st"駅, "bu"バス停, "lm"ランドマーク */
    fromType?: string;
    /** 目的地種別: "st"駅, "bu"バス停, "lm"ランドマーク */
    toType?: string;
    date?: string; // YYYYMMDDHHmm
    via?: string;
    type?: number; // 1=出発, 4=到着, 8=終電
    sort?: number; // 0=快速, 1=乗換少, 2=安い
  }>();

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  const searchDate = body.date ?? defaultDate;

  try {
    const result = await client.navi.search({
      from: body.from,
      to: body.to,
      fcode: body.fcode,
      tcode: body.tcode,
      date: searchDate,
      via: body.via,
      type: (body.type as 1 | 2 | 3 | 4 | 5) ?? 1,
      sort: (body.sort as 0 | 1 | 2) ?? undefined,
      // Edge データを取得するための追加パラメータ
      detail: "full",
      lsinfo: "1",
      split: "1",
    } as Parameters<typeof client.navi.search>[0]);

    type RawProp = Record<string, unknown>;
    type RawPrice = { Value?: string };
    type RawStop = {
      Name?: string;
      Code?: string;
      ArraivalTime?: string | number;
      DepartureTime?: string | number;
    };
    type RawEdge = {
      Property?: {
        RailName?: string;
        Color?: string | number;
        TrainType?: number;
        DepartureDatetime?: string;
        ArrivalDatetime?: string;
        /** 出発ホーム番号 (e.g. "3番線") */
        DepartureTrackNumber?: string;
        /** 到着ホーム番号 */
        ArrivalTrackNumber?: string;
        /** 行き先方面 (e.g. "\u65b0宿・中野方面") */
        Destination?: string;
        /** 列車番号 (e.g. "1020材子") */
        TrainNo?: string;
        /** 列車種別 (e.g. "局1") */
        TrainKind?: string;
        /** 編成両数 (e.g. "10") */
        NumOfCar?: string;
        /** 乗車位置ドア */
        Door?: string;
        StopStation?: RawStop[];
        RidingBusInfo?: Record<string, unknown>;
      };
    };
    type RawLink = {
      Id?: string;
      Name?: string;
      Time?: number;
      Distance?: number;
      Type?: number;
      Transport?: {
        Type?: number;
        From?: {
          Name?: string;
          Code?: string;
          Yomi?: string;
          Time?: string;
          GateTime?: string;
        };
        To?: {
          Name?: string;
          Code?: string;
          Yomi?: string;
          Time?: string;
          GateTime?: string;
        };
        Line?: {
          Name?: string;
          Color?: string;
          BusName?: string;
          Type?: number;
          TrainType?: { Name?: string; Color?: string; BgColor?: string };
        };
      };
    };

    const routes = (result.Feature ?? []).map((f) => {
      const raw = f as unknown as Record<string, unknown>;
      const ri = raw["RouteInfo"] as Record<string, unknown> | undefined;
      const prop = ri?.["Property"] as RawProp | undefined;
      const totalPrice = prop?.["TotalPrice"] as RawProp | undefined;
      const priceArr = prop?.["Price"] as RawPrice[] | undefined;
      const teiki = totalPrice?.["Teiki"] as Record<string, string> | undefined;
      const sortProp = prop?.["Sort"] as Record<string, string> | undefined;
      const fare =
        Number(
          (totalPrice?.["TotalPrice"] as string) ?? priceArr?.[0]?.Value ?? 0,
        ) || 0;
      const timeOnBoard = Number(prop?.["TimeOnBoard"] ?? 0) || 0;
      const timeOther = Number(prop?.["TimeOther"] ?? 0) || 0;
      const timeWalk = Number(prop?.["TimeWalk"] ?? 0) || 0;
      const totalMin = timeOnBoard + timeOther;

      // ソートバッジ: Sort.Fast/Easy/Cheap が "1" の場合
      let badge: string | undefined;
      if (sortProp?.["Fast"] === "1") badge = "最速";
      else if (sortProp?.["Easy"] === "1") badge = "乗換少";
      else if (sortProp?.["Cheap"] === "1") badge = "最安";

      // ─── Edge データを解析してセグメントを構築 (detail=full 時に取得可) ───
      const rawEdges = (ri?.["Edge"] as RawEdge[] | undefined) ?? [];
      const segments = rawEdges.map((edge) => {
        const ep = edge.Property;
        const railName = ep?.RailName ?? "";
        // 徒歩判定: RailName=="徒歩" OR Color==230230230 (APK定義の徒歩グレー)
        const rawColorNum = ep?.Color != null ? Math.abs(Number(ep.Color)) : -1;
        const isWalk = railName === "徒歩" || rawColorNum === 230230230;
        const color = ep?.Color != null ? decodeEdgeColor(ep.Color) : undefined;
        // 徒歩なのに RailName が出口名の場合 (例: "JR東口") → walkLabel に保持
        const walkLabel =
          isWalk && railName !== "" && railName !== "徒歩"
            ? railName
            : undefined;
        const stops = (ep?.StopStation ?? []).map((s) => ({
          name: s.Name ?? "",
          code: s.Code ?? undefined,
          arrivalTime: formatStopTime(s.ArraivalTime),
          departureTime: formatStopTime(s.DepartureTime),
        }));
        return {
          railName,
          color,
          isWalk,
          walkLabel,
          departureTime: formatDatetimeToHHmm(ep?.DepartureDatetime),
          arrivalTime: formatDatetimeToHHmm(ep?.ArrivalDatetime),
          /** 出発ホーム番号 e.g. "3番線" */
          departureTrackNumber: ep?.DepartureTrackNumber ?? undefined,
          /** 到着ホーム番号 */
          arrivalTrackNumber: ep?.ArrivalTrackNumber ?? undefined,
          /** 行き先方面 */
          destination: ep?.Destination ?? undefined,
          /** 列車番号 */
          trainNo: ep?.TrainNo ?? undefined,
          /** 列車種別 */
          trainKind: ep?.TrainKind ?? undefined,
          /** 編成両数 */
          numOfCar: ep?.NumOfCar ?? undefined,
          stops,
        };
      });

      // 出発・到着時刻を Edge から取得 (なければ推定値)
      const firstEdgeDep = rawEdges[0]?.Property?.DepartureDatetime;
      const lastEdgeArr =
        rawEdges[rawEdges.length - 1]?.Property?.ArrivalDatetime;
      const departureTime = firstEdgeDep ?? searchDate;
      const arrivalTime =
        lastEdgeArr ?? addMinutesToDateStr(searchDate, totalMin);

      // セクション (Link) データ (v3 では通常空)
      const rawLinks = (prop?.["Link"] as RawLink[] | undefined) ?? [];
      const sections = rawLinks.map((link) => ({
        type: link.Type ?? 0,
        name: link.Name ?? "",
        time: link.Time ?? 0,
        distance: link.Distance ?? 0,
        from: link.Transport?.From
          ? {
              name: link.Transport.From.Name ?? "",
              code: link.Transport.From.Code ?? "",
              time: link.Transport.From.Time ?? "",
              gateTime: link.Transport.From.GateTime,
            }
          : undefined,
        to: link.Transport?.To
          ? {
              name: link.Transport.To.Name ?? "",
              code: link.Transport.To.Code ?? "",
              time: link.Transport.To.Time ?? "",
              gateTime: link.Transport.To.GateTime,
            }
          : undefined,
        line: link.Transport?.Line
          ? {
              name: link.Transport.Line.Name ?? "",
              color: link.Transport.Line.Color ?? "",
              busName: link.Transport.Line.BusName,
              type: link.Transport.Line.Type ?? 0,
              trainType: link.Transport?.Line?.TrainType?.Name,
              trainTypeBg: link.Transport?.Line?.TrainType?.BgColor,
              trainTypeColor: link.Transport?.Line?.TrainType?.Color,
            }
          : undefined,
      }));

      return {
        totaltime: timeOnBoard,
        timeOther,
        timeWalk,
        transfer: Number(prop?.["TransferCount"] ?? 0) || 0,
        fare: {
          total: fare,
          teiki1: teiki?.["Teiki1"],
          teiki3: teiki?.["Teiki3"],
          teiki6: teiki?.["Teiki6"],
        },
        name: (raw["Name"] as string) ?? "",
        passStation: (prop?.["PassStation"] as string[]) ?? [],
        distance: Number(prop?.["Distance"] ?? 0) || 0,
        co2: Number(prop?.["ExhaustCO2"] ?? 0) || 0,
        badge,
        departureTime,
        arrivalTime,
        segments: segments.length > 0 ? segments : undefined,
        section: sections.length > 0 ? sections : undefined,
      };
    });

    return c.json({
      ok: true,
      data: { route: routes, searchDate, from: body.from, to: body.to },
    });
  } catch (e) {
    if (e instanceof ApiError) {
      return c.json(
        { ok: false, error: e.message, body: e.body },
        e.status as 400 | 403 | 404 | 500,
      );
    }
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// ─── 駅コード → 名称一括変換 ─────────────────────────────────────────────
interface StationNameInfo {
  name: string;
  railName?: string;
  companyName?: string;
  yomi?: string;
  platformNo?: string;
}
app.get("/api/station-names", async (c) => {
  const codesParam = c.req.query("codes") ?? "";
  const codes = codesParam.split(",").filter(Boolean).slice(0, 100);
  if (codes.length === 0) return c.json({ ok: true, data: {} });
  try {
    // 並列数を制限するバッチ処理 (レート制限対策)
    const CONCURRENCY = 5;
    const map: Record<string, StationNameInfo> = {};
    for (let i = 0; i < codes.length; i += CONCURRENCY) {
      const batch = codes.slice(i, i + CONCURRENCY);
      const entries = await Promise.allSettled(
        batch.map(async (code) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = (await client.poi.searchByStationId(code)) as any;
            const feat = r?.Feature?.[0];
            const name = feat?.Name ?? feat?.name;
            const tsi = feat?.TransitSearchInfo?.Detail;
            const railName: string | undefined = tsi?.RailName;
            const companyName: string | undefined = tsi?.CompanyName;
            const yomi: string | undefined = feat?.Yomi ?? feat?.yomi;
            // ホーム番号 (利用可能な場合)
            const platformNo: string | undefined =
              tsi?.PlatformNumber ??
              tsi?.TrackNumber ??
              tsi?.Platform ??
              undefined;
            const info: StationNameInfo = {
              name: name ?? code,
              railName,
              companyName,
              yomi,
              ...(platformNo ? { platformNo } : {}),
            };
            return [code, info] as [string, StationNameInfo];
          } catch {
            return [code, { name: code }] as [string, StationNameInfo];
          }
        }),
      );
      for (const e of entries) {
        if (e.status === "fulfilled") map[e.value[0]] = e.value[1];
      }
    }
    return c.json({ ok: true, data: map });
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// ─── 運行情報 ───────────────────────────────────────────────────────
app.get("/api/diainfo", async (c) => {
  try {
    const result = await client.diainfo.check();
    // 実際の API レスポンスは detail[] を返す
    // serviceCondition: "0"=平常, "1"=遅延, "2"=運転見合わせ, "3"=一部遅延
    const raw = result as unknown as {
      detail?: {
        companyCode?: string | null;
        companyName?: string | null;
        railCode?: string | null;
        railName?: string | null;
        railwayTypeCode?: number | null;
        railwayTypeName?: string | null;
        railAreaCode?: string | null;
        railAreaName?: string | null;
        diainfo?: {
          serviceCondition?: string;
          serviceStatus?: number;
          updateDate?: string;
          message?: string;
        };
      }[];
    };
    const condMap: Record<string, string> = {
      "0": "NORMAL",
      "1": "DELAY",
      "2": "STOP",
      "3": "PARTIAL",
    };
    const traininfo = (raw.detail ?? []).map((d) => {
      // 路線名の組み立て: 「JR東日本 特急」「関東 在来線」など
      let railName: string | undefined;
      if (d.railName) {
        railName = d.railName;
      } else if (d.companyName && d.railwayTypeName) {
        railName = `${d.companyName} ${d.railwayTypeName}`;
      } else if (d.railAreaName && d.railwayTypeName) {
        railName = `${d.railAreaName} ${d.railwayTypeName}`;
      } else {
        railName =
          d.companyName ?? d.railAreaName ?? d.railwayTypeName ?? undefined;
      }
      return {
        railId: d.railCode ?? undefined,
        railName,
        companyName: d.companyName ?? undefined,
        railwayTypeName: d.railwayTypeName ?? undefined,
        railAreaName: d.railAreaName ?? undefined,
        isAreaLevel: !d.railName && !d.railCode, // 路線名なし＝広域情報
        status: condMap[d.diainfo?.serviceCondition ?? "0"] ?? "NORMAL",
        message: d.diainfo?.message ?? undefined,
        updateDate: d.diainfo?.updateDate ?? undefined,
      };
    });
    return c.json({ ok: true, data: { traininfo } });
  } catch (e) {
    if (e instanceof ApiError) {
      return c.json({ ok: false, error: e.message }, e.status as 500);
    }
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// ─── 補完 (駅名・地名) ───────────────────────────────────────────────
app.get("/api/suggest", async (c) => {
  const q = c.req.query("q");
  if (!q || q.trim().length === 0)
    return c.json({ ok: true, data: { stations: [], spots: [] } });

  try {
    const [assistRes, spotRes] = await Promise.allSettled([
      client.navi.assist({ query: q.trim(), results: 10 }),
      client.poi.searchSpot(q.trim(), 1, "8"),
    ]);

    /**
     * Assist API の返すフィールド名は PascalCase（Suggest, Yomi, Lat, Lon, Id, Code）
     * Id の値: "st"=駅, "bu"=バス停, "lm"=ランドマーク
     */
    const stations =
      assistRes.status === "fulfilled"
        ? (assistRes.value.Result ?? []).map((r) => {
            const raw = r as unknown as Record<string, string>;
            return {
              id: raw["Code"] ?? raw["code"] ?? "",
              name: raw["Suggest"] ?? raw["name"] ?? "",
              yomi: raw["Yomi"] ?? raw["yomi"] ?? "",
              lat: raw["Lat"] ?? raw["lat"] ?? "",
              lon: raw["Lon"] ?? raw["lon"] ?? "",
              address: raw["Address"] ?? raw["address"] ?? "",
              type: raw["Id"] ?? raw["id"] ?? "st", // "st"=駅, "bu"=バス停, "lm"=ランドマーク
              category: "station" as const,
            };
          })
        : [];

    const spots =
      spotRes.status === "fulfilled"
        ? (spotRes.value.Feature ?? []).map((f) => ({
            id: f.Id,
            name: f.Name,
            category: "spot" as const,
            address: f.Address,
          }))
        : [];

    return c.json({
      ok: true,
      data: { stations, spots },
    });
  } catch (e) {
    if (e instanceof ApiError) {
      return c.json({ ok: false, error: e.message }, e.status as 400 | 500);
    }
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// ─── 駅名検索 ───────────────────────────────────────────────────────
app.get("/api/stations", async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json({ ok: false, error: "q is required" }, 400);

  try {
    const result = await client.poi.searchStationExact(q);
    return c.json({ ok: true, data: result });
  } catch (e) {
    if (e instanceof ApiError) {
      return c.json(
        { ok: false, error: e.message },
        e.status as 400 | 404 | 500,
      );
    }
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// ─── 時刻表 ───────────────────────────────────────────────────────
app.get("/api/timetable/station", async (c) => {
  const stationCode = c.req.query("stationCode") ?? "";
  const railCode = c.req.query("railCode") ?? "";
  const direction = c.req.query("direction") ?? "1";
  const date = c.req.query("date");

  if (!stationCode || !railCode) {
    return c.json(
      { ok: false, error: "stationCode and railCode are required" },
      400,
    );
  }

  try {
    const result = await client.timetable.getStation({
      stationCode,
      railCode,
      direction: direction,
      date,
    } as Parameters<typeof client.timetable.getStation>[0]);
    return c.json({ ok: true, data: result });
  } catch (e) {
    if (e instanceof ApiError) {
      return c.json(
        { ok: false, error: e.message },
        e.status as 400 | 404 | 500,
      );
    }
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// ─── 本番: 静的ファイル配信 ───────────────────────────────────────
if (isProd) {
  app.use("*", serveStatic({ root: "./dist/static" }));
  app.get("*", serveStatic({ path: "./dist/static/index.html" }));
}

// ─── Health check ───────────────────────────────────────────────────
app.get("/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

const port = Number(process.env.PORT ?? 3000);
console.log(`🚃 乗換案内 server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
