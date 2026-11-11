import { useState } from 'react';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { SaveBar, ScreenCard } from './Parts';

/** Header üst yazı: referanstaki tek alan (Yazı) ve kaydet düğmesi. */
export function HeaderTextScreen() {
  const [text, setText] = useState(
    "“Teknolojinin en güzel hali GÜZEL Teknoloji'de!” Akıllı alışverişin adresi — güvenli, hızlı ve uygun fiyatlı.",
  );

  return (
    <ScreenCard
      title="Header Üst Yazı"
      description="İletişim bilgilerinizi buradan güncelleyebilirsiniz."
    >
      <form
        aria-label="Header üst yazı formu"
        className="space-y-5"
        onSubmit={(event) => event.preventDefault()}
      >
        <TextAreaField
          label="Yazı"
          required
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <SaveBar label="Değişiklikleri Kaydet" />
      </form>
    </ScreenCard>
  );
}
