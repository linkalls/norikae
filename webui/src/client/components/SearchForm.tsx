import { useCallback, useEffect, useRef, useState } from "react";
import {
  type SearchHistory,
  type SearchRequest,
  suggestItems,
  type SuggestResult,
  type SuggestSpot,
  type SuggestStation,
} from "../api";

function getLocalISOString(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface Props {
  onSearch: (req: SearchRequest) => void;
  loading?: boolean;
  history?: SearchHistory[];
  onRemoveHistory?: (idx: number) => void;
  onClearHistory?: () => void;
  initialFrom?: string;
  initialTo?: string;
}

type SuggestItem =
  | (SuggestStation & { _type: "station" })
  | (SuggestSpot & { _type: "spot" });

// キャッシュ: 入力値 → サジェスト結果
const suggestCache = new Map<string, SuggestResult>();

function useSuggest() {
  const [results, setResults] = useState<SuggestResult | null>(null);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggest = useCallback((val: string) => {
    if (val.trim().length === 0) {
      setResults(null);
      setOpen(false);
      if (timer.current) clearTimeout(timer.current);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const q = val.trim();
      if (suggestCache.has(q)) {
        setResults(suggestCache.get(q)!);
        setOpen(true);
        return;
      }
      try {
        const res = await suggestItems(q);
        suggestCache.set(q, res);
        setResults(res);
        setOpen(true);
      } catch {
        // サジェスト失敗は無視
      }
    }, 600);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const flatItems: SuggestItem[] = results
    ? [
      ...(results.stations ?? []).slice(0, 6).map(
        (s) => ({ ...s, _type: "station" as const }),
      ),
      ...(results.spots ?? []).slice(0, 4).map(
        (s) => ({ ...s, _type: "spot" as const }),
      ),
    ]
    : [];

  return { flatItems, open, close, fetchSuggest };
}

interface StationInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** サジェストから項目を選択した時に呼び出される (name, code, type) */
  onSelect?: (name: string, code: string, type: string) => void;
  placeholder?: string;
}

function StationInput({ label, value, onChange, onSelect, placeholder }: StationInputProps) {
  const { flatItems, open, close, fetchSuggest } = useSuggest();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [close]);

  return (
    <div ref={ref} className="relative flex-1">
      <label className="block text-xs font-semibold text-gray-500 mb-1 tracking-wide">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          fetchSuggest(e.target.value);
          // 手入力時はコードをクリア (サジェストの選択ではないため)
          onSelect?.(e.target.value, "", "");
        }}
        onFocus={(e) => fetchSuggest(e.target.value)}
        placeholder={placeholder}
        required
        autoComplete="off"
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
      />
      {open && flatItems.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden max-h-64 overflow-y-auto">
          {flatItems.map((item, i) => (
            <li key={`${item._type}-${item.id}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(item.name);
                  // コードを親コンポーネントに現在化
                  if (onSelect) {
                    const code = "id" in item ? (item.id ?? "") : "";
                    const type = item._type === "spot" ? "spot" : ("type" in item ? (item.type ?? "st") : "st");
                    onSelect(item.name, code, type as string);
                  }
                  close();
                }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition text-sm"
              >
                <span className="text-base shrink-0">
                  {item._type === "spot"
                    ? "📍"
                    : ("type" in item && item.type === "bu")
                      ? "🚌"
                      : "🚉"}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900">{item.name}</span>
                  {"yomi" in item && item.yomi && (
                    <span className="ml-1.5 text-xs text-gray-400">{item.yomi}</span>
                  )}
                  {"address" in item && item.address && (
                    <span className="ml-1.5 text-xs text-gray-400 truncate block">
                      {item.address}
                    </span>
                  )}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${item._type === "spot"
                    ? "bg-emerald-100 text-emerald-600"
                    : ("type" in item && item.type === "bu")
                      ? "bg-orange-100 text-orange-600"
                      : "bg-blue-100 text-blue-600"
                    }`}
                >
                  {item._type === "spot"
                    ? "場所"
                    : ("type" in item && item.type === "bu")
                      ? "バス停"
                      : ("type" in item && item.type === "lm")
                        ? "観光"
                        : "駅"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SearchForm({ onSearch, loading, history = [], onRemoveHistory, onClearHistory, initialFrom = "", initialTo = "" }: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  // 駅/バス停コード (サジェストから選択した時に設定される)
  const [fromCode, setFromCode] = useState("");
  const [fromType, setFromType] = useState("");
  const [toCode, setToCode] = useState("");
  const [toType, setToType] = useState("");
  const [via, setVia] = useState("");
  const [showVia, setShowVia] = useState(false);
  const [datetime, setDatetime] = useState(() => {
    return getLocalISOString(new Date());
  });
  const [type, setType] = useState<1 | 4 | 8>(1);
  const [sort, setSort] = useState<0 | 1 | 2>(0);
  const [rosentype, setRosentype] = useState(0);

  const swap = useCallback(() => {
    setFrom(to);
    setTo(from);
    setFromCode(toCode);
    setFromType(toType);
    setToCode(fromCode);
    setToType(fromType);
  }, [from, to, fromCode, fromType, toCode, toType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) return;
    const date = datetime.replace(/[-:T]/g, "").slice(0, 12);
    onSearch({
      from,
      to,
      date,
      via: via || undefined,
      type,
      sort,
      rosentype,
      fcode: fromCode || undefined,
      tcode: toCode || undefined,
      fromType: fromType || undefined,
      toType: toType || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-2">
          <StationInput label="出発地" value={from} onChange={(v) => { setFrom(v); if (!fromCode) setFromCode(""); }} onSelect={(_, code, type) => { setFromCode(code); setFromType(type); }} placeholder="例: 渋谷" />
          <button
            type="button"
            onClick={swap}
            title="入れ替え"
            className="mb-0.5 shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-300 transition"
          >
            ⇅
          </button>
          <StationInput label="目的地" value={to} onChange={(v) => { setTo(v); if (!toCode) setToCode(""); }} onSelect={(_, code, type) => { setToCode(code); setToType(type); }} placeholder="例: 新宿" />
        </div>

        {showVia ? (
          <div className="flex items-end gap-2">
            <StationInput label="経由地 (任意)" value={via} onChange={setVia} placeholder="例: 品川" />
            <button
              type="button"
              onClick={() => { setVia(""); setShowVia(false); }}
              className="mb-0.5 w-9 h-9 shrink-0 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-400 hover:border-red-200 transition text-lg"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowVia(true)}
            className="self-start text-xs text-blue-500 hover:text-blue-700 transition"
          >
            + 経由地を追加
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          <button
            type="button"
            onClick={() => setDatetime(getLocalISOString(new Date()))}
            className="text-xs px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 font-medium transition shrink-0"
          >
            現在時刻
          </button>
        </div>
        <div className="flex gap-1 text-sm">
          {([{ label: "出発", value: 1 }, { label: "到着", value: 4 }, { label: "終電", value: 8 }] as const).map(
            ({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${type === value ? "bg-blue-500 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* 並び順・オプション */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-gray-500">並び順:</span>
        <div className="flex gap-1 text-sm">
          {([
            { label: "⚡ 速い", value: 0 as const },
            { label: "🔄 乗換少", value: 1 as const },
            { label: "💴 安い", value: 2 as const },
          ]).map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSort(value)}
              className={`px-3 py-1.5 rounded-lg transition font-medium text-xs ${sort === value ? "bg-emerald-500 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rosentype === 1}
            onChange={(e) => setRosentype(e.target.checked ? 1 : 0)}
            className="w-4 h-4 accent-blue-500"
          />
          新幹線を使う
        </label>
      </div>

      {/* 最近の検索 */}
      {history.length > 0 && !from && !to && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-400">🕐 最近の検索</span>
            <button
              type="button"
              onClick={onClearHistory}
              className="text-xs text-gray-300 hover:text-red-400 transition"
            >
              すべて削除
            </button>
          </div>
          <ul className="space-y-1">
            {history.map((h, i) => (
              <li key={i} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setFrom(h.from);
                    setTo(h.to);
                    // 履歴検索はコードなし（テキスト検索）
                    setFromCode(""); setFromType("");
                    setToCode(""); setToType("");
                  }}
                  className="flex-1 text-left flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-blue-50 transition text-sm group"
                >
                  <span className="text-gray-700 font-medium">{h.from}</span>
                  <span className="text-gray-400 text-xs">→</span>
                  <span className="text-gray-700 font-medium">{h.to}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveHistory?.(i)}
                  className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition rounded text-xs"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition text-sm shadow-sm"
      >
        {loading ? "検索中…" : "🔍 経路を検索"}
      </button>
    </form>
  );
}
