import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CORE° — The Descent",
  description:
    "How deep does your knowledge go? Seven questions. Rarer answers. A daily expedition into the unknown.",
  applicationName: "CORE° — The Descent",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08090c",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
