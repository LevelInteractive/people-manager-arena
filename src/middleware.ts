export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    // Protect everything except login, public assets, and auth API
    "/((?!login|api/auth|api/setup|_next/static|_next/image|favicon.ico).*)",
  ],
};
