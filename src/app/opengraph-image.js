import { ImageResponse } from "next/og";

export const alt = "AI Keşif yapay zeka araçları platformu";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "linear-gradient(135deg, #090f22 0%, #172554 48%, #581c87 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "2px solid rgba(255,255,255,0.25)",
            borderRadius: "999px",
            display: "flex",
            fontSize: "28px",
            letterSpacing: "0.08em",
            marginBottom: "34px",
            padding: "12px 26px",
          }}
        >
          YAPAY ZEKA ARAÇLARI REHBERİ
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "86px",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          AI Keşif
        </div>
        <div
          style={{
            color: "#dbeafe",
            display: "flex",
            fontSize: "34px",
            lineHeight: 1.35,
            marginTop: "30px",
            maxWidth: "900px",
          }}
        >
          İhtiyacınıza uygun yapay zeka aracını keşfedin, karşılaştırın ve
          daha hızlı karar verin.
        </div>
      </div>
    ),
    size
  );
}
