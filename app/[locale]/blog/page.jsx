import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { serverGetEnvelope } from '@/lib/api/server-api';

export const metadata = { title: 'Lookbook & journal' };

export default async function BlogPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Journal' });
  const result = await serverGetEnvelope('/posts?pageSize=24', { locale, revalidate: 60, tags: ['posts'] }).catch(() => ({ data: [] }));
  return (
    <div className="container py-8 md:py-12">
      <h1 className="page-heading">{t('title')}</h1>
      <p className="mt-2 max-w-xl text-[15px] text-[var(--color-muted)]">{t('subtitle')}</p>
      {result.data.length ? (
        <div className="mt-8 grid gap-x-5 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {result.data.map((post) => (
            <article key={post.id} className="group">
              <Link href={`/${locale}/blog/${post.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-surface)]">
                {post.coverUrl ? <Image src={post.coverUrl} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" /> : null}
              </Link>
              <p className="eyebrow mt-3">{post.category?.name || post.type}</p>
              <h2 className="mt-1 text-[18px] font-medium leading-snug"><Link href={`/${locale}/blog/${post.slug}`} className="hover:underline hover:underline-offset-4">{post.title}</Link></h2>
              {post.excerpt ? <p className="mt-1.5 line-clamp-2 text-[14px] text-[var(--color-muted)]">{post.excerpt}</p> : null}
            </article>
          ))}
        </div>
      ) : <p className="mt-10 text-[15px] text-[var(--color-muted)]">{t('empty')}</p>}
    </div>
  );
}
