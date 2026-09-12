'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Button } from './button';
import { Field } from './input';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

export function ImageUpload({
  value = [],
  onChange,
  max = 10,
  multiple = true,
  label = 'Images',
  hint,
  error,
  disabled = false,
  uploading = false,
  onUpload,
  className,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState([]);

  function createPreview(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  const processFiles = useCallback(
    async (files) => {
      const remaining = max - value.length;
      if (remaining <= 0) return;
      const toUpload = Array.from(files).slice(0, remaining);

      const newPreviews = await Promise.all(toUpload.map((f) => createPreview(f)));
      setPreviews((prev) => [...prev, ...newPreviews]);

      if (onUpload) {
        const results = await Promise.all(toUpload.map((f) => onUpload(f)));
        onChange?.([...value, ...results]);
        setPreviews([]);
      } else {
        onChange?.([
          ...value,
          ...toUpload.map((f) => ({ file: f, preview: newPreviews[toUpload.indexOf(f)] })),
        ]);
      }
    },
    [value, max, onChange, onUpload],
  );

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    processFiles(e.dataTransfer.files);
  }

  function handlePicker(files) {
    if (!files?.length) return;
    processFiles(files);
  }

  function remove(index) {
    const next = value.filter((_, i) => i !== index);
    onChange?.(next);
  }

  function clearAll() {
    onChange?.([]);
    setPreviews([]);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className={cn('grid gap-3', className)}>
      <label className="text-sm font-semibold">{label}</label>
      <div
        className={cn(
          'relative grid min-h-36 place-items-center rounded-lg border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-center transition hover:border-[var(--color-primary)]',
          dragOver && 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]',
          (disabled || value.length >= max) && 'pointer-events-none opacity-50',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label={`Upload ${multiple ? 'images' : 'an image'}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={(e) => handlePicker(e.target.files)}
          disabled={disabled || value.length >= max}
          className="sr-only"
        />
        <div className="flex flex-col items-center gap-2 py-6">
          {uploading ? (
            <Loader2 size={28} className="animate-spin text-[var(--color-primary)]" />
          ) : (
            <Upload size={24} className="text-[var(--color-muted)]" />
          )}
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {uploading ? 'Uploading…' : 'Click or drag images here'}
          </span>
          {hint && <span className="text-xs text-[var(--color-muted)]">{hint}</span>}
        </div>
      </div>

      {value.length > 0 || previews.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {previews.map((src, i) => (
            <div key={`preview-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-[var(--color-border)]">
              <Image src={src} alt={`Upload preview ${i + 1}`} className="size-full object-cover" width={100} height={100} />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-white" />
              </div>
            </div>
          ))}
          {value.map((item, i) => (
            <div key={item.id || i} className="relative group aspect-square rounded-lg overflow-hidden border border-[var(--color-border)]">
               <Image src={item.url || item.preview} alt={item.alt || `Image ${i + 1}`} className="size-full object-cover" width={100} height={100} />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); }}>Edit</Button>
                <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); remove(i); }}>
                  <X size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {value.length > 0 ? (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={clearAll} disabled={disabled}>
            Clear all
          </Button>
          <span className="text-xs text-[var(--color-muted)] self-center">{value.length}/{max}</span>
        </div>
      ) : null}
    </div>
  );
}