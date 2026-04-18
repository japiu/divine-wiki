import { baseUrl } from "@/lib/config";
import { getLLMIndex } from "@/lib/source";

export const revalidate = false;

export async function GET() {
  const entries = getLLMIndex(baseUrl);

  const header = [
    "# Divine Skins Wiki",
    "> Community-written guides for creating custom skins for League of Legends — modeling, texturing, VFX, animations, and tool workflows used by the Divine Skins creator community.",
    "",
    "## Guides",
    "",
  ].join("\n");

  const footer = [
    "",
    "## Links",
    `- [Full text (LLM-optimized)](${baseUrl}/llms-full.txt)`,
    "- [Divine Skins platform](https://divineskins.gg)",
    "- [Discord community](https://discord.gg/divineskins)",
    "",
  ].join("\n");

  return new Response(header + entries.join("\n") + footer);
}
