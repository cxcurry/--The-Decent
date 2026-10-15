"use client";
import { useEffect, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
export default function FullscreenButton() {
  const [supported, setSupported] = useState(false);
  const [full, setFull] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setSupported(document.fullscreenEnabled);
    const changed = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  if (!supported) return null;
  return (
    <div className="fullscreen-control">
      <button
        type="button"
        onClick={async () => {
          try {
            setError("");
            if (document.fullscreenElement) await document.exitFullscreen();
            else await document.documentElement.requestFullscreen();
          } catch {
            setError(
              "Full screen is unavailable. You can maximize your browser instead.",
            );
          }
        }}
        aria-label={full ? "Exit full screen" : "Enter full screen"}
        title={full ? "Exit full screen (Esc)" : "Enter full screen"}
      >
        {full ? <Minimize size={16} /> : <Maximize size={16} />}
        <span>{full ? "EXIT FULL SCREEN" : "FULL SCREEN"}</span>
      </button>
      {error && <p role="status">{error}</p>}
    </div>
  );
}
