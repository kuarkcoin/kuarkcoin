# Security Migration Notes

## Scope

- Date: 2026-06-19
- Command requested: `npm audit --omit=dev`
- Constraint: do **not** run `npm audit fix --force` and do **not** perform an automatic Next.js 15/16 major migration.
- Current mitigation applied: keep the application on the Next.js 14 major line and require the patched 14.x release range by updating `next` from `^14.2.5` to `^14.2.35` in `package.json` and the lockfile root dependency metadata. The lockfile already resolved `node_modules/next` to `14.2.35`.

## Audit result

`npm audit --omit=dev` could not complete in this environment because the npm registry audit endpoint returned `403 Forbidden`:

```text
npm warn audit 403 Forbidden - POST https://registry.npmjs.org/-/npm/v1/security/advisories/bulk
Forbidden
npm error audit endpoint returned an error
```

Because the audit service was unavailable, the remaining risk list below is based on the known Next.js security advisories relevant to the installed 14.x line and should be revalidated in CI or a developer environment with working npm audit access.

## Patched within Next.js 14.x

The project previously allowed Next.js `^14.2.5`. The lockfile already resolved Next.js to `14.2.35`, and the manifest now requires `^14.2.35` so fresh installs do not select older vulnerable 14.x releases.

Relevant vulnerabilities addressed by staying on the patched 14.2.x line include:

| Advisory / CVE | Risk | Fixed in 14.x | Project action |
| --- | --- | --- | --- |
| CVE-2025-29927 / middleware authorization bypass | Auth checks in middleware could be bypassed with crafted `x-middleware-subrequest` headers. | `14.2.25` | Covered by `^14.2.35`. |
| CVE-2025-57822 / middleware SSRF in self-hosted applications | Misuse of `next()` in middleware could forward untrusted headers in self-hosted deployments. | `14.2.32` | Covered by `^14.2.35`. |
| CVE-2025-55184 / React Server Components denial of service | Server Components DoS due to incomplete React Server Components protocol fix. | `14.2.35` | Covered by `^14.2.35`. |

## Remaining CVE/advisory items requiring major upgrade

The following known Next.js advisories are not fixed by remaining on the Next.js 14 major line. They require moving to patched Next.js 15 or 16 release lines, so they are intentionally not auto-fixed in this change.

| Advisory / CVE | Affected area | Fixed versions | Current status |
| --- | --- | --- | --- |
| Next.js React Server Components cache confusion / interpretation conflict advisory | App Router / React Server Components responses behind shared caches. | `15.5.16` or `16.2.5` and newer. | Major-only remediation; not auto-upgraded. |
| Next.js `_rsc` weak hash / cache-busting advisory | React Server Components cache partitioning and shared cache behavior. | `15.5.16` or `16.2.5` and newer. | Major-only remediation; not auto-upgraded. |
| Next.js Server Functions resource exhaustion advisory | React Server Components / Server Functions decoding of malicious payloads. | `15.5.16` or `16.2.5` and newer. | Major-only remediation; not auto-upgraded. |
| CVE-2025-55183 / React Server Components source code exposure | App Router and React Server Components source exposure class issue. | Next.js 15/16 patched release lines. | Major-only remediation; Next.js 14 is not listed as affected for this item, but verify during migration. |

## Why a major upgrade was not performed

- The requested remediation explicitly says not to perform an automatic Next.js 15/16 migration for major-only findings.
- Next.js 15 and 16 can introduce breaking changes in framework behavior, routing, caching, build output, linting/tooling, and runtime requirements.
- This repository uses the App Router under `app/` and several route handlers under `app/api/`, so framework runtime changes must be tested against production-like traffic before deployment.
- A forced audit fix could change multiple transitive dependencies and major versions without application-specific validation, so `npm audit fix --force` was not run.

## Next.js 15/16 migration plan

1. Create a dedicated migration branch, for example `security/next-major-upgrade`.
2. Review the official Next.js 15 and 16 migration guides and choose the target patched line:
   - Prefer the latest patched Next.js 16 line if the deployment platform and Node.js runtime support it.
   - Otherwise target the latest patched Next.js 15 line that includes the major-only security fixes.
3. Upgrade `next`, `react`, and `react-dom` together according to the selected Next.js release requirements.
4. Run the official codemods where applicable and review all generated changes manually.
5. Validate App Router pages, route handlers, caching behavior, redirects, headers, image optimization, and any server-only code paths.
6. Deploy to a staging environment with production-like environment variables and traffic paths.
7. Run smoke tests, security regression tests, and monitor runtime logs before production rollout.
8. Roll out production with a rollback plan pinned to the current patched 14.2.x release.

## Test and deployment checklist

- [ ] Re-run `npm audit --omit=dev` in CI or a developer environment with working registry access.
- [ ] Confirm `npm audit` shows no Next.js findings that are fixable within the 14.x line.
- [ ] Run `npm install` from a clean checkout and verify `package-lock.json` keeps `next` on `14.2.35` or newer 14.2.x.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Smoke test `/`, `/signals`, `/terminal`, and all public `app/api/*` route handlers used by production.
- [ ] Verify production or edge proxy strips untrusted `x-middleware-subrequest` headers before requests reach Next.js.
- [ ] If using shared caches or a CDN, verify cache keys vary safely for React Server Components and `_rsc` requests.
- [ ] Deploy to staging and monitor server logs for App Router, Server Components, and route-handler errors.
- [ ] Prepare rollback instructions to redeploy the last known-good build pinned to Next.js `14.2.35`.
