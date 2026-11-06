import { randomBytes } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type LogoFormat = 'png' | 'jpeg' | 'webp' | 'svg';
const extensions: Record<LogoFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
  svg: 'svg',
};
const formats: Record<string, LogoFormat> = { png: 'png', jpg: 'jpeg', webp: 'webp', svg: 'svg' };
export const logoMime = (format: LogoFormat) =>
  format === 'svg' ? 'image/svg+xml' : `image/${format}`;

/** Dosya adları sunucu üretimidir; kullanıcıdan gelen yollar kullanılmaz. */
export class BrandLogoStorage {
  private readonly directory: string;
  constructor(
    root: string,
    folder: 'markalar' | 'kategoriler' | 'firsatlar' | 'ozellikler' = 'markalar',
  ) {
    this.directory = path.resolve(root, folder);
  }

  private filePath(name: string) {
    if (!/^[0-9a-f]{48}\.(png|jpg|webp|svg)$/.test(name)) throw new Error('Geçersiz logo dosyası.');
    return path.join(this.directory, name);
  }

  async write(data: Buffer, format: LogoFormat) {
    await mkdir(this.directory, { recursive: true });
    const name = `${randomBytes(24).toString('hex')}.${extensions[format]}`;
    await writeFile(this.filePath(name), data, { flag: 'wx', mode: 0o600, flush: true });
    return name;
  }

  async read(name: string) {
    const format = formats[path.extname(name).slice(1)];
    if (!format) throw new Error('Geçersiz logo biçimi.');
    return { data: await readFile(this.filePath(name)), format };
  }

  async remove(name: string) {
    try {
      await unlink(this.filePath(name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
