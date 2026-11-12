import {
  SelectField as SelectFieldBase,
  type SelectFieldProps,
} from '../../../components/ui/SelectField';

export type { SelectOption } from '../../../components/ui/SelectField';

/**
 * E-Ticaret ayarlarındaki açılır listeler HER ZAMAN aşağı açılır; altta yer kalmazsa liste
 * kısalır ve kendi içinde kayar. Davranışı uygulamanın geri kalanında değiştirmemek için
 * ortak `SelectField`ı saran ince bir bileşendir (yalnızca bu ekranlarda kullanılır).
 */
export function SelectField(props: SelectFieldProps) {
  return <SelectFieldBase {...props} placement="down" />;
}
