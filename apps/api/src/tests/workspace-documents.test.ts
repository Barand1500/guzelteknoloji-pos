import express from 'express';
import request from 'supertest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createWorkspaceDocumentsRouter } from '../modules/workspace/workspace.documents';
import { errorHandler } from '../middleware/error-handler';
import { createLogger } from '../lib/logger';

describe('İşletmeye ait bayi sözleşmesi PDF', () => {
  it('PDF dosyasını uploads altında tutar; başka işletme dosyayı indiremez', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'pos-doc-'));
    let businessId = 1;
    const app = express().use(express.json());
    app.use((_req, res, next) => {
      res.locals.workspace = { business: { id: businessId }, owner: true, permissions: [] };
      next();
    });
    app.use(createWorkspaceDocumentsRouter(root), errorHandler(createLogger('silent')));
    try {
      const bytes = Buffer.from('%PDF-1.7\nexample\n%%EOF');
      const result = await request(app)
        .post('/')
        .send({
          name: 'bayi.pdf',
          dataUrl: `data:application/pdf;base64,${bytes.toString('base64')}`,
        });
      expect(result.status).toBe(201);
      expect(await readFile(path.join(root, 'belgeler', '1', result.body.file))).toEqual(bytes);
      expect((await request(app).get(`/${result.body.file}`)).status).toBe(200);
      businessId = 2;
      expect((await request(app).get(`/${result.body.file}`)).status).toBe(404);
      expect(
        (
          await request(app)
            .post('/')
            .send({ name: 'x.pdf', dataUrl: 'data:application/pdf;base64,PGh0bWw+' })
        ).status,
      ).toBe(400);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
