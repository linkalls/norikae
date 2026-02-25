# norikae-api-client

Yahoo! 乗換案内 内部 API の TypeScript クライアントライブラリ。  
外部依存ゼロ・Native `fetch` ベース。

## インストール

Bun workspaces から参照:

```json
{
  "dependencies": {
    "norikae-api-client": "workspace:*"
  }
}
```

## 基本的な使い方

```typescript
import { createNorikaeClient } from "norikae-api-client";

const client = createNorikaeClient({
  accessToken: process.env.NORIKAE_ACCESS_TOKEN, // 任意 (認証不要 API は省略可)
});

// ─── ルート検索 ───────────────────────────────────────────────
const result = await client.navi.search({
  from: "渋谷",
  to: "新宿",
  date: "202602251300", // YYYYMMDDHHmm
  type: 1, // 1=出発, 4=到着, 8=終電
  sort: 0, // 0=到着時刻順, 1=乗換回数順, 2=運賃順
  detail: 3,
});
console.log(result.Route);

// ─── 入力補完 ─────────────────────────────────────────────────
const suggest = await client.navi.assist({ query: "しぶや", results: 10 });
console.log(suggest.Result);

// ─── 運行情報 ─────────────────────────────────────────────────
const diainfo = await client.diainfo.check();

// ─── 駅名検索 ─────────────────────────────────────────────────
const stations = await client.poi.searchStationExact("渋谷");
console.log(stations.Feature);

// ─── 時刻表 ───────────────────────────────────────────────────
const timetable = await client.timetable.getStation({
  stationCode: "1130101",
  railCode: "22608",
  direction: 1,
});

// ─── リアルタイム位置情報 ────────────────────────────────────
const location = await client.location.getTrainTrip({ railId: "22608" });
```

## クライアント設定

```typescript
interface ClientConfig {
  appId?: string; // Yahoo AppID (User-Agent に埋め込み済み)
  accessToken?: string; // OAuth Bearer トークン (認証必須 API 用)
  timeout?: number; // タイムアウト ms (デフォルト: 15000)
  headers?: Record<string, string>; // 追加ヘッダー
}
```

## API モジュール一覧

| プロパティ         | クラス         | Base URL                             | 説明                   |
| ------------------ | -------------- | ------------------------------------ | ---------------------- |
| `client.navi`      | `NaviApi`      | `navi-transit.yahooapis.jp`          | ルート検索・補完・登録 |
| `client.diainfo`   | `DiainfoApi`   | `cache-diainfo-transit.yahooapis.jp` | 運行情報・混雑         |
| `client.timetable` | `TimetableApi` | `navi-transit.yahooapis.jp`          | 時刻表                 |
| `client.location`  | `LocationApi`  | `navi-transit.yahooapis.jp`          | リアルタイム位置       |
| `client.poi`       | `PoiApi`       | `map.yahooapis.jp`                   | 地点検索・お気に入り   |
| `client.ugc`       | `UgcApi`       | `navi-transit.yahooapis.jp`          | 混雑 UGC               |

## エラーハンドリング

```typescript
import { ApiError, createNorikaeClient } from "norikae-api-client";

try {
  const result = await client.navi.search({ from: "渋谷", to: "新宿" });
} catch (e) {
  if (e instanceof ApiError) {
    console.error(`HTTP ${e.status}:`, e.body);
    // e.status: number, e.body: unknown (API のエラー JSON)
  }
}
```

## ビルド

```bash
# 型チェック
bun tsc --noEmit
```

## API ドキュメント

→ [../docs/api-reference.md](../docs/api-reference.md)  
→ [../docs/auth.md](../docs/auth.md)
