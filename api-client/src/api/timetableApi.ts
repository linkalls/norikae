import { HttpClient } from "../http";

import {
  DirectArrivalData,
  DirectionData,
  TimetableBusstopData,
  TimetableBusstopRequest,
  TimetableBusstopTripData,
  TimetableBusstopTripRequest,
  TimetableStationData,
  TimetableStationRequest,
  TimetableStationTrainData,
  TimetableStationTrainRequest,
} from "../types";

/**
 * 時刻表 API
 *
 * - `getStation()` / `getStationTrain()` → `cache-navi-transit.yahooapis.jp`
 * - `getBusstop()` / `getBusstopTrip()` → `navi-transit.yahooapis.jp`
 */
export class TimetableApi {
  constructor(
    private readonly client: HttpClient,
    private readonly cacheNaviClient: HttpClient,
  ) {}

  /**
   * 駅時刻表取得 (GET /v2/timetable/station)
   *
   * @example
   * const tt = await api.timetable.getStation({
   *   stationCode: "1130101",  // 渋谷駅
   *   railCode: "22608",
   *   direction: "1",
   *   date: "20260225",
   * });
   */
  async getStation(
    params: TimetableStationRequest,
  ): Promise<TimetableStationData> {
    return this.cacheNaviClient.get<TimetableStationData>(
      "/v2/timetable/station",
      { params },
    );
  }

  /**
   * 駅時刻表 (列車詳細) 取得 (GET /v2/timetable/station/train)
   * cache-navi-transit.yahooapis.jp を使用
   */
  async getStationTrain(
    params: TimetableStationTrainRequest,
  ): Promise<TimetableStationTrainData> {
    return this.cacheNaviClient.get<TimetableStationTrainData>(
      "v2/timetable/station/train",
      { params },
    );
  }

  /**
   * バス停時刻表取得 (GET /v2/timetable/busstop)
   *
   * @example
   * const tt = await api.timetable.getBusstop({
   *   busstopCode: "530101",
   *   direction: "1",
   *   date: "20260225",
   * });
   */
  async getBusstop(
    params: TimetableBusstopRequest,
  ): Promise<TimetableBusstopData> {
    return this.client.get<TimetableBusstopData>("/v2/timetable/busstop", {
      params,
    });
  }

  /**
   * バス停トリップ取得 (GET /v2/timetable/busstop/trip)
   * navi-transit.yahooapis.jp を使用
   */
  async getBusstopTrip(
    params: TimetableBusstopTripRequest,
  ): Promise<TimetableBusstopTripData> {
    return this.client.get<TimetableBusstopTripData>(
      "v2/timetable/busstop/trip",
      { params },
    );
  }

  /**
   * 直通列車到着情報取得 (GET /v2/directArrival/{code})
   *
   * @param code - 駅コード
   */
  async getDirectArrival(code: string): Promise<DirectArrivalData> {
    return this.client.get<DirectArrivalData>(`/v2/directArrival/${code}`);
  }

  /**
   * 時刻表方向取得 (GET /v2/timetable/direction/station/{code})
   *
   * @param code - 駅コード
   */
  async getDirection(code: string): Promise<DirectionData> {
    return this.client.get<DirectionData>(
      `/v2/timetable/direction/station/${code}`,
    );
  }
}
