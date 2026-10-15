"use client";
import { useEffect, useState } from "react";
import { OCEAN_LAYERS, oceanLayer } from "@/lib/ocean";
import { ArrowDown, Waves } from "lucide-react";
import { diveDepth, diveProgress, type DiveEvent } from "@/lib/dive";

export default function DiveTransition({
  dive,
  reduced,
  onEnd,
}: {
  dive: DiveEvent;
  reduced: boolean;
  onEnd?: () => void;
}) {
  const [now, setNow] = useState(dive.startedAt);
  useEffect(() => {
    if (reduced) return;
    let frame: number;
    const tick = () => {
      setNow(performance.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dive, reduced]);
  const progress = reduced ? 1 : diveProgress(dive, now);
  const depth = reduced ? dive.toDepth : Math.round(diveDepth(dive, now));
  const biome = oceanLayer(depth);
  const distance = (dive.toDepth - dive.fromDepth).toLocaleString("en-US");
  return (
    <div
      className={`dive-transition ${reduced ? "dive-calm" : ""}`}
      data-points={dive.profile.points}
      data-journey={dive.journey ? "true" : undefined}
      data-preview={dive.preview ? "true" : undefined}
      data-reward={dive.profile.label}
    >
      <div className="dive-caption" role="status">
        {dive.journey ? (
          "FULL JOURNEY PREVIEW · SURFACE → CORE · 7,000 METERS"
        ) : (
          <>
            {dive.preview ? "PREVIEW · " : ""}
            {dive.profile.label} · +{dive.profile.points} POINTS · {distance}{" "}
            METERS DEEPER
          </>
        )}
      </div>
      <div className="dive-instruments" aria-hidden="true">
        <span className="dive-pull">
          <Waves size={16} />
          {dive.journey ? "THE FULL DESCENT" : dive.profile.label}
        </span>
        <div className="dive-depth">
          <ArrowDown />
          <strong>{depth.toLocaleString("en-US")}</strong>
          <span>M</span>
        </div>
        <div className="dive-biome">
          <b>{biome.name}</b>
          <span>{biome.detail}</span>
        </div>
        <div className="journey-route" aria-hidden="true">
          {OCEAN_LAYERS.map((layer, i) => (
            <span
              key={layer.depth}
              className={depth >= layer.depth ? "visited" : ""}
              title={layer.name}
            >
              <i />
              {i}K
            </span>
          ))}
        </div>
        <div className="dive-track">
          <i style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="dive-distance">
          +{distance} M{" "}
          <span>
            {dive.fromDepth.toLocaleString("en-US")} →{" "}
            {dive.toDepth.toLocaleString("en-US")} M
          </span>
        </div>
        <small>
          {reduced
            ? dive.preview
              ? "PREVIEW ONLY · SCORE UNCHANGED"
              : "NEW DEPTH REACHED"
            : progress < 0.82
              ? "THRUSTERS ENGAGED · DESCENDING"
              : dive.preview
                ? "PREVIEW ONLY · SCORE UNCHANGED"
                : "STABILIZING AT NEW DEPTH"}
        </small>
      </div>
      {onEnd && (
        <button className="end-dive-preview" onClick={onEnd} autoFocus>
          END PREVIEW
        </button>
      )}
    </div>
  );
}
