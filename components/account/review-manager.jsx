'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { reviewApi } from '@/lib/api/review-api';
import { Alert, Button, Card, CardBody, ConfirmAction, Field, Input, Skeleton, StatusBadge, Textarea } from '@/components/ui';
import { pushToast, successToast, errorToast } from '@/components/ui/toast';
import { useTableParams } from '@/lib/hooks/use-table-params';
import { AccountList } from './list-parts';

const REVIEWS_PAGE_SIZE = 10;

const FITS = ['small', 'true_to_size', 'large'];

function StarRow({ rating }) {
  const t = useTranslations('Account.reviews');
  return (
    <p className="text-amber-600" aria-label={t('stars', { count: rating })}>
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </p>
  );
}

export function ReviewList({ locale }) {
  const t = useTranslations('Account.reviews');
  const tUi = useTranslations('ui');
  const client = useQueryClient();
  const [params, setParams] = useTableParams({ page: 1 });
  const reviews = useQuery({ queryKey: ['account', 'reviews', 'page', params.page], queryFn: () => reviewApi.mine({ page: params.page, pageSize: REVIEWS_PAGE_SIZE }), placeholderData: (previous) => previous });
  const remove = useMutation({
    mutationFn: (id) => reviewApi.remove(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['account', 'reviews'] });
      pushToast({ tone: 'success', title: t('deleted') });
    },
    onError: (error) => pushToast({ tone: 'error', title: t('deleteFailed'), description: apiMessage(error) })
  });

  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-bold">{t('title')}</h2>
      <AccountList
        query={reviews}
        columns={[]}
        mobileOnly
        caption={t('title')}
        page={params.page}
        pageSize={REVIEWS_PAGE_SIZE}
        onPageChange={(page) => setParams({ page })}
        emptyTitle={t('emptyTitle')}
        emptyDescription={t('emptyBody')}
        emptyAction={<Button asChild><Link href={`/${locale}/account/orders`}>{t('viewOrders')}</Link></Button>}
        renderCard={(review) => (
          <Card>
            <CardBody className="flex flex-wrap justify-between gap-3">
              <div className="grid gap-1">
                <StarRow rating={review.rating} />
                <h3 className="mt-1 font-bold">{review.title || t('untitled')}</h3>
                <p className="mt-2">{review.body}</p>
                <p className="mt-3 flex items-center gap-2 text-sm text-[var(--color-muted)]">{t('status')}: <StatusBadge status={review.status} locale={locale} /></p>
              </div>
              <div className="flex h-fit gap-2">
                {['pending', 'rejected'].includes(review.status) ? (
                  <Button asChild variant="secondary">
                    <Link href={`/${locale}/account/reviews/new?reviewId=${review.id}`}>{t('edit')}</Link>
                  </Button>
                ) : null}
                <ConfirmAction
                  title={t('confirmDelete')}
                  confirmLabel={t('delete')}
                  cancelLabel={tUi('cancel')}
                  onConfirm={() => remove.mutate(review.id)}
                  trigger={<Button variant="danger" loading={remove.isPending && remove.variables === review.id}>{t('delete')}</Button>}
                />
              </div>
            </CardBody>
          </Card>
        )}
      />
      {remove.error ? <Alert tone="error">{apiMessage(remove.error)}</Alert> : null}
    </div>
  );
}

export function ReviewForm({ locale }) {
  const t = useTranslations('Account.reviews');
  const search = useSearchParams();
  const router = useRouter();
  const productId = search.get('productId');
  const orderItemId = search.get('orderItemId');
  const reviewId = search.get('reviewId');

  const existing = useQuery({
    queryKey: ['account', 'reviews'],
    queryFn: () => reviewApi.mine({ pageSize: 100 }),
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
  if (reviewId && !review) return <Alert tone="error">{t('notFound')}</Alert>;

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
  const t = useTranslations('Account.reviews');
  const schema = useMemo(() => z.object({
    rating: z.number().int().min(1, t('errors.rating')).max(5),
    fit: z.enum(FITS).nullable(),
    title: z.string().trim().max(180, t('errors.titleLength')).optional().default(''),
    body: z.string().trim().min(10, t('errors.bodyLength')).max(5000, t('errors.bodyMax'))
  }), [t]);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { rating: review?.rating || 5, fit: review?.fit || null, title: review?.title || '', body: review?.body || '' }
  });
  const [rating, fit] = useWatch({ control: form.control, name: ['rating', 'fit'] });
  const [photos, setPhotos] = useState(() => (review?.media || []).map((item) => ({ id: item.id, url: item.url })));
  const upload = useMutation({
    mutationFn: (file) => {
      const data = new FormData();
      data.append('file', file);
      data.append('purpose', 'review');
      return browserApi.post('/media/upload', data).then((response) => response.data.data);
    },
    onSuccess: (asset) => setPhotos((current) => [...current, { id: asset.id, url: asset.url || asset.variants?.[0]?.url || null }]),
    onError: (error) => errorToast(t('uploadFailed'), apiMessage(error))
  });
  const save = useMutation({
    mutationFn: (values) =>
      review
        ? reviewApi.update(review.id, { rating: values.rating, fit: values.fit, title: values.title, body: values.body, mediaIds: photos.map((photo) => photo.id), version: review.version })
        : reviewApi.create({ productId, orderItemId, rating: values.rating, fit: values.fit, title: values.title, body: values.body, mediaIds: photos.map((photo) => photo.id) }),
    onSuccess: () => {
      successToast(t('submitted'), t('submittedBody'));
      onSaved();
    },
    onError: (error) => errorToast(t('submitFailed'), apiMessage(error)),
  });

  if (!review && (!productId || !orderItemId)) {
    return <Alert tone="error">{t('chooseItem')}</Alert>;
  }

  return (
    <form className="card grid gap-5 p-6" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
      <div>
        <h2 className="text-2xl font-bold">{review ? t('editTitle') : t('newTitle')}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{t('intro')}</p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">{t('rating')}</legend>
        <div className="mt-2 flex gap-1" role="radiogroup" aria-label={t('rating')}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={t('stars', { count: value })} onClick={() => form.setValue('rating', value, { shouldValidate: true })} className={`text-3xl leading-none transition ${value <= rating ? 'text-amber-500' : 'text-[var(--color-border-strong)]'}`}>★</button>
          ))}
        </div>
        {form.formState.errors.rating ? <p className="mt-1 text-sm text-[var(--color-danger)]">{form.formState.errors.rating.message}</p> : null}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">{t('fit')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FITS.map((value) => (
            <button key={value} type="button" aria-pressed={fit === value} onClick={() => form.setValue('fit', fit === value ? null : value)} className={`min-h-10 rounded-full border px-4 text-sm transition ${fit === value ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)]' : 'border-[var(--color-border-strong)] hover:border-[var(--color-text)]'}`}>{t(`fits.${value}`)}</button>
          ))}
        </div>
      </fieldset>

      <Field label={t('titleField')} error={form.formState.errors.title?.message}>
        <Input maxLength={180} {...form.register('title')} />
      </Field>

      <Field label={t('body')} required error={form.formState.errors.body?.message}>
        <Textarea required minLength={10} maxLength={5000} rows={6} {...form.register('body')} />
      </Field>

      <div className="grid gap-2">
        <p className="text-sm font-medium">{t('photos')}</p>
        <div className="flex flex-wrap gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative size-20 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              {photo.url ? <Image src={photo.url} alt="" fill sizes="80px" className="object-cover" unoptimized /> : null}
              <button type="button" className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-white/90 text-[#111]" aria-label={t('removePhoto')} onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))}><X size={13} /></button>
            </div>
          ))}
          {photos.length < 5 ? (
            <label className={`grid size-20 cursor-pointer place-items-center rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-strong)] text-[var(--color-muted)] hover:border-[var(--color-text)] ${upload.isPending ? 'pointer-events-none opacity-50' : ''}`}>
              <ImagePlus size={20} aria-hidden="true" />
              <span className="sr-only">{t('addPhoto')}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) upload.mutate(file); }} />
            </label>
          ) : null}
        </div>
        <p className="text-xs text-[var(--color-muted)]">{t('photosHint')}</p>
      </div>

      {save.error ? <Alert tone="error">{apiMessage(save.error)}</Alert> : null}

      <div>
        <Button loading={save.isPending} type="submit" disabled={upload.isPending}>{t('submit')}</Button>
      </div>
    </form>
  );
}