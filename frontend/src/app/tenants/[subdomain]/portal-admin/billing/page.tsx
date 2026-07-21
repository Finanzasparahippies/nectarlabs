'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function BillingRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const subdomain = params?.subdomain;

  useEffect(() => {
    if (subdomain) {
      router.push(`/tenants/${subdomain}/admin`);
    } else {
      router.push('/dashboard');
    }
  }, [subdomain, router]);

  return (
    <div className="min-h-screen bg-[#020403] text-white flex flex-col items-center justify-center font-sans">
      <span className="w-8 h-8 rounded-full border-4 border-t-white border-white/10 animate-spin"></span>
      <p className="mt-4 text-xs font-black uppercase tracking-widest text-white/50">Redirigiendo a Facturación...</p>
    </div>
  );
}
