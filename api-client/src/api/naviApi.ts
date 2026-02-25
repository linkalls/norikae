import { HttpClient, cleanParams } from "../http";
import {
  AppSettingData,
  AssistData,
  AssistRequest,
  KousyouData,
  NaviData,
  NaviSearchRequest,
  RegistrationData,
  RegistrationMyTimetableCheckResult,
  RegistrationMyTimetableCreateDeleteParam,
  RegistrationMyTimetableData,
  RegistrationMyTimetableOverwriteParam,
  RegistrationMyTimetableUpdateParam,
  RegistrationType,
  RouteMemoData,
  RouteMemoRequest,
  TrainListData,
  TrainReplacePriceData,
  TrainSearchRequest,
} from "../types";

/**
 * 乗換案内 API (https://navi-transit.yahooapis.jp)
 *
 * ルート検索・列車情報・ルートメモ・登録データ・補完 などを提供
 * assist は poi-transit.yahooapis.jp を使用
 */
export class NaviApi {
  constructor(
    private readonly client: HttpClient,
    private readonly secClient: HttpClient,
    private readonly poiTransitClient: HttpClient,
  ) {}

  // --------------------------------------------------
  // ルート検索
  // --------------------------------------------------

  /**
   * ルート検索 (GET /v3/naviSearch)
   *
   * @param params - 検索条件
   * @returns ルート検索結果
   *
   * @example
   * const result = await api.navi.search({
   *   from: "渋谷",
   *   to: "新宿",
   *   date: "202602251200",
   *   type: 1,   // 出発時刻指定
   *   sort: 0,   // 到着時刻優先
   * });
   */
  async search(params: NaviSearchRequest): Promise<NaviData> {
    const query = cleanParams({
      output: "json",
      ...params,
    });
    return this.client.get<NaviData>("/v3/naviSearch", { params: query });
  }

  /**
   * 認証付きルート検索 (GET /v3/naviSearchAuth)
   * ログイン済みユーザー向け (ルートメモ連携等)
   */
  async searchAuth(params: NaviSearchRequest): Promise<NaviData> {
    const query = cleanParams({ output: "json", ...params });
    return this.secClient.get<NaviData>("/v3/naviSearchAuth", {
      params: query,
    });
  }

  /**
   * 列車検索 (POST /v2/trainSearch)
   */
  async trainSearch(params: TrainSearchRequest): Promise<NaviData> {
    return this.client.post<NaviData>(
      "/v2/trainSearch",
      new URLSearchParams(cleanParams(params)),
    );
  }

  /**
   * 列車一覧取得 (POST /v2/trainList)
   */
  async trainList(params: Record<string, string>): Promise<TrainListData> {
    return this.client.post<TrainListData>(
      "v2/trainList",
      new URLSearchParams(params),
    );
  }

  /**
   * 乗換運賃取得 (GET /v1/trainReplacePrice)
   */
  async trainReplacePrice(
    params: Record<string, string>,
  ): Promise<TrainReplacePriceData> {
    return this.client.get<TrainReplacePriceData>("/v1/trainReplacePrice", {
      params,
    });
  }

  /**
   * 再ルート検索 (POST /v2/reroute)
   */
  async reroute(params: Record<string, string>): Promise<NaviData> {
    return this.client.post<NaviData>(
      "/v2/reroute",
      new URLSearchParams(params),
    );
  }

  // --------------------------------------------------
  // ルートメモ (認証 API)
  // --------------------------------------------------

  /**
   * ルートメモ取得 (GET /v2/routeMemo)
   * ※ transit-sec.yahooapis.jp を使用
   */
  async getRouteMemo(params: RouteMemoRequest = {}): Promise<string> {
    return this.secClient.get<string>("/v2/routeMemo", {
      params: cleanParams(params as unknown as Record<string, unknown>),
    });
  }

  /**
   * ルートメモ保存 (POST /v2/routeMemo)
   */
  async saveRouteMemo(body: Record<string, unknown>): Promise<RouteMemoData> {
    return this.secClient.post<RouteMemoData>("/v2/routeMemo", body);
  }

  /**
   * ルートメモ更新 (PUT /v2/routeMemo)
   */
  async updateRouteMemo(body: Record<string, unknown>): Promise<RouteMemoData> {
    return this.secClient.put<RouteMemoData>("/v2/routeMemo", body);
  }

  // --------------------------------------------------
  // 登録データ (お気に入り・履歴等)
  // --------------------------------------------------

  /**
   * 登録データ取得 (GET /v2/registration/{type}/get)
   *
   * @param type - "itinerary" | "history" | "station" など
   */
  async getRegistration(
    type: RegistrationType,
    params: Record<string, string> = {},
  ): Promise<RegistrationData> {
    return this.client.get<RegistrationData>(`/v2/registration/${type}/get`, {
      params,
    });
  }

  /**
   * 登録データ差分更新 (POST /v2/registration/{type}/diff)
   */
  async diffRegistration(
    type: RegistrationType,
    body: Record<string, unknown>,
  ): Promise<RegistrationData> {
    return this.client.post<RegistrationData>(
      `/v2/registration/${type}/diff`,
      body,
    );
  }

  /**
   * 登録データ上書き (POST /v2/registration/{type}/overwrite)
   */
  async overwriteRegistration(
    type: RegistrationType,
    body: Record<string, unknown>,
  ): Promise<RegistrationData> {
    return this.client.post<RegistrationData>(
      `/v2/registration/${type}/overwrite`,
      body,
    );
  }

  // --------------------------------------------------
  // マイ時刻表
  // --------------------------------------------------

  /**
   * マイ時刻表チェック (GET /v2/registration/mytimetable/check)
   */
  async checkMyTimetable(
    updatedate: string,
  ): Promise<RegistrationMyTimetableCheckResult> {
    return this.client.get<RegistrationMyTimetableCheckResult>(
      "/v2/registration/mytimetable/check",
      { params: { updatedate } },
    );
  }

  /**
   * マイ時刻表取得 (GET /v2/registration/mytimetable/get)
   */
  async getMyTimetable(
    updatedate: string,
  ): Promise<RegistrationMyTimetableData> {
    return this.client.get<RegistrationMyTimetableData>(
      "/v2/registration/mytimetable/get",
      { params: { updatedate } },
    );
  }

  /**
   * マイ時刻表作成 (POST /v2/registration/mytimetable/create)
   */
  async createMyTimetable(
    params: RegistrationMyTimetableCreateDeleteParam,
  ): Promise<void> {
    await this.client.post("/v2/registration/mytimetable/create", params);
  }

  /**
   * マイ時刻表削除 (DELETE /v2/registration/mytimetable/delete)
   */
  async deleteMyTimetable(
    params: RegistrationMyTimetableCreateDeleteParam,
  ): Promise<void> {
    await this.client.delete("/v2/registration/mytimetable/delete", {
      data: params,
    });
  }

  /**
   * マイ時刻表更新 (POST /v2/registration/mytimetable/update)
   */
  async updateMyTimetable(
    params: RegistrationMyTimetableUpdateParam,
  ): Promise<void> {
    await this.client.post("/v2/registration/mytimetable/update", params);
  }

  /**
   * マイ時刻表上書き (POST /v2/registration/mytimetable/overwrite)
   */
  async overwriteMyTimetable(
    params: RegistrationMyTimetableOverwriteParam,
  ): Promise<void> {
    await this.client.post("/v2/registration/mytimetable/overwrite", params);
  }

  // --------------------------------------------------
  // 補完・設定
  // --------------------------------------------------

  /**
   * 入力補完 (GET /v1/assist)
   *
   * poi-transit.yahooapis.jp を使用 (Assist.java on haas/dp.java より)
   *
   * @example
   * const results = await api.navi.assist({ query: "しぶや", results: 5 });
   */
  async assist(params: AssistRequest): Promise<AssistData> {
    return this.poiTransitClient.get<AssistData>("/v1/assist", {
      params: cleanParams(params as unknown as Record<string, unknown>),
    });
  }

  /**
   * アプリ設定取得 (GET /dl/transit/android/app_setting.json)
   */
  async getAppSetting(): Promise<AppSettingData> {
    return this.client.get<AppSettingData>(
      "/dl/transit/android/app_setting.json",
    );
  }

  /**
   * 構内図情報取得 (GET /v2/kousyou)
   */
  async getKousyou(): Promise<KousyouData> {
    return this.client.get<KousyouData>("/v2/kousyou");
  }

  /**
   * イベント情報取得 (GET /v2/event)
   */
  async getEvent(params: Record<string, string> = {}): Promise<unknown> {
    return this.client.get("/v2/event", { params });
  }
}
