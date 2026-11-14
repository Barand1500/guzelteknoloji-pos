import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { prepareBrandLogo } from '../modules/brands/brand.repository';
import { brandDraftSchema } from '@gt/shared';

describe('Marka logosu ve alan doğrulama', () => {
  it.each(['png', 'jpeg', 'webp'] as const)(
    '%s girdisini boyutlarını koruyarak WebP yapar',
    async (format) => {
      const file = await sharp({
        create: { width: 1200, height: 600, channels: 4, background: '#ffaa00' },
      })
        .toFormat(format)
        .toBuffer();
      const result = await prepareBrandLogo(
        `data:image/${format};base64,${file.toString('base64')}`,
      );
      expect(result?.logoHash).toHaveLength(64);
      const metadata = await sharp(result!.data).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(600);
    },
  );
  it('SVG yüklemesini WebP olarak hazırlar', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="30"><rect width="100" height="30" fill="red"/></svg>',
    );
    const result = await prepareBrandLogo('data:image/svg+xml;base64,' + svg.toString('base64'));
    expect(result!.format).toBe('webp');
    expect(await sharp(result!.data).metadata()).toMatchObject({
      format: 'webp',
      width: 100,
      height: 30,
    });
  });
  it('2 MB sınırını ve gerçek dosya içeriğini denetler', async () => {
    await expect(
      prepareBrandLogo(
        'data:image/png;base64,' + Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64'),
      ),
    ).rejects.toMatchObject({ status: 400, message: 'Logo en çok 2 MB olabilir.' });
    await expect(prepareBrandLogo('blob:temporary')).rejects.toMatchObject({ status: 400 });
    const gif = await sharp({ create: { width: 1, height: 1, channels: 4, background: '#ffffff' } })
      .gif()
      .toBuffer();
    await expect(
      prepareBrandLogo('data:image/png;base64,' + gif.toString('base64')),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('marka adı zorunludur; alan uzunlukları sunucuda sınırlandırılır', () => {
    const draft = {
      name: '  İnci  ',
      description: '',
      active: true,
      logoUrl: null,
      seoTitle: '',
      seoDescription: '',
    };
    expect(brandDraftSchema.parse(draft).name).toBe('İnci');
    expect(brandDraftSchema.safeParse({ ...draft, name: ' ' }).success).toBe(false);
    expect(brandDraftSchema.safeParse({ ...draft, seoDescription: 'x'.repeat(1001) }).success).toBe(
      false,
    );
    expect(brandDraftSchema.safeParse({ ...draft, userId: 'başka-kullanıcı' }).success).toBe(false);
  });
});
