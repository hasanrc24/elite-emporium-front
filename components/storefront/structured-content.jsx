import Image from 'next/image';
import Link from 'next/link';
import { Clock3, Quote } from 'lucide-react';
import { sanitizeHtml } from '@/lib/safe-html';
import { safeContentHref } from '@/lib/utils';

/** Structured CMS blocks for pages, posts and homepage sections (BE-CMS-001). */
export function StructuredContent({ blocks = [], locale }) {
  return <div className="grid gap-12">{blocks.map((block) => <Block key={block.id} block={block} locale={locale} />)}</div>;
}

export function HeroBlock({ data, locale, priority = false, as: Heading = 'h1' }) {
  const imageUrl = data.imageUrl || data.backgroundImage || data.media?.url;
  const href = safeContentHref(data.url, locale);
  const secondary = safeContentHref(data.secondaryUrl, locale);
  return (
    <section className="relative isolate grid min-h-[72svh] items-end overflow-hidden bg-[var(--color-surface)] md:min-h-[78vh] md:items-center">
      {imageUrl ? <Image src={imageUrl} alt={data.imageAlt || ''} fill priority={priority} sizes="100vw" className="-z-10 object-cover object-top" /> : null}
      {imageUrl ? <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/60 via-black/10 to-transparent md:bg-gradient-to-r md:from-black/45 md:via-black/10" /> : null}
      <div className={`container py-10 md:py-16 ${imageUrl ? 'text-white' : ''}`}>
        <div className="max-w-xl">
          {data.eyebrow ? <p className={`eyebrow ${imageUrl ? '!text-white/85' : ''}`}>{data.eyebrow}</p> : null}
          <Heading className="display-heading mt-2">{data.title || data.heading}</Heading>
          {data.text ? <p className={`mt-4 max-w-md text-[15px] leading-7 md:text-[17px] ${imageUrl ? 'text-white/90' : 'text-[var(--color-muted)]'}`}>{data.text}</p> : null}
          <div className="mt-7 flex flex-wrap gap-3">
            {href ? <Link href={href} className={`inline-flex min-h-12 items-center rounded-[var(--radius-sm)] px-8 text-[15px] font-medium ${imageUrl ? 'bg-white text-[#111] hover:bg-white/90' : 'bg-[var(--color-text)] text-[var(--color-bg)]'}`}>{data.cta || 'Shop now'}</Link> : null}
            {secondary && data.secondaryCta ? <Link href={secondary} className={`inline-flex min-h-12 items-center rounded-[var(--radius-sm)] border px-8 text-[15px] font-medium ${imageUrl ? 'border-white text-white hover:bg-white/10' : 'border-[var(--color-text)]'}`}>{data.secondaryCta}</Link> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function BannerBlock({ data, locale }) {
  const imageUrl = data.imageUrl || data.backgroundImage || data.media?.url;
  const href = safeContentHref(data.url, locale);
  const content = (
    <>
      {imageUrl ? <Image src={imageUrl} alt={data.imageAlt || ''} fill sizes="(min-width: 768px) 50vw, 100vw" className="-z-10 object-cover transition duration-700 group-hover:scale-[1.03]" /> : null}
      <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/55 to-transparent" />
      <div className="p-6 text-white md:p-8">
        <h2 className="text-[24px] font-medium leading-tight md:text-[30px]">{data.title || data.heading}</h2>
        {data.text ? <p className="mt-2 max-w-sm text-[14px] text-white/85">{data.text}</p> : null}
        {data.cta ? <span className="mt-4 inline-block text-[14px] underline underline-offset-4">{data.cta}</span> : null}
      </div>
    </>
  );
  const className = 'group relative isolate grid min-h-[320px] items-end overflow-hidden rounded-[var(--radius-lg)] bg-[#3b3530] md:min-h-[420px]';
  return href ? <Link href={href} className={className}>{content}</Link> : <section className={className}>{content}</section>;
}

function Block({ block, locale }) {
  const data = block.data || {};
  if (block.type === 'rich_text') return <section className="prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.html || data.content || '') }} />;
  if (block.type === 'hero') return <div className="-mx-4 md:mx-0 md:overflow-hidden md:rounded-[var(--radius-lg)]"><HeroBlock data={data} locale={locale} as="h2" /></div>;
  if (block.type === 'banner') return <BannerBlock data={data} locale={locale} />;
  if (block.type === 'image' && (data.imageUrl || data.media?.url)) return <figure><div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)]"><Image src={data.imageUrl || data.media.url} alt={data.alt || ''} fill sizes="(min-width: 1024px) 896px, 100vw" className="object-cover" /></div>{data.caption ? <figcaption className="mt-2 text-[13px] text-[var(--color-muted)]">{data.caption}</figcaption> : null}</figure>;
  if (block.type === 'faq') return (
    <section className="grid gap-6 lg:grid-cols-[.6fr_1.4fr]">
      {data.title ? <h2 className="section-heading">{data.title}</h2> : <span />}
      <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        {(data.items || []).map((item, index) => <details key={index} className="group py-4"><summary className="flex cursor-pointer items-center justify-between gap-4 text-[15px] font-medium"><span>{item.question}</span><span aria-hidden="true" className="text-xl transition group-open:rotate-45">+</span></summary><p className="mt-2 max-w-[65ch] pr-8 text-[14px] leading-7 text-[var(--color-muted)]">{item.answer}</p></details>)}
      </div>
    </section>
  );
  if (block.type === 'testimonials') return (
    <section>
      {data.title ? <h2 className="section-heading mb-6">{data.title}</h2> : null}
      <div className="rail">
        {(data.items || []).map((item, index) => <blockquote key={index} className="flex h-full flex-col rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6"><Quote size={20} className="text-[var(--color-accent)]" aria-hidden="true" /><p className="mt-4 flex-1 text-[15px] leading-7">{item.quote}</p><footer className="mt-4 text-[13px] text-[var(--color-muted)]">{item.name}</footer></blockquote>)}
      </div>
    </section>
  );
  if (block.type === 'countdown') return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] bg-[var(--color-text)] p-6 text-[var(--color-bg)] md:p-8">
      <h2 className="text-[22px] font-medium md:text-[26px]">{data.title}</h2>
      {data.endsAt ? <p className="flex items-center gap-2 text-[14px]"><Clock3 size={17} aria-hidden="true" /><time dateTime={data.endsAt}>{new Date(data.endsAt).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}</time></p> : null}
    </section>
  );
  if (block.type === 'newsletter') return (
    <section className="grid gap-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 md:grid-cols-[1fr_auto] md:items-end md:p-10">
      <div><h2 className="section-heading">{data.title}</h2>{data.text ? <p className="mt-2 max-w-[55ch] text-[14px] text-[var(--color-muted)]">{data.text}</p> : null}</div>
      <Link className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--color-text)] px-6 text-sm" href={`/${locale}/contact`}>{data.cta || (locale === 'bn' ? 'যোগাযোগ' : 'Contact us')}</Link>
    </section>
  );
  return null;
}
