import Link from "next/link";
import { BookOpenIcon, PencilLineIcon, MessageCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/locale";
import { discordInviteUrl } from "@/lib/config";

export default async function HomePage({
  params,
}: PageProps<"/[lang]">) {
  const { lang } = await params;
  const messages = getMessages(lang);
  const t = messages.home;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(192,132,252,0.18),transparent_60%)]" />
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
        {t.title}
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
        {t.tagline}
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href={`/${lang}/docs/guided-walkthrough`}>
            <BookOpenIcon className="size-4" />
            {t.ctaStart}
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href={`/${lang}/docs`}>{t.ctaBrowse}</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={`/${lang}/contribute`}>
            <PencilLineIcon className="size-4" />
            {t.ctaContribute}
          </Link>
        </Button>
      </div>
      <Link
        href={discordInviteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-12 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <MessageCircleIcon className="size-4" />
        Join the Divine Discord
      </Link>
    </main>
  );
}
