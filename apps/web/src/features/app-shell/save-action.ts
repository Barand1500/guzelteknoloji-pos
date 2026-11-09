import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Alt çubuğun (Dock) ortadaki "+" düğmesini sayfaya özel "Kaydet" düğmesine çeviren küçük ortak
 * kayıt. Stok kartı ekranı açıkken kendi kaydetme işlemini buraya bildirir, ekrandan çıkınca geri
 * çeker; Dock yalnızca bu kayda bakar (ekran kodunu bilmez). Böylece sayfada büyük Kaydet
 * düğmeleri bulunmaz.
 */
export interface SaveAction {
  /** Düğmeye basılınca çalışır. */
  onSave: () => void;
  /** Kaydediliyorsa düğme dönen simge gösterir ve basılamaz. */
  saving: boolean;
}

let current: SaveAction | null = null;
const listeners = new Set<() => void>();

function publish(next: SaveAction | null) {
  current = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Dock'un okuduğu etkin kaydetme işlemi (yoksa null → normal "+" düğmesi). */
export function useActiveSaveAction(): SaveAction | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

/**
 * Bir ekran kaydetme işlemini Dock'a bildirir. `null` verilirse (ör. kaydedildi ekranı) düğme
 * tekrar "+" olur. Ekran kapanınca kayıt otomatik temizlenir.
 */
export function usePublishSaveAction(action: SaveAction | null): void {
  // Güncel closure'ı her çizimde saklarız; Dock hep en yeni onSave'i çağırır.
  const latest = useRef(action);
  // Ref çizim sırasında değil, çizimden sonra güncellenir.
  useEffect(() => {
    latest.current = action;
  });
  const active = action !== null;
  const saving = action?.saving ?? false;

  useEffect(() => {
    if (!active) return;
    publish({ onSave: () => latest.current?.onSave(), saving });
    return () => {
      // Başka bir ekran kendi kaydını koyduysa (route geçişi) onu silmeyiz.
      publish(null);
    };
  }, [active, saving]);
}
