import { cn } from "@/lib/utils";
import { DiscordLogo, GitHubLogo } from "@/components/brand-logos";

export interface PageCreditsData {
  discord?: string;
  github?: string;
}

interface PageCreditsProps {
  credits?: PageCreditsData;
  /** Localized "Made by" label — passed in so the component stays server-safe. */
  label: string;
  className?: string;
}

/** Strip whitespace and a leading "@" so hand-typed handles render clean. */
function cleanHandle(value?: string): string {
  return (value ?? "").trim().replace(/^@/, "");
}

/**
 * Contributor credit line at the bottom of a guide. Renders nothing unless
 * the page's frontmatter `credits` block names a Discord or GitHub handle.
 * GitHub links to the profile; Discord has no public profile URL, so the
 * handle is shown as plain text.
 */
export function PageCredits({ credits, label, className }: PageCreditsProps) {
  const discord = cleanHandle(credits?.discord);
  const github = cleanHandle(credits?.github);
  if (!discord && !github) return null;

  return (
    <div
      className={cn(
        "text-divine-text-muted flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm",
        className,
      )}
    >
      <span>{label}</span>
      {discord && (
        <span className="flex items-center gap-1.5">
          <DiscordLogo className="text-divine-info size-4" />
          <span className="text-divine-text">{discord}</span>
        </span>
      )}
      {github && (
        <a
          href={`https://github.com/${github}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-divine-text hover:text-divine-primary-light flex items-center gap-1.5 no-underline transition-colors"
        >
          <GitHubLogo className="size-4" />
          <span>{github}</span>
        </a>
      )}
    </div>
  );
}
