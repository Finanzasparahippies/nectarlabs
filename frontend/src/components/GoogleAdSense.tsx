'use client';

import Script from 'next/script';

export default function GoogleAdSense() {
  return (
    <Script
      id="google-adsense"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2582703158474486"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
