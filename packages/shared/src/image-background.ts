/**
 * Ürün fotoğrafının arkasındaki açık renkli fonu saydam yapar.
 *
 * Neden satır bazlı model: stüdyo çekimlerinde fon çoğu zaman düz beyaz değil, yukarıdan aşağıya
 * koyulaşan bir gradyandır. Tek bir "beyaz" eşiği kullanmak ya fonun bir kısmını bırakır ya da
 * beyaz/açık gri ürünün gövdesini yer. Bu yüzden her satırın iki ucundaki fon rengi ölçülür ve sel
 * yalnızca bu renge ÇOK yakın (6/255) piksellerde ilerler. Eşik dar tutulur; böylece kalem gövdesi
 * gibi açık gri ürünler korunur.
 *
 * Kenar: sel sınırındaki yarım saydam pikseller doğrudan silinmez; fon rengi renkten arındırılır ve
 * kapsama oranına göre saydamlık verilir. Böylece ürünün silueti bir piksel bile incelmez (eski
 * sürümde ürünün dış hattı yeniyordu).
 *
 * Kapalı delikler: çanta kulpu gibi nesnenin içinde kalan, dış fonla neredeyse aynı renkteki büyük
 * ve tek düze alanlar da fon sayılır. Küçük beyaz detaylar (logo, etiket) ve ürünün açık renkli iç
 * yüzeyleri korunur; bu yüzden delik rengi dış fonla en fazla 4/255 farklı olabilir.
 */
export function clearWhiteBackground(data: Uint8ClampedArray, width: number, height: number) {
  const total = width * height;
  if (total === 0 || width < 3 || height < 3) return;

  // Doygunluk ve parlaklık bir kez hesaplanır; sel ve delik taraması bunları kullanır.
  const lum = new Float32Array(total);
  const sat = new Uint8Array(total);
  for (let i = 0, offset = 0; i < total; i++, offset += 4) {
    const r = data[offset]!;
    const g = data[offset + 1]!;
    const b = data[offset + 2]!;
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    sat[i] = Math.max(r, g, b) - Math.min(r, g, b);
  }

  // 1) Satır bazlı fon rengi: her satırın sol/sağ 3 pikselinden nötr ve açık olanların medyanı.
  const model = new Float32Array(height * 3);
  const valid = new Uint8Array(height);
  const rs = new Float32Array(6);
  const gs = new Float32Array(6);
  const bs = new Float32Array(6);
  for (let y = 0; y < height; y++) {
    let count = 0;
    const add = (x: number) => {
      const i = y * width + x;
      if (sat[i]! > 45 || lum[i]! < 110 || count >= 6) return;
      const offset = i * 4;
      rs[count] = data[offset]!;
      gs[count] = data[offset + 1]!;
      bs[count] = data[offset + 2]!;
      count++;
    };
    for (let x = 0; x < 3; x++) add(x);
    for (let x = Math.max(3, width - 3); x < width; x++) add(x);
    if (count < 2) continue;
    const mid = count >> 1;
    model[y * 3] = medianOf(rs, count, mid);
    model[y * 3 + 1] = medianOf(gs, count, mid);
    model[y * 3 + 2] = medianOf(bs, count, mid);
    valid[y] = 1;
  }
  if (!valid.some((v) => v === 1)) return; // Fon açık/nötr değil: görsele dokunma.

  // Geçersiz satırlar en yakın geçerli satırdan doldurulur (ürün kenara değmiş olabilir).
  let last = -1;
  for (let y = 0; y < height; y++) {
    if (valid[y]) last = y;
    else if (last >= 0) {
      model[y * 3] = model[last * 3]!;
      model[y * 3 + 1] = model[last * 3 + 1]!;
      model[y * 3 + 2] = model[last * 3 + 2]!;
      valid[y] = 1;
    }
  }
  last = -1;
  for (let y = height - 1; y >= 0; y--) {
    if (valid[y]) last = y;
    else if (last >= 0) {
      model[y * 3] = model[last * 3]!;
      model[y * 3 + 1] = model[last * 3 + 1]!;
      model[y * 3 + 2] = model[last * 3 + 2]!;
      valid[y] = 1;
    }
  }

  // 5 satırlık yumuşatma: JPEG gürültüsü satır modelini titretmesin.
  const smooth = new Float32Array(model);
  for (let y = 0; y < height; y++) {
    const from = Math.max(0, y - 2);
    const to = Math.min(height, y + 3);
    let r = 0;
    let g = 0;
    let b = 0;
    for (let k = from; k < to; k++) {
      r += model[k * 3]!;
      g += model[k * 3 + 1]!;
      b += model[k * 3 + 2]!;
    }
    const n = to - from;
    smooth[y * 3] = r / n;
    smooth[y * 3 + 1] = g / n;
    smooth[y * 3 + 2] = b / n;
  }

  const backdropLight = (y: number): number =>
    0.299 * smooth[y * 3]! + 0.587 * smooth[y * 3 + 1]! + 0.114 * smooth[y * 3 + 2]!;
  const rowDistance = (index: number): number => {
    const y = (index / width) | 0;
    const offset = index * 4;
    const m = y * 3;
    return Math.max(
      Math.abs(data[offset]! - smooth[m]!),
      Math.abs(data[offset + 1]! - smooth[m + 1]!),
      Math.abs(data[offset + 2]! - smooth[m + 2]!),
    );
  };

  // 2) Fon seli: kenardan başlar, satır fonuna çok yakın ve yerel olarak sürekli piksellerde ilerler.
  const background = new Uint8Array(total);
  const queue = new Uint32Array(total);
  let tail = 0;
  for (let i = 0; i < total; i++) {
    if (data[i * 4 + 3] === 0) background[i] = 1; // kaynakta zaten saydam
  }
  const seed = (index: number) => {
    if (background[index]) return;
    if (sat[index]! > 45 || lum[index]! < 110) return;
    if (rowDistance(index) > 10) return;
    background[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }

  let head = 0;
  while (head < tail) {
    const index = queue[head++]!;
    const x = index % width;
    const y = (index / width) | 0;
    const offset = index * 4;
    const cr = data[offset]!;
    const cg = data[offset + 1]!;
    const cb = data[offset + 2]!;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        const next = ny * width + nx;
        if (background[next]) continue;
        if (sat[next]! > 45 || lum[next]! < 110) continue;
        const no = next * 4;
        // Yerel fark: gradyanı takip eder, keskin ürün kenarında durur.
        if (
          Math.abs(data[no]! - cr) > 16 ||
          Math.abs(data[no + 1]! - cg) > 16 ||
          Math.abs(data[no + 2]! - cb) > 16
        )
          continue;
        if (rowDistance(next) > 14) continue;
        background[next] = 1;
        queue[tail++] = next;
      }
    }
  }

  // 3) Kapalı kalan fon delikleri (çanta kulpu, taşıma boşluğu…).
  //    Yalnızca dış fonla neredeyse aynı renkte, büyük ve tek düze alanlar silinir.
  const seen = new Uint8Array(total);
  const holeQueue = new Uint32Array(total);
  const component: number[] = [];
  const minArea = Math.max(120, Math.round(total * 0.0002));
  for (let start = 0; start < total; start++) {
    if (background[start] || seen[start]) continue;
    if (sat[start]! > 35 || lum[start]! < 190) continue;
    let holeTail = 0;
    holeQueue[holeTail++] = start;
    seen[start] = 1;
    component.length = 0;
    let touchesBorder = false;
    let sumLum = 0;
    let sumLumSq = 0;
    let sumDistance = 0;
    while (holeTail > 0) {
      const index = holeQueue[--holeTail]!;
      component.push(index);
      const x = index % width;
      const y = (index / width) | 0;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true;
      const value = lum[index]!;
      sumLum += value;
      sumLumSq += value * value;
      sumDistance += rowDistance(index);
      // 4 komşuluk: ince bir çizgiyle ayrılmış iki bölge birleşmesin.
      if (x > 0) {
        const next = index - 1;
        if (!background[next] && !seen[next] && sat[next]! <= 35 && lum[next]! >= 190) {
          seen[next] = 1;
          holeQueue[holeTail++] = next;
        }
      }
      if (x + 1 < width) {
        const next = index + 1;
        if (!background[next] && !seen[next] && sat[next]! <= 35 && lum[next]! >= 190) {
          seen[next] = 1;
          holeQueue[holeTail++] = next;
        }
      }
      if (y > 0) {
        const next = index - width;
        if (!background[next] && !seen[next] && sat[next]! <= 35 && lum[next]! >= 190) {
          seen[next] = 1;
          holeQueue[holeTail++] = next;
        }
      }
      if (y + 1 < height) {
        const next = index + width;
        if (!background[next] && !seen[next] && sat[next]! <= 35 && lum[next]! >= 190) {
          seen[next] = 1;
          holeQueue[holeTail++] = next;
        }
      }
    }
    if (touchesBorder || component.length < minArea) continue;
    if (backdropLight((start / width) | 0) < 200) continue;
    const count = component.length;
    const mean = sumLum / count;
    const deviation = Math.sqrt(Math.max(0, sumLumSq / count - mean * mean));
    // 240: gerçekten beyaza yakın; 4: dış fonla aynı renk. Açık gri ürün içi bu iki koşulu
    // geçmediği için (ör. kalem gövdesi 248, fon 255) korunur.
    if (mean < 230 || deviation > 10 || sumDistance / count > 6) continue;
    for (const index of component) background[index] = 1;
  }

  // 4) Kenar: fon sınırındaki pikselleri yumuşakça saydamlaştır, ürün siluetini inceltme.
  for (let index = 0; index < total; index++) {
    if (background[index]) {
      data[index * 4 + 3] = 0;
      continue;
    }
    const x = index % width;
    const y = (index / width) | 0;
    let nearBackground = false;
    let backgroundNeighbors = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        if (background[ny * width + nx]) {
          nearBackground = true;
          backgroundNeighbors++;
        }
      }
    }
    if (!nearBackground) continue;

    // Fonun üzerinde kalmış tek tük beyaz gürültü noktaları (JPEG) tamamen silinir.
    if (backgroundNeighbors >= 6 && sat[index]! <= 45 && lum[index]! >= 225) {
      background[index] = 1;
      data[index * 4 + 3] = 0;
      continue;
    }

    const distance = rowDistance(index);
    const offset = index * 4;
    if (distance <= 10) {
      data[offset + 3] = 0;
      continue;
    }

    // Kenar pikseli, fon ile ürün rengi arasındaki karışımdır. Ürün rengi yakındaki güçlü
    // piksellerden tahmin edilir; böylece koyu ürünlerde açık hale, açık ürünlerde siluet kaybı olmaz.
    let objectR = 0;
    let objectG = 0;
    let objectB = 0;
    let objectCount = 0;
    for (let dy = -2; dy <= 2; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        const neighbor = ny * width + nx;
        if (background[neighbor]) continue;
        if (rowDistance(neighbor) <= 30) continue;
        const neighborOffset = neighbor * 4;
        objectR += data[neighborOffset]!;
        objectG += data[neighborOffset + 1]!;
        objectB += data[neighborOffset + 2]!;
        objectCount++;
        if (objectCount === 4) break;
      }
      if (objectCount === 4) break;
    }
    // Yakında güçlü renk yoksa (açık/ince ürün) piksel olduğu gibi bırakılır: siluet kırpılmaz.
    if (objectCount === 0) continue;

    const m = y * 3;
    const backdropR = smooth[m]!;
    const backdropG = smooth[m + 1]!;
    const backdropB = smooth[m + 2]!;
    const directionR = objectR / objectCount - backdropR;
    const directionG = objectG / objectCount - backdropG;
    const directionB = objectB / objectCount - backdropB;
    const denominator = directionR * directionR + directionG * directionG + directionB * directionB;
    if (denominator < 1) continue;
    const valueR = data[offset]!;
    const valueG = data[offset + 1]!;
    const valueB = data[offset + 2]!;
    // Kapsama oranı: pikselin fon→ürün doğrusu üzerindeki izdüşümü (0 = fon, 1 = ürün).
    const coverage = Math.max(
      0,
      Math.min(
        1,
        ((valueR - backdropR) * directionR +
          (valueG - backdropG) * directionG +
          (valueB - backdropB) * directionB) /
          denominator,
      ),
    );
    if (coverage < 0.3) {
      data[offset + 3] = 0;
      continue;
    }
    // Fon katkısı renkten çıkarılır; düşük kapsama oranında bölme rengi karartmasın diye
    // payda en az 0,6 kabul edilir (kenarda siyah leke oluşmaz).
    const strength = Math.max(coverage, 0.6);
    const objectBaseR = objectR / objectCount;
    const objectBaseG = objectG / objectCount;
    const objectBaseB = objectB / objectCount;
    const resultR = Math.round((valueR - backdropR * (1 - coverage)) / strength);
    const resultG = Math.round((valueG - backdropG * (1 - coverage)) / strength);
    const resultB = Math.round((valueB - backdropB * (1 - coverage)) / strength);
    const objectLum = 0.299 * objectBaseR + 0.587 * objectBaseG + 0.114 * objectBaseB;
    const resultLum = 0.299 * resultR + 0.587 * resultG + 0.114 * resultB;
    // Fon çıkarınca renk nesneye göre aşırı koyulaşıyorsa (ör. çantanın gri paneli) sonuç
    // siyah lekeye dönüşür; bu durumda komşu nesne rengi kullanılır.
    const tooDark = resultLum < objectLum * 0.55;
    data[offset] = Math.max(0, Math.min(255, tooDark ? Math.round(objectBaseR) : resultR));
    data[offset + 1] = Math.max(0, Math.min(255, tooDark ? Math.round(objectBaseG) : resultG));
    data[offset + 2] = Math.max(0, Math.min(255, tooDark ? Math.round(objectBaseB) : resultB));
    data[offset + 3] = Math.round(coverage * 255);
  }

  // 5) Kenarda kalan açık renkli benekleri temizle (JPEG gürültüsü siluetin dışında kalmasın).
  for (let index = 0; index < total; index++) {
    const offset = index * 4;
    const alpha = data[offset + 3]!;
    if (alpha === 0) continue;
    if (sat[index]! > 45 || lum[index]! < 215) continue;
    const x = index % width;
    const y = (index / width) | 0;
    let clear = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        if (data[(ny * width + nx) * 4 + 3] === 0) clear++;
      }
    }
    // Yarı saydam kenarlarda 3 temiz komşu yeter; tam opakta yalnızca çok açık ve çevresi
    // tamamen boş benekler silinir (ürünün açık renkli yüzeyi korunur).
    const remove = alpha < 255 ? clear >= 3 : clear >= 6 && lum[index]! >= 240;
    if (remove) data[offset + 3] = 0;
  }
}

/** Küçük bir dizinin ilk `count` elemanının medyanı. */
function medianOf(values: Float32Array, count: number, mid: number): number {
  // En fazla 6 eleman: kopyalayıp sıralamak maliyetsizdir.
  const copy = values.slice(0, count).sort();
  return copy[mid]!;
}
