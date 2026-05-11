import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Néctar Labs | Software Artesanal & Arquitectura de Alto Rendimiento",
  description: "Diseñamos software artesanal y arquitectura escalable para negocios que exigen independencia técnica y rendimiento industrial. Tu partner tecnológico estratégico.",
  keywords: ["software artesanal", "arquitectura de software", "desarrollo web méxico", "nectar labs", "partner tecnológico", "django nextjs", "desarrollo a medida"],
  authors: [{ name: "Jesus Saul Villegas Cruz" }],
  openGraph: {
    title: "Néctar Labs | Software Artesanal",
    description: "Arquitectura de software para negocios que exigen independencia técnica y rendimiento industrial.",
    url: "https://nectarlabs.dev",
    siteName: "Néctar Labs",
    locale: "es_MX",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Néctar Labs - Software Artesanal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Néctar Labs | Software Artesanal",
    description: "Arquitectura de software para negocios que exigen independencia técnica y rendimiento industrial.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
