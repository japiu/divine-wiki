import { baseUrl } from "@/lib/config";
import { getLLMFullText } from "@/lib/source";

export const revalidate = false;

export async function GET() {
  const entries = await getLLMFullText(baseUrl);

  const header = [
    "# Divine Skins Wiki",
    "> Community-written guides for creating custom skins for League of Legends.",
    "",
    "",
  ].join("\n");

  return new Response(header + entries.join("\n\n"));
}
