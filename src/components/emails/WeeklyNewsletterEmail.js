import * as React from "react";

// E-posta içindeki her bir bölüm için stil tanımlamaları
const sectionStyle = {
  marginBottom: "24px",
  paddingBottom: "24px",
  borderBottom: "1px solid #eaeaea",
};

const headingStyle = {
  fontSize: "20px",
  fontWeight: "bold",
  marginBottom: "16px",
  color: "#333",
};

const cardStyle = {
  backgroundColor: "#f9f9f9",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "12px",
};

const titleStyle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#444",
  textDecoration: "none",
};

const descriptionStyle = {
  fontSize: "14px",
  color: "#666",
  lineHeight: "1.5",
};

const linkStyle = {
  color: "#007bff",
  textDecoration: "underline",
};

// Ana E-posta Bileşeni
export const WeeklyNewsletterEmail = ({ newsletterData }) => (
  <div
    style={{
      fontFamily: "sans-serif",
      padding: "20px",
      backgroundColor: "#ffffff",
    }}
  >
    <div
      style={{ maxWidth: "600px", margin: "auto", border: "1px solid #ddd" }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#222",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "28px", color: "white", margin: 0 }}>
          AI Keşif Haftalık
        </h1>
      </div>

      <div style={{ padding: "24px" }}>
        {/* Giriş Yazısı */}
        <p style={descriptionStyle}>
          Merhaba! AI Keşif Platformu'nda bu hafta öne çıkanlar ve topluluğun en
          sevdikleri burada. İşte kaçırmamanız gerekenler:
        </p>

        {/* Haftanın Trendleri */}
        {newsletterData.trending_tools?.length > 0 && (
          <div style={sectionStyle}>
            <h2 style={headingStyle}>🔥 Haftanın Trendleri</h2>
            {newsletterData.trending_tools.map((tool, i) => (
              <div key={i} style={cardStyle}>
                <a
                  href={`${process.env.NEXT_PUBLIC_SITE_URL}/tool/${tool.slug}`}
                  style={titleStyle}
                >
                  {i + 1}. {tool.name}
                </a>
                <p style={descriptionStyle}>{tool.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Haftanın Prompt'u */}
        {newsletterData.top_prompt && (
          <div style={sectionStyle}>
            <h2 style={headingStyle}>⭐ Haftanın Prompt'u</h2>
            <div style={cardStyle}>
              <p style={{ ...titleStyle, marginBottom: "8px" }}>
                {newsletterData.top_prompt.title}
              </p>
              <pre
                style={{
                  ...descriptionStyle,
                  whiteSpace: "pre-wrap",
                  backgroundColor: "#eee",
                  padding: "12px",
                  borderRadius: "4px",
                }}
              >
                {newsletterData.top_prompt.prompt_text}
              </pre>
              <p style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
                <a
                  href={`${process.env.NEXT_PUBLIC_SITE_URL}/tool/${newsletterData.top_prompt.tool_slug}`}
                  style={linkStyle}
                >
                  {newsletterData.top_prompt.tool_name}
                </a>{" "}
                için.
              </p>
            </div>
          </div>
        )}

        {/* Haftanın Eseri */}
        {newsletterData.top_showcase && (
          <div style={sectionStyle}>
            <h2 style={headingStyle}>🎨 Haftanın Eseri</h2>
            <a
              href={`${process.env.NEXT_PUBLIC_SITE_URL}/eserler?eserId=${newsletterData.top_showcase.id}`}
              style={{ textDecoration: "none" }}
            >
              <div style={{ ...cardStyle, textAlign: "center" }}>
                <img
                  src={newsletterData.top_showcase.image_url}
                  alt={newsletterData.top_showcase.title}
                  style={{ maxWidth: "100%", borderRadius: "8px" }}
                />
                <p style={{ ...titleStyle, marginTop: "12px" }}>
                  {newsletterData.top_showcase.title}
                </p>
                <p style={{ fontSize: "12px", color: "#888" }}>
                  Oluşturan: {newsletterData.top_showcase.author_username}
                </p>
              </div>
            </a>
          </div>
        )}

        {/* Son Blog Yazısı */}
        {newsletterData.latest_post && (
          <div style={{ ...sectionStyle, borderBottom: "none" }}>
            <h2 style={headingStyle}>✍️ Son Yazımız</h2>
            <a
              href={`${process.env.NEXT_PUBLIC_SITE_URL}/blog/${newsletterData.latest_post.slug}`}
              style={{ textDecoration: "none" }}
            >
              <div style={cardStyle}>
                <p style={titleStyle}>{newsletterData.latest_post.title}</p>
                <p style={descriptionStyle}>
                  {newsletterData.latest_post.description}
                </p>
              </div>
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          backgroundColor: "#f2f2f2",
          padding: "16px",
          textAlign: "center",
          fontSize: "12px",
          color: "#888",
        }}
      >
        <p>Bu e-postayı AI Keşif Platformu'na üye olduğunuz için aldınız.</p>
        <p>© {new Date().getFullYear()} AI Keşif Platformu</p>
      </div>
    </div>
  </div>
);
