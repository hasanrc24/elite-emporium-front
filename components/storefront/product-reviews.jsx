'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiMessage } from '@/lib/api/browser-api';
import { reviewApi } from '@/lib/api/review-api';
import { formatNumber } from '@/lib/storefront';

function Stars({ value, size = 16, label }) {
  return (
    <span className="flex text-[var(--color-warning)]" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={size} fill={star <= Math.round(value) ? 'currentColor' : 'none'} aria-hidden="true" />)}
    </span>
  );
}

export function ProductReviews({ productId, locale, fitFeedback }) {
  const t = useTranslations('Product');
  const [sort, setSort] = useState('newest');
  const [stars, setStars] = useState(0);
  const reviews = useInfiniteQuery({
    queryKey: ['product-reviews', productId, sort, stars],
    placeholderData: (previous) => previous,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => reviewApi.publicForProduct(productId, { page: pageParam, pageSize: 10, sort, ...(stars ? { rating: stars } : {}) }),
    getNextPageParam: (last) => (last.meta?.page < last.meta?.pageCount ? last.meta.page + 1 : undefined)
  });
  const items = (reviews.data?.pages || []).flatMap((page) => page.data || []);
  const fitTotal = fitFeedback ? Object.values(fitFeedback).reduce((sum, value) => sum + Number(value || 0), 0) : 0;
  const aggregate = reviews.data?.pages?.[0]?.meta?.aggregate || { average: 0, count: 0 };
  const distribution = aggregate.distribution || null;
  const distributionTotal = distribution ? Object.values(distribution).reduce((sum, value) => sum + Number(value || 0), 0) : 0;
  const empty = !reviews.isLoading && !aggregate.count && !stars;
  return (
    <section id="reviews" className="scroll-mt-24" aria-labelledby="reviews-heading">
      <div className={empty ? '' : 'grid gap-8 md:grid-cols-[280px_1fr] md:gap-12'}>
        <div>
          <h2 id="reviews-heading" className="section-heading">{t('reviews')}</h2>
          {reviews.isLoading ? <div className="skeleton mt-4 h-16 rounded" aria-hidden="true" /> : aggregate.count ? (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-4xl font-medium tabular-nums">{formatNumber(aggregate.average, locale, 1)}</span>
              <div><Stars value={aggregate.average} label={t('ratingOutOf', { rating: formatNumber(aggregate.average, locale, 1) })} /><p className="mt-1 text-[13px] text-[var(--color-muted)]">{t('reviewCount', { count: aggregate.count })}</p></div>
            </div>
          ) : empty ? (
            <div className="mt-4 flex max-w-xl items-start gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-4">
              <Star size={20} className="mt-0.5 shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
              <div><p className="text-[15px] font-medium">{t('noReviews')}</p><p className="mt-1 text-[13px] leading-6 text-[var(--color-muted)]">{t('noReviewsBody')}</p></div>
            </div>
          ) : null}
          {distribution && aggregate.count > 0 ? (
            <ul className="mt-5 grid gap-1.5" aria-label={t('ratingBreakdown')}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = Number(distribution[star] || 0);
                const share = distributionTotal ? Math.round((count / distributionTotal) * 100) : 0;
                return (
                  <li key={star}>
                    <button type="button" aria-pressed={stars === star} onClick={() => setStars(stars === star ? 0 : star)} disabled={!count && stars !== star} aria-label={t('filterStars', { stars: formatNumber(star, locale), count })} className="grid w-full min-h-7 grid-cols-[2.25rem_1fr_2rem] items-center gap-2 text-[13px] disabled:opacity-50">
                      <span className="flex items-center gap-1 tabular-nums">{formatNumber(star, locale)}<Star size={12} fill="currentColor" className="text-[var(--color-warning)]" aria-hidden="true" /></span>
                      <span className={`h-1.5 overflow-hidden rounded-full bg-[var(--color-border)] ${stars === star ? 'ring-1 ring-[var(--color-text)]' : ''}`}><span className="block h-full bg-[var(--color-text)]" style={{ width: `${share}%` }} /></span>
                      <span className="text-right tabular-nums text-[var(--color-muted)]">{formatNumber(count, locale)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {fitTotal ? (
            <div className="mt-6">
              <p className="text-sm font-medium">{t('fitFeedback')}</p>
              <dl className="mt-3 grid gap-2 text-[13px]">
                {[['small', t('fitSmall')], ['true_to_size', t('fitTrue')], ['large', t('fitLarge')]].map(([key, label]) => {
                  const share = Math.round((Number(fitFeedback[key] || 0) / fitTotal) * 100);
                  return <div key={key} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-2"><dt>{label}</dt><dd className="h-1 overflow-hidden rounded-full bg-[var(--color-border)]"><span className="block h-full bg-[var(--color-text)]" style={{ width: `${share}%` }} /></dd><dd className="text-right tabular-nums text-[var(--color-muted)]">{formatNumber(share, locale)}%</dd></div>;
                })}
              </dl>
            </div>
          ) : null}
        </div>
        {empty && !reviews.error ? null : <div>
          {aggregate.count ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              {stars ? <button type="button" onClick={() => setStars(0)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[var(--color-surface)] px-3.5 text-[13px]">{t('starsOnly', { stars: formatNumber(stars, locale) })}<span aria-hidden="true">×</span><span className="sr-only">{t('clearStarFilter')}</span></button> : <span />}
              <label className="flex items-center gap-2 text-[13px]"><span className="text-[var(--color-muted)]">{t('reviewSort')}</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)} className="!min-h-9 !w-auto">
                  <option value="newest">{t('sortNewest')}</option><option value="highest">{t('sortHighest')}</option><option value="lowest">{t('sortLowest')}</option>
                </select>
              </label>
            </div>
          ) : null}
          {reviews.error ? <p role="alert" className="text-sm text-[var(--color-danger)]">{apiMessage(reviews.error)}</p> : null}
          <ul className="divide-y divide-[var(--color-border)]">
            {!items.length && !reviews.isLoading && stars ? <li className="py-4 text-sm text-[var(--color-muted)]">{t('noReviewsForStars')}</li> : null}
            {items.map((review) => (
              <li key={review.id} className="py-5 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <Stars value={review.rating} size={14} label={t('ratingOutOf', { rating: formatNumber(review.rating, locale) })} />
                  <time className="text-[12px] text-[var(--color-muted)]" dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric' })}</time>
                </div>
                {review.title ? <h3 className="mt-2 text-[15px] font-medium">{review.title}</h3> : null}
                <p className="mt-1.5 whitespace-pre-line text-[14px] leading-6">{review.body}</p>
                <p className="mt-2 text-[12px] text-[var(--color-muted)]">{review.customer?.name || '—'}{review.verifiedPurchase ? ` · ${t('verifiedPurchase')}` : ''}{review.fit ? ` · ${t('fit')}: ${review.fit === 'small' ? t('fitSmall') : review.fit === 'large' ? t('fitLarge') : t('fitTrue')}` : ''}</p>
                {review.staffResponse ? <p className="mt-3 border-l-2 border-[var(--color-border-strong)] pl-3 text-[13px] text-[var(--color-muted)]">{review.staffResponse}</p> : null}
              </li>
            ))}
          </ul>
          {reviews.hasNextPage ? <div className="mt-6 text-center"><button type="button" onClick={() => reviews.fetchNextPage()} disabled={reviews.isFetchingNextPage} className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--color-text)] px-8 text-[14px] disabled:opacity-50">{reviews.isFetchingNextPage ? t('loadingMore') : t('moreReviews')}</button></div> : null}
        </div>}
      </div>
    </section>
  );
}
