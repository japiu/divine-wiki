# divine-submit-pr

Cloudflare Worker for the Divine Skins wiki. It opens a GitHub pull request
on behalf of a signed-in contributor when they hit **Submit** in the
`/contribute` editor.

The Next.js route at `/api/submit` forwards here when
`CLOUDFLARE_SUBMIT_WORKER_URL` is set in the wiki site's environment. When
it's not set, the Next.js route does the same work inline — so this Worker
is optional for v1.

## Why at the edge

- **Per-user KV rate limiting.** One open PR at a time, three per day. The
  KV binding lets us enforce that with sub-millisecond reads, globally.
- **Cheap surface area.** The Worker holds no secrets beyond the Turnstile
  key. All GitHub auth is the contributor's own OAuth token, passed through
  in the `Authorization` header.
- **Spam mitigation.** Account-age check (7 days minimum) plus optional
  Cloudflare Turnstile verification if `TURNSTILE_SECRET_KEY` is set.

## One-time setup

1. **KV namespace**

   ```bash
   wrangler kv:namespace create "RATE_LIMIT"
   ```

   Paste the returned `id` into `wrangler.toml` in place of
   `REPLACE_WITH_KV_NAMESPACE_ID`.

2. **Secrets**

   ```bash
   wrangler secret put TURNSTILE_SECRET_KEY
   ```

   If you don't want Turnstile verification yet, skip this — the Worker
   will short-circuit to "allowed" when the secret is missing.

3. **Deploy**

   ```bash
   bun install
   wrangler deploy
   ```

   Note the public URL (typically
   `https://divine-submit-pr.<your-subdomain>.workers.dev`).

4. **Wire it up in the wiki site**

   In the Cloudflare Pages project env vars, add:

   ```
   CLOUDFLARE_SUBMIT_WORKER_URL=https://divine-submit-pr.<your-subdomain>.workers.dev
   ```

   The next deploy of the wiki will start forwarding `/api/submit` calls
   here automatically.

## Env vars (in `wrangler.toml`)

| Var | Default | Notes |
|---|---|---|
| `UPSTREAM_OWNER` | `DivineSkins` | GitHub org of the wiki repo |
| `UPSTREAM_REPO` | `divine-wiki` | repo name |
| `UPSTREAM_BASE` | `main` | branch PRs target |
| `MAX_OPEN_PRS` | `1` | per user, at once |
| `MAX_PRS_PER_DAY` | `3` | per user, per 24h |
| `MIN_ACCOUNT_AGE_DAYS` | `7` | minimum GitHub account age |
| `ALLOWED_ORIGIN` | `https://wiki.divineskins.gg` | CORS origin for the editor |

## Upgrade path

**To a GitHub App** (commits authored by a bot rather than the user): swap
the `new Octokit({ auth: token })` in `handleSubmit` for an App installation
token. Adds: `octokit-plugin-create-pull-request` for direct branch push on
upstream (no fork step), and two more secrets (`GITHUB_APP_ID`,
`GITHUB_APP_PRIVATE_KEY`).

## Local dev

```bash
bun install
wrangler dev
```

Wrangler simulates KV locally. Test with:

```bash
curl -X POST http://127.0.0.1:8787 \
  -H "Authorization: Bearer <your-gh-token>" \
  -H "Content-Type: application/json" \
  -d '{"frontmatter":{"title":"Test","description":"Testing the worker","category":"tools"},"slug":"test-submission","mdx":"# Hello\\n\\nBody."}'
```
