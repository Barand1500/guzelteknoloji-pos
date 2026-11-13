import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Sayfa içi sekmeler alt çubukta (yüzen adada) gösterilsin: ör. müşteri sayfasında Bilgiler /
 * Adresler / Hesap … Sayfa kendi sekmelerini bildirir; Dock bağlantılar yerine bunları çizer.
 */
export interface DockTabs {
  items: { id: string; label: string; icon: LucideIcon; iconOnly?: boolean }[];
  /** İlk kaçı "+" düğmesinin soluna dizilsin (varsayılan 2). */
  split?: number;
  value: string;
  onChange: (id: string) => void;
}

let currentTabs: DockTabs | null = null;
const tabListeners = new Set<() => void>();

function subscribeTabs(listener: () => void) {
  tabListeners.add(listener);
  return () => void tabListeners.delete(listener);
}

export function useActiveDockTabs(): DockTabs | null {
  return useSyncExternalStore(
    subscribeTabs,
    () => currentTabs,
    () => null,
  );
}

export function usePublishDockTabs(tabs: DockTabs): void {
  const latest = useRef(tabs.onChange);
  useEffect(() => {
    latest.current = tabs.onChange;
  });
  const { items, value, split } = tabs;
  useEffect(() => {
    currentTabs = { items, value, split, onChange: (id) => latest.current(id) };
    tabListeners.forEach((l) => l());
  }, [items, value, split]);
  useEffect(
    () => () => {
      currentTabs = null;
      tabListeners.forEach((l) => l());
    },
    [],
  );
}

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
  /** false ise düğme pasiftir (eksik/geçersiz alan). */
  disabled?: boolean;
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
  const disabled = action?.disabled ?? false;

  useEffect(() => {
    if (!active) return;
    publish({ onSave: () => latest.current?.onSave(), saving, disabled });
    return () => {
      // Başka bir ekran kendi kaydını koyduysa (route geçişi) onu silmeyiz.
      publish(null);
    };
  }, [active, saving, disabled]);
}

/**
 * Sayfaya özel "Ekle" eylemi: Fırsatlar sayfasında "Fırsat Ekle", Kategorilerde "Kategori Ekle",
 * Özelliklerde derinliğe göre "Şablon/Grup/Özellik Ekle" penceresini açar. Kaydet eyleminden sonra
 * gelir (Kaydet varsa Kaydet görünür); hiçbiri yoksa "+" yeni stok kartı açar.
 */
export interface AddAction {
  /** Erişilebilir ad ve ipucu: "Fırsat Ekle". */
  label: string;
  onAdd: () => void;
}

let currentAdd: AddAction | null = null;
const addListeners = new Set<() => void>();

function subscribeAdd(listener: () => void) {
  addListeners.add(listener);
  return () => void addListeners.delete(listener);
}

/** Dock'un okuduğu etkin "Ekle" eylemi (yoksa null). */
export function useActiveAddAction(): AddAction | null {
  return useSyncExternalStore(
    subscribeAdd,
    () => currentAdd,
    () => null,
  );
}

/** Bir sayfa kendi "Ekle" eylemini Dock'a bildirir; sayfadan çıkınca otomatik geri çekilir. */
export function usePublishAddAction(label: string, onAdd: () => void): void {
  const latest = useRef(onAdd);
  useEffect(() => {
    latest.current = onAdd;
  });
  useEffect(() => {
    currentAdd = { label, onAdd: () => latest.current() };
    addListeners.forEach((l) => l());
    return () => {
      currentAdd = null;
      addListeners.forEach((l) => l());
    };
  }, [label]);
}
