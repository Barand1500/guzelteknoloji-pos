/**
 * Üst çubuktaki selamlama: saate göre metin ve kullanıcının adı.
 *   05:00–11:59 Günaydın · 12:00–17:59 Tünaydın · 18:00–21:59 İyi Akşamlar · 22:00–04:59 İyi Geceler
 */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Günaydın';
  if (hour >= 12 && hour < 18) return 'Tünaydın';
  if (hour >= 18 && hour < 22) return 'İyi Akşamlar';
  return 'İyi Geceler';
}

interface Named {
  displayName?: string | null;
  email?: string | null;
}

/**
 * Selamlamada görünecek ad: görünen adın ilk sözcüğü ("Baran Demir" → "Baran"). Görünen ad yoksa
 * e-postanın başındaki harfler denenir; rakamla başlıyorsa ya da çok kısaysa ad gösterilmez
 * (yalnızca selamlama kalır), çünkü "21baran51" gibi bir adla hitap etmek kaba durur.
 */
export function firstNameOf(user: Named | null | undefined): string | null {
  const display = user?.displayName?.trim();
  if (display) return display.split(/\s+/)[0] ?? null;
  const local = user?.email?.split('@')[0] ?? '';
  const letters = /^\p{L}{3,}/u.exec(local)?.[0];
  if (!letters) return null;
  return letters.charAt(0).toLocaleUpperCase('tr') + letters.slice(1).toLocaleLowerCase('tr');
}
