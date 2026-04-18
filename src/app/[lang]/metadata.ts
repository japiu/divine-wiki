import type { Metadata } from "next";

const SITE_URL = "https://wiki.divineskins.gg";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  alternates: {
    canonical: SITE_URL,
    languages: {
      en: `${SITE_URL}/en`,
      fr: `${SITE_URL}/fr-FR`,
      tr: `${SITE_URL}/tr-TR`,
      "pt-BR": `${SITE_URL}/pt-BR`,
    },
  },

  openGraph: {
    type: "website",
    siteName: "Divine Skins Wiki",
    url: SITE_URL,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Divine Skins Wiki",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};
