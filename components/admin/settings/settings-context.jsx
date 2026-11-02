'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { pushToast } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { invalidateStorefrontSettings } from '@/app/actions/revalidate-settings';
import { tokenManager } from '@/lib/auth/token-manager';
import { useUnsavedGuard } from '../products/use-unsaved-guard';
import { SETTINGS_SECTIONS, isEqual, mapServerErrors, sectionGroups, setPath, validateGroup, validateMethod } from './settings-schema';

const GROUPS_KEY = ['admin', 'settings-groups'];
const SHIPPING_KEY = ['admin', 'shipping'];

const SettingsContext = createContext(null);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside SettingsProvider.');
  return context;
}

function methodPayload({ id: _id, version, archivedAt: _archivedAt, ...method }) {
  return {
    ...method,
    flatRate: new Decimal(method.flatRate).toFixed(2),
    freeThreshold: method.freeThreshold ? new Decimal(method.freeThreshold).toFixed(2) : null,
    displayOrder: Number(method.displayOrder) || 0,
    version: Number(version)
  };
}

const withoutKey = (record, key) => {
  if (!(key in record)) return record;
  const { [key]: _removed, ...rest } = record;
  return rest;
};

export function SettingsProvider({ children }) {
  const client = useQueryClient();
  const router = useRouter();
  const groupsQuery = useQuery({ queryKey: GROUPS_KEY, queryFn: () => browserApi.get('/admin/settings').then((response) => response.data.data) });
  const shippingQuery = useQuery({ queryKey: SHIPPING_KEY, queryFn: () => browserApi.get('/admin/shipping').then((response) => response.data.data) });

  const [groupDrafts, setGroupDrafts] = useState({});
  const [methodDrafts, setMethodDrafts] = useState({});
  // Keyed by group key, or `method:<id>` for delivery methods.
  const [serverErrors, setServerErrors] = useState({});
  const [failures, setFailures] = useState({});
  const [saving, setSaving] = useState(false);
  const [focusTarget, setFocusTarget] = useState(null);
  // Shown in the save bar rather than a toast, so nothing covers the Save button.
  const [saveNotice, setSaveNotice] = useState(null);

  const groups = useMemo(() => Object.fromEntries((groupsQuery.data || []).map((group) => [group.key, group])), [groupsQuery.data]);
  const values = useMemo(() => Object.fromEntries(Object.entries(groups).map(([key, group]) => [key, groupDrafts[key] ?? group.value])), [groups, groupDrafts]);
  const methods = useMemo(() => (shippingQuery.data?.methods || []).filter((method) => !method.archivedAt), [shippingQuery.data]);
  const methodValues = useMemo(() => methods.map((method) => methodDrafts[method.id] ?? method), [methods, methodDrafts]);

  const dirtyGroups = useMemo(() => Object.keys(groupDrafts).filter((key) => groups[key] && !isEqual(groupDrafts[key], groups[key].value)), [groupDrafts, groups]);
  const dirtyMethods = useMemo(() => methods.filter((method) => methodDrafts[method.id] && !isEqual(methodDrafts[method.id], method)).map((method) => method.id), [methods, methodDrafts]);
  const isDirty = dirtyGroups.length > 0 || dirtyMethods.length > 0;

  // Client checks run only on edited groups, so untouched legacy values never block a save elsewhere.
  const clientErrors = useMemo(() => {
    const result = {};
    for (const key of dirtyGroups) {
      const errors = validateGroup(key, values[key]);
      if (Object.keys(errors).length) result[key] = errors;
    }
    for (const id of dirtyMethods) {
      const errors = validateMethod(methodDrafts[id]);
      if (Object.keys(errors).length) result[`method:${id}`] = errors;
    }
    return result;
  }, [dirtyGroups, dirtyMethods, values, methodDrafts]);

  const errorsFor = useCallback((key) => ({ ...(serverErrors[key] || {}), ...(clientErrors[key] || {}) }), [serverErrors, clientErrors]);
  const errorCount = Object.values(clientErrors).reduce((total, errors) => total + Object.keys(errors).length, 0);

  const clearServerError = (key, path) => setServerErrors((current) => (current[key]?.[path] ? { ...current, [key]: withoutKey(current[key], path) } : current));

  const setValue = useCallback((group, path, next) => {
    setGroupDrafts((current) => ({ ...current, [group]: setPath(current[group] ?? groups[group]?.value, path, next) }));
    clearServerError(group, path);
    setSaveNotice(null);
  }, [groups]);

  const setMethod = useCallback((id, patch) => {
    const server = methods.find((method) => method.id === id);
    setMethodDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? server), ...patch } }));
    for (const path of Object.keys(patch)) clearServerError(`method:${id}`, path);
    setSaveNotice(null);
  }, [methods]);

  const discard = useCallback(() => {
    setSaveNotice(null);
    setGroupDrafts({});
    setMethodDrafts({});
    setServerErrors({});
    setFailures({});
  }, []);

  /** Drops one card's draft and reloads it, after another admin saved a newer version. */
  const reload = useCallback(async (key) => {
    if (key.startsWith('method:')) {
      setMethodDrafts((current) => withoutKey(current, key.slice(7)));
      await shippingQuery.refetch();
    } else {
      setGroupDrafts((current) => withoutKey(current, key));
      await groupsQuery.refetch();
    }
    setServerErrors((current) => withoutKey(current, key));
    setFailures((current) => withoutKey(current, key));
  }, [groupsQuery, shippingQuery]);

  const save = useCallback(async () => {
    if (!isDirty || saving) return;
    if (errorCount) {
      setSaveNotice(`${errorCount} field${errorCount === 1 ? ' needs' : 's need'} attention before saving.`);
      setFocusTarget({ firstError: true, at: Date.now() });
      return;
    }
    setSaveNotice(null);
    setSaving(true);
    const tasks = [
      ...dirtyGroups.map((key) => {
        const sent = groupDrafts[key];
        return {
          key,
          run: () => browserApi.put(`/admin/settings/${key}`, { value: sent, version: Number(groups[key].version) }).then((response) => response.data.data),
          apply: (saved) => {
            client.setQueryData(GROUPS_KEY, (list) => list?.map((group) => (group.key === key ? saved : group)));
            setGroupDrafts((current) => (current[key] === sent ? withoutKey(current, key) : current));
          }
        };
      }),
      ...dirtyMethods.map((id) => {
        const sent = methodDrafts[id];
        return {
          key: `method:${id}`,
          run: () => browserApi.patch(`/admin/shipping/methods/${id}`, methodPayload(sent)).then((response) => response.data.data),
          apply: (saved) => {
            client.setQueryData(SHIPPING_KEY, (data) => (data ? { ...data, methods: data.methods.map((method) => (method.id === id ? saved : method)) } : data));
            setMethodDrafts((current) => (current[id] === sent ? withoutKey(current, id) : current));
          }
        };
      })
    ];
    const results = await Promise.allSettled(tasks.map((task) => task.run()));
    const nextErrors = {};
    const nextFailures = {};
    let saved = 0;
    results.forEach((result, index) => {
      const task = tasks[index];
      if (result.status === 'fulfilled') {
        task.apply(result.value);
        saved += 1;
        return;
      }
      const error = result.reason;
      const conflict = error?.response?.status === 409;
      nextFailures[task.key] = { conflict, message: conflict ? 'Someone else saved changes here while you were editing.' : apiMessage(error, 'These settings could not be saved.') };
      const fieldErrors = error?.response?.data?.error?.fieldErrors;
      if (fieldErrors) nextErrors[task.key] = task.key.startsWith('method:') ? Object.fromEntries(Object.entries(fieldErrors).map(([path, messages]) => [path, Array.isArray(messages) ? messages[0] : messages])) : mapServerErrors(task.key, fieldErrors);
    });
    setServerErrors(nextErrors);
    setFailures(nextFailures);
    setSaving(false);

    const failed = tasks.length - saved;
    if (failed) {
      setSaveNotice(`${saved ? 'Some changes were saved, but ' : ''}${failed} card${failed === 1 ? '' : 's'} could not be saved. See the details on the page.`);
      setFocusTarget({ firstError: true, at: Date.now() });
    } else {
      pushToast({ tone: 'success', title: 'Settings saved', description: 'Your changes are live on the storefront.', duration: 3500 });
    }
    if (saved) {
      client.invalidateQueries({ queryKey: ['storefront-settings'] });
      // Store name and logo in the admin shell come from cached public settings.
      await invalidateStorefrontSettings(tokenManager.get()).catch(() => undefined);
      router.refresh();
    }
  }, [isDirty, saving, errorCount, dirtyGroups, dirtyMethods, groupDrafts, methodDrafts, groups, client, router]);

  // Ctrl/Cmd + S saves from anywhere in settings.
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; }, [save]);
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const { dialog: leaveDialog } = useUnsavedGuard(isDirty, {
    description: 'You have unsaved settings. If you leave now they will be lost.',
    allowPath: (pathname) => pathname === '/admin/settings' || pathname.startsWith('/admin/settings/')
  });

  const dirtySections = useMemo(() => {
    const dirty = new Set(dirtyGroups);
    return new Set(SETTINGS_SECTIONS.filter((section) => sectionGroups(section).some((group) => dirty.has(group)) || (section.id === 'shipping' && dirtyMethods.length)).map((section) => section.id));
  }, [dirtyGroups, dirtyMethods]);

  const value = {
    groupsQuery,
    shippingQuery,
    groups,
    values,
    methods: methodValues,
    zones: shippingQuery.data?.zones || [],
    setValue,
    setMethod,
    errorsFor,
    failures,
    reload,
    isDirty,
    dirtySections,
    dirtyCount: dirtyGroups.length + dirtyMethods.length,
    isGroupDirty: (key) => dirtyGroups.includes(key),
    isMethodDirty: (id) => dirtyMethods.includes(id),
    saving,
    save,
    saveNotice: isDirty ? saveNotice : null,
    discard,
    focusTarget,
    setFocusTarget
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
      {leaveDialog}
    </SettingsContext.Provider>
  );
}
