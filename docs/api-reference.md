# API リファレンス

Yahoo! 乗換案内 (`Y!乗換案内.7.55.4.apk`) から jadx + haas アノテーション解析で抽出した全エンドポイント。

---

## BFF API (Hono :3000)

フロントエンドは直接 Yahoo API を呼ばず、Hono BFF サーバーを経由する。

| メソッド | パス                               | 説明                      | 返却型                            |
| -------- | ---------------------------------- | ------------------------- | --------------------------------- |
| `GET`    | `/health`                          | ヘルスチェック            | `{ok, ts}`                        |
| `POST`   | `/api/search`                      | 経路検索                  | `{route[], from, to, searchDate}` |
| `GET`    | `/api/suggest?q=`                  | 駅名・スポットサジェスト  | `{stations[], spots[]}`           |
| `GET`    | `/api/station-names?codes=A,B,...` | 駅コード→日本語名・路線名 | `Record<code, StationNameInfo>`   |
| `GET`    | `/api/diainfo`                     | 運行情報                  | `{traininfo[]}`                   |
| `GET`    | `/api/stations?q=`                 | 駅名完全一致検索          | `{stations[]}`                    |

### StationNameInfo

```typescript
interface StationNameInfo {
  name: string; // 駅名 (日本語)
  railName?: string; // 路線名 (例: "山手線")
  companyName?: string; // 会社名 (例: "東日本旅客鉄道")
  yomi?: string; // 読み (片仮名)
}
```

### DiainfoItem

```typescript
interface DiainfoItem {
  railId?: string;
  railName?: string; // null の場合は広域情報 (isAreaLevel=true)
  companyName?: string;
  railwayTypeName?: string; // "特急", "在来線" など
  railAreaName?: string; // "関東" など
  isAreaLevel?: boolean;
  status?: "NORMAL" | "DELAY" | "STOP" | "PARTIAL";
  message?: string;
  updateDate?: string; // "YYYY-MM-DD HH:mm:ss"
}
```

### 乗換経路検索リクエスト

```typescript
interface SearchRequest {
  from: string; // 出発地名 または「駅名,code:XXXXXXX」形式
  to: string; // 目的地名
  via?: string; // 経由地名 (省略可)
  fcode?: string; // 出発地の駅/バス停コード (精度向上)
  tcode?: string; // 目的地の駅/バス停コード
  fromType?: number; // 出発地タイプ
  toType?: number; // 目的地タイプ
  date?: string; // "YYYYMMDDHHmm" (省略時: 現在時刻)
  type?: 1 | 4 | 8; // 1=出発 4=到着 8=終電
  sort?: 0 | 1 | 2; // 0=速い 1=乗換少 2=安い
  rosentype?: 0 | 1; // 0=通常 1=新幹線利用
}
```

### BFF `/api/search` レスポンス型

```typescript
interface SearchResponse {
  route: Route[];
  from: string;
  to: string;
  searchDate: string;
}

interface Route {
  totalTime: number; // 所要時間(分)
  transferCount: number; // 乗換回数
  fare: number; // 合計運賃(円)
  distance?: number; // 距離(km)
  co2?: number; // CO₂排出量(g)
  teikiMonth1?: number; // 定期代1ヶ月
  teikiMonth3?: number; // 定期代3ヶ月
  teikiMonth6?: number; // 定期代6ヶ月
  departureTime?: string; // 出発時刻 "HH:mm"
  arrivalTime?: string; // 到着時刻 "HH:mm"
  passStation?: string[]; // 経由駅コードリスト
  section?: Section[]; // レガシーセクション (非推奨)
  segments?: RouteSegment[]; // Edge ベース詳細セグメント (detail=full 時)
}

/** Edge ベースの乗車セグメント (detail=full 時に取得可能) */
interface RouteSegment {
  railName: string; // 路線名 or "徒歩"
  color?: string; // 路線色 "rgb(R,G,B)"
  isWalk: boolean; // 徒歩区間フラグ (Color=230,230,230 OR RailName="徒歩")
  walkLabel?: string; // 徒歩時の出口名 (例: "JR東口")
  departureTime?: string; // 発時刻 "HH:mm"
  arrivalTime?: string; // 着時刻 "HH:mm"
  /** 出発ホーム番号 (例: "3番線") — Edge.Property.DepartureTrackNumber */
  departureTrackNumber?: string;
  /** 到着ホーム番号 (例: "5番線") — Edge.Property.ArrivalTrackNumber */
  arrivalTrackNumber?: string;
  /** 行き先方面 (例: "新宿・中野方面") — Edge.Property.Destination */
  destination?: string;
  /** 列車番号 (例: "1020M") — Edge.Property.TrainNo */
  trainNo?: string;
  /** 列車種別 (例: "急行") — Edge.Property.TrainKind */
  trainKind?: string;
  /** 編成両数 (例: "10") — Edge.Property.NumOfCar */
  numOfCar?: string;
  stops: RouteStop[];
}

interface RouteStop {
  name: string; // 駅名
  code?: string; // 駅コード
  departureTime?: string; // 発時刻
  arrivalTime?: string; // 着時刻
}
```

### `/api/suggest` レスポンス

```typescript
interface SuggestResponse {
  stations: Station[];
  spots: Spot[];
}

interface Station {
  id: string; // 駅コード (例: "1130101")
  name: string; // 駅名
  yomi?: string;
  category: string; // "station" | "bus_stop"
}

interface Spot {
  id: string;
  name: string;
  category: string;
}
```

---

## Base URLs

| 識別子    | URL                                          | 用途                  |
| --------- | -------------------------------------------- | --------------------- |
| `navi`    | `https://navi-transit.yahooapis.jp`          | メイン乗換 API        |
| `diainfo` | `https://cache-diainfo-transit.yahooapis.jp` | 運行情報キャッシュ    |
| `map`     | `https://map.yahooapis.jp`                   | POI・地図情報         |
| `naviSec` | `https://transit-sec.yahooapis.jp`           | 要認証 (ルートメモ等) |
| `push`    | `https://subscription.push.yahooapis.jp`     | プッシュ通知          |

## 共通ヘッダー

```
User-Agent: Yahoo AppID:dj0zaiZpPWdPbmQ5Y1VFalVBMyZzPWNvbnN1bWVyc2VjcmV0Jng9ZDk-
Content-Type: application/json
Authorization: Bearer <token>  ← 認証必須エンドポイントのみ
```

---

## NaviApi (`navi-transit.yahooapis.jp`)

### `GET /v3/naviSearch` — ルート検索

```typescript
client.navi.search(params: NaviSearchRequest): Promise<NaviData>
```

| パラメータ  | 型                                     | 必須 | 説明                                                  |
| ----------- | -------------------------------------- | ---- | ----------------------------------------------------- |
| `from`      | `string`                               | ✅   | 出発地名                                              |
| `to`        | `string`                               | ✅   | 目的地名                                              |
| `date`      | `string`                               |      | 日時 `YYYYMMDDHHmm`                                   |
| `via`       | `string`                               |      | 経由地名                                              |
| `type`      | `number`                               |      | 1=出発, 4=到着, 8=終電                                |
| `sort`      | `number`                               |      | 0=到着順, 1=乗換数, 2=運賃                            |
| `rosentype` | `number`                               |      | 0=全路線, 1=新幹線含む                                |
| `detail`    | `"full"` \| `"simple"` \| `"standard"` |      | 詳細度。`"full"` で `Edge[]` 全停車駅・ホーム番号取得 |

### `GET /v3/naviSearchAuth` — ルート検索 (認証版)

認証トークン必須 (`transit-sec.yahooapis.jp`)

### `POST /v2/trainSearch` — 列車検索

```typescript
client.navi.trainSearch(params: TrainSearchRequest): Promise<NaviData>
```

### `GET /v1/assist` — 入力補完

```typescript
client.navi.assist(params: { query: string; results: number }): Promise<AssistData>
```

レスポンス例:

```json
{
  "Result": [
    { "id": "1130101", "name": "渋谷", "yomi": "しぶや", "category": "station" }
  ]
}
```

### `POST /v2/reroute` — 再ルート

### `GET /v2/registration/:type` — 登録データ取得

認証必須。`type`: `"itinerary"` | `"history"` | `"station"` など

### `GET /v1/registration/myTimetable/check` — マイ時刻表チェック

### `GET /v1/registration/myTimetable` — マイ時刻表一覧

### `POST /v1/registration/myTimetable` — マイ時刻表作成

### `DELETE /v1/registration/myTimetable/:id` — マイ時刻表削除

### `GET /dl/transit/android/app_setting.json` — アプリ設定

### `GET /v1/kousyou` — 構内図リスト

---

## DiainfoApi (`cache-diainfo-transit.yahooapis.jp` + `navi-transit.yahooapis.jp`)

### `GET /v4/diainfo/check` — 運行情報チェック

```typescript
client.diainfo.check(): Promise<DiainfoCheckData>
```

クエリパラメータ: `big=0`

レスポンス例:

```json
{
  "traininfo": [
    { "railId": "22608", "railName": "山手線", "status": "NORMAL" },
    {
      "railId": "22503",
      "railName": "中央線",
      "status": "DELAY",
      "message": "..."
    }
  ]
}
```

### `GET /v4/diainfo/train` — 列車運行情報詳細

```typescript
client.diainfo.trainInfo(params: object): Promise<DiainfoTrainData>
```

### `GET /v3/congestion/ugc/train` — 混雑 UGC 取得

### `POST /v3/congestion/ugc/train/increase` — 混雑報告

### `GET /v1/rail/search` — 路線検索

### `GET /v1/rail/:railId/stops` — 停車駅一覧

### `GET /v1/congestion/realtime/rail/:railId` — リアルタイム混雑

---

## TimetableApi (`navi-transit.yahooapis.jp`)

### `GET /v2/timetable/station` — 時刻表取得

```typescript
client.timetable.getStation(params: {
  stationCode: string;
  railCode: string;
  direction?: 1 | 2;
  date?: string;
}): Promise<TimetableStationData>
```

### `GET /v2/timetable/station/train/:trainNo` — 列車時刻表

### `GET /v2/timetable/busstop` — バス停時刻表

### `GET /v2/timetable/busstop/trip/:tripId` — バス便時刻表

### `GET /v2/timetable/directarrival/:code` — 直通先

### `GET /v2/timetable/direction/:code` — 行き先一覧

---

## LocationApi (`navi-transit.yahooapis.jp`)

### `POST /v3/location/bus` — バスリアルタイム位置

```typescript
client.location.getBus(param: object): Promise<LocationBusData>
```

### `POST /v2/location/train/trip` — 列車リアルタイム位置

### `GET /v1/location/train/jrw` — JR西日本列車位置

### `GET /v1/congestion/realtime/gate/list/:stationId` — 改札混雑

---

## PoiApi (`map.yahooapis.jp`)

### `GET /v1/poiSearch` — POI テキスト検索

```typescript
client.poi.search(params: PoiSearchRequest): Promise<PoiSearchData>
client.poi.searchStationExact(stationName: string): Promise<PoiSearchData>
client.poi.searchByStationId(stationId: string): Promise<PoiSearchData>
client.poi.searchSpot(spotName: string, start: number, results: string): Promise<PoiSearchData>
```

レスポンス (`Feature[]` の形式):

```json
{
  "Feature": [
    {
      "Id": "...",
      "Name": "渋谷駅",
      "Property": { "railCode": "22608", "stationCode": "1130101" }
    }
  ]
}
```

### `GET /v1/reverseGeoCoder` — 逆ジオコード

### `GET /v1/addressDirectory` — 住所ディレクトリ

### CRUD `/v1/mylist/transit/item` — お気に入り管理

### `GET /v1/comment` — コメント取得

---

## UgcApi (`navi-transit.yahooapis.jp`)

### `POST /v2/congestion/ugc/train` — 混雑報告投稿

```typescript
client.ugc.postCongestion(body: CongestionPostRequest): Promise<void>
```

### `PUT /v2/congestion/ugc/train` — 混雑報告更新

### `DELETE /v2/congestion/ugc/train/:railId/:direction/:station` — 混雑報告削除

### `GET /v2/congestion/ugc/train/timeline` — タイムライン取得

---

## BFF エンドポイント (webui Hono サーバー)

クライアント (React) → Hono (localhost:3000) → Yahoo API

| パス                     | メソッド | TS クライアント                                    |
| ------------------------ | -------- | -------------------------------------------------- |
| `/api/search`            | POST     | `client.navi.search()`                             |
| `/api/suggest?q=`        | GET      | `client.navi.assist()` + `client.poi.searchSpot()` |
| `/api/diainfo`           | GET      | `client.diainfo.check()`                           |
| `/api/stations?q=`       | GET      | `client.poi.searchStationExact()`                  |
| `/api/timetable/station` | GET      | `client.timetable.getStation()`                    |
| `/health`                | GET      | —                                                  |
