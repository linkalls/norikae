import { HttpClient } from "../http";

import {
  AddressDirectoryData,
  CommentData,
  KeepItemData,
  KeepItemDeleteData,
  KeepItemListData,
  PoiSearchData,
  PoiSearchRequest,
  ReverseGeoCoderData,
} from "../types";

/**
 * 地点・POI検索 API
 *
 * - `/v1/poiSearch` → `poi-transit.yahooapis.jp` (PoiSearch.java より)
 * - 逆ジオコーダー・住所・お気に入り → `map.yahooapis.jp`
 */
export class PoiApi {
  constructor(
    private readonly poiTransitClient: HttpClient,
    private readonly mapClient: HttpClient,
  ) {}

  // --------------------------------------------------
  // POI 検索
  // --------------------------------------------------

  /**
   * POI テキスト検索 (GET /v1/poiSearch)
   *
   * @example
   * const result = await api.poi.search({ query: "渋谷駅", results: "5", detail: "navi" });
   */
  async search(params: PoiSearchRequest): Promise<PoiSearchData> {
    return this.poiTransitClient.get<PoiSearchData>("/v1/poiSearch", {
      params,
    });
  }

  /**
   * 現在地周辺 POI 検索 (GET /v1/poiSearch with X-LIP-Geolocation header)
   *
   * @param lat     - 緯度 (例: 35.658581)
   * @param lon     - 経度 (例: 139.745433)
   * @param params  - 追加クエリパラメーター
   *
   * @example
   * const result = await api.poi.searchWithLatLon(35.658581, 139.745433, { results: "5" });
   */
  async searchWithLatLon(
    lat: number,
    lon: number,
    params: PoiSearchRequest = {},
  ): Promise<PoiSearchData> {
    const geolocation = `Position=[${lon},${lat}]`;
    return this.poiTransitClient.get<PoiSearchData>("/v1/poiSearch", {
      params,
      headers: { "X-LIP-Geolocation": geolocation },
    });
  }

  /**
   * 駅名完全一致検索 (GET /v1/poiSearch - exact match)
   *
   * @param stationName - 駅名 (完全一致)
   *
   * @example
   * const result = await api.poi.searchStationExact("渋谷");
   */
  async searchStationExact(stationName: string): Promise<PoiSearchData> {
    const params: PoiSearchRequest = {
      sort: "-X_transit_StaticScoreCustom1",
      x_binary_filter: `X_transit_BinaryFilterCustom1:64eb1163b0f13dacfd3a5cb96b333a53 AND X_transit_BinaryFilterCustom3:"${stationName}"`,
      ".src": "transit_app_stationdetail",
      results: "1",
      detail: "navi",
    };
    return this.poiTransitClient.get<PoiSearchData>("/v1/poiSearch", {
      params,
    });
  }

  /**
   * 駅ID検索 (GET /v1/poiSearch - by station ID)
   *
   * @param stationId - 駅ID
   */
  async searchByStationId(stationId: string): Promise<PoiSearchData> {
    const params: PoiSearchRequest = {
      x_binary_filter: `X_transit_BinaryFilterCustom1:64eb1163b0f13dacfd3a5cb96b333a53 AND X_transit_BinaryFilterCustom2:${stationId}`,
      ".src": "transit_app_stationdetail",
      results: "1",
      detail: "navi",
    };
    return this.poiTransitClient.get<PoiSearchData>("/v1/poiSearch", {
      params,
    });
  }

  /**
   * スポット名検索 (GET /v1/poiSearch - spot name)
   *
   * @param spotName - スポット名
   * @param start    - 結果開始位置
   * @param results  - 取得件数
   *
   * @example
   * const result = await api.poi.searchSpot("東京タワー", 1, "10");
   */
  async searchSpot(
    spotName: string,
    start: number,
    results: string,
  ): Promise<PoiSearchData> {
    const params: PoiSearchRequest = {
      results,
      start: String(start),
      query: spotName,
      sort: "relevancy",
      ac: "JP",
      ".src": "transit_app_search",
      detail: "navi",
    };
    return this.poiTransitClient.get<PoiSearchData>("/v1/poiSearch", {
      params,
    });
  }

  // --------------------------------------------------
  // 逆ジオコーダー
  // --------------------------------------------------

  /**
   * 逆ジオコーダー (緯度経度 → 住所)
   *
   * ReverseGeoCoder.java より: パスは `/reverse/v1/reverse-geocoder`, appid は専用値を使用
   * AppID: ReGEAkexg64HQMkk0s0K5l1Nor68xIN3Fkw5mZHe3QxzJGrDDBMIGouqUlHWry.L2w--
   */
  async reverseGeocode(
    lat: number,
    lon: number,
    params: Record<string, string> = {},
  ): Promise<ReverseGeoCoderData> {
    return this.mapClient.get<ReverseGeoCoderData>(
      "/reverse/v1/reverse-geocoder",
      {
        params: {
          lat: String(lat),
          lon: String(lon),
          datum: "wgs",
          // 逆ジオコーダーは専用 AppID を使用 (ReverseGeoCoder.java より)
          appid:
            "ReGEAkexg64HQMkk0s0K5l1Nor68xIN3Fkw5mZHe3QxzJGrDDBMIGouqUlHWry.L2w--",
          ...params,
        },
      },
    );
  }

  // --------------------------------------------------
  // 住所ディレクトリ
  // --------------------------------------------------

  /**
   * 住所ディレクトリ検索 (GET /address/directory/V2/addressDirectory)
   */
  async searchAddressDirectory(
    params: Record<string, string>,
  ): Promise<AddressDirectoryData> {
    return this.mapClient.get<AddressDirectoryData>(
      "address/directory/V2/addressDirectory",
      { params },
    );
  }

  // --------------------------------------------------
  // キープアイテム (お気に入り)
  // --------------------------------------------------

  /**
   * キープアイテム一覧取得
   * GET /v4/keep/items?src=transit.android&columns=detail&sort=-modify&type=gid
   *
   * @param results - 取得件数 (デフォルト: "20")
   */
  async getKeepItems(results = "20"): Promise<KeepItemListData> {
    return this.mapClient.get<KeepItemListData>(
      "/v4/keep/items?src=transit.android&columns=detail&sort=-modify&type=gid",
      { params: { results } },
    );
  }

  /**
   * キープアイテム単体取得 (GET /v4/keep/items/gid:{gid}?src=transit.android)
   *
   * @param gid - グループID
   */
  async getKeepItem(gid: string): Promise<KeepItemData> {
    return this.mapClient.get<KeepItemData>(
      `/v4/keep/items/gid:${gid}?src=transit.android`,
    );
  }

  /**
   * キープアイテム追加 (POST /v4/keep/items/gid:{gid}?src=transit.android)
   *
   * @param gid    - グループID
   * @param params - リクエストボディ
   */
  async addKeepItem(
    gid: string,
    params: Record<string, unknown>,
  ): Promise<KeepItemData> {
    return this.mapClient.post<KeepItemData>(
      `/v4/keep/items/gid:${gid}?src=transit.android`,
      params,
      { headers: { "Content-Type": "application/json" } },
    );
  }

  /**
   * キープアイテム削除 (DELETE /v4/keep/items/gid:{gid}?src=transit.android)
   *
   * @param gid    - グループID
   * @param params - リクエストボディ
   */
  async deleteKeepItem(
    gid: string,
    params: Record<string, unknown>,
  ): Promise<KeepItemData> {
    return this.mapClient.delete<KeepItemData>(
      `/v4/keep/items/gid:${gid}?src=transit.android`,
      { data: params },
    );
  }

  /**
   * キープアイテム複数削除
   * DELETE /v4/keep/items?src=transit.android
   *
   * @param params - 削除するGIDリスト
   */
  async deleteKeepItems(params: KeepItemDeleteData): Promise<KeepItemData> {
    return this.mapClient.delete<KeepItemData>(
      "/v4/keep/items?src=transit.android",
      { data: params },
    );
  }

  // --------------------------------------------------
  // コメント
  // --------------------------------------------------

  /**
   * スポットコメント取得 (GET /lsp/v3/comments)
   */
  async getComments(params: Record<string, string>): Promise<CommentData> {
    return this.mapClient.get<CommentData>("/lsp/v3/comments", {
      params,
    });
  }
}
