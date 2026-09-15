"use client";

import { useState, useTransition } from "react";
import { isoToMdy } from "@/lib/dates";
import { SongChip } from "../_components/song-chip";
import { searchAction, type SearchResult } from "./actions";

const MODES = [
  { key: "title", label: "By Song Title", placeholder: "hosanna" },
  { key: "hymn", label: "By Hymn #", placeholder: "149" },
  { key: "date", label: "By Date", placeholder: "9-13-26" },
] as const;

export function SearchClient() {
  const [mode, setMode] = useState<(typeof MODES)[number]["key"]>("title");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult>({ kind: "empty" });
  const [pending, startTransition] = useTransition();

  function run(nextMode: typeof mode, nextQuery: string) {
    startTransition(async () => {
      setResult(await searchAction(nextMode, nextQuery));
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => {
              setMode(m.key);
              setQuery("");
              setResult({ kind: "empty" });
            }}
            className={
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold " +
              (mode === m.key
                ? "border-accent bg-accent text-white"
                : "border-border-strong bg-surface text-text-muted hover:border-accent")
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            run(mode, e.target.value);
          }}
          placeholder={MODES.find((m) => m.key === mode)!.placeholder}
          className="flex-1 rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-sm"
        />
      </div>

      <div className="mt-4">
        {pending && <p className="text-sm text-text-faint italic">Searching…</p>}
        {!pending && <ResultView result={result} />}
      </div>
    </div>
  );
}

function ResultView({ result }: { result: SearchResult }) {
  if (result.kind === "empty") return null;

  if (result.kind === "title-none" || result.kind === "hymn-none") {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-lg font-bold">&ldquo;{result.query}&rdquo;</h3>
          <StatusPill used={false} />
        </div>
        <p className="text-sm text-text-muted">
          This hasn&apos;t appeared in the log — first time picking it? Save a service with it to
          start tracking.
        </p>
      </div>
    );
  }

  if (result.kind === "date-none") {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-lg font-bold">{result.query}</h3>
          <StatusPill used={false} label="No service found" />
        </div>
        <p className="text-sm text-text-muted">Try a date like 9-13-26.</p>
      </div>
    );
  }

  if (result.kind === "title-hit") {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-lg font-bold">{result.title}</h3>
          <StatusPill used />
        </div>
        <p className="mb-3 text-sm text-text-muted">
          Last used <b className="font-mono-tab text-foreground">{isoToMdy(result.lastDate)}</b> ·
          used {result.count} {result.count === 1 ? "time" : "times"}
        </p>
        <ul className="flex flex-col">
          {result.history.map((h, i) => (
            <li key={i} className="flex justify-between border-t border-border py-2 text-sm first:border-t-0">
              <span className="font-mono-tab font-semibold text-accent-strong">{isoToMdy(h.date)}</span>
              <span>Hymn {h.hymnNumber}</span>
            </li>
          ))}
        </ul>
        <AlsoPlayed date={result.lastDate} siblings={result.siblings} />
      </div>
    );
  }

  if (result.kind === "hymn-hit") {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-lg font-bold">{result.title}</h3>
          <StatusPill used />
        </div>
        <p className="mb-3 text-sm text-text-muted">
          Hymn <b className="font-mono-tab text-foreground">#{result.hymnNumber}</b> · last used{" "}
          <b className="font-mono-tab text-foreground">{isoToMdy(result.lastDate)}</b>
        </p>
        <AlsoPlayed date={result.lastDate} siblings={result.siblings} />
      </div>
    );
  }

  // date-hit
  const { service } = result;
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h3 className="mb-1 text-lg font-bold">
        {isoToMdy(service.date)}
        {service.sermon ? ` — ${service.sermon}` : ""}
      </h3>
      {service.scripture && <p className="mb-3 text-sm text-text-muted">{service.scripture}</p>}
      {service.songs.length ? (
        <div className="flex flex-col gap-1.5">
          {service.songs.map((s) => (
            <div key={s.id} className="flex flex-wrap items-baseline gap-2">
              <SongChip hymnNumber={s.hymnNumber} title={s.title} />
              {s.verses && (
                <span className="font-mono-tab rounded-full border border-border bg-surface-sunk px-2 py-0.5 text-xs text-text-muted">
                  {s.verses}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">{service.note || "No songs logged this week."}</p>
      )}
    </div>
  );
}

function AlsoPlayed({ date, siblings }: { date: string; siblings: { hymnNumber: string; title: string }[] }) {
  if (!siblings.length) return null;
  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="mb-2 text-xs font-bold tracking-wide text-text-muted uppercase">
        Also played that Sunday · <b className="font-mono-tab text-accent-strong">{isoToMdy(date)}</b>
      </div>
      <div className="flex flex-col gap-1">
        {siblings.map((s, i) => (
          <SongChip key={i} hymnNumber={s.hymnNumber} title={s.title} />
        ))}
      </div>
    </div>
  );
}

function StatusPill({ used, label }: { used: boolean; label?: string }) {
  return (
    <span
      className={
        "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase " +
        (used ? "bg-good-soft text-good" : "bg-warn-soft text-warn")
      }
    >
      {label ?? (used ? "Used before" : "Not used yet")}
    </span>
  );
}
