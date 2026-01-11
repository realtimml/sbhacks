import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbital - Agentic Personal OS",
  description:
    "AI-powered productivity assistant with Gmail, Slack, and Calendar integrations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="orbital-bg" />
        {children}
      </body>
    </html>
  );
}

