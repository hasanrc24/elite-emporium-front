import { getTranslations } from 'next-intl/server';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { ContactForm } from '@/components/storefront/contact-form';
import { serverGet } from '@/lib/api/server-api';

export const metadata = { title: 'Contact' };

export default async function ContactPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Contact' });
  const settings = await serverGet('/storefront/settings', { locale, revalidate: 60, tags: ['settings'] }).catch(() => null);
  const store = settings?.store || {};
  return (
    <div className="container grid items-start gap-10 py-8 md:py-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
      <section>
        <h1 className="page-heading">{t('title')}</h1>
        <p className="mt-3 max-w-md text-[15px] leading-7 text-[var(--color-muted)]">{t('subtitle')}</p>
        <ul className="mt-8 grid gap-5 text-[15px]">
          {store.whatsappUrl ? <li><a href={store.whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 underline-offset-4 hover:underline"><MessageCircle size={20} strokeWidth={1.5} />{t('whatsapp')}</a></li> : null}
          {store.contactPhone ? <li className="flex items-start gap-3"><Phone size={20} strokeWidth={1.5} className="mt-0.5" /><span><span className="block text-[13px] text-[var(--color-muted)]">{t('call')}</span><a href={`tel:${String(store.contactPhone).replace(/[^\d+]/g, '')}`}>{store.contactPhone}</a></span></li> : null}
          {store.contactEmail ? <li className="flex items-start gap-3"><Mail size={20} strokeWidth={1.5} className="mt-0.5" /><span><span className="block text-[13px] text-[var(--color-muted)]">{t('email')}</span><a href={`mailto:${store.contactEmail}`}>{store.contactEmail}</a></span></li> : null}
          {store.address ? <li className="flex items-start gap-3"><MapPin size={20} strokeWidth={1.5} className="mt-0.5" /><span><span className="block text-[13px] text-[var(--color-muted)]">{t('visit')}</span>{store.address}</span></li> : null}
        </ul>
      </section>
      <ContactForm />
    </div>
  );
}
