'use client';

import { Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, CardBody } from '@/components/ui';
import { apiMessage } from '@/lib/api/browser-api';
import { reviewApi } from '@/lib/api/review-api';

export function ProductReviews({ productId }) {
  const reviews = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: () => reviewApi.publicForProduct(productId, { pageSize: 20 })
  });
  if (reviews.isLoading) {
    return (
      <section className="mt-12">
        <h2 className="text-2xl font-bold">Customer reviews</h2>
        <p className="mt-4 text-[var(--color-muted)]">Loading reviews…</p>
      </section>
    );
  }
  if (reviews.error) {
    return (
      <section className="mt-12">
        <h2 className="text-2xl font-bold">Customer reviews</h2>
        <div className="mt-4"><Alert tone="error">{apiMessage(reviews.error)}</Alert></div>
      </section>
    );
  }
  const aggregate = reviews.data.meta.aggregate;
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Customer reviews</h2>
          <p className="mt-1 text-[var(--color-muted)]">
            {aggregate.count
              ? `${aggregate.average.toFixed(1)} out of 5 from ${aggregate.count} review${aggregate.count === 1 ? '' : 's'}`
              : 'No approved reviews yet.'}
          </p>
        </div>
        <Stars value={Math.round(aggregate.average)} />
      </div>
      <div className="mt-5 grid gap-4">
        {reviews.data.data.map((review) => (
          <Card key={review.id}>
            <CardBody>
              <div className="flex items-center justify-between gap-3">
                <Stars value={review.rating} />
                <span className="text-sm text-[var(--color-muted)]">{new Date(review.createdAt).toLocaleDateString('en-BD', { timeZone: 'Asia/Dhaka' })}</span>
              </div>
              {review.title ? <h3 className="mt-3 font-bold">{review.title}</h3> : null}
              <p className="mt-2 whitespace-pre-line">{review.body}</p>
              <p className="mt-3 text-sm text-[var(--color-muted)]">
                {review.customer?.name || 'Customer'}{review.verifiedPurchase ? ' · Verified purchase' : ''}
              </p>
              {review.staffResponse ? (
                <div className="mt-4 rounded-lg bg-[var(--color-surface-muted)] p-4">
                  <strong>Elite Emporium response</strong>
                  <p className="mt-1">{review.staffResponse}</p>
                </div>
              ) : null}
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Stars({ value }) {
  return (
    <span className="flex text-amber-500" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={18} fill={star <= value ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}