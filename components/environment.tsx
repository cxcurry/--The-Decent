"use client";
import { motion } from "motion/react";
import { memo } from "react";
import { ZONES, zoneFor } from "@/lib/types";
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
      className={`environment ${compact ? "environment-compact" : ""}`}
      onPointerMove={(e) => {
        if (reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty(
          "--look-x",
          `${(e.clientX - r.left - r.width / 2) * 0.025}px`,
        );
        e.currentTarget.style.setProperty(
          "--look-y",
          `${(e.clientY - r.top - r.height / 2) * 0.025}px`,
        );
      }}
      aria-label={`Descent environment: ${depth} meters, ${zoneFor(score)}`}
    >
      <div className="environment-grid" />
      <div className="coordinate top-left">
        EXPEDITION / CORE—07
        <br />
        40° 42′ N · 74° 00′ W
      </div>
      <div className="coordinate top-right">
        <span className="signal-dot" /> SIGNAL ACTIVE
      </div>
      <svg
        className="shaft"
        viewBox="0 0 520 650"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="plasma">
            <stop stopColor="#6abcff" stopOpacity=".7" />
            <stop offset=".3" stopColor="#367bff" stopOpacity=".22" />
            <stop offset="1" stopColor="#367bff" stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id="beam"
            x1="260"
            y1="60"
            x2="260"
            y2="590"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#367bff" stopOpacity="0" />
            <stop offset=".45" stopColor="#79caff" />
            <stop offset="1" stopColor="#367bff" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="wall"
            x1="0"
            y1="80"
            x2="0"
            y2="600"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#a8d7ff" stopOpacity=".35" />
            <stop offset="1" stopColor="#367bff" stopOpacity=".03" />
          </linearGradient>
          <filter id="bloom">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <motion.g
          animate={{ y: reduced ? 0 : -score * 0.035 }}
          transition={{ duration: reduced ? 0 : 1.8, ease: "easeOut" }}
        >
          <ellipse
            cx="260"
            cy="300"
            rx="235"
            ry="250"
            fill="url(#plasma)"
            opacity={1 - score / 1100}
          />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <g key={i} opacity={1 - i * 0.055}>
              <ellipse
                cx="260"
                cy={115 + i * 34}
                rx={193 - i * 12}
                ry={67 - i * 3.8}
                stroke={i === 0 ? "#9acaff" : "#367bff"}
                strokeWidth={i === 0 ? 1.6 : 0.8}
              />
              <ellipse
                cx="260"
                cy={118 + i * 34}
                rx={193 - i * 12}
                ry={67 - i * 3.8}
                stroke="#367bff"
                strokeOpacity=".22"
                strokeWidth="5"
              />
            </g>
          ))}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const angle = (i * Math.PI) / 4;
            return (
              <path
                key={i}
                d={`M ${260 + 193 * Math.cos(angle)} ${115 + 67 * Math.sin(angle)} L ${260 + 61 * Math.cos(angle)} ${489 + 25.2 * Math.sin(angle)}`}
                stroke="url(#wall)"
              />
            );
          })}
          <ellipse
            cx="260"
            cy="489"
            rx="62"
            ry="25"
            stroke="#4ea5ff"
            strokeWidth="1"
          />
          <ellipse cx="260" cy="489" rx="90" ry="55" fill="url(#plasma)" />
        </motion.g>
        <path d="M260 55V570" stroke="url(#beam)" strokeWidth="2" />
        <path
          d="M260 170V440"
          stroke="#4ea5ff"
          strokeWidth="12"
          opacity=".2"
          filter="url(#bloom)"
        />
        <motion.g
          animate={{ y: reduced ? 0 : score * 0.25 }}
          transition={{ duration: reduced ? 0 : 1.8, ease: "easeOut" }}
        >
          <path d="m254 216 6 10 6-10" fill="#d2ecff" />
          <circle
            cx="260"
            cy="220"
            r="14"
            stroke="#a8d7ff"
            strokeOpacity=".3"
          />
          <circle
            cx="260"
            cy="220"
            r="24"
            stroke="#4ea5ff"
            strokeOpacity=".12"
          />
        </motion.g>
        {Array.from({ length: 22 }, (_, i) => (
          <circle
            key={i}
            className={reduced ? "" : "particle"}
            cx={40 + ((i * 83) % 440)}
            cy={90 + ((i * 67) % 470)}
            r={i % 3 === 0 ? 1.6 : 0.8}
            fill="#a8d7ff"
            opacity=".45"
            style={{ animationDelay: `-${i * 0.6}s` }}
          />
        ))}
        <path
          d="M65 555h390M65 549v12m390-12v12"
          stroke="#5c7291"
          strokeOpacity=".4"
        />
        <text
          x="260"
          y="580"
          textAnchor="middle"
          fill="#91a3bd"
          fontSize="9"
          letterSpacing="3"
        >
          ENTER THE UNKNOWN
        </text>
      </svg>
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
        <span>↓ {zoneFor(score)}</span>
        <span>{String(depth).padStart(4, "0")} M</span>
      </div>
    </div>
  );
}

export default memo(Environment);
