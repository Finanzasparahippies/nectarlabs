import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SupportChatWidget from "../components/SupportChatWidget";
import GoogleAdSense from "../components/GoogleAdSense";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://staging.nectarlabs.dev"),
  title: "Néctar Labs | Software Artesanal & Arquitectura de Alto Rendimiento",
  description: "Diseñamos software artesanal y arquitectura escalable para negocios que exigen independencia técnica y rendimiento industrial. Tu partner tecnológico estratégico.",
  keywords: ["software artesanal", "arquitectura de software", "desarrollo web méxico", "nectar labs", "partner tecnológico", "django nextjs", "desarrollo a medida"],
  authors: [{ name: "Jesus Saul Villegas Cruz" }],
  other: {
    "google-adsense-account": "ca-pub-2582703158474486",
  },
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
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="google-adsense-account" content="ca-pub-2582703158474486" />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.add('dark');localStorage.setItem('theme','dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <GoogleAdSense />
        {children}
        <SupportChatWidget />
      </body>
    </html>
  );
}
