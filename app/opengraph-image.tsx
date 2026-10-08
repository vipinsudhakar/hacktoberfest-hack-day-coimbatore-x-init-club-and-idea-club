import { ImageResponse } from "next/og";
import { LOGO_PATHS } from "@/components/Icons";

export const alt = "TrialBridge: find cancer clinical trials in India the patient may be able to join";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The clinic letter as a card: paper, ink, one blue accent, the bridge mark. No stock imagery.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fcfcfa",
          color: "#121519",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill="#2643a6" />
            {LOGO_PATHS.map((d) => (
              <path key={d} d={d} fill="none" stroke="#ffffff" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" }}>TrialBridge</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.03em", maxWidth: 960 }}>
            Find cancer trials in India the patient may be able to join
          </div>
          <div style={{ fontSize: 30, color: "#464c55", lineHeight: 1.4, maxWidth: 940 }}>
            Add photos of the reports. Every rule of every recruiting trial is checked, with questions to take to the
            oncologist.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 24, color: "#656b74" }}>
          <div style={{ width: 48, height: 4, borderRadius: 2, background: "#2643a6" }} />
          Reports read by Gemma 4 · Trials from ClinicalTrials.gov · Not medical advice
        </div>
      </div>
    ),
    size,
  );
}
