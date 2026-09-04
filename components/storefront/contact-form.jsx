'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Button, Card, CardBody, Field, FieldGroup, Input, Textarea } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const form = useForm({ defaultValues: { name: '', phone: '', email: '', subject: '', message: '' } });

  async function submit(values) {
    setError('');
    try {
      await browserApi.post('/contact', values);
      setSent(true);
      form.reset();
    } catch (caught) {
      setError(apiMessage(caught));
    }
  }

  if (sent) {
    return (
      <Card>
        <CardBody>
          <Alert>Your message was received. Our team will respond using the contact details provided.</Alert>
          <Button className="mt-5" variant="secondary" onClick={() => setSent(false)}>Send another message</Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <Card>
        <CardBody className="grid gap-4">
          <Field label="Name" required>
            <Input autoComplete="name" required {...form.register('name')} />
          </Field>
          <FieldGroup columns={2}>
            <Field label="Phone">
              <Input inputMode="tel" autoComplete="tel" {...form.register('phone')} />
            </Field>
            <Field label="Email">
              <Input type="email" autoComplete="email" {...form.register('email')} />
            </Field>
          </FieldGroup>
          <Field label="Subject" required>
            <Input required minLength={2} {...form.register('subject')} />
          </Field>
          <Field label="Message" required>
            <Textarea required minLength={10} rows={6} {...form.register('message')} />
          </Field>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div>
            <Button loading={form.formState.isSubmitting}>Send message</Button>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}