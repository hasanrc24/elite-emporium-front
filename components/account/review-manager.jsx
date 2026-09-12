'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiMessage } from '@/lib/api/browser-api';
import { reviewApi } from '@/lib/api/review-api';
import { Alert, Button, Card, CardBody, EmptyState, Field, Input, NativeSelect, Skeleton, Textarea } from '@/components/ui';
import { pushToast, successToast, errorToast } from '@/components/ui/toast';

const RATINGS = [5, 4, 3, 2, 1].map((value) => ({ value: String(value), label: `${value} star${value === 1 ? '' : 's'}` }));

function StarRow({ rating }) {
  return (
    <p className="text-amber-600" aria-label={`${rating} of 5 stars`}>
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </p>
  );
}

export function ReviewList({ locale }) {
  const client = useQueryClient();
  const reviews = useQuery({ queryKey: ['account', 'reviews'], queryFn: () => reviewApi.mine() });
  const remove = useMutation({
    mutationFn: (id) => reviewApi.remove(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['account', 'reviews'] });
      pushToast({ tone: 'success', title: 'Review deleted', description: 'Your review has been removed.' });
    },
    onError: (error) => pushToast({ tone: 'error', title: 'Could not delete review', description: apiMessage(error, 'Review could not be deleted.') })
  });

  if (reviews.isLoading) {
    return (
      <Card>
        <Skeleton className="h-32" />
      </Card>
    );
  }
  if (reviews.error) return <Alert tone="error">{apiMessage(reviews.error)}</Alert>;

  const list = reviews.data?.data || [];
  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-bold">Your reviews</h2>
      {list.length ? (
        list.map((review) => (
          <Card key={review.id}>
            <CardBody className="flex flex-wrap justify-between gap-3">
              <div className="grid gap-1">
                <StarRow rating={review.rating} />
                <h3 className="mt-1 font-bold">{review.title || 'Product review'}</h3>
                <p className="mt-2">{review.body}</p>
                <p className="mt-3 text-sm capitalize text-[var(--color-muted)]">Status: {review.status}</p>
              </div>
              <div className="flex h-fit gap-2">
                {['pending', 'rejected'].includes(review.status) ? (
                  <Button asChild variant="secondary">
                    <Link href={`/${locale}/account/reviews/new?reviewId=${review.id}`}>Edit</Link>
                  </Button>
                ) : null}
                <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(review.id)}>
                  Delete
                </Button>
              </div>
            </CardBody>
          </Card>
        ))
      ) : (
        <EmptyState title="You have not submitted any reviews." description="Reviews help other shoppers and reward you with loyalty points." />
      )}
      {remove.error ? <Alert tone="error">{apiMessage(remove.error)}</Alert> : null}
    </div>
  );
}

export function ReviewForm({ locale }) {
  const search = useSearchParams();
  const router = useRouter();
  const productId = search.get('productId');
  const orderItemId = search.get('orderItemId');
  const reviewId = search.get('reviewId');

  const existing = useQuery({
    queryKey: ['account', 'reviews'],
    queryFn: () => reviewApi.mine(),
    enabled: Boolean(reviewId)
  });
  const review = existing.data?.data?.find((item) => item.id === reviewId);

  if (reviewId && existing.isLoading) {
    return (
      <Card>
        <Skeleton className="h-40" />
      </Card>
    );
  }
  if (reviewId && !review) return <Alert tone="error">Review not found or cannot be edited.</Alert>;

  return (
    <ReviewEditor
      key={review?.version || 'new'}
      review={review}
      productId={productId}
      orderItemId={orderItemId}
      onSaved={() => router.replace(`/${locale}/account/reviews`)}
    />
  );
}

function ReviewEditor({ review, productId, orderItemId, onSaved }) {
  const form = useForm({
    resolver: zodResolver(z.object({
      rating: z.coerce.number().int().min(1, 'Please select a rating').max(5, 'Rating cannot exceed 5'),
      title: z.string().trim().max(180, 'Title must be 180 characters or fewer').optional().default(''),
      body: z.string().trim().min(10, 'Review must be at least 10 characters').max(5000, 'Review must be 5000 characters or fewer'),
    })),
    defaultValues: { rating: review?.rating || 5, title: review?.title || '', body: review?.body || '' },
  });
  const save = useMutation({
    mutationFn: (values) =>
      review
        ? reviewApi.update(review.id, { rating: Number(values.rating), title: values.title, body: values.body, mediaIds: [], version: review.version })
        : reviewApi.create({ productId, orderItemId, rating: Number(values.rating), title: values.title, body: values.body, mediaIds: [] }),
    onSuccess: () => {
      successToast('Review submitted', 'Your review has been submitted for moderation');
      onSaved();
    },
    onError: (error) => errorToast('Failed to submit review', apiMessage(error, 'Could not submit review')),
  });

  if (!review && (!productId || !orderItemId)) {
    return <Alert tone="error">Choose a fulfilled order item before writing a review.</Alert>;
  }

  return (
    <form className="card grid gap-5 p-6" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
      <div>
        <h2 className="text-2xl font-bold">{review ? 'Edit review' : 'Write a review'}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Reviews are linked to a fulfilled purchase and may require moderation.</p>
      </div>

      <Field label="Rating" required error={form.formState.errors.rating?.message}>
        <NativeSelect
          {...form.register('rating', { valueAsNumber: true })}
          options={RATINGS}
        />
      </Field>

      <Field label="Title (optional)" error={form.formState.errors.title?.message}>
        <Input maxLength={180} {...form.register('title')} />
      </Field>

      <Field label="Review" required error={form.formState.errors.body?.message}>
        <Textarea required minLength={10} maxLength={5000} rows={6} {...form.register('body')} />
      </Field>

      {save.error ? <Alert tone="error">{apiMessage(save.error)}</Alert> : null}

      <div>
        <Button loading={save.isPending} type="submit">Submit review</Button>
      </div>
    </form>
  );
}