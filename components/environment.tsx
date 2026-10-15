"use client";
import { motion } from "motion/react";
import { memo } from "react";
import { oceanLayer } from "@/lib/ocean";
import { ZONES, zoneFor } from "@/lib/types";

// Telemetry floats over the single viewport-sized world, rather than enclosing
// another copy of the artwork in a separate panel.
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
    <aside
      className={`environment world-telemetry ${compact ? "environment-compact" : ""}`}
      aria-label={`Descent environment: ${depth} meters, ${zoneFor(score)}`}
    >
      <div className="coordinate top-left">
        <span className="signal-dot" /> LIVE FROM THE UNKNOWN
        <br />
        CORE / EXPLORER 07
      </div>
      <div className="probe-lock" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <span>
          EXPLORER 07
          <br />
          <b>LINK STABLE</b>
        </span>
      </div>
      <div className="sonar-display" aria-hidden="true">
        <i />
        <span />
        <b />
        <em />
      </div>
      <div className="scene-location">
        <span className="scene-crosshair">+</span>
        <span>
          {zoneFor(score)}
          <small>
            {oceanLayer(depth).name.toUpperCase()} ·{" "}
            {String(depth).padStart(4, "0")} M
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
            transition={{ duration: reduced ? 0 : 2.5 }}
          >
            <span />
            YOU
          </motion.div>
        </div>
      </div>
      <div className="environment-bottom">
        <span>↓ INTO THE UNKNOWN</span>
        <span>EXPEDITION / 07</span>
      </div>
    </aside>
  );
}
export default memo(Environment);
