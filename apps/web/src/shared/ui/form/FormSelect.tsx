import { MenuItem, TextField, type TextFieldProps } from '@mui/material';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

type Props<T extends FieldValues> = Omit<
  TextFieldProps,
  'name' | 'select' | 'error' | 'helperText'
> & {
  name: FieldPath<T>;
  control: Control<T>;
  options: SelectOption[];
  helperText?: string;
  /** Mostra item "Selecione…" no topo. */
  withEmptyOption?: boolean;
  emptyOptionLabel?: string;
};

export function FormSelect<T extends FieldValues>({
  name,
  control,
  options,
  helperText,
  required,
  withEmptyOption = false,
  emptyOptionLabel = 'Selecione…',
  ...rest
}: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...rest}
          {...field}
          value={field.value ?? ''}
          select
          required={required}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
          fullWidth={rest.fullWidth ?? true}
          SelectProps={{
            ...rest.SelectProps,
            displayEmpty: withEmptyOption,
          }}
        >
          {withEmptyOption && (
            <MenuItem value="">
              <em>{emptyOptionLabel}</em>
            </MenuItem>
          )}
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}
