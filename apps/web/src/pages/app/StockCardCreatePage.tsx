import { useParams, useSearchParams } from 'react-router';
import { StockCardForm } from '../../features/stock/components/StockCardForm';

/**
 * Stok kartı ekranı. Üç kullanım, tek ekran:
 * /stok-karti/yeni → boş kart (ekle) · /stok-karti/:cardId → dolu kart (düzenle) ·
 * /stok-karti/yeni?kopya=:id → dolu ama yeni kayıt (kopya).
 */
export function StockCardCreatePage() {
  const { cardId } = useParams();
  const [params] = useSearchParams();
  const copyFromId = params.get('kopya') ?? undefined;
  return <StockCardForm {...(cardId ? { cardId } : {})} {...(copyFromId ? { copyFromId } : {})} />;
}
