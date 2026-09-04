import { notFound } from 'next/navigation';
import { StructuredContent } from '@/components/storefront/structured-content';
import { serverGet } from '@/lib/api/server-api';
export async function generateMetadata({ params }) { const { locale, slug } = await params; try { const page = await serverGet(`/pages/${slug}`, { locale, revalidate: 60 }); return { title: page.seo.title, description: page.seo.description }; } catch { return { title: 'Page' }; } }
export default async function ContentPage({ params }) { const { locale, slug } = await params; let page; try { page = await serverGet(`/pages/${slug}`, { locale, revalidate: 60, tags: [`page:${slug}`] }); } catch { notFound(); } return <div className="container py-12"><div className="mx-auto max-w-4xl"><h1 className="text-4xl font-black">{page.title}</h1>{page.excerpt ? <p className="mt-3 text-lg muted">{page.excerpt}</p> : null}<div className="mt-9"><StructuredContent blocks={page.blocks} locale={locale} /></div></div></div>; }
