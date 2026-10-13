import { siteUrl } from "@/lib/site";
import { ImageResponse } from "next/og";
export const alt = "Bondline — Put money behind the promises you make.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "#111210",
          padding: "64px",
          color: "#f2efe9",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: "5px solid #e3b65d",
              borderRadius: "50%",
            }}
          />
          Bondline
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: -3,
            lineHeight: 1.12,
          }}
        >
          <span>Put money behind</span>
          <span>
            the promises <span style={{ color: "#e3b65d" }}>you make.</span>
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #34382f",
            paddingTop: 24,
            fontSize: 23,
            color: "#aaa99f",
          }}
        >
          <span>Commitments. Circles. Follow-through.</span>
          <span style={{ color: "#e3b65d" }}>{new URL(siteUrl).host}</span>
        </div>
      </div>
    ),
    size,
  );
}
