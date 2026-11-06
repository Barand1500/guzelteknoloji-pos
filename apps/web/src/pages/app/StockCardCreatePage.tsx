import { useParams, useSearchParams } from 'react-router';
import { StockCardForm } from '../../features/stock/components/StockCardForm';
import { SIDE_BOX_IDS, type SideBoxId } from '../../features/stock/components/StockSidePanel';

/**
 * Stok kartı ekranı. Üç kullanım, tek ekran:
 * /stok-karti/yeni → boş kart (ekle) · /stok-karti/:cardId → dolu kart (düzenle) ·
 * /stok-karti/yeni?kopya=:id → dolu ama yeni kayıt (kopya).
 * `?ac=kategori|firsat|ozet` o yan kutuyu açık getirir (kayıt sonrası ekrandan gelinir).
 */
export function StockCardCreatePage() {
  const { cardId } = useParams();
  const [params] = useSearchParams();
  const copyFromId = params.get('kopya') ?? undefined;
  const box = SIDE_BOX_IDS.find((id): id is SideBoxId => id === params.get('ac'));
  return (
    <StockCardForm
      key={cardId ?? copyFromId ?? 'yeni'}
      {...(cardId ? { cardId } : {})}
      {...(copyFromId ? { copyFromId } : {})}
      {...(box ? { initialBox: box } : {})}
    />
  );
}
