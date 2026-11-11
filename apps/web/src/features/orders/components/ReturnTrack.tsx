import {
  RETURN_KIND_LABEL,
  RETURN_STATUS_LABEL,
  type ReturnKind,
  type ReturnRequest,
  type ReturnStatus,
} from '../types';
import { JourneyBar, type JourneyStep } from './JourneyBar';

function steps(kind: ReturnKind): JourneyStep[] {
  return [
    {
      id: 'pending',
      label: 'Talep Alındı',
      short: 'Talep',
      hint: 'Müşteri talep etti',
      image: 'bekliyor',
    },
    {
      id: 'approved',
      label: 'Onaylandı',
      short: 'Onay',
      hint: 'Talep kabul edildi',
      image: 'hazirlaniyor',
    },
    {
      id: 'completed',
      label: kind === 'return' ? 'İade Tamamlandı' : 'Değişim Tamamlandı',
      short: kind === 'return' ? 'İade' : 'Değişim',
      hint: kind === 'return' ? 'Ödeme iade edildi' : 'Yeni ürün gönderildi',
      image: kind === 'return' ? 'teslim' : 'kargoda',
    },
  ];
}

const NEXT: Partial<Record<ReturnStatus, ReturnStatus>> = { approved: 'completed' };

interface ReturnTrackProps {
  request: ReturnRequest;
  busy: boolean;
  onStatus: (status: ReturnStatus) => void;
}

/**
 * İade/değişim yolculuk şeridi: Talep Alındı → Onaylandı → İade/Değişim Tamamlandı (bkz. JourneyBar).
 * Ret durumunda ikinci adım kırmızı "Reddedildi" kartına döner, üçüncü adım pasif kalır. Altta durumu
 * ilerleten düğmeler: beklemede → Onayla / Reddet, onaylı → Tamamlandı.
 */
export function ReturnTrack({ request, busy, onStatus }: ReturnTrackProps) {
  const rejected = request.status === 'rejected';
  const index = request.status === 'pending' ? 0 : request.status === 'approved' ? 1 : 2;
  const next = NEXT[request.status];
  const btn =
    'inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold transition-colors disabled:opacity-60';

  return (
    <div className="flex flex-col gap-3">
      <JourneyBar
        ariaLabel={`${RETURN_KIND_LABEL[request.kind]} akışı`}
        steps={steps(request.kind)}
        done={rejected ? 1 : index}
        current={rejected ? null : index}
        failedAt={rejected ? 1 : undefined}
        failure={{
          label: RETURN_STATUS_LABEL.rejected,
          short: 'Ret',
          hint: 'Talep reddedildi',
          image: 'iptal',
        }}
      />
      <p className="sr-only" aria-live="polite">
        {`Şu an: ${RETURN_STATUS_LABEL[request.status]}`}
      </p>
      {request.status === 'pending' || next ? (
        <div className="flex flex-wrap justify-end gap-2">
          {request.status === 'pending' ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onStatus('approved')}
                aria-label={`${request.customer} talebini onayla`}
                className={`${btn} bg-brand-700 text-white hover:bg-brand-800`}
              >
                Onayla
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onStatus('rejected')}
                aria-label={`${request.customer} talebini reddet`}
                className={`${btn} bg-danger-soft text-danger hover:bg-danger hover:text-white`}
              >
                Reddet
              </button>
            </>
          ) : null}
          {next ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus(next)}
              aria-label={`${request.customer} talebini tamamlandı yap`}
              className={`${btn} bg-brand-700 text-white hover:bg-brand-800`}
            >
              Tamamlandı Olarak İşaretle
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
