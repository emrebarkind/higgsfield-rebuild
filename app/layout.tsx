import type { Metadata, Viewport } from "next";
import { Archivo_Narrow, Inter, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/src/components/Nav";
import { Footer } from "@/src/components/Footer";
import "./globals.css";

const display = Archivo_Narrow({ variable: "--nf-display", subsets: ["latin"], weight: ["500", "700"] });
const ui = Inter({ variable: "--nf-ui", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--nf-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dailies — a real camera for your still images",
  description:
    "Turn a still image into real camera moves rendered in your browser. Roll takes, circle the best, export MP4. Free, no sign-in.",
};

// Matches --bg, so the phone's browser chrome is graphite too.
export const viewport: Viewport = { themeColor: "#1c1b19" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-20 focus:rounded focus:bg-paper focus:px-3 focus:py-1.5 focus:text-bg">
          Skip to content
        </a>
        <Nav />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
