import { lazy, Suspense, useRef, useState } from "react";
import Papa from "papaparse";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges } from "@react-three/drei";
import { Trash2, Plus, Upload, QrCode, Pencil, PackageX, Layers, LayersIcon, ScanQrCode, Loader2 } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import type { Barang } from "../../types";

const QrScanDialog = lazy(() => import("./QrScanDialog").then((m) => ({ default: m.QrScanDialog })));
const QrLabelDialog = lazy(() => import("./QrLabelDialog").then((m) => ({ default: m.QrLabelDialog })));

function DialogLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-xs text-neutral-500">
      <Loader2 className="h-4 w-4 animate-spin" /> Memuat modul QR…
    </div>
  );
}

const emptyForm = { nama: "", panjang: "", lebar: "", tinggi: "", berat: "", quantity: "1", stackable: true, orientable: false, fragilityLevel: "normal", bottomAxis: null as string | null, bottomFaceIndex: null as number | null };


function BarangCanvas({ w, h, d, bottomFaceIndex, setBottomFace, fragilityLevel }: { w: number, h: number, d: number, bottomFaceIndex: number | null, setBottomFace: (axis: string, faceIndex: number) => void, fragilityLevel: string }) {
  const maxDim = Math.max(w, h, d) || 1;
  const scale = 2 / maxDim;
  const sw = w * scale || 1;
  const sh = h * scale || 1;
  const sd = d * scale || 1;

  const handleClick = (e: any) => {
    e.stopPropagation();
    const fIdx = e.face?.materialIndex;
    if (fIdx === 0 || fIdx === 1) setBottomFace("panjang", fIdx);
    else if (fIdx === 2 || fIdx === 3) setBottomFace("tinggi", fIdx);
    else if (fIdx === 4 || fIdx === 5) setBottomFace("lebar", fIdx);
  };

  const color = fragilityLevel !== "normal" ? "#e8926b" : "#5b8def";
  const hlColor = "#ef4444"; // Red highlight

  const mats = Array(6).fill(null).map((_, i) => {
    const highlight = i === bottomFaceIndex;
    return <meshStandardMaterial key={i} attach={`material-${i}`} color={highlight ? hlColor : color} opacity={highlight ? 0.9 : 0.7} transparent />;
  });

  return (
    <group>
      <mesh onClick={handleClick}>
        <boxGeometry args={[sw, sh, sd]} />
        {mats}
        <Edges color="#0d1414" />
      </mesh>
    </group>
  );
}

export function Step4Barang({ onAdvance }: { onAdvance?: () => void }) {
  const { pengirimanList, barangList, addBarang, addBarangBulk, updateBarang, removeBarang } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);

  const [pengirimanId, setPengirimanId] = useState(pengirimanList[0]?.id ?? "");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [editBarang, setEditBarang] = useState<Barang | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [labelBarang, setLabelBarang] = useState<Barang | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  const itemsForPengiriman = barangList.filter((b) => b.pengirimanId === pengirimanId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(form.panjang);
    const l = parseFloat(form.lebar);
    const t = parseFloat(form.tinggi);
    const berat = parseFloat(form.berat);
    const qty = parseInt(form.quantity, 10);
    if (!pengirimanId) {
      setError("Pilih pengiriman terlebih dahulu.");
      return;
    }
    if (!form.nama.trim() || !p || !l || !t || !berat || !qty || p <= 0 || l <= 0 || t <= 0 || berat <= 0 || qty <= 0) {
      setError("Lengkapi semua kolom barang dengan nilai valid.");
      return;
    }
    setError(null);
    addBarang({
      pengirimanId,
      namaBarang: form.nama.trim(),
      panjang: p,
      lebar: l,
      tinggi: t,
      berat,
      quantity: qty,
      bisaDitumpuk: form.stackable,
      orientable: form.orientable,
      bottomAxis: form.bottomAxis,
      bottomFaceIndex: form.bottomFaceIndex
    });
    setForm(emptyForm);
    onAdvance?.();
  };

  const handleCsv = (file: File) => {
    if (!pengirimanId) {
      setError("Pilih pengiriman sebelum import CSV.");
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = (result.data as Record<string, string>[])
          .map((row) => ({
            pengirimanId,
            namaBarang: row.nama_barang?.trim() || row.namaBarang?.trim() || "Barang",
            panjang: parseFloat(row.panjang),
            lebar: parseFloat(row.lebar),
            tinggi: parseFloat(row.tinggi),
            berat: parseFloat(row.berat),
            quantity: parseInt(row.quantity, 10) || 1,
            bisaDitumpuk: /^(1|true|ya|y)$/i.test((row.bisa_ditumpuk || row.bisaDitumpuk || "true").trim()),
            orientable: /^(1|true|ya|y)$/i.test((row.boleh_miring || row.orientable || "false").trim()),
          }))
          .filter((r) => r.panjang > 0 && r.lebar > 0 && r.tinggi > 0 && r.berat > 0);
        if (rows.length) {
          addBarangBulk(rows);
          onAdvance?.();
        }
      },
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-2 h-fit">
        <CardHeader>
          <CardTitle>Data Barang</CardTitle>
          <CardDescription>Setiap pengiriman memiliki daftar barangnya sendiri.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="pengiriman">Pengiriman</Label>
            <Select id="pengiriman" value={pengirimanId} onChange={(e) => setPengirimanId(e.target.value)}>
              <option value="">— Pilih pengiriman —</option>
              {pengirimanList.map((p) => (
                <option key={p.id} value={p.id}>{p.id} · {p.kodePengiriman}</option>
              ))}
            </Select>
            {pengirimanList.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-500/80">
                Buat data pengiriman terlebih dahulu di step sebelumnya.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="namaBarang">Nama Barang</Label>
              <Input
                id="namaBarang"
                value={form.nama}
                onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                placeholder="cth. Kardus Elektronik"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="pBarang">Panjang (cm)</Label>
                <Input id="pBarang" type="number" min={0} value={form.panjang} onChange={(e) => setForm((f) => ({ ...f, panjang: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="lBarang">Lebar (cm)</Label>
                <Input id="lBarang" type="number" min={0} value={form.lebar} onChange={(e) => setForm((f) => ({ ...f, lebar: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="tBarang">Tinggi (cm)</Label>
                <Input id="tBarang" type="number" min={0} value={form.tinggi} onChange={(e) => setForm((f) => ({ ...f, tinggi: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="berat">Berat / item (kg)</Label>
                <Input id="berat" type="number" min={0} value={form.berat} onChange={(e) => setForm((f) => ({ ...f, berat: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="qty">Quantity</Label>
                <Input id="qty" type="number" min={1} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.stackable}
                  onChange={(e) => setForm((f) => ({ ...f, stackable: e.target.checked }))}
                  className="h-3.5 w-3.5 rounded border-neutral-700 accent-teal-400"
                />
                Bisa ditumpuk (stackable)
              </label>
              <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer select-none" title="Jika dicentang, AI dapat membaringkan barang secara miring untuk menghemat ruang">
                <input
                  type="checkbox"
                  checked={form.orientable}
                  onChange={(e) => setForm((f) => ({ ...f, orientable: e.target.checked }))}
                  className="h-3.5 w-3.5 rounded border-neutral-700 accent-teal-400"
                />
                Boleh dimiringkan (orientable)
              </label>
            </div>
            
            <div className="h-48 w-full bg-neutral-900 rounded-md overflow-hidden relative mt-2 mb-2 border border-neutral-800">
              <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 10]} intensity={1} />
                <OrbitControls enableZoom={true} enablePan={false} />
                <BarangCanvas 
                  w={parseFloat(form.panjang) || 10} 
                  h={parseFloat(form.tinggi) || 10} 
                  d={parseFloat(form.lebar) || 10} 
                  bottomFaceIndex={form.bottomFaceIndex}
                  setBottomFace={(axis, idx) => setForm(f => ({ ...f, bottomAxis: axis, bottomFaceIndex: idx }))}
                  fragilityLevel={form.stackable ? "normal" : "fragile"}
                />
              </Canvas>
              <div className="absolute bottom-2 left-2 text-[10px] text-neutral-400 pointer-events-none bg-black/50 px-2 py-1 rounded">
                Klik sisi untuk jadikan alas (merah). Putar dengan mouse.
              </div>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={!pengirimanId}>
              <Plus className="h-4 w-4" /> Tambah Barang
            </Button>
          </form>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} disabled={!pengirimanId}>
              <Upload className="h-3.5 w-3.5" /> CSV
            </Button>
            <Dialog open={scanOpen} onOpenChange={setScanOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!pengirimanId}
                  onClick={() => setScanNotice(null)}
                >
                  <QrCode className="h-3.5 w-3.5" /> Scan QR
                </Button>
              </DialogTrigger>
              <DialogContent title="Scan QR Barang" description="Arahkan kamera ke label QR atau unggah gambar QR.">
                <Suspense fallback={<DialogLoading />}>
                  <QrScanDialog
                    onDetected={(payload) => {
                      if (!pengirimanId) return;
                      addBarang({ pengirimanId, ...payload });
                      setScanNotice(`"${payload.namaBarang}" berhasil ditambahkan dari QR.`);
                      onAdvance?.();
                    }}
                    onClose={() => setScanOpen(false)}
                  />
                </Suspense>
              </DialogContent>
            </Dialog>
          </div>
          {scanNotice && (
            <p className="flex items-center gap-1.5 text-[11px] text-teal-300">
              <ScanQrCode className="h-3 w-3" /> {scanNotice}
            </p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleCsv(e.target.files[0])}
          />
          <p className="text-[11px] text-neutral-600">
            Kolom CSV: nama_barang, panjang, lebar, tinggi, berat, quantity, bisa_ditumpuk, boleh_miring
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>
            Daftar Barang {pengirimanId && `— ${pengirimanList.find((p) => p.id === pengirimanId)?.kodePengiriman}`} ({itemsForPengiriman.length})
          </CardTitle>
          <CardDescription>Tabel barang khusus untuk pengiriman yang dipilih.</CardDescription>
        </CardHeader>
        <CardContent>
          {!pengirimanId ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-neutral-600">
              <PackageX className="h-6 w-6" />
              <p className="text-xs">Pilih pengiriman untuk melihat daftar barangnya.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Dimensi</TableHead>
                  <TableHead>Berat</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Tumpuk</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsForPengiriman.length === 0 && (
                  <TableEmpty colSpan={7}>Belum ada barang untuk pengiriman ini.</TableEmpty>
                )}
                {itemsForPengiriman.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs text-teal-300">{b.id}</TableCell>
                    <TableCell>{b.namaBarang}</TableCell>
                    <TableCell className="text-neutral-400">
                      {b.panjang}×{b.lebar}×{b.tinggi} cm
                    </TableCell>
                    <TableCell>{b.berat} kg</TableCell>
                    <TableCell>{b.quantity}</TableCell>
                    <TableCell>
                      {b.bisaDitumpuk ? (
                        <Layers className="h-3.5 w-3.5 text-teal-400" />
                      ) : (
                        <LayersIcon className="h-3.5 w-3.5 text-neutral-700" />
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                      <Dialog open={labelBarang?.id === b.id} onOpenChange={(open) => !open && setLabelBarang(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => setLabelBarang(b)} title="Lihat label QR">
                            <QrCode className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        {labelBarang?.id === b.id && (
                          <DialogContent title="Label QR Barang" description="Cetak/tempel pada kemasan untuk memudahkan input ulang via scan.">
                            <Suspense fallback={<DialogLoading />}>
                              <QrLabelDialog barang={labelBarang} />
                            </Suspense>
                          </DialogContent>
                        )}
                      </Dialog>
                      <Dialog open={editBarang?.id === b.id} onOpenChange={(open) => !open && setEditBarang(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => setEditBarang(b)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        {editBarang?.id === b.id && (
                          <DialogContent title="Edit Barang" description={b.namaBarang}>
                            <EditBarangForm
                              barang={editBarang}
                              onSave={(data) => {
                                updateBarang(b.id, data);
                                setEditBarang(null);
                              }}
                            />
                          </DialogContent>
                        )}
                      </Dialog>
                      <Button variant="destructive" size="icon" onClick={() => removeBarang(b.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EditBarangForm({
  barang,
  onSave,
}: {
  barang: Barang;
  onSave: (data: Partial<Barang>) => void;
}) {
  const [nama, setNama] = useState(barang.namaBarang);
  const [panjang, setPanjang] = useState(String(barang.panjang));
  const [lebar, setLebar] = useState(String(barang.lebar));
  const [tinggi, setTinggi] = useState(String(barang.tinggi));
  const [berat, setBerat] = useState(String(barang.berat));
  const [quantity, setQuantity] = useState(String(barang.quantity));
  
  const [stackable, setStackable] = useState(barang.bisaDitumpuk);
  const [orientable, setOrientable] = useState(barang.orientable ?? false);
  const [bottomAxis, setBottomAxis] = useState<string | null>(barang.bottomAxis || null);
  const [bottomFaceIndex, setBottomFaceIndex] = useState<number | null>(barang.bottomFaceIndex ?? null);


  return (
    <div className="space-y-3">
      <div>
        <Label>Nama Barang</Label>
        <Input value={nama} onChange={(e) => setNama(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label>Panjang</Label>
          <Input type="number" value={panjang} onChange={(e) => setPanjang(e.target.value)} />
        </div>
        <div>
          <Label>Lebar</Label>
          <Input type="number" value={lebar} onChange={(e) => setLebar(e.target.value)} />
        </div>
        <div>
          <Label>Tinggi</Label>
          <Input type="number" value={tinggi} onChange={(e) => setTinggi(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Berat (kg)</Label>
          <Input type="number" value={berat} onChange={(e) => setBerat(e.target.value)} />
        </div>
        <div>
          <Label>Quantity</Label>
          <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={stackable}
            onChange={(e) => setStackable(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-neutral-700 accent-teal-400"
          />
          Bisa ditumpuk (stackable)
        </label>
        <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={orientable}
            onChange={(e) => setOrientable(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-neutral-700 accent-teal-400"
          />
          Boleh dimiringkan (orientable)
        </label>
      </div>
      <div className="h-40 w-full bg-neutral-900 rounded-md overflow-hidden relative mt-2 mb-2 border border-neutral-800">
        <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1} />
          <OrbitControls enableZoom={true} enablePan={false} />
          <BarangCanvas 
            w={parseFloat(panjang) || 10} 
            h={parseFloat(tinggi) || 10} 
            d={parseFloat(lebar) || 10} 
            bottomFaceIndex={bottomFaceIndex}
            setBottomFace={(axis, idx) => { setBottomAxis(axis); setBottomFaceIndex(idx); }}
            fragilityLevel={stackable ? "normal" : "fragile"}
          />
        </Canvas>
      </div>

      <Button
        className="w-full"
        onClick={() =>
          onSave({
            namaBarang: nama.trim(),
            panjang: parseFloat(panjang) || barang.panjang,
            lebar: parseFloat(lebar) || barang.lebar,
            tinggi: parseFloat(tinggi) || barang.tinggi,
            berat: parseFloat(berat) || barang.berat,
            quantity: parseInt(quantity, 10) || barang.quantity,
            bisaDitumpuk: stackable,
            orientable: orientable,
            fragilityLevel: stackable ? "normal" : "fragile",
            bottomAxis,
            bottomFaceIndex,
          })
        }
      >
        Simpan Perubahan
      </Button>
    </div>
  );
}
