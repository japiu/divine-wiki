import { RootProvider } from "fumadocs-ui/provider/next";
import { defineI18nUI } from "fumadocs-ui/i18n";
import { i18n } from "@/lib/i18n";
import englishTranslations from "@/../messages/en.json";
import { Manrope, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import { baseUrl } from "@/lib/config";
import { cn } from "@/lib/utils";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  keywords: [
    "league of legends",
    "lol custom skins",
    "league modding",
    "champion mods",
    "fantome files",
    "skin modding tutorial",
    "league of legends vfx",
    "ltmao",
    "cs-lol-manager",
    "divine skins",
    "celestial launcher",
  ],
  alternates: {
    types: {
      "text/plain": [
        { url: "/llms.txt", title: "LLM-friendly site index" },
        { url: "/llms-full.txt", title: "LLM-friendly full documentation" },
      ],
    },
  },
};

const translations = Object.fromEntries(
  i18n.languages.map((lang) => {
    const messages = require(`@/../messages/${lang}.json`);
    return [
      lang,
      {
        displayName: messages.displayName ?? lang,
        ...(messages.nav?.search && {
          search: messages.nav.search ?? englishTranslations.nav.search,
        }),
      },
    ];
  }),
);

const { provider } = defineI18nUI(i18n, {
  translations,
});

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;

  return (
    <html lang={lang} dir="ltr" suppressHydrationWarning>
      <body>
        <div className={cn(manrope.variable, jetbrainsMono.variable, "font-sans")}>
          <RootProvider i18n={provider(lang)}>{children}</RootProvider>
        </div>
      </body>
    </html>
  );
}
