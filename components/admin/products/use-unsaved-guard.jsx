'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmAction } from '@/components/ui';

/**
 * Dirty-form leave warning (FE-FORM-001). The App Router has no route-change blocker, so this covers
 * tab close/reload (beforeunload) and in-app link clicks (captured before Next navigates). The browser Back
 * button inside the SPA cannot be intercepted without polluting history, so it is left alone.
 * Render the returned `dialog` somewhere in the tree. `allowPath` lets links that keep the draft alive (for
 * example between sections of one editor) through without a prompt.
 */
export function useUnsavedGuard(isDirty, { title = 'Leave without saving?', description = 'You have unsaved changes on this product. If you leave now they will be lost.', allowPath } = {}) {
  const router = useRouter();
  const [pending, setPending] = useState(null);
  const dirtyRef = useRef(isDirty);
  const allowRef = useRef(allowPath);
  useEffect(() => { dirtyRef.current = isDirty; }, [isDirty]);
  useEffect(() => { allowRef.current = allowPath; }, [allowPath]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    const onClick = (event) => {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (allowRef.current?.(url.pathname)) return;
      event.preventDefault();
      event.stopPropagation();
      setPending(`${url.pathname}${url.search}${url.hash}`);
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', onClick, true);
    };
  }, [isDirty]);

  const dialog = (
    <ConfirmAction
      open={Boolean(pending)}
      onOpenChange={(open) => { if (!open) setPending(null); }}
      title={title}
      description={description}
      confirmLabel="Leave page"
      cancelLabel="Keep editing"
      onConfirm={() => {
        const target = pending;
        dirtyRef.current = false;
        if (target) router.push(target);
      }}
    />
  );
  return { dialog };
}
