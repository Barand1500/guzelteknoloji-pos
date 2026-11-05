import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { createSupportConfig, type SupportEnv } from '../../config/support.config';
import { axeViolations } from '../../test/utils';
import { SupportSheet } from './SupportSheet';

const FORM_URL = 'https://destek.guzelteknoloji.com/form/destek?source=abc-123&embed=1';
const ORIGIN = 'https://destek.guzelteknoloji.com';
const fullEnv: SupportEnv = { VITE_SUPPORT_FORM_URL: FORM_URL };

function Harness({ env }: { env: SupportEnv }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Yardım aç
      </button>
      <SupportSheet open={open} onClose={() => setOpen(false)} config={createSupportConfig(env)} />
    </>
  );
}

async function openSheet(env: SupportEnv = fullEnv) {
  const ue = userEvent.setup();
  render(<Harness env={env} />);
  const trigger = screen.getByRole('button', { name: 'Yardım aç' });
  await ue.click(trigger);
  return { ue, trigger };
}

describe('Destek yapılandırması', () => {
  it("geçerli https form adresini ve origin'ini alır", () => {
    const config = createSupportConfig(fullEnv);
    expect(config.formUrl).toBe(FORM_URL);
    expect(config.formOrigin).toBe(ORIGIN);
    expect(config.title).toBe('Yardıma Mı İhtiyacınız Var?');
  });

  it('boş, http veya bozuk adresleri reddeder', () => {
    for (const bad of ['', '   ', 'http://destek.example.com/form', 'javascript:alert(1)', 'abc']) {
      const config = createSupportConfig({ VITE_SUPPORT_FORM_URL: bad });
      expect(config.formUrl, bad).toBeNull();
      expect(config.formOrigin, bad).toBeNull();
    }
  });
});

describe('Yardım penceresi (gömülü destek formu)', () => {
  it('açılınca formu iframe içinde gösterir (başlık ve güvenli öznitelikler)', async () => {
    await openSheet();
    const dialog = screen.getByRole('dialog', { name: 'Yardıma Mı İhtiyacınız Var?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const frame = screen.getByTitle('Destek Talebi');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', FORM_URL);
    expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    expect(frame.getAttribute('sandbox')).toContain('allow-forms');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-top-navigation');
  });

  it('form yüklenene kadar iskelet gösterir, yüklenince kaldırır', async () => {
    await openSheet();
    expect(screen.getByRole('status')).toHaveTextContent('Form yükleniyor');
    fireEvent.load(screen.getByTitle('Destek Talebi'));
    expect(screen.queryByText('Form yükleniyor…')).not.toBeInTheDocument();
  });

  it('formu yeni sekmede açan güvenli bağlantı sunar', async () => {
    await openSheet();
    const link = screen.getByRole('link', { name: /Formu Yeni Sekmede Aç/ });
    expect(link).toHaveAttribute('href', FORM_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('(yeni sekmede açılır)');
  });

  it('açılır, odağı içeri alır, Escape ile kapanır ve odağı geri verir', async () => {
    const { ue, trigger } = await openSheet();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await ue.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('arka plana (dışarı) tıklamak modalı KAPATMAZ', async () => {
    const { ue } = await openSheet();
    const backdrop = document.querySelector('.modal-backdrop');
    expect(backdrop).not.toBeNull();
    await ue.click(backdrop as Element);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Kapat düğmesiyle kapanır', async () => {
    const { ue } = await openSheet();
    await ue.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Tab ile odak diyalog içinde döner', async () => {
    const { ue } = await openSheet();
    const dialog = screen.getByRole('dialog');
    for (let i = 0; i < 5; i++) {
      await ue.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('erişilebilirlik ihlali içermez', async () => {
    await openSheet();
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it('form adresi yoksa anlaşılır boş durum gösterir, iframe oluşturmaz', async () => {
    await openSheet({});
    expect(screen.getByText('Destek formu henüz eklenmedi')).toBeInTheDocument();
    expect(screen.queryByTitle('Destek Talebi')).not.toBeInTheDocument();
  });
});

describe('Gönderim başarısı (postMessage)', () => {
  const send = (data: unknown, origin: string, fromFrame = true) => {
    const frame = screen.getByTitle('Destek Talebi') as HTMLIFrameElement;
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data,
          origin,
          source: fromFrame ? frame.contentWindow : window,
        }),
      );
    });
  };

  it('formdan gelen başarı mesajında animasyonlu teşekkür ekranı gösterir', async () => {
    await openSheet();
    send({ type: 'submitted' }, ORIGIN);
    expect(await screen.findByText('Talebiniz alındı!')).toBeInTheDocument();
  });

  it('düz metin "success" mesajını da kabul eder', async () => {
    await openSheet();
    send('success', ORIGIN);
    expect(await screen.findByText('Talebiniz alındı!')).toBeInTheDocument();
  });

  it("başka bir origin'den gelen mesajı yok sayar", async () => {
    await openSheet();
    send({ type: 'submitted' }, 'https://kotu-site.example');
    expect(screen.queryByText('Talebiniz alındı!')).not.toBeInTheDocument();
  });

  it('iframe dışından gelen mesajı yok sayar', async () => {
    await openSheet();
    send({ type: 'submitted' }, ORIGIN, false);
    expect(screen.queryByText('Talebiniz alındı!')).not.toBeInTheDocument();
  });

  it('başarı dışındaki mesajları (ör. boyut) yok sayar', async () => {
    await openSheet();
    send({ type: 'resize', height: 900 }, ORIGIN);
    send({ type: 'unsuccessful' }, ORIGIN);
    expect(screen.queryByText('Talebiniz alındı!')).not.toBeInTheDocument();
  });

  it('"Yeni Talep Oluştur" formu yeniden yükler', async () => {
    const { ue } = await openSheet();
    send({ type: 'submitted' }, ORIGIN);
    await ue.click(await screen.findByRole('button', { name: 'Yeni Talep Oluştur' }));
    expect(screen.queryByText('Talebiniz alındı!')).not.toBeInTheDocument();
    expect(screen.getByTitle('Destek Talebi')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Form yükleniyor');
  });
});
