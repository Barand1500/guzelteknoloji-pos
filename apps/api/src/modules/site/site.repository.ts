import type {
  MenuEntryDto,
  MenuEntryDraftInput,
  SitePageDto,
  SitePageDraftInput,
  SiteLegalType,
  SiteWidgetiSettings,
  SliderDto,
  SliderDraftInput,
  TemplateVariableDto,
  TemplateVariableDraftInput,
  WidgetDto,
  WidgetDraftInput,
} from '@gt/shared';
import { Prisma } from '../../generated/prisma/client';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';

function conflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    throw new HttpError(409, 'CONFLICT', 'Bu bağlantı (slug) zaten kullanılıyor.');
  throw error;
}

const imageUrl = (id: number | null) => (id === null ? null : `/api/site/gorseller/${id}`);

/** E-ticaret site içeriği: sayfalar, menü, slider, widget ve şablon değişkenleri. */
export class SiteRepository {
  constructor(private db: PrismaClient) {}

  async pages(businessId: number): Promise<SitePageDto[]> {
    const rows = await this.db.siteSayfasi.findMany({
      where: { isletmeId: businessId },
      orderBy: [{ sira: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      id: String(row.id),
      title: row.ad,
      slug: row.slug,
      content: row.icerik,
      legal: row.yasalTur as SiteLegalType,
      published: row.yayinda,
      order: row.sira,
    }));
  }

  async savePage(businessId: number, input: SitePageDraftInput, id?: number) {
    let savedId: number | undefined = id;
    if (id) {
      const row = await this.db.siteSayfasi.findFirst({ where: { id, isletmeId: businessId } });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Sayfa bulunamadı.');
      try {
        await this.db.siteSayfasi.update({
          where: { id },
          data: {
            ad: input.title,
            slug: input.slug,
            icerik: input.content,
            yasalTur: input.legal,
            yayinda: input.published,
            sira: input.order,
          },
        });
      } catch (error) {
        conflict(error);
      }
    } else {
      try {
        const created = await this.db.siteSayfasi.create({
          data: {
            isletmeId: businessId,
            ad: input.title,
            slug: input.slug,
            icerik: input.content,
            yasalTur: input.legal,
            yayinda: input.published,
            sira: input.order,
          },
        });
        savedId = created.id;
      } catch (error) {
        conflict(error);
      }
    }
    const list = await this.pages(businessId);
    return list.find((item) => item.id === String(savedId)) ?? list[list.length - 1]!;
  }

  /** E-ticaret site içerikleri: kimlik listesi yeni sıraya göre 0..n-1 olarak yazılır. */
  async reorderPages(businessId: number, ids: string[]) {
    const order = this.orderIds(ids);
    await this.db.$transaction(async (tx) => {
      const rows = await tx.siteSayfasi.findMany({
        where: { isletmeId: businessId, id: { in: order } },
        select: { id: true },
      });
      if (rows.length !== order.length)
        throw new HttpError(404, 'NOT_FOUND', 'Sayfalardan biri bulunamadı.');
      for (const [index, id] of order.entries())
        await tx.siteSayfasi.update({ where: { id }, data: { sira: index } });
    });
  }

  async removePage(businessId: number, id: number) {
    const row = await this.db.siteSayfasi.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Sayfa bulunamadı.');
    await this.db.siteSayfasi.delete({ where: { id } });
  }

  async menu(businessId: number): Promise<MenuEntryDto[]> {
    const rows = await this.db.siteMenuOgesi.findMany({
      where: { isletmeId: businessId },
      orderBy: [{ grup: 'asc' }, { sira: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      id: String(row.id),
      group: row.grup as MenuEntryDto['group'],
      label: row.ad,
      url: row.baglanti,
      newTab: row.yeniSekme,
      active: row.aktif,
      order: row.sira,
    }));
  }

  async saveMenu(businessId: number, input: MenuEntryDraftInput, id?: number) {
    let savedId: number | undefined = id;
    if (id) {
      const row = await this.db.siteMenuOgesi.findFirst({ where: { id, isletmeId: businessId } });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Menü öğesi bulunamadı.');
      await this.db.siteMenuOgesi.update({
        where: { id },
        data: {
          grup: input.group,
          ad: input.label,
          baglanti: input.url,
          yeniSekme: input.newTab,
          aktif: input.active,
          sira: input.order,
        },
      });
    } else {
      const created = await this.db.siteMenuOgesi.create({
        data: {
          isletmeId: businessId,
          grup: input.group,
          ad: input.label,
          baglanti: input.url,
          yeniSekme: input.newTab,
          aktif: input.active,
          sira: input.order,
        },
      });
      savedId = created.id;
    }
    const list = await this.menu(businessId);
    return list.find((item) => item.id === String(savedId))!;
  }

  async removeMenu(businessId: number, id: number) {
    const row = await this.db.siteMenuOgesi.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Menü öğesi bulunamadı.');
    await this.db.siteMenuOgesi.delete({ where: { id } });
  }

  /** Menü sıralaması grup içindedir: yalnızca tek grubun kimlikleri gönderilir. */
  async reorderMenu(businessId: number, ids: string[]) {
    const order = this.orderIds(ids);
    await this.db.$transaction(async (tx) => {
      const rows = await tx.siteMenuOgesi.findMany({
        where: { isletmeId: businessId, id: { in: order } },
        select: { id: true, grup: true },
      });
      if (rows.length !== order.length)
        throw new HttpError(404, 'NOT_FOUND', 'Menü öğelerinden biri bulunamadı.');
      if (new Set(rows.map((row) => row.grup)).size > 1)
        throw new HttpError(
          400,
          'VALIDATION_ERROR',
          'Aynı menü grubundaki öğeler birlikte sıralanır.',
        );
      for (const [index, id] of order.entries())
        await tx.siteMenuOgesi.update({ where: { id }, data: { sira: index } });
    });
  }

  async sliders(businessId: number): Promise<SliderDto[]> {
    const rows = await this.db.siteSlideri.findMany({
      where: { isletmeId: businessId },
      orderBy: [{ sira: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      id: String(row.id),
      title: row.baslik,
      description: row.aciklama,
      link: row.baglanti,
      active: row.aktif,
      order: row.sira,
      imageId: row.gorselId === null ? null : String(row.gorselId),
      imageUrl: imageUrl(row.gorselId),
    }));
  }

  async saveSlider(businessId: number, input: SliderDraftInput, id?: number) {
    let savedId: number | undefined = id;
    let gorselId: number | null = null;
    if (input.imageId !== null) {
      gorselId = Number(input.imageId);
      const image = await this.db.siteGorseli.findFirst({
        where: { id: gorselId, isletmeId: businessId },
      });
      if (!image) throw new HttpError(400, 'VALIDATION_ERROR', 'Görsel bulunamadı.');
    }
    if (id) {
      const row = await this.db.siteSlideri.findFirst({ where: { id, isletmeId: businessId } });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Slider bulunamadı.');
      await this.db.siteSlideri.update({
        where: { id },
        data: {
          baslik: input.title,
          aciklama: input.description,
          baglanti: input.link,
          aktif: input.active,
          sira: input.order,
          gorselId,
        },
      });
    } else {
      const created = await this.db.siteSlideri.create({
        data: {
          isletmeId: businessId,
          baslik: input.title,
          aciklama: input.description,
          baglanti: input.link,
          aktif: input.active,
          sira: input.order,
          gorselId,
        },
      });
      savedId = created.id;
    }
    const list = await this.sliders(businessId);
    return list.find((item) => item.id === String(savedId))!;
  }

  async removeSlider(businessId: number, id: number) {
    const row = await this.db.siteSlideri.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Slider bulunamadı.');
    await this.db.siteSlideri.delete({ where: { id } });
  }

  async reorderSliders(businessId: number, ids: string[]) {
    const order = this.orderIds(ids);
    await this.db.$transaction(async (tx) => {
      const rows = await tx.siteSlideri.findMany({
        where: { isletmeId: businessId, id: { in: order } },
        select: { id: true },
      });
      if (rows.length !== order.length)
        throw new HttpError(404, 'NOT_FOUND', 'Sliderlardan biri bulunamadı.');
      for (const [index, id] of order.entries())
        await tx.siteSlideri.update({ where: { id }, data: { sira: index } });
    });
  }

  async widgets(businessId: number): Promise<WidgetDto[]> {
    const rows = await this.db.siteWidgeti.findMany({
      where: { isletmeId: businessId },
      orderBy: [{ sira: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      id: String(row.id),
      name: row.ad,
      type: row.tur as WidgetDto['type'],
      title: row.baslik,
      visible: row.gorunur,
      order: row.sira,
      imageId: row.gorselId === null ? null : String(row.gorselId),
      imageUrl: imageUrl(row.gorselId),
      settings: (row.ayarlar ?? {}) as SiteWidgetiSettings,
    }));
  }

  async saveWidget(businessId: number, input: WidgetDraftInput, id?: number) {
    let savedId: number | undefined = id;
    // Görsel kimliği istemciden gelir; başka işletmenin görseli bağlanamasın diye sahiplik doğrulanır.
    let gorselId: number | null = null;
    if (input.imageId !== null) {
      gorselId = Number(input.imageId);
      const image = await this.db.siteGorseli.findFirst({
        where: { id: gorselId, isletmeId: businessId },
      });
      if (!image) throw new HttpError(400, 'VALIDATION_ERROR', 'Görsel bulunamadı.');
    }
    const data = {
      ad: input.name,
      tur: input.type,
      baslik: input.title,
      gorunur: input.visible,
      sira: input.order,
      gorselId,
      ayarlar: input.settings as Prisma.InputJsonObject,
    };
    if (id) {
      const row = await this.db.siteWidgeti.findFirst({ where: { id, isletmeId: businessId } });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Widget bulunamadı.');
      await this.db.siteWidgeti.update({ where: { id }, data });
    } else {
      const created = await this.db.siteWidgeti.create({
        data: { ...data, isletmeId: businessId },
      });
      savedId = created.id;
    }
    const list = await this.widgets(businessId);
    return list.find((item) => item.id === String(savedId))!;
  }

  async removeWidget(businessId: number, id: number) {
    const row = await this.db.siteWidgeti.findFirst({ where: { id, isletmeId: businessId } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Widget bulunamadı.');
    await this.db.siteWidgeti.delete({ where: { id } });
  }

  async reorderWidgets(businessId: number, ids: string[]) {
    const order = this.orderIds(ids);
    await this.db.$transaction(async (tx) => {
      const rows = await tx.siteWidgeti.findMany({
        where: { isletmeId: businessId, id: { in: order } },
        select: { id: true },
      });
      if (rows.length !== order.length)
        throw new HttpError(404, 'NOT_FOUND', 'Widgetlardan biri bulunamadı.');
      for (const [index, id] of order.entries())
        await tx.siteWidgeti.update({ where: { id }, data: { sira: index } });
    });
  }

  /**
   * Sıralama kimliklerini sayıya çevirir ve tekrar eden kaydı reddeder.
   * Tekrar eden kimlik, aynı satırı iki kez güncelleyip sırayı bozardı.
   */
  private orderIds(ids: string[]): number[] {
    const numbers = ids.map((id) => Number(id));
    if (new Set(numbers).size !== numbers.length)
      throw new HttpError(400, 'VALIDATION_ERROR', 'Sıralamada aynı kayıt iki kez gönderildi.');
    return numbers;
  }

  async variables(businessId: number): Promise<TemplateVariableDto[]> {
    const rows = await this.db.siteSablonDegiskeni.findMany({
      where: { isletmeId: businessId },
      include: { alanlar: { orderBy: { sira: 'asc' } } },
      orderBy: [{ sira: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      id: String(row.id),
      name: row.ad,
      type: row.tur as TemplateVariableDto['type'],
      module: row.modul,
      description: row.aciklama,
      fields: row.alanlar.map((field) => ({
        id: String(field.id),
        column: field.dbSutun,
        code: field.degisken,
      })),
    }));
  }

  async saveVariable(businessId: number, input: TemplateVariableDraftInput, id?: number) {
    const result = await this.db.$transaction(async (tx) => {
      let variableId = id;
      if (id) {
        const row = await tx.siteSablonDegiskeni.findFirst({
          where: { id, isletmeId: businessId },
        });
        if (!row) throw new HttpError(404, 'NOT_FOUND', 'Değişken bulunamadı.');
        await tx.siteSablonDegiskeni.update({
          where: { id },
          data: {
            ad: input.name,
            tur: input.type,
            modul: input.module,
            aciklama: input.description,
          },
        });
        await tx.siteSablonDegiskenAlani.deleteMany({ where: { degiskenId: id } });
      } else {
        const last = await tx.siteSablonDegiskeni.aggregate({
          where: { isletmeId: businessId },
          _max: { sira: true },
        });
        const created = await tx.siteSablonDegiskeni.create({
          data: {
            isletmeId: businessId,
            ad: input.name,
            tur: input.type,
            modul: input.module,
            aciklama: input.description,
            sira: (last._max.sira ?? 0) + 1,
          },
        });
        variableId = created.id;
      }
      if (!variableId) throw new HttpError(500, 'INTERNAL_ERROR', 'Değişken oluşturulamadı.');
      if (input.fields.length > 0) {
        await tx.siteSablonDegiskenAlani.createMany({
          data: input.fields.map((field, index) => ({
            degiskenId: variableId!,
            dbSutun: field.column,
            degisken: field.code,
            sira: index,
          })),
        });
      }
      return variableId;
    });
    const list = await this.variables(businessId);
    return list.find((item) => item.id === String(result))!;
  }

  async removeVariable(businessId: number, id: number) {
    const row = await this.db.siteSablonDegiskeni.findFirst({
      where: { id, isletmeId: businessId },
    });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Değişken bulunamadı.');
    await this.db.siteSablonDegiskeni.delete({ where: { id } });
  }
}
