import 'flag-icons/css/flag-icons.min.css';
import type { SelectOption } from '../../components/ui/SelectField';

/**
 * Menşei (üretim ülkesi) seçenekleri. Ülke adları tarayıcının kendi Türkçe ad listesinden
 * (`Intl.DisplayNames`) gelir: elle yazılmış ad listesi yoktur, her güncel tarayıcıda aynı çalışır.
 * Bayraklar emoji değil SVG'dir (flag-icons paketi): Windows'taki Chrome/Edge bayrak emojisini
 * çizemez, SVG ise her tarayıcıda ve işletim sisteminde aynı görünür.
 */

/** ISO 3166-1 alfa-2 kodları (BM üyesi ve gözlemci devletler + yaygın bölgeler). */
const CODES =
  'AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'.split(
    ' ',
  );

/** Bayrak simgesi: flag-icons sınıfları (`fi fi-tr`). Erişilebilirlikte yok sayılır; ad zaten yazılıdır. */
export function Flag({ code }: { code: string }) {
  return (
    <span
      aria-hidden="true"
      className={`fi fi-${code.toLowerCase()} shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgb(0_0_0/0.12)]`}
    />
  );
}

function buildOptions(): SelectOption[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(['tr'], { type: 'region' });
  } catch {
    // Çok eski tarayıcı: ad listesi yoksa ülke kodu gösterilir (seçim yine çalışır).
  }
  const options = CODES.map((code) => {
    const label = names?.of(code) ?? code;
    return { value: label, label, icon: <Flag code={code} /> };
  });
  // Alfabetik (Türkçe harf sırasıyla); sık kullanılan Türkiye en üstte durur.
  options.sort((a, b) => a.label.localeCompare(b.label, 'tr'));
  const turkey = options.findIndex((o) => o.value === names?.of('TR'));
  if (turkey > 0) options.unshift(...options.splice(turkey, 1));
  return options;
}

let cache: SelectOption[] | null = null;
/** Ülke seçenekleri (ilk kullanımda bir kez üretilir). Değer = ülkenin Türkçe adıdır. */
export function countryOptions(): SelectOption[] {
  return (cache ??= buildOptions());
}
