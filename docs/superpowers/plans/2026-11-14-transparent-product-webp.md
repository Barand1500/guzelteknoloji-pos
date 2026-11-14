# Yeni görsel yüklemelerini WebP kaydetme

Kullanıcı kapsamı ürünlerin yanı sıra kategori, marka ve diğer görsel yüklemeleri olarak netleştirdi. Mevcut dosyalar ve DB kayıtları dönüştürülmez; migration/deploy yapılmaz.

- Ortak sunucu işlevi yeni görselleri WebP hazırlar. Ürün yüklemeleri ve marka/kategori/özellik/fırsat/ödeme/site (slider/widget dahil) yüklemelerinin ortak doğrulama yolu bunu kullanır. Eski BLOB taşıması aynen korunur; belge yüklemeleri değişmez.
- Ürünlerde images.products açıksa mevcut beyaz fon temizleme algoritması WebP kodlamadan önce uygulanır. Kapalıyken arka plan korunur. Diğer ekranların mevcut şeffaf önizleme davranışı korunur.
- Beyaz fon temizlemenin saf fonksiyonu shared modülüne taşınır; tarayıcı ve sunucu aynı algoritmayı kullanır.
- EXIF yönü uygulanır; küçük görsel büyütülmez, uzun kenar en fazla 2048 piksel olur. WebP quality90, alphaQuality100; tek kodlama yapılır.
- Dosya/bilet/sıralama ve mevcut kayıtların MIME okuma akışı korunur. Yeni dosya .webp olur. Hata sessizce başarı sayılmaz. Eşzamanlı işlemler bellek için sınırlanır.
- Ürün ayarı ve yükleme ekranları kalıcı şeffaflığı açıklar. Önceden yüklenen görseller topluca değiştirilmez.
- Gerçek PNG/JPEG/WebP/SVG girdisi, alfa, boyut ve API dosya/bilet akışı; mevcut önizleme/toplu yükleme testleri ve typecheck ile doğrulanır.