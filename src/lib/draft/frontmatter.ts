export interface DraftFields {
  title: string;
  description: string;
  category: string;
  slug: string;
  body: string;
  discord: string;
  github: string;
}

/** Strip whitespace and a leading "@" from a hand-typed handle. */
export function cleanHandle(value: string): string {
  return value.trim().replace(/^@/, "");
}

/**
 * Build the full .mdx file text from the editor fields.
 * `title`, `description`, and the optional `credits` block go into
 * frontmatter — `category` is implied by the file path, and the schema in
 * source.config.ts rejects unknown keys.
 */
export function assembleMdx(
  fields: Pick<
    DraftFields,
    "title" | "description" | "body" | "discord" | "github"
  >,
): string {
  const lines: string[] = ["---", `title: ${yamlScalar(fields.title)}`];
  if (fields.description.trim()) {
    lines.push(`description: ${yamlScalar(fields.description)}`);
  }
  const discord = cleanHandle(fields.discord);
  const github = cleanHandle(fields.github);
  if (discord || github) {
    lines.push("credits:");
    if (discord) lines.push(`  discord: ${yamlScalar(discord)}`);
    if (github) lines.push(`  github: ${yamlScalar(github)}`);
  }
  lines.push("---", "");
  return lines.join("\n") + "\n" + fields.body.replace(/^\s+/, "") + "\n";
}

/** Quote a YAML scalar only when it could otherwise misparse. */
function yamlScalar(value: string): string {
  const trimmed = value.trim();
  // YAML reserved words and pure numbers parse as non-strings. Always quote
  // them so frontmatter `title` / `description` stay strings for the schema.
  const reserved = new Set([
    "true",
    "false",
    "yes",
    "no",
    "on",
    "off",
    "null",
    "~",
  ]);
  const looksNumeric = /^[+-]?(\d[\d_]*)(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed);
  if (trimmed === "" || reserved.has(trimmed.toLowerCase()) || looksNumeric) {
    return JSON.stringify(trimmed);
  }
  if (/^[A-Za-z0-9][A-Za-z0-9 .,'!?()/-]*$/.test(trimmed)) return trimmed;
  return JSON.stringify(trimmed);
}
