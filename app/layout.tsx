import type { Metadata } from "next";
import { PageScrollBar } from "@/registry/sahajiv/ui/scroll-area";
import { AppearanceProvider } from "@/registry/sahajiv/ui/appearance";
import "./globals.css";
export const metadata: Metadata = {
  title: "SahaJiv UI",
  description: "SahaJiv React components and shadcn registry.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-mode="light">
      <body><AppearanceProvider>{children}<PageScrollBar /></AppearanceProvider></body>
    </html>
  );
}
