import { NextRequest, NextResponse } from "next/server";

export const middleware = (request: NextRequest) => {
  const host = request.headers.get("host") ?? "";

  if (host.startsWith("localhost")) {
    const url = request.nextUrl.clone();
    url.host = host.replace("localhost", "127.0.0.1");
    return NextResponse.redirect(url);
  }

  const token = request.cookies.get("spotify_access_token")?.value;
  const { pathname } = request.nextUrl;

  if (pathname === "/radio" && !token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/" && token) {
    return NextResponse.redirect(new URL("/radio", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/radio"],
};
