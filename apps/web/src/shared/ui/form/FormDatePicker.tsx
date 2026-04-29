import { DatePicker, type DatePickerProps } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

type Props<T extends FieldValues> = Omit<DatePickerProps<Dayjs>, 'value' | 'onChange'> & {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  helperText?: string;
};

/**
 * Aceita Date | string ISO | Dayjs no form value e devolve sempre
 * uma string ISO (yyyy-mm-dd) — facilita serialização ao backend.
 */
export function FormDatePicker<T extends FieldValues>({
  name,
  control,
  required,
  helperText,
  ...rest
}: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const value = field.value ? dayjs(field.value as string | Date) : null;
        return (
          <DatePicker
            {...rest}
            value={value}
            onChange={(d) => field.onChange(d ? d.format('YYYY-MM-DD') : '')}
            slotProps={{
              textField: {
                fullWidth: true,
                required,
                error: !!fieldState.error,
                helperText: fieldState.error?.message ?? helperText,
                onBlur: field.onBlur,
                inputProps: {
                  'aria-required': required ? 'true' : undefined,
                  'aria-invalid': !!fieldState.error,
                },
              },
            }}
          />
        );
      }}
    />
  );
}
