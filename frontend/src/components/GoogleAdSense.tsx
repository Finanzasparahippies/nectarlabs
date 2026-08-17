'use client';

import { useEffect } from 'react';

export default function GoogleAdSense() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (document.getElementById('google-adsense-script')) return;

    const script = document.createElement('script');
    script.id = 'google-adsense-script';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2582703158474486';
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }, []);

  return null;
}
