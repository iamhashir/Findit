import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Findit",
  description: "Software engineering news and trends in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
