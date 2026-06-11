import type { MDXRemoteSerializeResult } from "next-mdx-remote";
import { previewRemarkPlugins } from "@/lib/draft/mdx-config";

export type CompileResult =
  | { ok: true; serialized: MDXRemoteSerializeResult }
  | { ok: false; error: string; line: number | null };

/**
 * Compiles draft MDX entirely in the browser — no server round-trip, so
 * typing in the editor never produces network traffic. The MDX compiler is
 * dynamically imported to keep it out of the initial /draft bundle; a
 * rejected import (e.g. offline before the chunk ever loaded) propagates to
 * the caller, which maps it to the "unavailable" state. Compile errors are
 * returned as values so the editor can render them inline.
 */
export async function compilePreview(mdx: string): Promise<CompileResult> {
  const { serialize } = await import("next-mdx-remote/serialize");
  try {
    const serialized = await serialize(mdx, {
      parseFrontmatter: true,
      mdxOptions: { remarkPlugins: previewRemarkPlugins },
      // next-mdx-remote's blockJS default strips every JSX expression
      // attribute, which silently breaks components with object props
      // (<ParameterList parameters={[...]}/>) and diverges from the
      // published page. The compile runs in the author's own browser on
      // their own draft — self-XSS territory — so allow expressions and
      // keep only the eval/Function-style scrubber.
      blockJS: false,
      blockDangerousJS: true,
    });
    return { ok: true, serialized };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "MDX failed to compile";
    return { ok: false, error: message, line: extractLine(message) };
  }
}

/** MDX compile errors usually embed a `line:column` — pull the line number. */
function extractLine(message: string): number | null {
  const match = message.match(/(\d+):(\d+)/);
  return match ? Number(match[1]) : null;
}
