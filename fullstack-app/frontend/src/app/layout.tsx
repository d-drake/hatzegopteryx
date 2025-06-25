import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hatzegopteryx - Fullstack App",
  description: "A modern fullstack application built with PostgreSQL, FastAPI, and Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}