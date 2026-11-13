import type { MultiOption } from '../../components/ui/MultiSelectField';

export interface CampaignAudience {
  customerTypes: MultiOption[];
  priceLists: MultiOption[];
}

const fold = (value: string) => value.trim().toLocaleLowerCase('tr');

/** Eski adla kayıtlar okunur; yeni seçimler tanımlamanın kimliğiyle saklanır. */
export function audienceSelection(values: string[], options: MultiOption[]): string[] {
  return [...new Set(values.map((value) =>
    options.find((option) => option.id === value)?.id ??
    options.find((option) => fold(option.name) === fold(value))?.id ?? value,
  ))];
}

export function audienceOptions(options: MultiOption[], values: string[]): MultiOption[] {
  const missing = audienceSelection(values, options).filter((id) => !options.some((option) => option.id === id));
  return [...options, ...missing.map((id) => ({ id, name: id }))];
}

export function audienceLabels(values: string[], options: MultiOption[]): string[] {
  return audienceSelection(values, options).map((id) => options.find((option) => option.id === id)?.name ?? id);
}
