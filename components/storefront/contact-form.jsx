'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, Card, CardBody, Field, FieldGroup, Input, Textarea } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { isBangladeshiPhone } from '@/lib/utils';
import { pushToast, successToast, errorToast } from '@/components/ui/toast';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone: z.string().trim().refine((value) => !value || isBangladeshiPhone(value), 'Enter a valid Bangladeshi phone number'),
  email: z.string().trim().email('Enter a valid email address').or(z.literal('')),
  subject: z.string().trim().min(2, 'Subject must be at least 2 characters').max(180, 'Subject must be 180 characters or fewer'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(5000, 'Message must be 5000 characters or fewer'),
});

export function ContactForm() {
  const form = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', phone: '', email: '', subject: '', message: '' },
  });

  async function submit(values) {
    try {
      await browserApi.post('/contact', values);
      successToast('Message sent', 'Our team will respond using the contact details provided.');
      form.reset();
    } catch (caught) {
      errorToast('Message not sent', apiMessage(caught, 'Could not send your message'));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <Card>
        <CardBody className="grid gap-4">
          <Field label="Name" required error={form.formState.errors.name?.message}>
            <Input autoComplete="name" required {...form.register('name')} />
          </Field>
          <FieldGroup columns={2}>
            <Field label="Phone" error={form.formState.errors.phone?.message}>
              <Input inputMode="tel" autoComplete="tel" {...form.register('phone')} />
            </Field>
            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" {...form.register('email')} />
            </Field>
          </FieldGroup>
          <Field label="Subject" required error={form.formState.errors.subject?.message}>
            <Input required minLength={2} {...form.register('subject')} />
          </Field>
          <Field label="Message" required error={form.formState.errors.message?.message}>
            <Textarea required minLength={10} maxLength={5000} rows={6} {...form.register('message')} />
          </Field>
          {form.formState.errors.root?.message ? <Alert tone="error">{form.formState.errors.root.message}</Alert> : null}
          <div>
            <Button loading={form.formState.isSubmitting}>Send message</Button>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}