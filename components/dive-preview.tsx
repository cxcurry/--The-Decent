"use client";
import { TIERS } from "@/lib/types";

export default function DivePreview({
  onPreview,
  disabled = false,
  roundActive = false,
}: {
  onPreview: (points: number) => void;
  disabled?: boolean;
  roundActive?: boolean;
}) {
  return (
    <section className="dive-preview" aria-label="Dive effect previews">
      <h2>Try the dive effects.</h2>
      <p>Compare all six reward levels. Previews don’t change your score.</p>
      <div className="preview-tiers">
        {TIERS.map((tier) => (
          <button
            key={tier.points}
            type="button"
            disabled={disabled || roundActive}
            aria-label={`Preview ${tier.points}-point dive`}
            onClick={() => onPreview(tier.points)}
          >
            <strong>
              {tier.points}
              <small>PTS</small>
            </strong>
            <span>{tier.name}</span>
            <i>↓ {(tier.points * 10).toLocaleString("en-US")} M</i>
          </button>
        ))}
      </div>
      <small>
        {roundActive
          ? "Finish your current round before previewing."
          : "No daily wait · Turn SOUND ON to hear the effects"}
      </small>
    </section>
  );
}
