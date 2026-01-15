import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "peoplegraph",
  description: "Personal CRM with zero-friction note capture",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
