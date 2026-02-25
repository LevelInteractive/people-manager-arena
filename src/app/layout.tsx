import type { Metadata } from "next";
import Providers from "@/components/Providers";
import "@/lib/env-check"; // Validates env vars on startup
import "./globals.css";

export const metadata: Metadata = {
  title: "Level Up — The Manager Arena",
  description: "Leadership training game for Level Agency people managers",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
