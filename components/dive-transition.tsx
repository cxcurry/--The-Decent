"use client";
import { useEffect, useState } from "react";
import { ArrowDown, Waves } from "lucide-react";
import { diveDepth, diveProgress, type DiveEvent } from "@/lib/dive";

export default function DiveTransition({
  dive,
  reduced,
}: {
  dive: DiveEvent;
  reduced: boolean;
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
  const distance = (dive.toDepth - dive.fromDepth).toLocaleString("en-US");
  return (
    <div
      className={`dive-transition ${reduced ? "dive-calm" : ""}`}
      data-points={dive.profile.points}
      data-reward={dive.profile.label}
    >
      <div className="dive-caption" role="status">
        {dive.profile.label} · +{dive.profile.points} POINTS · {distance} METERS
        DEEPER
      </div>
      <div className="dive-instruments" aria-hidden="true">
        <span className="dive-pull">
          <Waves size={16} />
          {dive.profile.label}
        </span>
        <div className="dive-depth">
          <ArrowDown />
          <strong>{depth.toLocaleString("en-US")}</strong>
          <span>M</span>
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
            ? "NEW DEPTH REACHED"
            : progress < 0.82
              ? "THRUSTERS ENGAGED · DESCENDING"
              : "STABILIZING AT NEW DEPTH"}
        </small>
      </div>
    </div>
  );
}
