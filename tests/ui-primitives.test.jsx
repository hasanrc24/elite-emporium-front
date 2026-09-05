import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useForm } from 'react-hook-form';
import {
  Alert,
  Button,
  Checkbox,
  ControlledCheckbox,
  ControlledSelect,
  DatePicker,
  DateRangePicker,
  ControlledRadioGroup,
  EmptyState,
  Field,
  Input,
  MultiSelect,
  RadioItem,
  Select,
  StatusBadge
} from '@/components/ui';

function ControlledForm({ onSubmit }) {
  const form = useForm({ defaultValues: { active: false, payments: ['cod'], paymentMethod: 'cod', status: 'draft' } });
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <ControlledCheckbox name="active" control={form.control} label="Active" />
      <ControlledCheckbox name="payments" control={form.control} defaultValue={[]} value="cod" label="COD" />
      <ControlledCheckbox name="payments" control={form.control} defaultValue={[]} value="bkash" label="bKash" />
      <ControlledRadioGroup name="paymentMethod" control={form.control}>
        <RadioItem value="cod" label="Cash" />
        <RadioItem value="bkash" label="Mobile payment" />
      </ControlledRadioGroup>
      <ControlledSelect name="status" control={form.control} options={[{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }]} />
      <button type="submit">Save</button>
    </form>
  );
}

describe('UI primitives', () => {
  it('renders Button with size and variant data attributes', () => {
    render(<Button size="sm" variant="danger">Delete</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'danger');
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'sm');
  });

  it('renders Alert with role alert when tone is error', () => {
    render(<Alert tone="error">boom</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('Field wires id and renders hint/error', () => {
    render(
      <Field htmlFor="email" label="Email" hint="we will not spam" error="required">
        <Input id="email" />
      </Field>
    );
    const input = screen.getByLabelText(/Email/);
    expect(input).toBeInTheDocument();
    expect(screen.getAllByRole('alert').some((n) => n.textContent.includes('required'))).toBe(true);
  });

  it('Field generates an accessible label association for its first control', () => {
    render(<Field label="Full name"><Input /></Field>);
    expect(screen.getByLabelText('Full name')).toHaveAttribute('type', 'text');
  });

  it('Checkbox toggles checked state via onCheckedChange', () => {
    const onChange = vi.fn();
    render(<Checkbox aria-label="agree" onCheckedChange={onChange} />);
    fireEvent.click(screen.getByLabelText('agree'));
    expect(onChange).toHaveBeenCalled();
  });

  it('controlled form adapters preserve booleans, checkbox arrays, and radio values', async () => {
    const onSubmit = vi.fn();
    render(<ControlledForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByLabelText('Active'));
    fireEvent.click(screen.getByLabelText('COD'));
    fireEvent.click(screen.getByLabelText('bKash'));
    fireEvent.click(screen.getByLabelText('Mobile payment'));
    fireEvent.click(screen.getByRole('button', { name: 'Draft' }));
    fireEvent.click(screen.getByRole('option', { name: 'Published' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      { active: true, payments: ['bkash'], paymentMethod: 'bkash', status: 'published' },
      expect.anything()
    ));
  });

  it('renders StatusBadge with localized label for known status', () => {
    render(<StatusBadge status="paid" locale="en" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('EmptyState renders title and description', () => {
    render(<EmptyState title="Nothing here" description="Add something" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Add something')).toBeInTheDocument();
  });

  it('DatePicker emits an ISO calendar date', () => {
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select date' }));
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('DateRangePicker keeps preset changes in draft until they are applied', () => {
    const onChange = vi.fn();
    render(<DateRangePicker value={{ from: '', to: '' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select date range' }));
    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Set dates' }));
    expect(onChange).toHaveBeenCalledWith({
      from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    });
  });

  it('Select emits the native-compatible event contract', () => {
    const onChange = vi.fn();
    render(<Select value="pending" onChange={onChange} options={[{ value: 'pending', label: 'Pending', color: '#ef476f' }, { value: 'complete', label: 'Complete', color: '#2fbf71' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pending' }));
    fireEvent.click(screen.getByRole('option', { name: 'Complete' }));
    expect(onChange.mock.calls[0][0].target.value).toBe('complete');
  });

  it('MultiSelect toggles values and exposes selected state', () => {
    const onChange = vi.fn();
    render(<MultiSelect value={['food']} onChange={onChange} options={[{ value: 'food', label: 'Food' }, { value: 'travel', label: 'Travel' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Food' }));
    expect(screen.getByRole('option', { name: 'Food' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('option', { name: 'Travel' }));
    expect(onChange).toHaveBeenCalledWith(['food', 'travel']);
  });
});
