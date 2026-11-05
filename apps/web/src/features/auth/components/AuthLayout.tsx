import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { brandConfig } from '../../../config/brand.config';
import { BrandMark } from './BrandMark';
import { DotGrid } from './DotGrid';
import { HeroIllustration } from './HeroIllustration';

/**
 * Giriş ekranı iskeleti. Sabit yükseklik kullanılmaz: içerik uzarsa (zoom, klavye, kısa ekran)
 * sayfa doğal olarak kayar. 100dvh ve safe-area boşlukları mobil tarayıcı çubuklarını hesaba katar.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={[
        'flex min-h-dvh flex-col bg-surface',
        'desktop:grid desktop:grid-cols-[minmax(0,3fr)_minmax(24rem,1fr)]',
        'short-landscape:grid short-landscape:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]',
      ].join(' ')}
    >
      <header
        className={[
          'relative isolate overflow-hidden text-white',
          'bg-[radial-gradient(120%_90%_at_100%_0%,var(--color-brand-500)_0%,var(--color-brand-600)_55%,var(--color-brand-800)_100%)]',
          // Mobil: ekranın yaklaşık üçte biri; çok kısa/uzun ekranlarda sınırlar içinde esner.
          'min-h-[clamp(10.5rem,31dvh,17rem)] px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-12',
          'tablet:min-h-[clamp(15rem,38dvh,24rem)] tablet:px-10 tablet:pb-24',
          'desktop:sticky desktop:top-0 desktop:flex desktop:h-dvh desktop:min-h-[34rem] desktop:flex-col desktop:px-14 desktop:pb-12',
          'short-landscape:min-h-dvh short-landscape:px-6 short-landscape:pb-6',
        ].join(' ')}
      >
        {/* Etkileşimli nokta deseni: fare üzerinden geçince noktalar canlanır. */}
        <DotGrid />

        <div className="relative z-10 flex h-full flex-col desktop:max-w-xl">
          <BrandMark />
          {/* Metin genişliği görsele yer bırakacak şekilde sınırlanır; çakışma olmaz. */}
          <div className="mt-5 max-w-[19rem] min-[420px]:max-w-[56%] tablet:mt-8 tablet:max-w-[50%] desktop:mt-auto desktop:max-w-lg short-landscape:mt-4 short-landscape:max-w-none">
            <h1 className="text-[1.375rem] leading-tight font-extrabold tracking-tight text-balance tablet:text-4xl desktop:text-5xl desktop:leading-[1.08] short-landscape:text-xl">
              {brandConfig.headline}
            </h1>
            <p className="mt-2 hidden text-sm leading-relaxed text-white/90 min-[380px]:block tablet:mt-4 tablet:text-lg short-landscape:text-sm">
              {brandConfig.description}
            </p>
          </div>
          <ul className="mt-8 hidden flex-wrap gap-2.5 desktop:flex min-[1600px]:mb-auto">
            {brandConfig.highlights.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-semibold ring-1 ring-white/20 backdrop-blur-sm"
              >
                <Check className="size-4 text-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Dar ekranlarda (<420px) illüstrasyon yerine metne değmeyen sade bir köşe dekoru. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-accent ring-[18px] ring-white/12 min-[420px]:hidden short-landscape:hidden"
        />

        <HeroIllustration
          className={[
            'pointer-events-none absolute right-2 bottom-8 hidden w-[42%] max-w-[14rem] min-[420px]:block',
            'tablet:right-6 tablet:bottom-14 tablet:w-[clamp(13rem,34vw,20rem)] tablet:max-w-none',
            'desktop:static desktop:mt-10 desktop:mb-auto desktop:block desktop:w-full desktop:max-w-[22rem] desktop:self-center min-[1600px]:hidden!',
            'short-landscape:hidden',
          ].join(' ')}
        />

        {/* Geniş masaüstü (≥1600px): tek illüstrasyon sağ tarafta büyük durur. */}
        <HeroIllustration className="pointer-events-none absolute top-1/2 right-12 hidden w-[26rem] -translate-y-1/2 min-[1600px]:block" />
      </header>

      <main
        className={[
          'relative z-10 -mt-7 flex flex-1 flex-col rounded-t-panel bg-surface shadow-panel',
          'tablet:mx-auto tablet:-mt-16 tablet:mb-12 tablet:w-[min(100%-4rem,34rem)] tablet:flex-none tablet:rounded-panel tablet:shadow-card',
          'desktop:m-0 desktop:w-auto desktop:flex-1 desktop:justify-center desktop:rounded-none desktop:shadow-none',
          'short-landscape:mt-0 short-landscape:rounded-none short-landscape:shadow-none',
        ].join(' ')}
      >
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-8 desktop:flex-none pb-[max(2rem,env(safe-area-inset-bottom))] tablet:px-10 tablet:pt-10 tablet:pb-10 short-landscape:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
