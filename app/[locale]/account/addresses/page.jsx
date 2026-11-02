import { getTranslations } from 'next-intl/server';
import { AddressBook } from '@/components/account/address-book';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Account' }); return { title: t('meta.addresses'), robots: { index: false } }; }
export default async function AddressesPage({ params }) { const { locale } = await params; return <AddressBook locale={locale} />; }
