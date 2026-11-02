import Image from 'next/image';
import { notFound } from 'next/navigation';
import { StructuredContent } from '@/components/storefront/structured-content';
import { serverGet } from '@/lib/api/server-api';

async function loadPost(slug, locale) {
  try { return await serverGet(`/posts/${encodeURIComponent(slug)}`, { locale, revalidate: 60, tags: [`post:${slug}`] }); } catch (error) { if (error.status === 404) return null; throw error; }
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const post = await loadPost(slug, locale).catch(() => null);
  return post ? { title: post.seo?.title || post.title, description: post.seo?.description, alternates: { canonical: `/${locale}/blog/${slug}`, languages: { en: `/en/blog/${slug}`, bn: `/bn/blog/${slug}` } }, openGraph: { images: post.coverUrl ? [{ url: post.coverUrl }] : undefined } } : { title: 'Journal' };
}

export default async function PostPage({ params }) {
  const { locale, slug } = await params;
  const post = await loadPost(slug, locale);
  if (!post) notFound();
  return (
    <article className="container py-8 md:py-12">
      <header className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">{post.category?.name || post.type}</p>
        <h1 className="display-heading mt-2 !text-[clamp(2rem,4.5vw,3.25rem)]">{post.title}</h1>
        {post.excerpt ? <p className="mt-4 text-[16px] leading-7 text-[var(--color-muted)]">{post.excerpt}</p> : null}
        {post.publishedAt ? <time dateTime={post.publishedAt} className="mt-4 block text-[13px] text-[var(--color-muted)]">{new Date(post.publishedAt).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'long', year: 'numeric' })}</time> : null}
      </header>
      {post.coverUrl ? <div className="relative mx-auto mt-8 aspect-[16/9] max-w-5xl overflow-hidden rounded-[var(--radius-lg)]"><Image src={post.coverUrl} alt="" fill priority sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" /></div> : null}
      <div className="mx-auto mt-10 max-w-3xl"><StructuredContent blocks={post.blocks} locale={locale} /></div>
    </article>
  );
}
