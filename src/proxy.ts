import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/v1 (public API routes — authenticated via API key, not session)
     * - api/checkout (public checkout API routes — no auth)
     * - pay (public checkout page — no auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/v1|api/checkout|api/cron|pay).*)",
  ],
};
