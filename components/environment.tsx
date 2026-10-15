"use client";
import { motion } from "motion/react";
import { memo } from "react";
import { ZONES, zoneFor } from "@/lib/types";
import DescentScene from "./descent-scene";
function Environment({
  score = 0,
  compact = false,
  reduced = false,
}: {
  score?: number;
  compact?: boolean;
  reduced?: boolean;
}) {
  const depth = score * 10;
  return (
    <div
      className={`environment immersive-environment ${compact ? "environment-compact" : ""}`}
      role="img"
      aria-label={`Descent environment: ${depth} meters, ${zoneFor(score)}`}
    >
      <DescentScene score={score} reduced={reduced} />
      <div className="scene-scanline" />
      <div className="coordinate top-left">
        EXPEDITION / CORE—07
        <br />
        PROBE CONNECTED · LIVE FEED
      </div>
      <div className="coordinate top-right">
        <span className="signal-dot" />{" "}
        {score ? "DESCENDING" : "AWAITING DESCENT"}
      </div>
      <div className="scene-location">
        <span className="scene-crosshair">+</span>
        <span>
          {zoneFor(score)}
          <small>
            {String(depth).padStart(4, "0")} METERS BELOW THE SURFACE
          </small>
        </span>
      </div>
      <div className="depth-rail">
        <span className="rail-label">DEPTH / M</span>
        <div className="rail-track">
          {ZONES.map((_, i) => (
            <span
              className="rail-tick"
              style={{ top: `${(i / 7) * 100}%` }}
              key={i}
            >
              <i />
              {i === 0 ? "0000" : `${i}000`}
            </span>
          ))}
          <span className="rail-tick" style={{ top: "100%" }}>
            <i />
            7000
          </span>
          <motion.div
            className="rail-marker"
            animate={{ top: `${(score / 700) * 100}%` }}
            transition={{ duration: reduced ? 0 : 1.8 }}
          >
            <span />
            YOU
          </motion.div>
        </div>
      </div>
      <div className="environment-bottom">
        <span>↓ EXPLORE THE UNKNOWN</span>
        <span>{String(depth).padStart(4, "0")} M</span>
      </div>
    </div>
  );
}
export default memo(Environment);
