import workerImage from '../../../assets/hero-worker.png';

/**
 * Marka alanındaki tek illüstrasyon (`src/assets/hero-worker.png`, şeffaf arka planlı).
 * Koyu çizgiler turuncu zeminde kaybolmasın diye görselin çevresine ince beyaz bir kenar
 * (çıkartma efekti) ve yumuşak bir gölge verilir. Dekoratiftir; ekran okuyuculardan gizlenir.
 * Görseli değiştirmek için aynı adlı dosyayı değiştirmek yeterlidir.
 */
const STICKER_FILTER = [
  'drop-shadow(2px 0 0 #fff)',
  'drop-shadow(-2px 0 0 #fff)',
  'drop-shadow(0 2px 0 #fff)',
  'drop-shadow(0 -2px 0 #fff)',
  'drop-shadow(0 18px 22px rgb(0 0 0 / 0.28))',
].join(' ');

export function HeroIllustration({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={className}>
      <img
        src={workerImage}
        alt=""
        draggable={false}
        style={{ filter: STICKER_FILTER }}
        className="block h-auto w-full select-none"
      />
    </div>
  );
}
