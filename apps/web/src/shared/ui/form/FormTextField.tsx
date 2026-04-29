import { TextField, type TextFieldProps } from '@mui/material';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

type Props<T extends FieldValues> = Omit<TextFieldProps, 'name' | 'error' | 'helperText'> & {
  name: FieldPath<T>;
  control: Control<T>;
  helperText?: string;
};

export function FormTextField<T extends FieldValues>({
  name,
  control,
  helperText,
  required,
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
          required={required}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
          fullWidth={rest.fullWidth ?? true}
          inputProps={{
            ...rest.inputProps,
            'aria-required': required ? 'true' : undefined,
            'aria-invalid': !!fieldState.error,
          }}
        />
      )}
    />
  );
}
