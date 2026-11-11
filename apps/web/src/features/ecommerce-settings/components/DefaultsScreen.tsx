import { useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { SelectField } from '../../../components/ui/SelectField';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { ImagePicker, pickImage, type PickedImage } from './ImagePicker';
import { FieldGrid, SaveBar, ScreenCard } from './Parts';

const currencyOptions = [
  { value: 'TRY', label: '₺ Türk Lirası' },
  { value: 'USD', label: '$ ABD Doları' },
  { value: 'EUR', label: '€ Euro' },
];

/**
 * Varsayılanlar: yeni ürün/müşteri ve sistem için başlangıç değerleri.
 * Seçenekler örnek listedir; gerçek kategori/marka/fiyat listesi backend bağlanınca POS'tan gelir.
 */
export function DefaultsScreen() {
  const [product, setProduct] = useState({
    kategori: '',
    marka: '',
    stokTipi: 'basit',
    alisParaBirimi: 'USD',
    birim: 'ADET',
    paraBirimi: 'USD',
    kdv: '20',
    kdvDahil: false,
    iadeGun: '14',
    stokYokYazisi: 'Stokta Yok',
  });
  const [customer, setCustomer] = useState({
    cariTipi: 'son-kullanici',
    fiyatTanimi: 'FIYAT',
    fiyatSecimi: '1',
    musteriTipi: 'gercek',
    vergiDairesi: '',
    ulke: 'TR',
  });
  const [system, setSystem] = useState({
    stokGosterimi: 'tam',
    satisParaBirimi: 'TRY',
    girisYonlendirme: '',
  });
  const [stockImage, setStockImage] = useState<PickedImage | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <ScreenCard
        title="Ürün Varsayılanları"
        description="Yeni ürün eklenirken seçili gelecek değerler."
      >
        <div className="space-y-5">
          <FieldGrid>
            <SelectField
              label="Kategori"
              value={product.kategori}
              options={[{ value: '', label: 'Kategori seçiniz.' }]}
              onChange={(value) => setProduct({ ...product, kategori: value })}
            />
            <SelectField
              label="Marka"
              value={product.marka}
              options={[{ value: '', label: 'Marka seçiniz.' }]}
              onChange={(value) => setProduct({ ...product, marka: value })}
            />
            <SelectField
              label="Stok Tipi"
              value={product.stokTipi}
              options={[
                { value: 'basit', label: 'Basit Ürün' },
                { value: 'varyantli', label: 'Varyantlı Ürün' },
              ]}
              onChange={(value) => setProduct({ ...product, stokTipi: value })}
            />
            <SelectField
              label="Alış Para Birimi"
              value={product.alisParaBirimi}
              options={currencyOptions}
              onChange={(value) => setProduct({ ...product, alisParaBirimi: value })}
            />
            <SelectField
              label="Birim"
              value={product.birim}
              options={[
                { value: 'ADET', label: 'ADET' },
                { value: 'KG', label: 'KG' },
                { value: 'KUTU', label: 'KUTU' },
              ]}
              onChange={(value) => setProduct({ ...product, birim: value })}
            />
            <SelectField
              label="Para Birimi"
              value={product.paraBirimi}
              options={currencyOptions}
              onChange={(value) => setProduct({ ...product, paraBirimi: value })}
            />
            <SelectField
              label="KDV Oranı"
              value={product.kdv}
              options={['0', '1', '8', '10', '18', '20'].map((value) => ({
                value,
                label: `%${value}`,
              }))}
              onChange={(value) => setProduct({ ...product, kdv: value })}
            />
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">KDV Dahil</span>
              <ToggleSwitch
                label="Fiyatlar KDV dahil"
                checked={product.kdvDahil}
                onChange={(value) => setProduct({ ...product, kdvDahil: value })}
              />
            </div>
            <TextField
              label="İade/Değişim Zamanı (Gün)"
              numeric="integer"
              value={product.iadeGun}
              onChange={(e) => setProduct({ ...product, iadeGun: e.target.value })}
            />
            <TextAreaField
              label="Stok Olmama Yazısı"
              rows={2}
              value={product.stokYokYazisi}
              onChange={(e) => setProduct({ ...product, stokYokYazisi: e.target.value })}
            />
          </FieldGrid>
          <ImagePicker
            label="Stok Olmama Görseli"
            hint="1000×1000 piksel önerilir."
            value={stockImage}
            onPick={(file) => pickImage(stockImage, file, setStockImage)}
            onClear={() => setStockImage(null)}
          />
        </div>
      </ScreenCard>

      <ScreenCard
        title="Müşteri Varsayılanları"
        description="Yeni müşteri kaydında kullanılacak başlangıç değerleri."
      >
        <FieldGrid>
          <SelectField
            label="Cari Tipi"
            value={customer.cariTipi}
            options={[
              { value: 'son-kullanici', label: 'Son Kullanıcı' },
              { value: 'bayi', label: 'Bayi' },
            ]}
            onChange={(value) => setCustomer({ ...customer, cariTipi: value })}
          />
          <SelectField
            label="Fiyat Tanımı"
            value={customer.fiyatTanimi}
            options={[
              { value: 'FIYAT', label: 'FIYAT' },
              { value: 'PERAKENDE', label: 'PERAKENDE' },
              { value: 'TOPTAN', label: 'TOPTAN' },
            ]}
            onChange={(value) => setCustomer({ ...customer, fiyatTanimi: value })}
          />
          <SelectField
            label="Fiyat Seçimi"
            value={customer.fiyatSecimi}
            options={[
              { value: '1', label: 'Fiyat 1' },
              { value: '2', label: 'Fiyat 2' },
              { value: '3', label: 'Fiyat 3' },
            ]}
            onChange={(value) => setCustomer({ ...customer, fiyatSecimi: value })}
          />
          <SelectField
            label="Müşteri Tipi"
            value={customer.musteriTipi}
            options={[
              { value: 'gercek', label: 'Gerçek' },
              { value: 'tuzel', label: 'Tüzel' },
            ]}
            onChange={(value) => setCustomer({ ...customer, musteriTipi: value })}
          />
          <SelectField
            label="Vergi Dairesi"
            value={customer.vergiDairesi}
            options={[{ value: '', label: 'Vergi Dairesi seçiniz.' }]}
            onChange={(value) => setCustomer({ ...customer, vergiDairesi: value })}
          />          <SelectField
            label="Ülke"
            value={customer.ulke}
            options={[
              { value: 'TR', label: 'Türkiye' },
              { value: 'DE', label: 'Almanya' },
              { value: 'NL', label: 'Hollanda' },
            ]}
            onChange={(value) => setCustomer({ ...customer, ulke: value })}
          />
        </FieldGrid>
      </ScreenCard>

      <ScreenCard title="Sistem Varsayılanları">
        <FieldGrid>
          <SelectField
            label="Stok Gösterimi"
            value={system.stokGosterimi}
            options={[
              { value: 'tam', label: 'Tam Stok Göster' },
              { value: 'adet', label: 'Yalnızca Adet Göster' },
            ]}
            onChange={(value) => setSystem({ ...system, stokGosterimi: value })}
          />
          <SelectField
            label="Satış Para Birimi"
            value={system.satisParaBirimi}
            options={currencyOptions}
            onChange={(value) => setSystem({ ...system, satisParaBirimi: value })}
          />
          <div className="sm:col-span-2">
            <SelectField
              label="Giriş Yönlendirme Adresi"
              value={system.girisYonlendirme}
              options={[{ value: '', label: 'Giriş Yönlendirme Adresi seçiniz.' }]}
              onChange={(value) => setSystem({ ...system, girisYonlendirme: value })}
            />
          </div>
        </FieldGrid>
      </ScreenCard>

      <Alert tone="info">
        Kategori, marka ve para birimi seçenekleri backend bağlanınca POS’taki gerçek listelerden
        gelecek; bu ekran ürün veya fiyat kaydı oluşturmaz.
      </Alert>
      <SaveBar label="Kaydet" />
    </div>
  );
}
