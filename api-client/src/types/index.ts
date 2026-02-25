// ============================================================
// 共通型
// ============================================================

export interface ApiError {
  code: string;
  message: string;
}

// ============================================================
// NaviSearch (ルート検索)
// ============================================================

/** ルート検索リクエストパラメータ */
export interface NaviSearchRequest {
  /** 出発地名称 */
  from: string;
  /** 目的地名称 */
  to: string;
  /** 経由地名称 (カンマ区切り可) */
  via?: string;
  /** 出発地駅コード */
  fcode?: string;
  /** 出発地GID */
  fromgid?: string;
  /** 目的地駅コード */
  tcode?: string;
  /** 目的地GID */
  togid?: string;
  /** 日時 (YYYYMMDDHHmm) */
  date: string;
  /**
   * 時刻種別
   * 1: 出発, 2: 到着, 3: 始発, 4: 終電, 5: 現在時刻
   */
  type?: 1 | 2 | 3 | 4 | 5;
  /**
   * ソート順
   * 0: 到着が早い, 1: 乗換少ない, 2: 料金安い
   */
  sort?: 0 | 1 | 2;
  /** 徒歩速度 (1-3, デフォルト: 1) */
  ws?: number;
  /** 徒歩合計速度 */
  tws?: number;
  /** 座席種別 (0: 自由席, 1: 指定席, 2: グリーン席) */
  expkind?: number;
  /** チケット種別 */
  ticket?: string;
  /** パスタイプ */
  passtype?: string;
  /** オフピーク (1: オフピーク優先) */
  offpeak?: number;
  /** 利用路線パターン */
  ptn?: string;
  /** 特急チケット */
  expticket?: string;
  /** 回避路線名 */
  irname?: string;
  /** 回避路線ID */
  irid?: string;
  output?: "json";
}

export interface NaviData {
  ResultInfo: NaviResultInfo;
  Feature: NaviFeature[];
  Request: NaviRequest;
}

export interface NaviResultInfo {
  Count: number;
  Total: number;
  Start: number;
  Status: number;
  Latency: number;
  Description: string;
  Copyright: string;
}

export interface NaviRequest {
  Query: {
    from: string;
    to: string;
    date: string;
    sort?: string;
  };
}

export interface NaviFeature {
  Id: string;
  Name: string;
  Geometry: NaviGeometry;
  Property: NaviProperty;
}

export interface NaviGeometry {
  Type: string;
  Coordinates: string;
}

export interface NaviProperty {
  TotalTime: number;
  TotalDistance: number;
  SearchType: number;
  TotalFare: NaviFare;
  GeoUnit: number;
  AltiUnit: string;
  Link: NaviLink[];
}

export interface NaviFare {
  Oneway: number;
  Round: number;
}

export interface NaviLink {
  Id: string;
  Name: string;
  Time: number;
  Distance: number;
  Type: number;
  Transport?: NaviTransport;
}

export interface NaviTransport {
  Type: number;
  From: NaviStation;
  To: NaviStation;
  Line: NaviLine;
}

export interface NaviStation {
  Name: string;
  Code: string;
  Yomi: string;
  Time: string;
  GateTime?: string;
}

export interface NaviLine {
  Name: string;
  Color: string;
  BusName?: string;
  Type: number;
  Fare: NaviFare;
  TrainType?: NaviTrainType;
}

export interface NaviTrainType {
  Code: string;
  Name: string;
  Color: string;
  BgColor: string;
}

// ============================================================
// TrainSearch / TrainList
// ============================================================

export interface TrainSearchRequest {
  output?: "json";
  [key: string]: string | undefined;
}

export interface TrainListRequest {
  output?: "json";
  [key: string]: string | undefined;
}

export interface TrainListData {
  ResultInfo: NaviResultInfo;
  Feature: NaviFeature[];
}

// ============================================================
// RouteMemo (ルートメモ / クラウド同期)
// ============================================================

export interface RouteMemoRequest {
  func?: "detail" | "list";
}

export interface RouteMemoData {
  Date: string;
  hasServerUpToDate: string;
  memos?: RouteMemo[];
}

export interface RouteMemo {
  id: string;
  from: string;
  to: string;
  date: string;
  memo?: string;
}

// ============================================================
// Reroute (再ルート検索)
// ============================================================

export interface RerouteRequest {
  [key: string]: string | undefined;
}

// ============================================================
// Registration (お気に入り・設定同期)
// ============================================================

export type RegistrationType = "itinerary" | "history" | "station" | string;

export interface RegistrationRequest {
  [key: string]: string | undefined;
}

export interface RegistrationData {
  revision: string;
  data: string;
  updatedate?: string;
  total?: number;
}

// ============================================================
// RegistrationMyTimetable (マイ時刻表)
// ============================================================

export interface RegistrationMyTimetableData {
  updatedate: string;
  items: MyTimetableItem[];
}

export interface MyTimetableItem {
  id: string;
  name?: string;
  stationId: string;
  railCode?: string;
  direction?: string;
}

export interface RegistrationMyTimetableCheckResult {
  hasUpdate: boolean;
}

export interface RegistrationMyTimetableCreateDeleteParam {
  items: MyTimetableItem[];
}

export interface RegistrationMyTimetableUpdateParam {
  items: MyTimetableItem[];
  updatedate: string;
}

export interface RegistrationMyTimetableOverwriteParam {
  items: MyTimetableItem[];
  updatedate: string;
}

// ============================================================
// Diainfo (運行情報)
// ============================================================

export interface DiainfoCheckData {
  ResultInfo: DiainfoResultInfo;
  DiainfoList: DiainfoItem[];
}

export interface DiainfoResultInfo {
  Count: number;
  Status: number;
  Description: string;
}

export interface DiainfoItem {
  railCode: string;
  railName: string;
  status: number;
  text?: string;
  url?: string;
}

export interface DiainfoTrainRequest {
  railAreaCode?: string;
  railRangeCode?: string;
  typeCode?: string;
  contentProviderId?: string;
  stationCode?: string;
  trainNo?: string;
  output?: "json";
}

export interface DiainfoTrainData {
  ResultInfo: DiainfoResultInfo;
  Property?: DiainfoTrainProperty;
}

export interface DiainfoTrainProperty {
  DiainfoId: string;
  RailName: string;
  TrainNo: string;
  BoundFor: string;
  TrainType: string;
  DelayTime?: number;
  StopInfo?: DiainfoStopInfo[];
}

export interface DiainfoStopInfo {
  stationName: string;
  arrivalTime?: string;
  departureTime?: string;
  delayTime?: number;
}

// ============================================================
// DiainfoCgm (混雑情報UGC)
// ============================================================

export interface DiainfoCgmInfoIncreaseData {
  ResultInfo: DiainfoResultInfo;
  railList?: CgmRailItem[];
}

export interface DiainfoCgmInfoVoteRequest {
  railCode: number;
  rangeCode: number;
  directionCode: number;
}

export interface DiainfoCgmInfoVoteData {
  ResultInfo: DiainfoResultInfo;
  voteInfo?: CgmVoteInfo;
}

export interface CgmVoteInfo {
  railCode: number;
  rangeCode: number;
  directionCode: number;
  upCount: number;
  downCount: number;
  level: number;
}

export interface DiainfoCgmVoteAuthRequest {
  railCode: number;
  rangeCode: number;
  directionCode: number;
  delayType: number;
}

export interface DiainfoCgmVoteAuthData {
  ResultInfo: DiainfoResultInfo;
  result?: string;
}

export interface CgmRailItem {
  railCode: string;
  railName: string;
  level?: number;
}

// ============================================================
// RailSearch (路線検索)
// ============================================================

export interface RailSearchRequest {
  query: string;
  results: string;
}

export interface RailSearchData {
  ResultInfo: DiainfoResultInfo;
  Rail?: RailItem[];
}

export interface RailItem {
  railCode: string;
  railName: string;
  companyName?: string;
  railAreaCode?: string;
  railRangeCode?: string;
  color?: string;
}

// ============================================================
// StopStation (停車駅)
// ============================================================

export interface StopStationData {
  ResultInfo: DiainfoResultInfo;
  StationList?: StopStationItem[];
}

export interface StopStationItem {
  stationCode: string;
  stationName: string;
  order: number;
}

// ============================================================
// CongestionRail (混雑情報 - 路線)
// ============================================================

export interface CongestionRailRequest {
  railRangeId: string;
}

export interface CongestionRailData {
  ResultInfo: DiainfoResultInfo;
  FormattedData?: CongestionRailFormattedData;
}

export interface CongestionRailFormattedData {
  upList: Record<string, CongestionDateData>;
  downList: Record<string, CongestionDateData>;
}

export interface CongestionDateData {
  date: string;
  dataList: CongestionTimeData[];
}

export interface CongestionTimeData {
  startTime: string;
  endTime: string;
  level: number;
  hashtag?: string;
  landmark?: string;
}

// ============================================================
// Timetable (時刻表)
// ============================================================

export interface TimetableStationRequest {
  /** 駅コード (Assist.Result.Code または POI検索結果の駅コード) */
  stationCode: string;
  /** 方面コード (stationData.getDirid()) - StationData.gId に相当 */
  directionCode?: string;
  /** 日付 (YYYYMMDD 形式) */
  date?: string;
  /** 運行日種別 (1=平日, 2=土曜, 4=日曜祈日) */
  driveDayKind?: string;
  [key: string]: string | undefined;
}

export interface TimetableStationData {
  ResultInfo: TimetableResultInfo;
  Timetable?: TimetableData;
}

export interface TimetableResultInfo {
  Count: number;
  Status: number;
  Description: string;
}

export interface TimetableData {
  Master?: TimetableMaster;
  TimeTable?: TimetableHour[];
}

export interface TimetableMaster {
  destination: TimetableDestination[];
  kind: TimetableKind[];
}

export interface TimetableDestination {
  name: string;
  info?: string;
  id?: string;
}

export interface TimetableKind {
  name: string;
  info?: string;
  id?: string;
}

export interface TimetableHour {
  hour: number;
  MinuteItem?: TimetableMinute[];
}

export interface TimetableMinute {
  minute: number;
  destination?: number;
  kind?: number;
  firstStation?: string;
  extraTrain?: string;
}

export interface TimetableStationTrainRequest {
  stationCode: string;
  directionCode?: string;
  trainNo?: string;
  date?: string;
  [key: string]: string | undefined;
}

export interface TimetableStationTrainData {
  ResultInfo: TimetableResultInfo;
  Train?: TimetableTrain[];
}

export interface TimetableTrain {
  trainNo: string;
  trainType: string;
  destination: string;
  stopList: TimetableTrainStop[];
}

export interface TimetableTrainStop {
  stationName: string;
  arrivalTime?: string;
  departureTime?: string;
}

export interface TimetableBusstopRequest {
  busstopCode: string;
  direction?: string;
  date?: string;
  [key: string]: string | undefined;
}

export interface TimetableBusstopData {
  ResultInfo: TimetableResultInfo;
  Timetable?: TimetableBusstopTimetable;
}

export interface TimetableBusstopTimetable {
  Master?: TimetableMaster;
  TimeTable?: TimetableHour[];
}

export interface TimetableBusstopTripRequest {
  busstopCode: string;
  tripId?: string;
  [key: string]: string | undefined;
}

export interface TimetableBusstopTripData {
  ResultInfo: TimetableResultInfo;
  Trip?: BusstopTrip[];
}

export interface BusstopTrip {
  tripId: string;
  stopList: BusstopTripStop[];
}

export interface BusstopTripStop {
  name: string;
  arrivalTime?: string;
}

export interface DirectArrivalData {
  ResultInfo: TimetableResultInfo;
  DirectArrival?: DirectArrivalItem[];
}

export interface DirectArrivalItem {
  trainType: string;
  destination: string;
  departureTime: string;
  delay?: number;
}

export interface DirectionData {
  ResultInfo: TimetableResultInfo;
  Direction?: DirectionItem[];
}

export interface DirectionItem {
  direction: string;
  groupId: string;
  source?: string;
  driveDayKind?: string;
  railName?: string;
}

// ============================================================
// Location (リアルタイム位置情報)
// ============================================================

export interface LocationBusRequest {
  param: string;
}

export interface LocationBusData {
  Header: LocationHeader;
  Bus?: LocationBusItem[];
}

export interface LocationHeader {
  Status: number;
  Description?: string;
}

export interface LocationBusItem {
  id: string;
  position: LocationPosition;
  nextStation?: string;
}

export interface LocationPosition {
  lat: string;
  lon: string;
}

export interface LocationTrainTripRequest {
  param: string;
  stopinfo?: string;
}

export interface LocationTrainData {
  Header: LocationHeader;
  Train?: LocationTrainItem[];
  Railway?: LocationRailway[];
}

export interface LocationTrainItem {
  id: string;
  position: LocationPosition;
  currentStation?: string;
  nextStation?: string;
  delay?: number;
}

export interface LocationRailway {
  id: string;
  name: string;
}

export interface LocationTrainJrwRequest {
  railway: string;
  direction: string;
  station: string;
  express: string;
}

export interface LocationTrainJrwData {
  Header: LocationHeader;
  Train?: LocationTrainItem[];
}

// ============================================================
// POI Search / 地点検索
// ============================================================

export interface PoiSearchRequest {
  query?: string;
  results?: string;
  detail?: string;
  sort?: string;
  [key: string]: string | undefined;
}

export interface PoiSearchData {
  ResultInfo: PoiResultInfo;
  Feature?: PoiFeature[];
}

export interface PoiResultInfo {
  Count: number;
  Total: number;
  Start: number;
  Status: number;
  Latency?: number;
  Description: string;
}

export interface PoiFeature {
  Id: string;
  Gid?: string;
  Name: string;
  Geometry?: PoiGeometry[];
  Category?: string[];
  Address?: string;
  Yomi?: string;
  Property?: PoiProperty;
  TransitSearchInfo?: PoiTransitSearchInfo;
  AddressElement?: PoiAddressElement[];
  Station?: PoiStation[];
}

export interface PoiGeometry {
  Type: string;
  Coordinates: string[];
}

export interface PoiProperty {
  Tel?: string;
  DetailUrl?: string;
  Header?: string[];
  HeaderUrl?: string[];
}

export interface PoiTransitSearchInfo {
  Detail?: PoiStationDetail;
  Property?: PoiTransitProperty;
  CassetteConfList?: PoiCassetteConf[];
}

export interface PoiStationDetail {
  stationId?: string;
  railSubName?: string;
  companyName?: string;
  railwayTypeCode?: string;
  railAreaCode?: string;
  railRangeCode?: string;
  contentProviderId?: string;
  StationInfo?: PoiStationInfo;
}

export interface PoiStationInfo {
  DiaInfo?: PoiDiaInfo[];
  RailGroup?: PoiRailGroup[];
  RailInfo?: PoiRailInfo[];
  Exit?: PoiExit[];
  Facility?: PoiFacility[];
}

export interface PoiDiaInfo {
  railName?: string;
  railCode?: string;
  contentProviderId?: string;
  railAreaCode?: string;
  railRangeCode?: string;
}

export interface PoiRailGroup {
  direction: string;
  railId: string;
  source?: string;
  serviceDayCode?: string;
  railName?: string;
}

export interface PoiRailInfo {
  name: string;
  iconUrl?: string;
  color?: string;
}

export interface PoiExit {
  name: string;
  guidance?: string;
}

export interface PoiFacility {
  name: string;
  guidance?: string;
}

export interface PoiTransitProperty {
  tel?: string;
  detailUrl?: string;
  header?: string[];
  headerUrl?: string[];
}

export interface PoiCassetteConf {
  header: string;
  headerUrl?: string;
}

export interface PoiAddressElement {
  name: string;
  level: string;
}

export interface PoiStation {
  id: string;
  name: string;
  time?: string;
  exit?: string;
}

// ============================================================
// Reverse GeoCoder
// ============================================================

export interface ReverseGeoCoderData {
  ResultInfo: PoiResultInfo;
  Feature?: PoiFeature[];
}

// ============================================================
// Keep Items (お気に入りアイテム)
// ============================================================

export interface KeepItemData {
  Total?: number;
  Start?: number;
  Count?: number;
  Items?: KeepItem[];
}

export interface KeepItemListData {
  Total?: number;
  Items?: KeepItem[];
}

export interface KeepItem {
  gid: string;
  title?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  modifyDate?: string;
}

export interface KeepItemDeleteData {
  gids: string[];
}

// ============================================================
// Address Directory
// ============================================================

export interface AddressDirectoryData {
  ResultInfo: PoiResultInfo;
  Feature?: PoiFeature[];
}

// ============================================================
// Comment (コメント)
// ============================================================

export interface CommentRequest {
  [key: string]: string | undefined;
}

export interface CommentData {
  ResultInfo: PoiResultInfo;
  Feature?: CommentFeature[];
}

export interface CommentFeature {
  Id: string;
  Name?: string;
  Comment?: string;
  Date?: string;
}

// ============================================================
// Real-Time Congestion (リアルタイム混雑)
// ============================================================

export interface RealTimeCongestionData {
  ResultInfo: DiainfoResultInfo;
  GateList?: CongestionGate[];
}

export interface CongestionGate {
  gateId: string;
  gateName: string;
  level: number;
  updatedAt?: string;
}

// ============================================================
// Congestion UGC
// ============================================================

export interface CongestionPostRequest {
  railId: string;
  direction: string;
  station: string;
  railName?: string;
  destinationName?: string;
  stationTime: string;
  trainKind?: string;
  diainfoId?: string;
  arrivalDirection?: string;
  level: string;
}

export interface CongestionData {
  ResultInfo: DiainfoResultInfo;
  result?: string;
}

export interface CongestionTimelineRequest {
  railRangeId?: string;
  direction?: string;
  date?: string;
  [key: string]: string | undefined;
}

export interface CongestionTimelineData {
  ResultInfo: DiainfoResultInfo;
  Timeline?: CongestionTimelineItem[];
}

export interface CongestionTimelineItem {
  time: string;
  level: number;
  count?: number;
}

// ============================================================
// App Setting
// ============================================================

export interface AppSettingData {
  version?: string;
  forceUpdateVersion?: string;
  message?: string;
  [key: string]: unknown;
}

// ============================================================
// Assist (入力補完)
// ============================================================

export interface AssistRequest {
  query: string;
  results: number;
}

export interface AssistData {
  ResultInfo: DiainfoResultInfo;
  Result?: AssistResult[];
}

export interface AssistResult {
  id: string;
  name: string;
  yomi?: string;
  category?: string;
  lat?: string;
  lon?: string;
}

// ============================================================
// Kousyou (構内図)
// ============================================================

export interface KousyouData {
  ResultInfo: DiainfoResultInfo;
  Station?: KousyouStation[];
}

export interface KousyouStation {
  stationId: string;
  stationName: string;
  url?: string;
}

// ============================================================
// TrainReplacePrice (乗換運賃)
// ============================================================

export interface TrainReplacePriceData {
  ResultInfo: DiainfoResultInfo;
  Price?: TrainReplacePriceItem[];
}

export interface TrainReplacePriceItem {
  from: string;
  to: string;
  price: number;
  type?: string;
}

// ============================================================
// Yahoo Calendar
// ============================================================

export interface YahooCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
}

export interface YahooCalendarResponse {
  events?: YahooCalendarEvent[];
}

// ============================================================
// NLU (自然言語理解)
// ============================================================

export interface NluResultData {
  intent?: string;
  entities?: Record<string, string>;
  [key: string]: unknown;
}

// ============================================================
// Push
// ============================================================

export interface PushTokenData {
  status?: string;
}
