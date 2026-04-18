/**
 * Cloudflare Worker — /submit edge endpoint for the Divine Skins wiki.
 *
 * The Next.js route at /api/submit forwards here when CLOUDFLARE_SUBMIT_WORKER_URL
 * is set. Doing it at the edge unlocks per-user KV rate limiting and keeps
 * GitHub API calls off the Pages build/render path.
 *
 * Auth model for v1: contributor's own GitHub OAuth token. The Next.js
 * route reads the httpOnly `divine_gh_token` cookie and forwards it as a
 * Bearer token in the Authorization header. Commits end up authored by the
 * real contributor (no GitHub App attribution gymnastics).
 *
 * Upgrade path: swap token use for a GitHub App installation token once
 * an App is provisioned. The fork step then becomes unnecessary — the App
 * can push branches to the upstream repo directly.
 */
import { Octokit } from "@octokit/rest";
import { z } from "zod";

export interface Env {
  RATE_LIMIT: KVNamespace;
  UPSTREAM_OWNER: string;
  UPSTREAM_REPO: string;
  UPSTREAM_BASE: string;
  MAX_OPEN_PRS: string;
  MAX_PRS_PER_DAY: string;
  MIN_ACCOUNT_AGE_DAYS: string;
  ALLOWED_ORIGIN: string;
  TURNSTILE_SECRET_KEY?: string;
}

const SUBMISSION_SCHEMA = z.object({
  frontmatter: z.object({
    title: z.string().min(3).max(80),
    description: z.string().min(10).max(200),
    category: z.enum([
      "guided-walkthrough",
      "tools",
      "maya",
      "blender",
      "animations",
      "vfx-bins",
      "assets-library",
      "errors",
    ]),
  }),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  mdx: z.string().min(50).max(200_000),
  discord: z.string().max(40).optional(),
  turnstileToken: z.string().optional(),
});

type Submission = z.infer<typeof SUBMISSION_SCHEMA>;

function jsonResponse(env: Env, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    },
  });
}

function errorResponse(env: Env, message: string, status: number): Response {
  return jsonResponse(env, { error: message }, status);
}

async function verifyTurnstile(env: Env, token: string, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true; // Verification disabled in dev.
  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
    remoteip: ip,
  });
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body },
  );
  const data = (await res.json()) as { success?: boolean };
  return !!data.success;
}

async function checkRateLimit(
  env: Env,
  login: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const openKey = `open:${login}`;
  const dayKey = `day:${login}:${new Date().toISOString().slice(0, 10)}`;

  const [openRaw, dayRaw] = await Promise.all([
    env.RATE_LIMIT.get(openKey),
    env.RATE_LIMIT.get(dayKey),
  ]);

  const openCount = Number(openRaw ?? "0");
  const dayCount = Number(dayRaw ?? "0");
  const maxOpen = Number(env.MAX_OPEN_PRS || "1");
  const maxDay = Number(env.MAX_PRS_PER_DAY || "3");

  if (openCount >= maxOpen) {
    return {
      ok: false,
      message: `You already have ${openCount} open PR. Wait for review before submitting another.`,
    };
  }
  if (dayCount >= maxDay) {
    return {
      ok: false,
      message: `Daily submission limit reached (${maxDay}). Try again tomorrow.`,
    };
  }
  return { ok: true };
}

async function incrementRateLimit(env: Env, login: string): Promise<void> {
  const openKey = `open:${login}`;
  const dayKey = `day:${login}:${new Date().toISOString().slice(0, 10)}`;

  const [openRaw, dayRaw] = await Promise.all([
    env.RATE_LIMIT.get(openKey),
    env.RATE_LIMIT.get(dayKey),
  ]);

  const newOpen = Number(openRaw ?? "0") + 1;
  const newDay = Number(dayRaw ?? "0") + 1;

  await Promise.all([
    env.RATE_LIMIT.put(openKey, String(newOpen), { expirationTtl: 14 * 86_400 }),
    env.RATE_LIMIT.put(dayKey, String(newDay), { expirationTtl: 48 * 3_600 }),
  ]);
}

function buildMdx(body: Submission): string {
  const title = body.frontmatter.title.replace(/"/g, '\\"');
  const desc = body.frontmatter.description.replace(/"/g, '\\"');
  return [
    "---",
    `title: "${title}"`,
    `description: "${desc}"`,
    `category: "${body.frontmatter.category}"`,
    "---",
    "",
    body.mdx.trim(),
    "",
  ].join("\n");
}

function buildPrBody(login: string, discord: string | undefined, category: string, slug: string): string {
  return [
    "## What this PR changes",
    "",
    `Adds \`content/docs/en/${category}/${slug}.mdx\`, submitted through the in-site editor.`,
    "",
    "## Author",
    "",
    `- GitHub: [@${login}](https://github.com/${login})`,
    discord ? `- Discord: ${discord}` : "- Discord: *not provided*",
    "",
    "## Preview",
    "",
    "*Cloudflare Pages preview link will appear below once the build completes.*",
  ].join("\n");
}

async function handleSubmit(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return errorResponse(env, "Missing Authorization header", 401);
  }

  let payload: Submission;
  try {
    const raw = (await request.json()) as unknown;
    payload = SUBMISSION_SCHEMA.parse(raw);
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        : "Invalid JSON body";
    return errorResponse(env, message, 400);
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
  if (env.TURNSTILE_SECRET_KEY && payload.turnstileToken) {
    const ok = await verifyTurnstile(env, payload.turnstileToken, ip);
    if (!ok) return errorResponse(env, "Turnstile verification failed", 403);
  }

  // Fetch the contributor's GitHub identity.
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "divine-submit-pr",
    },
  });
  if (!userRes.ok) {
    return errorResponse(env, "Invalid GitHub token", 401);
  }
  const user = (await userRes.json()) as {
    login: string;
    created_at: string;
  };

  const minAgeDays = Number(env.MIN_ACCOUNT_AGE_DAYS || "7");
  const ageDays = (Date.now() - new Date(user.created_at).getTime()) / 86_400_000;
  if (ageDays < minAgeDays) {
    return errorResponse(
      env,
      `GitHub accounts must be at least ${minAgeDays} days old to submit.`,
      403,
    );
  }

  const rate = await checkRateLimit(env, user.login);
  if (!rate.ok) return errorResponse(env, rate.message, 429);

  const octokit = new Octokit({
    auth: token,
    userAgent: "divine-submit-pr",
  });

  const branch = `contrib/${user.login}/${payload.slug}-${Date.now().toString(36)}`;
  const path = `content/docs/en/${payload.frontmatter.category}/${payload.slug}.mdx`;
  const content = buildMdx(payload);

  try {
    // Ensure fork exists.
    try {
      await octokit.repos.get({ owner: user.login, repo: env.UPSTREAM_REPO });
    } catch {
      await octokit.repos.createFork({
        owner: env.UPSTREAM_OWNER,
        repo: env.UPSTREAM_REPO,
      });
      // Poll up to 10s for fork readiness.
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          await octokit.repos.get({ owner: user.login, repo: env.UPSTREAM_REPO });
          break;
        } catch {
          if (i === 4) throw new Error("Fork did not become ready in 10 seconds");
        }
      }
    }

    // Sync fork's main to upstream.
    const upstream = await octokit.git.getRef({
      owner: env.UPSTREAM_OWNER,
      repo: env.UPSTREAM_REPO,
      ref: `heads/${env.UPSTREAM_BASE}`,
    });
    const baseSha = upstream.data.object.sha;

    try {
      await octokit.git.updateRef({
        owner: user.login,
        repo: env.UPSTREAM_REPO,
        ref: `heads/${env.UPSTREAM_BASE}`,
        sha: baseSha,
        force: true,
      });
    } catch {
      /* fork may be divergent — proceed anyway, branch off upstream sha */
    }

    await octokit.git.createRef({
      owner: user.login,
      repo: env.UPSTREAM_REPO,
      ref: `refs/heads/${branch}`,
      sha: baseSha,
    });

    // Base64 encode without Node Buffer (Worker runtime).
    const encoded = btoa(unescape(encodeURIComponent(content)));

    await octokit.repos.createOrUpdateFileContents({
      owner: user.login,
      repo: env.UPSTREAM_REPO,
      path,
      branch,
      message: `guide: add ${payload.frontmatter.category}/${payload.slug}`,
      content: encoded,
    });

    const pr = await octokit.pulls.create({
      owner: env.UPSTREAM_OWNER,
      repo: env.UPSTREAM_REPO,
      title: `guide: ${payload.frontmatter.title}`,
      head: `${user.login}:${branch}`,
      base: env.UPSTREAM_BASE,
      body: buildPrBody(
        user.login,
        payload.discord,
        payload.frontmatter.category,
        payload.slug,
      ),
      maintainer_can_modify: true,
    });

    await incrementRateLimit(env, user.login);

    return jsonResponse(env, {
      prUrl: pr.data.html_url,
      prNumber: pr.data.number,
      branch,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(env, message, 502);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight.
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
          "Access-Control-Allow-Credentials": "true",
        },
      });
    }

    if (request.method !== "POST") {
      return errorResponse(env, "Method not allowed", 405);
    }

    return handleSubmit(request, env);
  },
};
