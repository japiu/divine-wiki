/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { source } from "@/lib/source";
import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { ogLanguageBlacklist } from "@/lib/i18n";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lang: string; slug?: string[] }> },
) {
  const { lang, slug = [] } = await params;

  if (ogLanguageBlacklist.includes(lang)) {
    return notFound();
  }

  const page = source.getPage(slug, lang);
  if (!page) return notFound();

  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg, #0b0a0f 0%, #1a1722 50%, #111016 100%)",
          color: "#cacdd9",
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "96px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <span
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.1,
            }}
          >
            {page.data.title}
          </span>
          {page.data.description && (
            <span
              style={{
                fontSize: 36,
                fontWeight: 400,
                color: "#828699",
                lineHeight: 1.3,
              }}
            >
              {page.data.description}
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: "20px",
            alignItems: "center",
            fontSize: 40,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "linear-gradient(135deg, #c084fc 0%, #783cb5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                background: "#ecb96a",
              }}
            />
          </div>
          <span style={{ color: "#ffffff" }}>Divine Skins Wiki</span>
        </div>
      </div>
    ),
  );
}

export function generateStaticParams() {
  return source.generateParams();
}
