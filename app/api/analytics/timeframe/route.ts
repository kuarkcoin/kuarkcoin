import { analyticsPayload, noStore } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const payload = await analyticsPayload(req);
    return noStore({ ...payload, data: payload.stats.timeframes });
  } catch (error) {
    return noStore({ ok: false, error: error instanceof Error ? error.message : "Analytics error" }, { status: 500 });
  }
}
