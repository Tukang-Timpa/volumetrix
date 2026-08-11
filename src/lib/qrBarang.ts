/**
 * Format QR code untuk data barang.
 * QR berisi JSON: { n: nama, p: panjang, l: lebar, t: tinggi, b: berat, q: quantity, s: stackable }
 * Juga mendukung format cadangan yang dipisah "|" untuk label yang dicetak manual:
 *   nama|panjang|lebar|tinggi|berat|quantity|stackable(1/0)
 */
export interface BarangQrPayload {
  namaBarang: string;
  panjang: number;
  lebar: number;
  tinggi: number;
  berat: number;
  quantity: number;
  bisaDitumpuk: boolean;
}

export function encodeBarangQr(data: BarangQrPayload): string {
  return JSON.stringify({
    n: data.namaBarang,
    p: data.panjang,
    l: data.lebar,
    t: data.tinggi,
    b: data.berat,
    q: data.quantity,
    s: data.bisaDitumpuk ? 1 : 0,
  });
}

export function decodeBarangQr(raw: string): BarangQrPayload | null {
  const text = raw.trim();
  if (!text) return null;

  // Coba format JSON dulu
  try {
    const obj = JSON.parse(text);
    const namaBarang = String(obj.n ?? obj.namaBarang ?? "").trim();
    const panjang = Number(obj.p ?? obj.panjang);
    const lebar = Number(obj.l ?? obj.lebar);
    const tinggi = Number(obj.t ?? obj.tinggi);
    const berat = Number(obj.b ?? obj.berat);
    const quantity = Number(obj.q ?? obj.quantity ?? 1);
    const bisaDitumpuk = obj.s !== undefined ? Boolean(obj.s) : Boolean(obj.bisaDitumpuk ?? true);

    if (namaBarang && panjang > 0 && lebar > 0 && tinggi > 0 && berat > 0 && quantity > 0) {
      return { namaBarang, panjang, lebar, tinggi, berat, quantity, bisaDitumpuk };
    }
  } catch {
    // lanjut ke format pipe-delimited
  }

  // Format cadangan: nama|panjang|lebar|tinggi|berat|quantity|stackable
  const parts = text.split("|").map((p) => p.trim());
  if (parts.length >= 6) {
    const [namaBarang, p, l, t, b, q, s] = parts;
    const panjang = parseFloat(p);
    const lebar = parseFloat(l);
    const tinggi = parseFloat(t);
    const berat = parseFloat(b);
    const quantity = parseInt(q, 10);
    const bisaDitumpuk = s === undefined ? true : /^(1|true|ya|y)$/i.test(s);

    if (namaBarang && panjang > 0 && lebar > 0 && tinggi > 0 && berat > 0 && quantity > 0) {
      return { namaBarang, panjang, lebar, tinggi, berat, quantity, bisaDitumpuk };
    }
  }

  return null;
}
