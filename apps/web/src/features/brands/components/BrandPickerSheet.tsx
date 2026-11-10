import { PickList } from '../../../components/ui/PickList';
import { Sheet } from '../../../components/ui/Sheet';
import type { Brand } from '../types';

interface BrandPickerSheetProps {
  brands: Brand[];
  /** Başlığın altında görünen açıklama (hangi dosya için seçildiği). */
  description?: string;
  onPick: (brandId: string) => void;
  onClose: () => void;
}

/** Marka seçme penceresi (Toplu Logo'da eşleşmeyen dosya için): aranabilir liste, dokununca seçilir. */
export function BrandPickerSheet({ brands, description, onPick, onClose }: BrandPickerSheetProps) {
  return (
    <Sheet open onClose={onClose} title="Marka Seç" description={description}>
      <PickList
        label="Marka"
        options={brands.map((b) => ({ value: b.id, label: b.name }))}
        value=""
        onChange={onPick}
      />
    </Sheet>
  );
}
