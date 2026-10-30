import type { Metadata } from "next";
import { Playfair_Display, Inter, Archivo_Black } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const heading = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const logoFont = Archivo_Black({
  variable: "--font-logo-src",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Dilmuss — Ayollar kiyim do'koni",
  description: "Har bir ayol — o'z uslubini topadi. Dilmuss nafislik, sifat va zamonaviy uslubni birlashtiradi.",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("dilmuss-theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${heading.variable} ${body.variable} ${logoFont.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-cream text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
