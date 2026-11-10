import { Camera, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { DuplicateNote } from './DuplicateNote';

interface BarcodeScanSheetProps {
  /** Barkod türü seçenekleri (okunan biçim buradaki değerle eşleşirse tür de seçilir). */
  typeValues: string[];
  onUse: (code: string, type: string | null) => void;
  onClose: () => void;
}

/** zxing biçim adı → formdaki barkod türü. */
const FORMAT_TO_TYPE: Record<string, string> = {
  EAN_13: 'EAN13',
  EAN_8: 'EAN8',
  UPC_A: 'UPC',
  UPC_E: 'UPC',
  CODE_39: 'CODE39',
  CODE_93: 'CODE93',
  CODE_128: 'CODE128',
};

type Phase =
  | { kind: 'starting' }
  | { kind: 'scanning' }
  | { kind: 'found'; code: string; type: string | null }
  | { kind: 'error'; message: string };

/** Kamera hatasını kullanıcıya anlaşılır bir cümleye çevirir. */
function cameraMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Kamera izni verilmedi. Adres çubuğundaki kamera simgesinden izin verin ya da barkodu elle yazın.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'Bu cihazda kamera bulunamadı. Barkodu elle yazabilirsiniz.';
  if (name === 'NotReadableError') return 'Kamera başka bir uygulama tarafından kullanılıyor.';
  if (!window.isSecureContext) return 'Kamera yalnızca güvenli (https) bağlantıda çalışır.';
  return 'Kamera açılamadı. Barkodu elle yazabilirsiniz.';
}

/**
 * Kamerayla barkod okuma penceresi (telefonda da bilgisayarda da). Kamera açılır, barkod görününce
 * okunur; sonra "Doğru mu?" ekranı gelir: kullanıcı değeri düzeltebilir, "Tekrar Tara" diyebilir ya
 * da "Kullan" ile barkod kutusunu doldurur. Okuyucu (zxing) ilk açılışta yüklenir; ana pakete girmez.
 */
export function BarcodeScanSheet({ typeValues, onUse, onClose }: BarcodeScanSheetProps) {
  const video = useRef<HTMLVideoElement>(null);
  const stop = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'starting' });
  const [attempt, setAttempt] = useState(0);
  const [edited, setEdited] = useState('');

  const release = useCallback(() => {
    stop.current?.();
    stop.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('kamera yok');
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all(
          [import('@zxing/browser'), import('@zxing/library')],
        );
        if (cancelled || !video.current) return;
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
        ]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          video.current,
          (result) => {
            if (!result || cancelled) return;
            const format = BarcodeFormat[result.getBarcodeFormat()];
            const type = FORMAT_TO_TYPE[format] ?? null;
            release();
            navigator.vibrate?.(30);
            setEdited(result.getText());
            setPhase({ kind: 'found', code: result.getText(), type });
          },
        );
        if (cancelled) controls.stop();
        else {
          stop.current = () => controls.stop();
          setPhase({ kind: 'scanning' });
        }
      } catch (error) {
        if (!cancelled) setPhase({ kind: 'error', message: cameraMessage(error) });
      }
    })();
    return () => {
      cancelled = true;
      release();
    };
  }, [attempt, release]);

  const retry = () => {
    setPhase({ kind: 'starting' });
    setAttempt((n) => n + 1);
  };
  const found = phase.kind === 'found' ? phase : null;
  const finalType = found?.type && typeValues.includes(found.type) ? found.type : null;

  return (
    <Sheet
      open
      onClose={onClose}
      title="Barkod Tara"
      description="Barkodu kameraya tutun; okununca doğrulamanızı isteriz."
      size="md"
    >
      <div className="flex flex-col gap-4">
        {phase.kind === 'error' ? <Alert tone="error">{phase.message}</Alert> : null}

        {found ? null : (
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-ink">
            <video
              ref={video}
              muted
              playsInline
              aria-label="Kamera görüntüsü"
              className="size-full object-cover"
            />
            {phase.kind === 'scanning' ? (
              // Hedef çerçeve + tarama çizgisi
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <span className="relative h-2/5 w-4/5 rounded-2xl border-2 border-white/80">
                  <span className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-brand-500" />
                </span>
              </span>
            ) : null}
            {phase.kind === 'starting' ? (
              <span className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-semibold text-white">
                <Camera className="size-5" aria-hidden="true" />
                Kamera açılıyor…
              </span>
            ) : null}
          </div>
        )}

        {found ? (
          <div role="group" aria-label="Okunan barkod" className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-ink-muted">Doğru mu?</p>
            <TextField
              label={finalType ? `Okunan Barkod (${finalType})` : 'Okunan Barkod'}
              value={edited}
              inputMode="numeric"
              onChange={(e) => setEdited(e.target.value)}
            />
            <DuplicateNote kind="barcode" value={edited} />
            <p className="text-sm text-ink-muted">
              Yanlışsa değiştirebilir ya da tekrar tarayabilirsiniz.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button
                flow={false}
                disabled={edited.trim() === ''}
                onClick={() => onUse(edited.trim(), finalType)}
              >
                Kullan
              </Button>
              <Button
                variant="outline"
                flow={false}
                onClick={retry}
                leadingIcon={<RefreshCw className="size-5" aria-hidden="true" />}
              >
                Tekrar Tara
              </Button>
            </div>
          </div>
        ) : phase.kind === 'error' ? (
          <Button
            variant="outline"
            flow={false}
            onClick={retry}
            leadingIcon={<RefreshCw className="size-5" aria-hidden="true" />}
          >
            Tekrar Dene
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}
