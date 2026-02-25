/** フロントエンド → Hono サーバー API ラッパー */

export interface SearchHistory {
  from: string;
  to: string;
}

const BASE = "";

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path);
  const json: { ok: boolean; data?: T; error?: string } = await res.json();
  if (!json.ok) throw new Error(json.error ?? "Unknown error");
  return json.data as T;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: { ok: boolean; data?: T; error?: string } = await res.json();
  if (!json.ok) throw new Error(json.error ?? "Unknown error");
  return json.data as T;
}

// ─── 型定義 ──────────────────────────────────────────────────────────

export interface SearchRequest {
  from: string;
  to: string;
  /** 出発地の駅/バス停コード (Assist Code フィールド) */
  fcode?: string;
  /** 目的地の駅/バス停コード (Assist Code フィールド) */
  tcode?: string;
  /** 出発地種別: "st"=駅, "bu"=バス停, "lm"=ランドマーク */
  fromType?: string;
  /** 目的地種別: "st"=駅, "bu"=バス停, "lm"=ランドマーク */
  toType?: string;
  date?: string;
  via?: string;
  type?: number;
  sort?: number; // 0=速い, 1=乗換少, 2=安い
  rosentype?: number;
}

// ─── Edge ベースのセグメント型 ─────────────────────────────────────

export interface RouteStop {
  name: string;
  code?: string;
  arrivalTime?: string; // "HH:mm"
  departureTime?: string; // "HH:mm"
}

export interface RouteSegment {
  railName: string; // 路線名 or "徒歩"
  color?: string; // "rgb(R,G,B)"
  isWalk: boolean;
  /** 徒歩区間なのに railName が出口名の場合 (例: "JR東口") */
  walkLabel?: string;
  departureTime?: string; // "HH:mm"
  arrivalTime?: string; // "HH:mm"
  /** 出発ホーム番号 (例: "3番線") */
  departureTrackNumber?: string;
  /** 到着ホーム番号 */
  arrivalTrackNumber?: string;
  /** 行き先方面 (例: "新宿・中野方面") */
  destination?: string;
  /** 列車番号 (例: "1020M") */
  trainNo?: string;
  /** 列車種別 (例: "急行") */
  trainKind?: string;
  /** 編成両数 (例: "10") */
  numOfCar?: string;
  stops: RouteStop[];
}

/** ルート検索1件 */
export interface Route {
  totaltime?: number;
  timeOther?: number; // 乗換待ち時間 (分)
  timeWalk?: number; // 合計徒歩時間 (分)
  fare?: {
    total?: number;
    teiki1?: string; // 1ヶ月定期
    teiki3?: string; // 3ヶ月定期
    teiki6?: string; // 6ヶ月定期
  };
  transfer?: number;
  name?: string;
  passStation?: string[]; // 経由駅コード配列
  distance?: number; // 距離 (km)
  co2?: number; // CO2排出量 (g)
  badge?: string; // "最速" | "乗換少" | "最安"
  departureTime?: string; // 出発時刻 YYYYMMDDHHmm
  arrivalTime?: string; // 到着時刻 YYYYMMDDHHmm
  /** Edge ベースのセグメントデータ (detail=full 時に取得) */
  segments?: RouteSegment[];
  section?: Section[];
}

export interface Section {
  type?: number; // 0=walk, 1=train etc
  name?: string;
  time?: number; // 所要時間(分)
  distance?: number;
  from?: {
    name?: string;
    code?: string;
    time?: string; // YYYYMMDDHHmm
    gateTime?: string;
  };
  to?: {
    name?: string;
    code?: string;
    time?: string; // YYYYMMDDHHmm
    gateTime?: string;
  };
  line?: {
    name?: string;
    color?: string;
    busName?: string;
    type?: number;
    trainType?: string; // 列車種別名 (特急, 急行, etc.)
    trainTypeBg?: string;
    trainTypeColor?: string;
  };
}

/** 運行情報1件 */
export interface DiainfoItem {
  railId?: string;
  railName?: string;
  companyName?: string;
  railwayTypeName?: string;
  railAreaName?: string;
  isAreaLevel?: boolean; // 路線名なし＝広域情報
  status?: string; // "NORMAL" | "DELAY" | "STOP" etc.
  message?: string;
  updateDate?: string; // "YYYY-MM-DD HH:mm:ss"
}

/** 駅情報 */
export interface Station {
  stationCode?: string;
  name?: string;
  railCode?: string;
  railName?: string;
  lat?: number;
  lon?: number;
}

// ─── API 関数 ──────────────────────────────────────────────────────────

export const searchRoutes = (req: SearchRequest) =>
  apiPost<{ route?: Route[]; searchDate?: string; from?: string; to?: string }>(
    "/api/search",
    req,
  );

export const getDiainfo = () =>
  apiGet<{ traininfo?: DiainfoItem[] }>("/api/diainfo");

/** 駅コード → 詳細情報 */
export interface StationNameInfo {
  name: string;
  railName?: string;
  companyName?: string;
  yomi?: string;
  platformNo?: string;
}

export const searchStations = (q: string) =>
  apiGet<{
    feature?: {
      property?: { name?: string; code?: string; railCode?: string };
    }[];
  }>(`/api/stations?q=${encodeURIComponent(q)}`);

export const getStationNames = (codes: string[]) =>
  apiGet<Record<string, StationNameInfo>>(
    `/api/station-names?codes=${encodeURIComponent(codes.join(","))}`,
  );

export const getTimetable = (params: {
  stationCode: string;
  railCode: string;
  direction?: number;
}) =>
  apiGet<{
    stationCode?: string;
    railCode?: string;
    train?: {
      trainName?: string;
      rows?: { time?: string; destination?: string }[];
    }[];
  }>(
    `/api/timetable/station?stationCode=${params.stationCode}&railCode=${params.railCode}&direction=${params.direction ?? 1}`,
  );

// ─── 入力補完 ──────────────────────────────────────────────────────────

export interface SuggestStation {
  /** 駅コード (Assist API の Code フィールド) */
  id: string;
  name: string;
  yomi?: string;
  lat?: string;
  lon?: string;
  address?: string;
  /** 種別: "st"=駅, "bu"=バス停, "lm"=ランドマーク */
  type?: string;
  category?: "station";
}

export interface SuggestSpot {
  id: string;
  name: string;
  category: "spot";
  address?: string;
}

export interface SuggestResult {
  stations: SuggestStation[];
  spots: SuggestSpot[];
}

export const suggestItems = (q: string) =>
  apiGet<SuggestResult>(`/api/suggest?q=${encodeURIComponent(q)}`);
