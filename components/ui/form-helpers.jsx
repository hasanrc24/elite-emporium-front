'use client';

import { Controller } from 'react-hook-form';
import { CheckboxField, RadioGroup, SwitchField } from './choice';
import { Input, Textarea } from './input';
import { Combobox, MultiSelect, NativeSelect } from './select';
import { OTPInput } from './otp';
import { DatePicker } from './date-picker';

/** React Hook Form adapter for boolean and array-valued Radix checkboxes. */
export function ControlledCheckbox({ name, control, rules, defaultValue = false, value: optionValue, ...props }) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      defaultValue={defaultValue}
      render={({ field, fieldState }) => {
        const isGroup = optionValue !== undefined;
        const checked = isGroup ? Array.isArray(field.value) && field.value.includes(optionValue) : field.value === true;
        return (
          <CheckboxField
            {...props}
            ref={field.ref}
            name={field.name}
            checked={checked}
            onCheckedChange={(nextChecked) => {
              if (!isGroup) return field.onChange(nextChecked === true);
              const current = Array.isArray(field.value) ? field.value : [];
              field.onChange(nextChecked === true
                ? Array.from(new Set([...current, optionValue]))
                : current.filter((item) => item !== optionValue));
            }}
            onBlur={field.onBlur}
            error={props.error || fieldState.error?.message}
          />
        );
      }}
    />
  );
}

export function ControlledSwitch({ name, control, rules, defaultValue = false, ...props }) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      defaultValue={defaultValue}
      render={({ field, fieldState }) => (
        <SwitchField {...props} ref={field.ref} name={field.name} checked={field.value === true} onCheckedChange={(value) => field.onChange(value === true)} onBlur={field.onBlur} error={props.error || fieldState.error?.message} />
      )}
    />
  );
}

export function ControlledRadioGroup({ name, control, rules, defaultValue = '', children, ...props }) {
  return (
    <Controller name={name} control={control} rules={rules} defaultValue={defaultValue} render={({ field, fieldState }) => (
      <RadioGroup {...props} ref={field.ref} name={field.name} value={field.value ?? ''} onValueChange={field.onChange} onBlur={field.onBlur} aria-invalid={fieldState.invalid || undefined}>{children}</RadioGroup>
    )} />
  );
}

export function ControlledOTPInput({ name, control, rules, defaultValue = '', ...props }) {
  return <Controller name={name} control={control} rules={rules} defaultValue={defaultValue} render={({ field, fieldState }) => <OTPInput {...props} value={field.value ?? ''} onChange={field.onChange} invalid={props.invalid ?? fieldState.invalid} />} />;
}

export function ControlledInput({ name, control, rules, defaultValue = '', ...props }) {
  return <Controller name={name} control={control} rules={rules} defaultValue={defaultValue} render={({ field, fieldState }) => <Input {...props} {...field} value={field.value ?? ''} invalid={props.invalid ?? fieldState.invalid} />} />;
}

export function ControlledTextarea({ name, control, rules, defaultValue = '', ...props }) {
  return <Controller name={name} control={control} rules={rules} defaultValue={defaultValue} render={({ field, fieldState }) => <Textarea {...props} {...field} value={field.value ?? ''} invalid={props.invalid ?? fieldState.invalid} />} />;
}

export function ControlledNativeSelect({ name, control, rules, defaultValue = '', parseValue, ...props }) {
  return <Controller name={name} control={control} rules={rules} defaultValue={defaultValue} render={({ field, fieldState }) => <NativeSelect {...props} {...field} value={field.value ?? ''} onChange={(event) => field.onChange(parseValue ? parseValue(event.target.value) : event.target.value)} invalid={props.invalid ?? fieldState.invalid} />} />;
}

export function ControlledCombobox({ name, control, rules, defaultValue = '', ...props }) {
  return <Controller name={name} control={control} rules={rules} defaultValue={defaultValue} render={({ field, fieldState }) => <Combobox {...props} name={field.name} value={field.value ?? ''} onChange={field.onChange} invalid={props.invalid ?? fieldState.invalid} />} />;
}

export function ControlledMultiSelect({ name, control, rules, defaultValue = [], ...props }) {
  return <Controller name={name} control={control} rules={rules} defaultValue={defaultValue} render={({ field, fieldState }) => <MultiSelect {...props} value={field.value ?? []} onChange={field.onChange} invalid={props.invalid ?? fieldState.invalid} />} />;
}

export function ControlledDatePicker({ name, control, rules, defaultValue = '', ...props }) {
  return <Controller name={name} control={control} rules={rules} defaultValue={defaultValue} render={({ field, fieldState }) => <DatePicker {...props} name={field.name} value={field.value ?? ''} onChange={field.onChange} invalid={props.invalid ?? fieldState.invalid} />} />;
}
