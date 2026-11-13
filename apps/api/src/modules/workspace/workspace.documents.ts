import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/http-error';
import { requirePermission, type AccessContext } from './workspace.access';

const upload = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/\.pdf$/i),
  dataUrl: z.string().max(2_800_000),
});
const fileName = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/);
export function createWorkspaceDocumentsRouter(uploadsDir: string) {
  const router = Router();
  const context = (value: AccessContext | undefined) => {
    if (!value) throw new HttpError(401, 'UNAUTHENTICATED', 'Hesabınıza giriş yapın.');
    return value;
  };
  router.post('/', async (req, res) => {
    const ctx = context(res.locals.workspace);
    requirePermission(ctx, 'settings', 'save');
    const data = upload.parse(req.body);
    const match = /^data:application\/(?:pdf|octet-stream);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      data.dataUrl,
    );
    if (!match) throw new HttpError(400, 'VALIDATION_ERROR', 'PDF dosyası seçin.');
    const bytes = Buffer.from(match[1]!, 'base64');
    if (bytes.length > 2 * 1024 * 1024 || !bytes.subarray(0, 5).equals(Buffer.from('%PDF-')))
      throw new HttpError(400, 'VALIDATION_ERROR', 'En fazla 2 MB büyüklüğünde PDF dosyası seçin.');
    const file = `${randomUUID()}.pdf`;
    const directory = path.resolve(uploadsDir, 'belgeler', String(ctx.business.id));
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, file), bytes, { flag: 'wx', mode: 0o600 });
    res
      .set('Cache-Control', 'no-store')
      .status(201)
      .json({ file, name: path.basename(data.name).replace(/[\r\n]/g, '') });
  });
  router.get('/:file', async (req, res) => {
    const ctx = context(res.locals.workspace);
    requirePermission(ctx, 'settings', 'read');
    const file = fileName.parse(req.params.file);
    let bytes: Buffer;
    try {
      bytes = await readFile(path.resolve(uploadsDir, 'belgeler', String(ctx.business.id), file));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new HttpError(404, 'NOT_FOUND', 'Belge bulunamadı.');
      throw error;
    }
    res
      .set({
        'Cache-Control': 'no-store',
        'Content-Type': 'application/pdf',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'attachment; filename="bayi-sozlesmesi.pdf"',
      })
      .send(bytes);
  });
  return router;
}
