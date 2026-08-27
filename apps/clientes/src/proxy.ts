export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/((?!login|registro|tenant-no-encontrado|api/auth|api/webhooks|_next/static|_next/image|favicon.ico).*)",
  ],
};
