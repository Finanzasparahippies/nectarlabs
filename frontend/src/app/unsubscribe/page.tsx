'use client';

import React from 'react';
import UnsubscribeContent from '@/components/addons/newsletter-campaigner/UnsubscribeContent';

export default function PlatformUnsubscribePage() {
  return (
    <div className="min-h-screen bg-background dark:bg-[#020403] flex items-center justify-center p-6">
      <UnsubscribeContent />
    </div>
  );
}
