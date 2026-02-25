import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDiainfo,
  searchRoutes,
  type DiainfoItem,
  type Route,
  type SearchHistory,
  type SearchRequest,
} from "./api";
import DiainfoPanel from "./components/DiainfoPanel";
import RouteResult from "./components/RouteResult";
import SearchForm from "./components/SearchForm";

type Tab = "search" | "diainfo";

// ─── 検索履歴 ────────────────────────────────────────────────────────
const HISTORY_KEY = "norikae-history";
function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistory[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); }
    catch { return []; }
  });
  const add = useCallback((from: string, to: string) => {
    if (!from || !to) return;
    setHistory((prev) => {
      const next = [{ from, to }, ...prev.filter(h => !(h.from === from && h.to === to))].slice(0, 8);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const remove = useCallback((idx: number) => {
    setHistory((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const clear = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);
  return { history, add, remove, clear };
}

// ─── Toast ───────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((text: string) => {
    setMsg(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2500);
  }, []);
  return { msg, show };
}

export default function App() {
  const [tab, setTab] = useState<Tab>("search");
  const { history, add: addHistory, remove: removeHistory, clear: clearHistory } = useSearchHistory();
  const { msg: toastMsg, show: showToast } = useToast();

  // ── URL パラメータからの初期値 ──
  const [initialFrom] = useState(() => new URLSearchParams(window.location.search).get("from") ?? "");
  const [initialTo] = useState(() => new URLSearchParams(window.location.search).get("to") ?? "");

  // ── 路線検索 ──
  const [searching, setSearching] = useState(false);
  const [routes, setRoutes] = useState<Route[] | null>(null);
  const [searchDate, setSearchDate] = useState<string | undefined>();
  const [searchFrom, setSearchFrom] = useState<string | undefined>();
  const [searchTo, setSearchTo] = useState<string | undefined>();
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = useCallback(async (req: SearchRequest) => {
    addHistory(req.from, req.to);
    setSearching(true);
    setSearchError(null);
    setRoutes(null);
    setSearchDate(undefined);
    // URL を書き換えて共有可能な状態に
    const params = new URLSearchParams({ from: req.from, to: req.to });
    window.history.replaceState(null, "", `?${params.toString()}`);
    try {
      const data = await searchRoutes(req);
      setRoutes(data.route ?? []);
      setSearchDate(data.searchDate);
      setSearchFrom(data.from);
      setSearchTo(data.to);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  }, [addHistory]);

  // 共有
  const handleShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${searchFrom} → ${searchTo} 乗換案内`, url }).catch(() => { });
    } else {
      navigator.clipboard.writeText(url).then(() => showToast("URLをコピーしました 📋")).catch(() => showToast("コピー失敗"));
    }
  }, [searchFrom, searchTo, showToast]);

  // ── 運行情報 ──
  const [diainfoLoading, setDiainfoLoading] = useState(false);
  const [diainfoItems, setDiainfoItems] = useState<DiainfoItem[]>([]);
  const [diainfoError, setDiainfoError] = useState<string | null>(null);
  const [diainfoFetched, setDiainfoFetched] = useState(false);

  const fetchDiainfo = useCallback(async () => {
    setDiainfoLoading(true);
    setDiainfoError(null);
    try {
      const data = await getDiainfo();
      setDiainfoItems(data.traininfo ?? []);
      setDiainfoFetched(true);
    } catch (e) {
      setDiainfoError(e instanceof Error ? e.message : String(e));
    } finally {
      setDiainfoLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "diainfo" && !diainfoFetched) {
      fetchDiainfo();
    }
  }, [tab, diainfoFetched, fetchDiainfo]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🚃</span>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight tracking-tight">
              乗換案内
            </h1>
            <p className="text-blue-200 text-xs">Transit Navigator</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex gap-0 border-t border-blue-500">
          {(
            [
              { id: "search", label: "🔍 経路検索" },
              { id: "diainfo", label: "📡 運行情報" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-5 py-2.5 text-sm font-medium transition-all relative -mb-px ${tab === id
                ? "text-white border-b-2 border-white"
                : "text-blue-200 hover:text-white"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* ── 経路検索 ── */}
        {tab === "search" && (
          <div className="flex flex-col gap-5">
            <SearchForm
              onSearch={handleSearch}
              loading={searching}
              history={history}
              onRemoveHistory={removeHistory}
              onClearHistory={clearHistory}
              initialFrom={initialFrom}
              initialTo={initialTo}
            />

            {searchError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
                <span className="shrink-0 text-base">⚠️</span>
                <span>{searchError}</span>
              </div>
            )}

            {searching && (
              <div className="flex flex-col items-center py-10 gap-3 text-gray-400">
                <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-sm">経路を検索中…</span>
              </div>
            )}

            {routes !== null && !searching && (
              <>
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs text-gray-500 font-medium">
                    {routes.length > 0
                      ? `${routes.length} 件の経路`
                      : "経路が見つかりませんでした"}
                  </p>
                  {routes.length > 0 && searchFrom && searchTo && (
                    <button
                      type="button"
                      onClick={handleShare}
                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition px-2 py-1 rounded-lg hover:bg-blue-50"
                    >
                      🔗 共有
                    </button>
                  )}
                </div>
                <RouteResult routes={routes} searchDate={searchDate} from={searchFrom} to={searchTo} />
              </>
            )}

            {routes === null && !searching && !searchError && (
              <div className="text-center py-16 text-gray-300">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-sm text-gray-400">
                  出発地と目的地を入力して経路を検索してください
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 運行情報 ── */}
        {tab === "diainfo" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">
                運行情報
              </h2>
              <button
                onClick={fetchDiainfo}
                disabled={diainfoLoading}
                className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-40 flex items-center gap-1 transition"
              >
                <span className={diainfoLoading ? "animate-spin inline-block" : ""}>↻</span>
                更新
              </button>
            </div>

            {diainfoError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
                <span>⚠️</span>
                <span>{diainfoError}</span>
              </div>
            )}

            <DiainfoPanel items={diainfoItems} loading={diainfoLoading} />
          </div>
        )}
      </main>
    </div>
  );
}
