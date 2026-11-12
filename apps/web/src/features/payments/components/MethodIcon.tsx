import { Banknote, CreditCard, FileText, Landmark, QrCode, Store, Truck, Wallet, type LucideIcon } from 'lucide-react';
import type { PaymentIcon, PaymentMethod } from '../types';

export const ICONS: Record<PaymentIcon, LucideIcon> = {
  card: CreditCard,
  bank: Landmark,
  store: Store,
  file: FileText,
  delivery: Truck,
  wallet: Wallet,
  cash: Banknote,
  qr: QrCode,
};

/** Ödeme şeklinin simgesi: yüklenen görsel varsa o, yoksa seçili hazır simge. */
export function MethodIcon({
  method,
  className = 'size-6',
}: {
  method: Pick<PaymentMethod, 'icon' | 'iconUrl'>;
  className?: string;
}) {
  if (method.iconUrl)
    return <img src={method.iconUrl} alt="" className={`${className} rounded-md object-contain`} />;
  const Icon = method.icon ? ICONS[method.icon] : Wallet;
  return <Icon className={className} aria-hidden="true" />;
}
