'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, CardBody, Spinner } from '@/components/ui';
import { apiMessage } from '@/lib/api/browser-api';
import { orderApi } from '@/lib/api/order-api';

const terminal = new Set(['paid', 'cancelled', 'failed']);

export function BkashRecovery({ locale }) {
  const search = useSearchParams();
  const [record, setRecord] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const callbackStatus = search.get('status');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(sessionStorage.getItem('ee_bkash_recovery') || 'null');
        setRecord(stored);
        if (!stored) setChecking(false);
      } catch {
        setChecking(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const recover = useCallback(async () => {
    if (!record) return;
    setChecking(true);
    setError('');
    try {
      const next = await orderApi.recoverBkash({
        attemptId: record.attemptId,
        recoveryToken: record.recoveryToken,
        callbackStatus: ['success', 'failure', 'cancel'].includes(callbackStatus) ? callbackStatus : null
      });
      setResult(next);
      if (terminal.has(next.state)) sessionStorage.removeItem('ee_bkash_recovery');
    } catch (caught) {
      setError(apiMessage(caught, 'Payment status could not be checked.'));
    } finally {
      setChecking(false);
    }
  }, [callbackStatus, record]);

  useEffect(() => {
    if (!record) return;
    const timer = window.setTimeout(recover, 0);
    return () => window.clearTimeout(timer);
  }, [record, recover]);

  useEffect(() => {
    if (!result || terminal.has(result.state)) return;
    const timer = window.setTimeout(recover, 5000);
    return () => window.clearTimeout(timer);
  }, [recover, result]);

  if (!record && !checking) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardBody className="grid place-items-center text-center">
          <h1 className="text-2xl font-bold">No payment to recover</h1>
          <p className="mt-2 text-[var(--color-muted)]">Return to checkout to start a new bKash payment.</p>
          <Button asChild className="mt-5">
            <Link href={`/${locale}/checkout`}>Return to checkout</Link>
          </Button>
        </CardBody>
      </Card>
    );
  }

  const state = result?.state || 'checking';
  return (
    <Card className="mx-auto max-w-xl">
      <CardBody className="grid place-items-center text-center">
        <p className="text-sm uppercase tracking-widest text-[var(--color-primary)]">bKash payment</p>
        <h1 className="mt-2 text-3xl font-black">
          {state === 'paid' ? 'Payment confirmed' : state === 'cancelled' ? 'Payment cancelled' : state === 'failed' ? 'Payment failed' : 'Checking payment'}
        </h1>
        <p className="mt-3 text-[var(--color-muted)]">
          {result?.orderReference || record?.orderReference}{state === 'checking' ? ' · This may take a moment.' : ''}
        </p>
        {checking ? <Spinner className="mt-4 text-[var(--color-primary)]" /> : null}
        {error ? <div className="mt-5 w-full"><Alert tone="error">{error}</Alert></div> : null}
        <div className="mt-6 flex justify-center gap-3">
          {state === 'paid' ? (
            <Button asChild><Link href={`/${locale}/order/success/${result.orderReference}`}>View order</Link></Button>
          ) : terminal.has(state) ? (
            <Button asChild><Link href={`/${locale}/checkout`}>Return to checkout</Link></Button>
          ) : (
            <Button loading={checking} onClick={recover}>Check again</Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}