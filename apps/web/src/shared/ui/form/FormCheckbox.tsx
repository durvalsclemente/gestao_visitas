import { Checkbox, FormControl, FormControlLabel, FormHelperText } from '@mui/material';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

interface Props<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: React.ReactNode;
  helperText?: string;
  disabled?: boolean;
}

export function FormCheckbox<T extends FieldValues>({
  name,
  control,
  label,
  helperText,
  disabled,
}: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl error={!!fieldState.error} disabled={disabled}>
          <FormControlLabel
            control={
              <Checkbox
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                onBlur={field.onBlur}
                inputProps={{
                  'aria-invalid': !!fieldState.error,
                }}
              />
            }
            label={label}
          />
          {(fieldState.error?.message || helperText) && (
            <FormHelperText sx={{ ml: 4, mt: -0.5 }}>
              {fieldState.error?.message ?? helperText}
            </FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}
