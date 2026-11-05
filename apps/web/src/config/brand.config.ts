/**
 * Marka metinleri tek yerden yönetilir. Gerçek logo hazır olduğunda `logoSrc` doldurulur;
 * boşken metin tabanlı geçici logo gösterilir.
 */
export interface BrandConfig {
  name: string;
  /** Logo yanında gösterilecek kısa monogram (geçici logo için). */
  monogram: string;
  logoSrc: string | null;
  headline: string;
  description: string;
  highlights: readonly string[];
}

export const brandConfig: BrandConfig = {
  name: 'Güzel Teknoloji',
  monogram: 'GT',
  logoSrc: null,
  headline: 'İşinizi tek hesapla, güvenle yönetin.',
  description: 'Hesabınıza giriş yapın; kaldığınız yerden hızla devam edin.',
  highlights: ['Güvenli oturum', 'Her cihazda erişim', 'Hızlı destek'],
};
