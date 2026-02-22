export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    // Protect everything except login, public assets, and auth API
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
