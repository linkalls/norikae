import { HttpClient } from "../http";

import {
  CongestionRailData,
  DiainfoCgmInfoIncreaseData,
  DiainfoCgmInfoVoteData,
  DiainfoCgmInfoVoteRequest,
  DiainfoCgmVoteAuthData,
  DiainfoCgmVoteAuthRequest,
  DiainfoCheckData,
  DiainfoTrainData,
  DiainfoTrainRequest,
  RailSearchData,
  RailSearchRequest,
  StopStationData,
} from "../types";

/**
 * 運行情報 API
 *
 * - ダイヤ障害チェック    : https://cache-diainfo-transit.yahooapis.jp
 * - 列車位置・UGC情報    : https://navi-transit.yahooapis.jp
 */
export class DiainfoApi {
  constructor(
    /** cache-diainfo-transit.yahooapis.jp */
    private readonly cacheClient: HttpClient,
    /** navi-transit.yahooapis.jp */
    private readonly naviClient: HttpClient,
  ) {}

  // --------------------------------------------------
  // ダイヤ障害チェック (cache-diainfo)
  // --------------------------------------------------

  /**
   * 運行情報一覧チェック (GET /v4/diainfo/check?big=0)
   *
   * 現在のダイヤ乱れ・遅延情報を取得
   */
  async check(): Promise<DiainfoCheckData> {
    return this.cacheClient.get<DiainfoCheckData>(
      "/v4/diainfo/check?big=0",
    );
  }

  /**
   * 列車ダイヤ情報取得 (GET /v4/diainfo/train)
   *
   * @param params - 路線・列車コード等
   *
   * @example
   * const info = await api.diainfo.trainInfo({
   *   railAreaCode: "4",
   *   railRangeCode: "22608",
   * });
   */
  async trainInfo(params: DiainfoTrainRequest): Promise<DiainfoTrainData> {
    return this.cacheClient.get<DiainfoTrainData>(
      "/v4/diainfo/train",
      { params },
    );
  }

  // --------------------------------------------------
  // 混雑情報 UGC (navi)
  // --------------------------------------------------

  /**
   * 混雑情報増加データ取得 (GET /v3/diainfoCgm/info/increase)
   *
   * 各路線の混雑投票が増加している最新情報
   */
  async getCongestionIncrease(): Promise<DiainfoCgmInfoIncreaseData> {
    return this.naviClient.get<DiainfoCgmInfoIncreaseData>(
      "/v3/diainfoCgm/info/increase",
    );
  }

  /**
   * 混雑投票情報取得 (GET /v3/diainfoCgm/info/vote)
   *
   * @param params - 路線コード・区間コード・方向コード
   *
   * @example
   * const vote = await api.diainfo.getCongestionVote({
   *   railCode: 22608,
   *   rangeCode: 1,
   *   directionCode: 1,
   * });
   */
  async getCongestionVote(
    params: DiainfoCgmInfoVoteRequest,
  ): Promise<DiainfoCgmInfoVoteData> {
    return this.naviClient.get<DiainfoCgmInfoVoteData>(
      "/v3/diainfoCgm/info/vote",
      { params },
    );
  }

  /**
   * 混雑投票認証 & 投票 (POST /v3/diainfoCgm/voteAuth)
   *
   * @param params - 路線コード・遅延種別等
   */
  async voteCongestion(
    params: DiainfoCgmVoteAuthRequest,
  ): Promise<DiainfoCgmVoteAuthData> {
    return this.naviClient.post<DiainfoCgmVoteAuthData>(
      "/v3/diainfoCgm/voteAuth",
      new URLSearchParams({
        railCode: String(params.railCode),
        rangeCode: String(params.rangeCode),
        directionCode: String(params.directionCode),
        delayType: String(params.delayType),
      }),
    );
  }

  // --------------------------------------------------
  // 路線検索 (navi)
  // --------------------------------------------------

  /**
   * 路線名で路線を検索 (GET /v2/railSearch)
   *
   * @example
   * const rails = await api.diainfo.searchRail({ query: "山手線", results: "10" });
   */
  async searchRail(params: RailSearchRequest): Promise<RailSearchData> {
    return this.naviClient.get<RailSearchData>("/v2/railSearch", {
      params,
    });
  }

  /**
   * 停車駅一覧取得 (GET /v2/stopStations/{railId}/{rangeId})
   *
   * @param railId  - 路線ID
   * @param rangeId - 区間ID
   *
   * @example
   * const stops = await api.diainfo.getStopStations("22608", "1");
   */
  async getStopStations(
    railId: string,
    rangeId: string,
  ): Promise<StopStationData> {
    return this.naviClient.get<StopStationData>(
      `/v2/stopStations/${railId}/${rangeId}`,
    );
  }

  /**
   * 路線混雑情報取得 (GET /v2/congestion/rail/single)
   *
   * @param railRangeId - 路線区間ID
   */
  async getRailCongestion(railRangeId: string): Promise<CongestionRailData> {
    return this.naviClient.get<CongestionRailData>(
      "/v2/congestion/rail/single?",
      { params: { railRangeId } },
    );
  }
}
