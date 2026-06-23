import { analyticsPayload, noStore } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    return noStore(await analyticsPayload(req));
  } catch (error) {
    return noStore({ ok: false, error: error instanceof Error ? error.message : "Analytics error" }, { status: 500 });
  }
}
