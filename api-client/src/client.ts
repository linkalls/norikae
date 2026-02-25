import { DiainfoApi } from "./api/diainfoApi";
import { LocationApi } from "./api/locationApi";
import { NaviApi } from "./api/naviApi";
import { PoiApi } from "./api/poiApi";
import { TimetableApi } from "./api/timetableApi";
import { UgcApi } from "./api/ugcApi";
import type { ClientConfig } from "./http";
import { BASE_URLS, createHttpClient } from "./http";

export { BASE_URLS };
export type { ClientConfig };

/**
 * 乗換案内 API クライアント
 *
 * @example
 * ```ts
 * import { NorikaeClient } from "norikae-api-client";
 *
 * const client = new NorikaeClient({
 *   appId: "your-app-id",
 *   accessToken: "your-access-token", // 認証不要の API はなくてもOK
 * });
 *
 * // ルート検索
 * const routes = await client.navi.search({
 *   from: "渋谷",
 *   to: "新宿",
 *   date: "202602251200",
 *   type: 1, // 出発時刻指定
 * });
 *
 * // 駅名検索
 * const stations = await client.poi.searchStationExact("渋谷");
 *
 * // 時刻表取得
 * const timetable = await client.timetable.getStation({
 *   stationCode: "1130101",
 *   railCode: "22608",
 * });
 *
 * // 運行情報チェック
 * const diainfo = await client.diainfo.check();
 * ```
 */
export class NorikaeClient {
  /**
   * ルート検索・列車情報・登録データ API
   * Base: https://navi-transit.yahooapis.jp
   */
  readonly navi: NaviApi;

  /**
   * 運行情報・混雑情報 API
   * Base: https://cache-diainfo-transit.yahooapis.jp + https://navi-transit.yahooapis.jp
   */
  readonly diainfo: DiainfoApi;

  /**
   * 時刻表 API
   * Base: https://cache-navi-transit.yahooapis.jp (station) / https://navi-transit.yahooapis.jp (busstop)
   */
  readonly timetable: TimetableApi;

  /**
   * リアルタイム位置情報 API
   * Base: https://navi-transit.yahooapis.jp
   */
  readonly location: LocationApi;

  /**
   * POI検索・地点情報・お気に入り API
   * Base: https://poi-transit.yahooapis.jp (poiSearch) / https://map.yahooapis.jp (geocode/address/keep)
   */
  readonly poi: PoiApi;

  /**
   * 混雑UGC API
   * Base: https://navi-transit.yahooapis.jp
   */
  readonly ugc: UgcApi;

  constructor(config: ClientConfig = {}) {
    /** navi-transit.yahooapis.jp - 主要エンドポイント (output=json を常に付与) */
    const naviClient = createHttpClient(BASE_URLS.navi, {
      ...config,
      defaultParams: { output: "json", ...config.defaultParams },
    });

    /** transit-sec.yahooapis.jp - 認証が必要なエンドポイント */
    const secClient = createHttpClient(BASE_URLS.naviSec, config, true);

    /** cache-diainfo-transit.yahooapis.jp - ダイヤ情報キャッシュ */
    const diainfoClient = createHttpClient(BASE_URLS.diainfo, {
      ...config,
      defaultParams: { output: "json", ...config.defaultParams },
    });

    /**
     * poi-transit.yahooapis.jp - POI検索・駅名補完
     * Assist.java / PoiSearch.java が使用するエンドポイント
     * haas/dp.java: y84.a(..., "https://poi-transit.yahooapis.jp", 54)
     */
    const poiTransitClient = createHttpClient(BASE_URLS.poiTransit, {
      ...config,
      defaultParams: { output: "json", ...config.defaultParams },
    });

    /**
     * cache-navi-transit.yahooapis.jp - キャッシュ乗換案内 API
     * TimetableStation.java / DiainfoCgm.java が使用するエンドポイント
     * haas/b42.java: y84.a(..., "https://cache-navi-transit.yahooapis.jp", 54)
     */
    const cacheNaviClient = createHttpClient(BASE_URLS.cacheNavi, {
      ...config,
      defaultParams: { output: "json", ...config.defaultParams },
    });

    /**
     * map.yahooapis.jp - 地図・逆ジオコーダー・住所・お気に入り
     * AppID は query param として送信 (ReverseGeoCoder.java の HashMap から)
     * AppID: dj00aiZpPUVkd3FZTVJFZHhWNCZzPWNvbnN1bWVyc2VjcmV0Jng9N2E-
     */
    const mapClient = createHttpClient(BASE_URLS.map, {
      ...config,
      defaultParams: {
        appid: "dj00aiZpPUVkd3FZTVJFZHhWNCZzPWNvbnN1bWVyc2VjcmV0Jng9N2E-",
        output: "json",
        ...config.defaultParams,
      },
    });

    this.navi = new NaviApi(naviClient, secClient, poiTransitClient);
    this.diainfo = new DiainfoApi(diainfoClient, naviClient);
    this.timetable = new TimetableApi(naviClient, cacheNaviClient);
    this.location = new LocationApi(naviClient);
    this.poi = new PoiApi(poiTransitClient, mapClient);
    this.ugc = new UgcApi(naviClient);
  }
}

/**
 * クライアントを作成するファクトリー関数
 *
 * @example
 * const client = createNorikaeClient({ accessToken: "token" });
 */
export function createNorikaeClient(config: ClientConfig = {}): NorikaeClient {
  return new NorikaeClient(config);
}
