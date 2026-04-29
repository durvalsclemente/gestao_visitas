import {
  Box,
  Button,
  Chip,
  FormControl,
  FormHelperText,
  FormLabel,
  Stack,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useId, useRef, useState, type DragEvent } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

interface Props<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  /** ex.: 'image/*,application/pdf' */
  accept?: string;
  multiple?: boolean;
  /** Tamanho máximo por arquivo, em bytes. */
  maxSize?: number;
  helperText?: string;
  required?: boolean;
}

/**
 * Upload com drag-and-drop. Armazena `File[]` no form value
 * (sempre array, mesmo no modo single — facilita o consumo).
 * O envio em si fica para o caller (axios FormData).
 */
export function FormFileUpload<T extends FieldValues>({
  name,
  control,
  label,
  accept,
  multiple = false,
  maxSize,
  helperText,
  required,
}: Props<T>) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateFiles = (files: File[]): string | null => {
    if (maxSize) {
      const oversized = files.find((f) => f.size > maxSize);
      if (oversized) {
        return `Arquivo "${oversized.name}" excede o limite de ${formatSize(maxSize)}.`;
      }
    }
    return null;
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const value = (field.value as File[] | undefined) ?? [];
        const errorMessage = localError ?? fieldState.error?.message;

        const setFiles = (incoming: FileList | null) => {
          if (!incoming) return;
          const arr = Array.from(incoming);
          const err = validateFiles(arr);
          if (err) {
            setLocalError(err);
            return;
          }
          setLocalError(null);
          field.onChange(multiple ? [...value, ...arr] : arr.slice(0, 1));
        };

        const removeAt = (idx: number) => {
          const next = value.filter((_, i) => i !== idx);
          field.onChange(next);
        };

        const handleDrop = (e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setDragActive(false);
          setFiles(e.dataTransfer.files);
        };

        return (
          <FormControl error={!!errorMessage} fullWidth required={required}>
            <FormLabel htmlFor={inputId} sx={{ mb: 1, fontWeight: 500 }}>
              {label}
            </FormLabel>
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              sx={{
                border: '2px dashed',
                borderColor: errorMessage
                  ? 'error.main'
                  : dragActive
                    ? 'primary.main'
                    : 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: dragActive ? 'action.hover' : 'background.default',
                transition: 'all .15s ease',
              }}
            >
              <CloudUploadIcon color="action" sx={{ fontSize: 36, mb: 1 }} aria-hidden />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Arraste arquivos aqui ou
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => inputRef.current?.click()}
                aria-controls={inputId}
              >
                Selecionar arquivos
              </Button>
              <input
                id={inputId}
                ref={inputRef}
                type="file"
                hidden
                accept={accept}
                multiple={multiple}
                onChange={(e) => setFiles(e.target.files)}
                onBlur={field.onBlur}
                aria-required={required ? 'true' : undefined}
                aria-invalid={!!errorMessage}
              />
              {accept && (
                <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                  Tipos aceitos: {accept}
                </Typography>
              )}
              {maxSize && (
                <Typography variant="caption" display="block" color="text.secondary">
                  Tamanho máximo por arquivo: {formatSize(maxSize)}
                </Typography>
              )}
            </Box>

            {value.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                {value.map((f, i) => (
                  <Chip
                    key={`${f.name}-${i}`}
                    label={`${f.name} (${formatSize(f.size)})`}
                    onDelete={() => removeAt(i)}
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}

            {(errorMessage || helperText) && (
              <FormHelperText>{errorMessage ?? helperText}</FormHelperText>
            )}
          </FormControl>
        );
      }}
    />
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
