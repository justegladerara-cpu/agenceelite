import { NextResponse, NextRequest } from "next/server";
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    path === "/2025/08/02/bonjour-tout-le-monde" ||
    /^\/(author|category|tag)(\/|$)/.test(path)
  )
    return new NextResponse(
      "Ce contenu a été retiré. Consultez /preparer-mon-envoi.",
      { status: 410 },
    );
  const response = NextResponse.next();
  if (
    process.env.APP_ENV !== "production" ||
    /^\/(admin|espace-client|suivi|api)(\/|$)/.test(path)
  )
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
