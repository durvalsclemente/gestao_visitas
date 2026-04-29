import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';

interface SignaturePadProps {
  /** Data URL atual da assinatura (vazio = limpo). */
  value: string;
  onChange: (dataUrl: string) => void;
  height?: number;
  helperText?: string;
}

/**
 * Pad de assinatura simples baseado em <canvas>.
 * Funciona com mouse, dedo (touch) e stylus via Pointer Events.
 * Devolve PNG como data URL no `onChange` ao soltar o ponteiro.
 */
export function SignaturePad({
  value,
  onChange,
  height = 180,
  helperText,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  // Restaura a imagem quando `value` chega de fora (ex.: rascunho carregado).
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height);
      img.src = value;
    }
  }, [value]);

  const getRelativePoint = (e: PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  };

  const startDraw = (e: PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = getRelativePoint(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1F2937';
    setDrawing(true);
  };

  const moveDraw = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = getRelativePoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const endDraw = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    canvasRef.current?.releasePointerCapture(e.pointerId);
    setDrawing(false);
    const c = canvasRef.current!;
    onChange(c.toDataURL('image/png'));
  };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    onChange('');
  };

  return (
    <Box>
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: '#fff',
          touchAction: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={height * 2}
          style={{ width: '100%', height, display: 'block', cursor: 'crosshair' }}
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
          onPointerLeave={endDraw}
          aria-label="Área para assinatura digital"
          role="img"
        />
      </Box>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
        <Button
          size="small"
          startIcon={<ClearIcon />}
          onClick={clear}
          disabled={!value}
          aria-label="Limpar assinatura"
        >
          Limpar
        </Button>
        {helperText && (
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
