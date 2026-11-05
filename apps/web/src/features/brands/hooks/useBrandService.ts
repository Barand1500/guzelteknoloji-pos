import { useSession } from '../../auth/hooks/session-context';
import { hasDevAccess } from '../../dev-login/devAccess';
import { demoBrandService } from '../services/brand.demo';
import { brandService, type BrandService } from '../services/brand.service';

export function useBrandService(): BrandService {
  const { session } = useSession();
  // GEÇİCİ test kullanıcısı korunur; gerçek oturumda demo servis kullanılmaz.
  return session.status === 'anonymous' && hasDevAccess() ? demoBrandService : brandService;
}
