import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { discordInviteUrl } from "@/lib/config";

export function DocsFooter() {
  return (
    <footer className="border-divine-border mt-16 border-t pt-6 pb-12 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-[var(--fd-layout-width)] flex-col gap-3 px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Written by the Divine Skins community. Open source on{" "}
          <Link
            href="https://github.com/DivineSkins/divine-wiki"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            GitHub
          </Link>
          .
        </div>
        <Link
          href={discordInviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-foreground"
        >
          Get help in Discord
          <ExternalLinkIcon className="size-3.5" />
        </Link>
      </div>
    </footer>
  );
}
