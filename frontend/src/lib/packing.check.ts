import assert from "node:assert";
import { packAllContainers, packMultiContainer, type Box } from "./packing.ts";
import type { Barang } from "../types";

const barang = (id: string, stackable: boolean): Barang => ({
  id,
  pengirimanId: "PGR-0001",
  namaBarang: id,
  panjang: 10,
  lebar: 10,
  tinggi: 10,
  berat: 5,
  quantity: 1,
  bisaDitumpuk: stackable,
  createdAt: 0,
});

const k20: Box = { w: 20, h: 20, d: 20 };

// Non-stackable tidak ditindih: dua barang non-stackable harus berdampingan, bukan menumpuk.
{
  const { perContainer, unplacedCount } = packMultiContainer(
    [barang("BRG-1", false), barang("BRG-2", false)],
    [k20]
  );
  assert.strictEqual(unplacedCount, 0, "dua non-stackable harus muat berdampingan");
  assert.ok(perContainer[0].every((i) => i.y === 0), "non-stackable tidak boleh di atas barang lain");
}

// Non-stackable yang hanya muat di atas non-stackable lain = leftover.
{
  const narrow: Box = { w: 10.5, h: 20, d: 10.5 };
  const { perContainer, unplacedCount } = packMultiContainer(
    [barang("BRG-1", false), barang("BRG-2", false)],
    [narrow]
  );
  assert.strictEqual(perContainer[0].length, 1, "hanya satu yang muat di lantai");
  assert.strictEqual(unplacedCount, 1, "yang satunya tidak boleh menumpuk di atasnya");
}

// Non-stackable boleh di atas stackable, tapi tidak boleh ada yang menimpa non-stackable.
{
  const column: Box = { w: 10, h: 20, d: 10 };
  const { perContainer, unplacedCount } = packMultiContainer(
    [barang("BRG-S1", true), barang("BRG-N1", false), barang("BRG-S2", true)],
    [column]
  );
  const n1 = perContainer[0].find((i) => i.barangId === "BRG-N1");
  assert.ok(n1, "BRG-N1 seharusnya termuat");
  assert.strictEqual(n1.y, 10, "non-stackable boleh duduk di atas stackable");
  assert.strictEqual(unplacedCount, 1, "stackable ke-2 hanya muat di atas N1 — harus ditolak");
}

// Stackable biasa tetap bisa ditumpuk.
{
  const column: Box = { w: 10, h: 20, d: 10 };
  const { perContainer, unplacedCount } = packMultiContainer(
    [barang("BRG-A", true), barang("BRG-B", true)],
    [column]
  );
  assert.strictEqual(unplacedCount, 0);
  const b = perContainer[0].find((i) => i.barangId === "BRG-B");
  assert.ok(b, "BRG-B harus termuat");
  assert.strictEqual(b.y, 10, "stackable harus tetap bisa ditumpuk");
}

// Warna konsisten per barang: dua unit barang yang sama berwarna sama.
{
  const a = barang("BRG-X", true);
  const { perContainer } = packMultiContainer(
    [
      { ...a, quantity: 2 },
      barang("BRG-Y", true),
    ],
    [k20]
  );
  const xs = perContainer[0].filter((i) => i.barangId === "BRG-X");
  const ys = perContainer[0].filter((i) => i.barangId === "BRG-Y");
  assert.ok(xs.length > 1 && ys.length > 0, "kedua barang harus termuat");
  assert.ok(xs.every((i) => i.color === xs[0].color), "unit barang sama harus berwarna sama");
}

// REGRESI bug rekomendasi AI: 32 kulkas (non-stackable) di truk kecil butuh 4
// truk. Dengan 4 truk tersedia (armada.jumlah) → semua harus keangkut,
// kontainer kosong dibuang, tidak ada truk fiktif yang ditambahkan.
{
  const kulkas: Barang = {
    id: "KLK",
    pengirimanId: "PGR-0001",
    namaBarang: "Kulkas",
    panjang: 0.7,
    lebar: 0.7,
    tinggi: 1.8,
    berat: 60,
    quantity: 32,
    bisaDitumpuk: false,
    createdAt: 0,
  };
  const truck: Box = { w: 3.0, h: 1.8, d: 1.8 };

  const { containers, perContainer, unplacedCount } = packAllContainers(
    [kulkas],
    [truck, truck, truck, truck]
  );
  assert.strictEqual(containers.length, 4, "4 truk terpakai");
  assert.strictEqual(unplacedCount, 0, "32 kulkas harus semuanya keangkut");
  assert.ok(perContainer.every((pc) => pc.length > 0), "tidak ada kontainer kosong");
  assert.ok(containers.every((b) => b === truck), "kontainer = referensi armada asli");
}

// Kapasitas armada kurang: cuma 3 truk untuk 32 kulkas → jujur 8 unit sisa,
// TIDAK menambah truk fiktif di luar armada yang tersedia.
{
  const kulkas: Barang = {
    id: "KLK",
    pengirimanId: "PGR-0001",
    namaBarang: "Kulkas",
    panjang: 0.7,
    lebar: 0.7,
    tinggi: 1.8,
    berat: 60,
    quantity: 32,
    bisaDitumpuk: false,
    createdAt: 0,
  };
  const truck: Box = { w: 3.0, h: 1.8, d: 1.8 };
  const { containers, unplacedCount } = packAllContainers([kulkas], [truck, truck, truck]);
  assert.strictEqual(containers.length, 3, "tidak boleh melebihi armada tersedia");
  assert.strictEqual(unplacedCount, 8, "sisa 8 kulkas dilaporkan jujur");
}

// Kapasitas armada benar-benar habis: barang lebih besar dari kontainer harus
// tetap 1 kontainer (tidak menambah kontainer percuma) dan sisa dilaporkan.
{
  const oversized: Barang = { ...barang("BRG-BIG", false), panjang: 30, lebar: 30, tinggi: 30 };
  const tiny: Box = { w: 10, h: 10, d: 10 };
  const { perContainer, unplacedCount } = packAllContainers([oversized], [tiny]);
  assert.strictEqual(perContainer.length, 1, "tidak boleh menambah kontainer tanpa hasil");
  assert.strictEqual(unplacedCount, 1, "barang oversized harus dilaporkan sebagai sisa");
}

// Armada lebih banyak dari kebutuhan: kontainer kosong di akhir dibuang.
{
  const barang2 = (id: string): Barang => ({ ...barang(id, true), quantity: 3 });
  const { containers, perContainer, unplacedCount } = packAllContainers(
    [barang2("BRG-A")],
    [k20, k20, k20, k20]
  );
  assert.strictEqual(unplacedCount, 0);
  assert.strictEqual(perContainer.length, 1, "hanya 1 kontainer terisi");
  assert.strictEqual(containers.length, 1, "kontainer kosong dibuang");
}

console.log("packing.check: semua assertion lulus ✓");