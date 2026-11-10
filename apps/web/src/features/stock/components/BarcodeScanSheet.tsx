import { Camera, Flashlight, FlashlightOff, RefreshCw, SwitchCamera } from 'lucide-react';
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

/** Okuyucunun biçim adı (zxing `EAN_13`, tarayıcı `ean_13`) → formdaki barkod türü. */
const FORMAT_TO_TYPE: Record<string, string> = {
  EAN_13: 'EAN13',
  EAN_8: 'EAN8',
  UPC_A: 'UPC',
  UPC_E: 'UPC',
  CODE_39: 'CODE39',
  CODE_93: 'CODE93',
  CODE_128: 'CODE128',
};
const typeOf = (format: string) => FORMAT_TO_TYPE[format.toUpperCase()] ?? null;

/** Tarayıcının yerleşik okuyucusunun (BarcodeDetector) denenecek biçimleri. */
const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93'];

interface NativeDetector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string; format: string }[]>;
}
interface NativeDetectorCtor {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

/** EAN-13 / EAN-8 / UPC-A kontrol hanesi doğru mu? (Yanlış okumalar çoğunlukla burada elenir.) */
export function checksumOk(text: string, format: string): boolean {
  const kind = format.toUpperCase().replace('_', '');
  const length = kind === 'EAN13' ? 13 : kind === 'EAN8' ? 8 : kind === 'UPCA' ? 12 : 0;
  if (length === 0) return true; // diğer biçimlerde kontrol hanesi yoktur
  if (text.length !== length || !/^[0-9]+$/.test(text)) return false;
  const digits = [...text].map(Number);
  const check = digits.pop()!;
  // Sağdan sola: ilk hane ×3, sonraki ×1, ...
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** Aynı değer üst üste bu kadar okunmadan kabul edilmez (tek karelik yanlış okumaları eler). */
const CONFIRMATIONS = 3;
/** İki okuma arası bu süreyi aşarsa sayaç sıfırlanır (ms). */
const CONFIRM_WINDOW = 900;

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
 * Kamerayla barkod okuma penceresi (telefonda da bilgisayarda da). Kamera YÜKSEK çözünürlükte
 * (1080p) ve sürekli odakla açılır (düşük çözünürlük ince çizgili barkodları okunmaz yapar).
 * Tarayıcının yerleşik okuyucusu (BarcodeDetector: Chrome/Edge/Android) varsa o kullanılır; yoksa
 * zxing (ilk açılışta yüklenir, "daha çok dene" modunda). Okununca "Doğru mu?" ekranı gelir: değer
 * düzeltilebilir, "Tekrar Tara" denebilir ya da "Kullan" ile barkod kutusu doldurulur. Karanlıkta el
 * feneri (destekleyen cihazda) ve birden çok kamera varsa kamera değiştirme düğmesi çıkar.
 */
export function BarcodeScanSheet({ typeValues, onUse, onClose }: BarcodeScanSheetProps) {
  const video = useRef<HTMLVideoElement>(null);
  const stop = useRef<(() => void) | null>(null);
  const track = useRef<MediaStreamTrack | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'starting' });
  const [attempt, setAttempt] = useState(0);
  const [edited, setEdited] = useState('');
  const [devices, setDevices] = useState<string[]>([]);
  const [deviceIndex, setDeviceIndex] = useState<number | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const release = useCallback(() => {
    stop.current?.();
    stop.current = null;
  }, []);

  const deviceId = deviceIndex === null ? undefined : devices[deviceIndex];

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let controls: { stop(): void } | null = null;
    let media: MediaStream | null = null;
    const stopAll = () => {
      window.clearTimeout(timer);
      controls?.stop();
      controls = null;
      media?.getTracks().forEach((t) => t.stop());
      media = null;
      track.current = null;
    };
    stop.current = stopAll;

    // Doğrulama: kontrol hanesi tutmalı ve aynı değer art arda N kez okunmalı.
    let candidate = { text: '', count: 0, at: 0 };
    const vote = (text: string, format: string) => {
      if (cancelled || !checksumOk(text, format)) return false;
      const now = Date.now();
      candidate =
        candidate.text === text && now - candidate.at < CONFIRM_WINDOW
          ? { text, count: candidate.count + 1, at: now }
          : { text, count: 1, at: now };
      if (candidate.count < CONFIRMATIONS) return false;
      finish(text, format);
      return true;
    };
    const finish = (text: string, format: string) => {
      if (cancelled) return;
      stopAll();
      navigator.vibrate?.(30);
      setEdited(text);
      setTorchOn(false);
      setPhase({ kind: 'found', code: text, type: typeOf(format) });
    };

    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('kamera yok');
        media = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            ...(deviceId
              ? { deviceId: { exact: deviceId } }
              : { facingMode: { ideal: 'environment' } }),
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) return stopAll();
        const videoTrack = media.getVideoTracks()[0] ?? null;
        track.current = videoTrack;
        // Sürekli odak (destekleyen kameralarda) ve el feneri desteği.
        try {
          await videoTrack?.applyConstraints({
            advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
          });
        } catch {
          /* Bu kamera odak ayarını desteklemiyor; normal devam. */
        }
        const caps = videoTrack?.getCapabilities?.() as { torch?: boolean } | undefined;
        setTorchSupported(Boolean(caps?.torch));
        void navigator.mediaDevices
          .enumerateDevices()
          .then((list) => {
            if (!cancelled)
              setDevices(
                list.filter((d) => d.kind === 'videoinput' && d.deviceId).map((d) => d.deviceId),
              );
          })
          .catch(() => undefined);

        const element = video.current;
        if (!element) return stopAll();
        element.srcObject = media;
        await element.play();
        if (cancelled) return;
        setPhase({ kind: 'scanning' });

        // 1) Tarayıcının yerleşik okuyucusu: hızlı ve doğru.
        const Native = (window as unknown as { BarcodeDetector?: NativeDetectorCtor })
          .BarcodeDetector;
        let detector: NativeDetector | null = null;
        if (Native) {
          try {
            const supported = (await Native.getSupportedFormats?.()) ?? NATIVE_FORMATS;
            const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
            if (formats.length) detector = new Native({ formats });
          } catch {
            detector = null;
          }
        }
        if (detector) {
          const active = detector;
          const loop = async () => {
            if (cancelled) return;
            try {
              const codes = await active.detect(element);
              const first = codes[0];
              if (first?.rawValue && vote(first.rawValue, first.format)) return;
            } catch {
              /* Kare okunamadı; sonraki karede tekrar denenir. */
            }
            timer = window.setTimeout(() => void loop(), 80);
          };
          void loop();
          return;
        }

        // 2) Yedek: zxing ("daha çok dene" modunda, yalnızca ürün barkodu biçimleriyle).
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all(
          [import('@zxing/browser'), import('@zxing/library')],
        );
        if (cancelled) return;
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
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 60 });
        controls = await reader.decodeFromVideoElement(element, (result) => {
          if (result) vote(result.getText(), BarcodeFormat[result.getBarcodeFormat()] ?? '');
        });
        if (cancelled) stopAll();
      } catch (error) {
        stopAll();
        if (!cancelled) setPhase({ kind: 'error', message: cameraMessage(error) });
      }
    })();

    return () => {
      cancelled = true;
      stopAll();
    };
  }, [attempt, deviceId]);

  const retry = () => {
    setPhase({ kind: 'starting' });
    setAttempt((n) => n + 1);
  };
  const toggleTorch = () => {
    const next = !torchOn;
    void track.current
      ?.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      .then(() => setTorchOn(next))
      .catch(() => undefined);
  };
  const switchCamera = () => {
    release();
    setPhase({ kind: 'starting' });
    setTorchOn(false);
    setDeviceIndex(
      (i) => ((i ?? Math.max(0, devices.indexOf(deviceId ?? ''))) + 1) % devices.length,
    );
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
          <>
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
              {phase.kind === 'scanning' && (torchSupported || devices.length > 1) ? (
                <span className="absolute right-3 bottom-3 flex gap-2">
                  {torchSupported ? (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      aria-label={torchOn ? 'El fenerini kapat' : 'El fenerini aç'}
                      aria-pressed={torchOn}
                      className="flex size-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
                    >
                      {torchOn ? (
                        <FlashlightOff className="size-5" aria-hidden="true" />
                      ) : (
                        <Flashlight className="size-5" aria-hidden="true" />
                      )}
                    </button>
                  ) : null}
                  {devices.length > 1 ? (
                    <button
                      type="button"
                      onClick={switchCamera}
                      aria-label="Kamerayı değiştir"
                      className="flex size-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
                    >
                      <SwitchCamera className="size-5" aria-hidden="true" />
                    </button>
                  ) : null}
                </span>
              ) : null}
            </div>
            {phase.kind === 'scanning' ? (
              <p className="text-sm leading-relaxed text-ink-muted">
                Barkodu çerçevenin ortasına getirin ve kamerayı <strong>15–20 cm</strong> uzakta,
                sabit tutun. Işık yeterli olsun; ekrandaki barkodlar kâğıttakinden zor okunur.
                Okunmazsa biraz yaklaşıp uzaklaşın ya da barkodu elle yazın.
              </p>
            ) : null}
          </>
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
