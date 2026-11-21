import type { Metadata, Viewport } from "next";
import { Inter, Kantumruy_Pro } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Khmer first, Inter for Latin text. Both feed --font-sans in globals.css.
const khmer = Kantumruy_Pro({
  variable: "--font-khmer",
  subsets: ["khmer", "latin"],
  weight: ["400", "500", "600", "700"],
});

const latin = Inter({
  variable: "--font-latin",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "សំឡេងក្រុង · CityVoice",
  description: "Citizen services platform for Cambodia",
};

export const viewport: Viewport = {
  themeColor: "#032ea1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="km" className={`${khmer.variable} ${latin.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
