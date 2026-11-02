'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';

/** Floating WhatsApp/Messenger help (hidden on checkout so it never covers the CTA). */
export function ChatButton({ store, locale }) {
  const t = useTranslations('Common');
  const pathname = usePathname();
  const href = [store?.whatsappUrl, store?.messengerUrl].find((url) => typeof url === 'string' && /^https:\/\//.test(url));
  if (!href || pathname?.startsWith(`/${locale}/checkout`)) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={t('chat')} className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-30 grid size-12 place-items-center rounded-full bg-[#1a8f4c] text-white shadow-[0_10px_30px_rgb(0_0_0/.18)] transition hover:scale-105 md:bottom-6 md:right-6 md:size-14">
      <MessageCircle size={24} aria-hidden="true" />
    </a>
  );
}
