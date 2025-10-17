// app/dev/probe/[token]/page.js
import { probeDetailEndpoints } from "@/lib/api/probe";
import { getCurrentSiteKey } from "@/lib/site-detection-server";

export const revalidate = 0;
export const dynamic = "force-dynamic";

function Badge({ children, tone = "neutral" }) {
  const toneCls = {
    neutral: "bg-neutral-200 text-neutral-800",
    ok: "bg-green-200 text-green-900",
    warn: "bg-yellow-200 text-yellow-900",
    err: "bg-red-200 text-red-900",
  }[tone] || "bg-neutral-200 text-neutral-800";

  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${toneCls}`}>
      {children}
    </span>
  );
}

export default async function ProbePage({ params, searchParams }) {
  const { token } = await params;
  const sp = await searchParams;

  const siteKey = (sp?.site || (await getCurrentSiteKey()) || "sandhills").toLowerCase();

  const results = await probeDetailEndpoints({ token, siteKey });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Detail Endpoint Probe</h1>
      <p className="mt-2 text-sm opacity-75">
        Token: <code className="px-1 py-0.5 bg-neutral-100 rounded">{token}</code>{" "}
        · site: <code className="px-1 py-0.5 bg-neutral-100 rounded">{siteKey}</code>
      </p>

      <div className="mt-6 grid gap-3">
        {results.map((r) => {
          const tone = r.ok ? (r.exact ? "ok" : "warn") : "err";
          return (
            <div key={r.url} className="border rounded-lg p-3 bg-white">
              <div className="flex items-center gap-2">
                <Badge tone={tone}>
                  {r.ok ? (r.exact ? "200 • exact" : `${r.status} • ok`) : r.status}
                </Badge>
                <code className="text-xs break-all">{r.url}</code>
              </div>

              <div className="mt-2 text-xs">
                <div className="opacity-70">
                  kind: <code>{r.summary?.kind}</code>{" "}
                  {r.summary?.kind === "array" && (
                    <>
                      · length: <code>{r.summary.length}</code>
                      {Array.isArray(r.summary.firstKeys) && r.summary.firstKeys.length > 0 && (
                        <>
                          {" "}
                          · first keys:{" "}
                          <code>{r.summary.firstKeys.join(", ")}</code>
                        </>
                      )}
                    </>
                  )}
                  {r.summary?.kind === "object" && Array.isArray(r.summary.keys) && r.summary.keys.length > 0 && (
                    <>
                      · keys: <code>{r.summary.keys.join(", ")}</code>
                    </>
                  )}
                  {r.summary?.kind === "error" && r.summary.message && (
                    <>
                      · error: <code>{r.summary.message}</code>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-sm opacity-75">
        Tip: Look for the first card with <strong>“200 • exact”</strong>. That’s the URL/params
        your detail fetcher should use for this token. If none show “exact”, pick the first 200 and
        note the keys it returns.
      </p>
    </main>
  );
}
