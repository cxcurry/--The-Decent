"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  Crosshair,
  History,
  Menu,
  Radio,
  RotateCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Volume2,
  Waves,
  X,
} from "lucide-react";
import type { GameView, HistoryEntry, RoundView } from "@/lib/types";
import { CURRENT_EDITION, TIERS, ZONES, zoneFor } from "@/lib/types";
import { dayNumber } from "@/lib/daily";
import Environment from "./environment";
import DescentScene from "./descent-scene";
type Page = "daily" | "history" | "how" | "settings";
const format = (n: number) => n.toLocaleString("en-US");
function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
function useCounter(value: number, reduced: boolean) {
  const [n, setN] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    const from = current.current,
      start = performance.now();
    let frame: number;
    function tick(t: number) {
      const p = reduced ? 1 : Math.min(1, (t - start) / 1400);
      current.current = Math.round(
        from + (value - from) * (1 - Math.pow(1 - p, 3)),
      );
      setN(current.current);
      if (p < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return n;
}
export default function Game() {
  const [page, setPage] = useState<Page>("daily"),
    [data, setData] = useState<GameView | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [text, setText] = useState(""),
    [now, setNow] = useState(Date.now()),
    [mobileMenu, setMobileMenu] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]),
    [selected, setSelected] = useState<HistoryEntry | null>(null),
    [historyBusy, setHistoryBusy] = useState(false);
  const [sound, setSound] = useState(false),
    [reduced, setReduced] = useState(false),
    [copied, setCopied] = useState(false),
    [draftStatus, setDraftStatus] = useState(""),
    [finalReady, setFinalReady] = useState(true);
  const offset = useRef(0),
    queue = useRef<Promise<unknown>>(Promise.resolve()),
    draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    timeoutRound = useRef(""),
    resetDay = useRef(""),
    input = useRef<HTMLInputElement>(null),
    stateRef = useRef<GameView | null>(null),
    roundKey = useRef("");
  const attempt = data?.attempt,
    round = attempt?.rounds.at(-1),
    score = useCounter(attempt?.score ?? 0, reduced);
  const beep = useCallback(() => {
    if (!sound) return;
    try {
      const audio = new AudioContext();
      const osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.frequency.setValueAtTime(440, audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audio.currentTime + 0.16);
      gain.gain.setValueAtTime(0.035, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.22);
      osc.start();
      osc.stop(audio.currentTime + 0.23);
      osc.onended = () => void audio.close();
    } catch {}
  }, [sound]);
  const apply = useCallback((next: GameView) => {
    if (
      stateRef.current?.attempt?.status === "active" &&
      next.attempt?.status === "complete"
    )
      setFinalReady(false);
    offset.current = next.serverTime - Date.now();
    stateRef.current = next;
    setData(next);
    const r = next.attempt?.rounds.at(-1);
    const key = `${next.day}-${next.attempt?.edition}-${r?.number}`;
    if (key !== roundKey.current) {
      roundKey.current = key;
      setText(r?.draft ?? "");
      setDraftStatus("");
    }
    setNow(Date.now() + offset.current);
  }, []);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/game", { cache: "no-store" });
      const next = await response.json();
      if (!response.ok) throw new Error(next.error);
      apply(next);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Connection lost. Please retry.",
      );
    }
  }, [apply]);
  useEffect(() => {
    void refresh();
    const interval = setInterval(
      () => setNow(Date.now() + offset.current),
      100,
    );
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    try {
      const settings = JSON.parse(
        localStorage.getItem("core-settings") || "{}",
      );
      setSound(settings.sound === true);
      setReduced(
        settings.reduced ??
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
    } catch {}
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  const act = useCallback(
    (action: string, value?: string, silent = false) => {
      const current = stateRef.current?.attempt?.rounds.at(-1);
      if (draftTimer.current && !silent) {
        clearTimeout(draftTimer.current);
        draftTimer.current = null;
      }
      if (!silent) {
        setBusy(true);
        setError("");
      }
      const task = queue.current
        .catch(() => {})
        .then(async () => {
          try {
            const response = await fetch("/api/game", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action,
                text: value,
                round: current?.number,
              }),
              keepalive: silent,
            });
            const next: GameView & { error?: string } = await response.json();
            if (!response.ok)
              throw new Error(next.error ?? "Unable to save your answer.");
            if (silent) {
              setDraftStatus("Answer saved");
              if (next.attempt?.rounds.at(-1)?.resolved) apply(next);
            } else {
              apply(next);
              if (next.attempt?.rounds.at(-1)?.points && !current?.resolved)
                beep();
            }
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Connection lost. Please retry.",
            );
            if (silent) setDraftStatus("Not saved");
          } finally {
            if (!silent) setBusy(false);
          }
        });
      queue.current = task;
      return task;
    },
    [apply, beep],
  );
  useEffect(() => {
    if (data && now >= data.nextReset && resetDay.current !== data.day) {
      resetDay.current = data.day;
      void refresh();
    }
  }, [now, data, refresh]);
  const expired = round && !round.resolved && now >= round.deadline;
  useEffect(() => {
    if (!expired || !data) return;
    const key = `${data.day}-${attempt?.edition}-${round?.number}`;
    if (timeoutRound.current === key) return;
    timeoutRound.current = key;
    queue.current = queue.current.catch(() => {}).then(() => refresh());
  }, [expired, data, round?.number, refresh]);
  const preview = !!round && !round.resolved && now < round.previewUntil;
  useEffect(() => {
    if (page === "daily" && round && !round.resolved && !preview)
      input.current?.focus();
  }, [page, round?.number, round?.resolved, preview]);
  const navigate = (next: Page) => {
    setPage(next);
    setMobileMenu(false);
    setSelected(null);
    setError("");
    if (next === "daily") void refresh();
    if (next === "history") {
      setHistoryBusy(true);
      fetch("/api/history")
        .then(async (r) => {
          const body = await r.json();
          if (!r.ok) throw new Error(body.error);
          setHistory(body.history);
        })
        .catch((e) => setError(e.message))
        .finally(() => setHistoryBusy(false));
    }
  };
  const saveSetting = (key: "sound" | "reduced", value: boolean) => {
    const settings = { sound, reduced, [key]: value };
    if (key === "sound") setSound(value);
    else setReduced(value);
    try {
      localStorage.setItem("core-settings", JSON.stringify(settings));
    } catch {}
  };
  const changeText = (value: string) => {
    setText(value);
    setDraftStatus("Saving…");
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => void act("draft", value, true), 180);
  };
  const share = async (entry?: HistoryEntry) => {
    const a = entry ?? attempt;
    if (!a) return;
    const summary = `CORE° — THE DESCENT\n${a.day} · Daily #${dayNumber(a.day)} · ${a.edition === CURRENT_EDITION ? "Everyday" : "Original"} edition\n${a.rounds.map((r) => (r.points === 100 ? "💎" : r.points >= 60 ? "🔵" : r.points > 0 ? "⚪" : "⚫")).join("")}\n${a.score}/700 · ${format(a.score * 10)} m\n${zoneFor(a.score)}\nHow deep does your knowledge go?`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(
        "Clipboard unavailable. Select and copy this summary: " + summary,
      );
    }
  };
  const stats = data?.stats;
  const complete = attempt?.status === "complete";
  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"}>
      <div
        className={`app ${reduced ? "reduce-motion" : ""}`}
        style={
          {
            "--zone-darkness": `${Math.min(0.5, (attempt?.score ?? 0) / 1400)}`,
          } as React.CSSProperties
        }
      >
        <DescentScene ambient score={attempt?.score ?? 0} reduced={reduced} />
        {page === "daily" && round?.resolved && round.points > 0 && (
          <div
            key={`${attempt?.day}-${round.number}`}
            className="score-wave"
            aria-hidden="true"
          />
        )}
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <button
            className="brand"
            aria-label="CORE home"
            onClick={() => navigate("daily")}
          >
            CORE<span>°</span>
            <i />
          </button>
          <span className="brand-divider" />
          <span className="edition">THE DESCENT</span>
          <nav
            className={mobileMenu ? "nav nav-open" : "nav"}
            aria-label="Main navigation"
          >
            {(
              [
                ["daily", "Daily Descent"],
                ["history", "My Results"],
                ["how", "How to Play"],
              ] as [Page, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                className={page === id ? "nav-active" : ""}
                onClick={() => navigate(id)}
              >
                {label}
              </button>
            ))}
            <button
              className={`settings-link ${page === "settings" ? "nav-active" : ""}`}
              aria-label="Settings"
              onClick={() => navigate("settings")}
            >
              <Settings2 size={17} />
            </button>
          </nav>
          <button
            className="mobile-toggle"
            aria-label={mobileMenu ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenu}
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </header>
        <main id="main">
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button
                onClick={() => {
                  setError("");
                  void refresh();
                }}
                aria-label="Retry connection"
              >
                <RotateCw size={16} />
              </button>
            </div>
          )}
          {!data && !error ? (
            <div className="loading">
              <span className="signal-dot" /> ESTABLISHING CONNECTION…
            </div>
          ) : null}
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.25 }}
            >
              {page === "daily" && data && !attempt && (
                <>
                  <div className="expedition-bar">
                    <span>
                      <span className="signal-dot" /> DAILY EXPEDITION{" "}
                      <b>#{String(data.challenge).padStart(3, "0")}</b>
                    </span>
                    <span className="date-label">
                      {new Date(`${data.day}T12:00:00`)
                        .toLocaleDateString("en-US", {
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                        })
                        .toUpperCase()}{" "}
                      <i> / </i> OPEN TO ALL
                    </span>
                  </div>
                  <section className="landing-hero">
                    <div className="hero-copy">
                      <div className="eyebrow">
                        <span className="tiny-line" /> FAMILIAR QUESTIONS.
                        UNCOMMON DISCOVERIES.
                      </div>
                      <h1>
                        THE
                        <br />
                        <span>DESCENT</span>
                        <span className="title-dot">°</span>
                      </h1>
                      <p className="hero-subtitle">
                        How deep does your
                        <br className="desktop-break" /> knowledge go?
                      </p>
                      <p className="hero-description">
                        7 questions. 25 seconds each.
                        <br />
                        The rarer your answer, the deeper you go.
                      </p>
                      <button
                        className="primary start-button"
                        onClick={() => void act("start")}
                        disabled={busy}
                      >
                        {busy ? "CONNECTING…" : "START DESCENT"}
                        <ArrowDown size={19} />
                      </button>
                      <div className="start-note">
                        <ShieldCheck size={13} /> FREE TO EXPLORE <span>·</span>{" "}
                        NO ACCOUNT NEEDED
                      </div>
                    </div>
                    <Environment reduced={reduced} />
                  </section>
                  <div className="expedition-details">
                    <div>
                      <span className="detail-label">THE MISSION</span>
                      <strong>
                        07 <small>questions</small>
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">THE WINDOW</span>
                      <strong>
                        25 <small>seconds / round</small>
                      </strong>
                    </div>
                    <div>
                      <span className="detail-label">THE LIMIT</span>
                      <strong>
                        7,000 <small>meters</small>
                      </strong>
                    </div>
                    <div className="reset-detail">
                      <span className="detail-label">NEXT EXPEDITION IN</span>
                      <strong className="countdown">
                        {countdown(data.nextReset - now)}
                      </strong>
                      <small>MIDNIGHT · NEW YORK</small>
                    </div>
                  </div>
                  <section className="landing-bottom">
                    <div>
                      <span className="eyebrow">
                        ORDINARY ANSWERS STAY AT THE SURFACE.
                      </span>
                      <h2>Think beyond the obvious.</h2>
                      <p>
                        Correct is only the beginning. Find the answer others
                        overlook.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => navigate("how")}
                      >
                        Explore the scoring system <ArrowUpRight size={15} />
                      </button>
                    </div>
                    <div className="mini-rarities">
                      {TIERS.map((tier, i) => (
                        <div key={tier.name}>
                          <span
                            className="rarity-line"
                            style={{
                              height: 12 + i * 7,
                              background: tier.color,
                              opacity: 0.45 + i * 0.1,
                            }}
                          />
                          <span>{tier.points}</span>
                        </div>
                      ))}
                      <span className="mini-rarity-label">
                        SURFACE <ArrowRight size={12} /> CORE°
                      </span>
                    </div>
                  </section>
                  {stats && stats.completed > 0 && (
                    <div className="best-strip">
                      <Sparkles size={16} /> PERSONAL BEST{" "}
                      <b>{stats.best}/700</b>
                      <span>{format(stats.best * 10)} M</span>
                      <button onClick={() => navigate("history")}>
                        View your log <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </>
              )}
              {page === "daily" &&
                data &&
                attempt &&
                (!complete || !finalReady) &&
                round && (
                  <>
                    <div className="expedition-bar">
                      <button
                        className="text-button"
                        onClick={() => navigate("how")}
                      >
                        EXPEDITION #{String(data.challenge).padStart(3, "0")}{" "}
                        <ChevronRight size={14} />
                      </button>
                      <span>
                        <span className="signal-dot" />{" "}
                        {round.resolved
                          ? "DESCENT COMPLETE"
                          : "LIVE EXPEDITION"}
                      </span>
                    </div>
                    <div className="play-layout">
                      <motion.section
                        className="play-panel"
                        key={`${attempt.edition}-${round.number}`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45 }}
                      >
                        <div className="round-topline">
                          <span className="eyebrow">
                            STAGE {String(round.number).padStart(2, "0")}{" "}
                            <i>/ 07</i>
                          </span>
                          <div
                            className="round-progress"
                            aria-label={`Question ${round.number} of 7`}
                          >
                            {Array.from({ length: 7 }, (_, i) => (
                              <span
                                key={i}
                                className={
                                  i < round.number - 1
                                    ? "done"
                                    : i === round.number - 1
                                      ? "current"
                                      : ""
                                }
                              />
                            ))}
                          </div>
                        </div>
                        {!round.resolved ? (
                          <>
                            <div className="category">
                              <Crosshair size={14} />
                              {round.category}
                            </div>
                            <h2 className="question">{round.prompt}</h2>
                            <p className="question-note">
                              Start with an answer you know. Rarer answers earn
                              more.
                            </p>
                            <div className="answer-area">
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (!preview && !busy && !expired)
                                    void act("submit", text);
                                }}
                              >
                                <label htmlFor="answer">YOUR ANSWER</label>
                                <div
                                  className={`answer-input ${data.rejected ? "rejected" : ""}`}
                                >
                                  <input
                                    ref={input}
                                    id="answer"
                                    name="answer"
                                    value={text}
                                    onChange={(e) => changeText(e.target.value)}
                                    onBlur={() => {
                                      if (draftTimer.current) {
                                        clearTimeout(draftTimer.current);
                                        draftTimer.current = null;
                                        if (
                                          !round.resolved &&
                                          !expired &&
                                          !preview
                                        )
                                          void act("draft", text, true);
                                      }
                                    }}
                                    placeholder={
                                      preview
                                        ? "Read the prompt…"
                                        : "Type an answer you know…"
                                    }
                                    maxLength={120}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    enterKeyHint="send"
                                    disabled={preview || busy || !!expired}
                                    aria-describedby="answer-feedback"
                                  />
                                  <button
                                    type="submit"
                                    aria-label="Submit answer"
                                    disabled={preview || busy || !!expired}
                                  >
                                    <ArrowRight size={23} />
                                  </button>
                                </div>
                                <div
                                  id="answer-feedback"
                                  className={`answer-feedback ${data.rejected ? "feedback-rejected" : ""}`}
                                  aria-live="polite"
                                >
                                  {data.feedback ||
                                    (preview
                                      ? "Take a breath. Your timer starts in a moment."
                                      : draftStatus ||
                                        "Press Enter to lock in your answer.")}
                                </div>
                              </form>
                              <div className="question-actions">
                                <button
                                  className="text-button muted"
                                  onClick={() => void act("pass")}
                                  disabled={preview || busy || !!expired}
                                >
                                  Pass this round <ArrowRight size={14} />
                                </button>
                                <span>NO POINTS DEDUCTED FOR GUESSES</span>
                              </div>
                            </div>
                            <div className="timer-row">
                              <Timer
                                remaining={
                                  preview
                                    ? 25
                                    : Math.max(0, (round.deadline - now) / 1000)
                                }
                                preview={preview}
                              />
                              <div>
                                <span className="eyebrow">
                                  {preview
                                    ? "PREPARE TO DESCEND"
                                    : expired
                                      ? "TRANSMITTING"
                                      : "TIME TO THINK"}
                                </span>
                                <p>
                                  {preview
                                    ? "Your 25 seconds begin shortly."
                                    : "Keep exploring. You can try again."}
                                </p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="reveal">
                            <div className="category">
                              <Check size={15} />
                              {round.points
                                ? "ANSWER LOCKED"
                                : "ROUND COMPLETE"}
                            </div>
                            <div
                              className="reveal-rarity"
                              style={{
                                color:
                                  TIERS.find((t) => t.name === round.tier)
                                    ?.color ?? "#91a0b4",
                              }}
                            >
                              {round.tier ??
                                (round.outcome === "passed"
                                  ? "PASSED"
                                  : "TIME’S UP")}
                            </div>
                            <h2 className="reveal-answer">
                              {round.answer ??
                                (round.outcome === "passed"
                                  ? "The journey continues."
                                  : "A little deeper next time.")}
                            </h2>
                            {round.submitted && !round.answer && (
                              <p className="question-note">
                                “{round.submitted}” wasn’t recognized in our
                                curated bank.
                              </p>
                            )}
                            <div className="points-earned">
                              +{round.points}
                              <span>POINTS</span>
                              <i>↓ {format(round.points * 10)} M</i>
                            </div>
                            {Math.floor(attempt.score / 100) >
                              Math.floor(
                                (attempt.score - round.points) / 100,
                              ) && (
                              <motion.div
                                className="milestone"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4 }}
                              >
                                <Crosshair size={14} /> NEW DEPTH ZONE ·{" "}
                                {zoneFor(attempt.score)}
                              </motion.div>
                            )}
                            <p className="reveal-note">
                              {round.points >= 60
                                ? "An uncommon answer. A remarkable discovery."
                                : round.points
                                  ? "Knowledge takes you deeper. Keep going."
                                  : "Every explorer has uncharted territory. Keep going."}
                            </p>
                            <button
                              className="primary"
                              disabled={busy}
                              onClick={() =>
                                complete
                                  ? setFinalReady(true)
                                  : void act("continue")
                              }
                            >
                              {complete
                                ? "VIEW EXPEDITION RESULTS"
                                : "CONTINUE DESCENT"}{" "}
                              <ArrowDown size={18} />
                            </button>
                            <p className="paused-note">
                              TIMER PAUSED · YOUR NEXT STAGE IS READY
                            </p>
                          </div>
                        )}
                        <div className="live-stats">
                          <div>
                            <span className="detail-label">TOTAL SCORE</span>
                            <strong>
                              {score}
                              <small> / 700</small>
                            </strong>
                          </div>
                          <div>
                            <span className="detail-label">CURRENT DEPTH</span>
                            <strong>
                              {format(score * 10)}
                              <small> M</small>
                            </strong>
                          </div>
                          <span className="zone-chip">
                            {zoneFor(attempt.score)}
                          </span>
                        </div>
                      </motion.section>
                      <Environment
                        compact
                        score={attempt.score}
                        reduced={reduced}
                      />
                    </div>
                    <div className="expedition-footnote">
                      <Radio size={13} /> SERVER-SAVED EXPEDITION{" "}
                      <span>ONE DAILY DESCENT. EVERY ANSWER COUNTS.</span>
                    </div>
                  </>
                )}
              {page === "daily" &&
                data &&
                attempt &&
                complete &&
                finalReady && (
                  <Results
                    entry={{
                      day: attempt.day,
                      edition: attempt.edition,
                      score: attempt.score,
                      rounds: attempt.rounds,
                    }}
                    stats={data.stats}
                    onShare={() => void share()}
                    copied={copied}
                    next={countdown(data.nextReset - now)}
                    onHistory={() => navigate("history")}
                  />
                )}
              {page === "how" && (
                <section className="content-page">
                  <span className="eyebrow">EXPEDITION FIELD GUIDE</span>
                  <h1 className="page-title">
                    Go deeper.
                    <br />
                    <span>Think rarer.</span>
                  </h1>
                  <p className="page-intro">
                    Seven open-ended questions. One daily descent. Your
                    knowledge is the only equipment you need.
                  </p>
                  <div className="how-grid">
                    {[
                      [
                        "01",
                        "Read the terrain",
                        "You have two seconds to read each category, then 25 seconds to find an answer.",
                      ],
                      [
                        "02",
                        "Find the uncommon",
                        "Any accepted answer scores. Uncommon answers earn more. Rejected guesses can be retried while time remains.",
                      ],
                      [
                        "03",
                        "Follow your descent",
                        "Every point takes you ten meters deeper. Reach 7,000 meters with seven perfect CORE° answers.",
                      ],
                    ].map(([n, title, body]) => (
                      <article className="instruction" key={n}>
                        <span>{n}</span>
                        <h2>{title}</h2>
                        <p>{body}</p>
                      </article>
                    ))}
                  </div>
                  <h2 className="section-title">Six levels of discovery.</h2>
                  <div className="tier-grid">
                    {TIERS.map((t, i) => (
                      <div key={t.name} className="tier-card">
                        <span style={{ color: t.color }}>
                          0{i + 1} / {t.name}
                        </span>
                        <strong>
                          {t.points}
                          <small>PTS</small>
                        </strong>
                      </div>
                    ))}
                  </div>
                  <div className="field-note">
                    <ShieldCheck size={22} />
                    <div>
                      <h3>A fair expedition, with clear limits.</h3>
                      <p>
                        Rarity tiers are curated editorial estimates, not
                        measured player popularity. Our starter collection has
                        49 approachable questions in seven rotating daily sets.
                        Common answers count, and rarer answers are a bonus.
                        Some valid answers may not yet be in the bank; try
                        another if yours is unrecognized. Aliases, accents and
                        conservative typo correction are supported.
                      </p>
                      <p>
                        The Everyday edition gives existing players a fresh
                        daily attempt. Original-edition results are retained in
                        your history. Each edition permits one attempt per day.
                      </p>
                      <p>
                        Your anonymous browser cookie identifies your saved
                        server-side attempt. Refreshing preserves the timer and
                        score. Clearing cookies or using another browser creates
                        a new identity; this is not perfect anti-cheat
                        protection. After midnight in America/New_York, the next
                        daily set unlocks. Unfinished previous-day descents
                        expire.
                      </p>
                      <p>
                        Drafts save as you type. At timeout, the server
                        evaluates the most recently saved text. The timer pauses
                        on reveal screens, and accepted answers are locked.
                      </p>
                    </div>
                  </div>
                  <button className="primary" onClick={() => navigate("daily")}>
                    RETURN TO DAILY DESCENT <ArrowRight size={18} />
                  </button>
                </section>
              )}
              {page === "settings" && (
                <section className="content-page settings-page">
                  <span className="eyebrow">EXPEDITION CONTROLS</span>
                  <h1 className="page-title">Your atmosphere.</h1>
                  <p className="page-intro">A little focus goes a long way.</p>
                  <div className="setting-row">
                    <Volume2 size={23} />
                    <div>
                      <h2>Discovery sound</h2>
                      <p>A subtle signal when an answer is accepted.</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={sound}
                      aria-label="Discovery sound"
                      className={`toggle ${sound ? "enabled" : ""}`}
                      onClick={() => saveSetting("sound", !sound)}
                    >
                      <span />
                    </button>
                  </div>
                  <div className="setting-row">
                    <Waves size={23} />
                    <div>
                      <h2>Reduced motion</h2>
                      <p>Quiet the particles and shorten descent animations.</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={reduced}
                      aria-label="Reduced motion"
                      className={`toggle ${reduced ? "enabled" : ""}`}
                      onClick={() => saveSetting("reduced", !reduced)}
                    >
                      <span />
                    </button>
                  </div>
                  <div className="field-note">
                    <ShieldCheck size={22} />
                    <div>
                      <h3>Your progress stays with this browser.</h3>
                      <p>
                        No account is required. Settings stay on this device;
                        scores and attempts are stored on the server. Keep your
                        browser’s cookies to return to your results.
                      </p>
                    </div>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("daily")}
                  >
                    Back to the descent <ArrowRight size={16} />
                  </button>
                </section>
              )}
              {page === "history" && (
                <section className="content-page">
                  <span className="eyebrow">YOUR EXPEDITION LOG</span>
                  <h1 className="page-title">Depths explored.</h1>
                  <p className="page-intro">Every descent leaves a record.</p>
                  {selected && stats ? (
                    <>
                      <button
                        className="text-button"
                        onClick={() => setSelected(null)}
                      >
                        ← Back to your log
                      </button>
                      <Results
                        entry={selected}
                        stats={stats}
                        onShare={() => void share(selected)}
                        copied={copied}
                        onHistory={() => setSelected(null)}
                      />
                    </>
                  ) : (
                    <>
                      <div className="history-stats">
                        {[
                          ["PERSONAL BEST", `${stats?.best ?? 0} / 700`],
                          ["AVERAGE SCORE", String(stats?.average ?? 0)],
                          ["CURRENT STREAK", `${stats?.streak ?? 0} days`],
                          [
                            "LONGEST STREAK",
                            `${stats?.longestStreak ?? 0} days`,
                          ],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <span className="detail-label">{label}</span>
                            <strong>{value}</strong>
                          </div>
                        ))}
                      </div>
                      {historyBusy ? (
                        <p className="empty-state">RETRIEVING EXPEDITIONS…</p>
                      ) : history.length === 0 ? (
                        <div className="empty-state">
                          <History size={34} />
                          <h2>Your story starts at the surface.</h2>
                          <p>
                            Complete your first seven-question descent to begin
                            your expedition log.
                          </p>
                          <button
                            className="primary"
                            onClick={() => navigate("daily")}
                          >
                            DAILY DESCENT <ArrowRight size={17} />
                          </button>
                        </div>
                      ) : (
                        <div className="history-list">
                          {history.map((a) => (
                            <button
                              key={a.id ?? `${a.day}-${a.edition}`}
                              onClick={() => setSelected(a)}
                            >
                              <span className="history-date">
                                {a.day}
                                <small>
                                  {a.edition === CURRENT_EDITION
                                    ? "EVERYDAY EDITION"
                                    : "ORIGINAL EDITION"}
                                </small>
                              </span>
                              <span className="history-zone">
                                {zoneFor(a.score)}
                                <small>{format(a.score * 10)} M</small>
                              </span>
                              <strong>
                                {a.score} <small>/700</small>
                              </strong>
                              <ChevronRight size={18} />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="site-footer">
          <span>
            <b>CORE°</b> KNOWLEDGE HAS DEPTH.
          </span>
          <span>
            ONE WORLD. ONE DAILY DESCENT. <i>↘</i>
          </span>
        </footer>
      </div>
    </MotionConfig>
  );
}
function Timer({
  remaining,
  preview,
}: {
  remaining: number;
  preview: boolean;
}) {
  const urgent = remaining <= 5 && !preview;
  return (
    <div
      className={`timer ${urgent ? "timer-urgent" : ""}`}
      aria-label={
        preview ? "Reading time" : `${Math.ceil(remaining)} seconds remaining`
      }
    >
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="32" />
        <circle
          cx="36"
          cy="36"
          r="32"
          strokeDasharray={`${(remaining / 25) * 201.06} 201.06`}
        />
      </svg>
      <span>
        {preview ? "…" : Math.ceil(remaining)}
        <small>SEC</small>
      </span>
    </div>
  );
}
function Results({
  entry,
  stats,
  onShare,
  copied,
  next,
  onHistory,
}: {
  entry: HistoryEntry;
  stats: GameView["stats"];
  onShare: () => void;
  copied: boolean;
  next?: string;
  onHistory: () => void;
}) {
  return (
    <section className="results content-page">
      <div className="results-heading">
        <span className="eyebrow">
          <span className="signal-dot" />{" "}
          {entry.edition === CURRENT_EDITION ? "EVERYDAY" : "ORIGINAL"}{" "}
          EXPEDITION COMPLETE / {entry.day}
        </span>
        <span className="result-mark">
          <Crosshair size={42} />
        </span>
        <h1 className="page-title">You went deeper.</h1>
        <p className="page-intro">
          {zoneFor(entry.score)} <span>·</span>{" "}
          {entry.score === stats.best && entry.score > 0
            ? "PERSONAL BEST"
            : "EXPEDITION LOGGED"}
        </p>
        <div className="result-numbers">
          <div>
            <strong>
              {format(entry.score * 10)}
              <span>M</span>
            </strong>
            <small>FINAL DEPTH REACHED</small>
          </div>
          <div>
            <strong>
              {entry.score}
              <span>/700</span>
            </strong>
            <small>TOTAL SCORE</small>
          </div>
        </div>
        <div className="zone-scale">
          {ZONES.map((z, i) => (
            <span
              className={i <= Math.floor(entry.score / 100) ? "reached" : ""}
              key={z}
              title={z}
            />
          ))}
        </div>
        <div className="result-buttons">
          <button className="primary" onClick={onShare}>
            {copied ? <Check size={17} /> : <Copy size={17} />}{" "}
            {copied ? "RESULTS COPIED" : "COPY RESULTS"}
          </button>
          <button className="secondary" onClick={onHistory}>
            MY EXPEDITION LOG <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
      <div className="breakdown">
        <div className="section-heading">
          <h2>Your seven discoveries.</h2>
          <span>ROUND / ANSWER / DEPTH</span>
        </div>
        {entry.rounds.map((r) => (
          <Breakdown key={r.number} round={r} />
        ))}
      </div>
      <div className="summary-stats">
        {[
          ["PERSONAL BEST", `${stats.best}/700`],
          [
            "DAILY STREAK",
            `${stats.streak} ${stats.streak === 1 ? "day" : "days"}`,
          ],
          [
            "COMPLETED",
            `${stats.completed} ${stats.completed === 1 ? "dive" : "dives"}`,
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <span className="detail-label">{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {next && (
        <div className="next-expedition">
          <Radio size={18} />
          <p>
            New depths await tomorrow.
            <small>NEXT EXPEDITION · MIDNIGHT NEW YORK</small>
          </p>
          <b>{next}</b>
        </div>
      )}
    </section>
  );
}
function Breakdown({ round: r }: { round: RoundView }) {
  return (
    <article className="breakdown-row">
      <span className="round-index">0{r.number}</span>
      <div>
        <span className="detail-label">{r.category}</span>
        <h3>
          {r.answer ??
            (r.outcome === "passed" ? "Passed" : r.submitted || "No answer")}
        </h3>
        <p>{r.prompt}</p>
        {r.answer &&
          r.submitted &&
          r.answer.toLowerCase() !== r.submitted.toLowerCase() && (
            <p className="original-answer">You entered: {r.submitted}</p>
          )}
      </div>
      <span
        className="breakdown-tier"
        style={{
          color: TIERS.find((t) => t.name === r.tier)?.color ?? "#7b879a",
        }}
      >
        {r.tier ?? (r.outcome === "passed" ? "PASSED" : "NO SCORE")}
      </span>
      <strong>
        +{r.points}
        <small>{format(r.points * 10)} M</small>
      </strong>
    </article>
  );
}
