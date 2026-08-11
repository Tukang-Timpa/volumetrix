import { useRef, useState } from "react";
import Papa from "papaparse";
import { Trash2, Upload, Plus, FileSpreadsheet, Pencil } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { KAROSERI_LABEL, type JenisKaroseri, type Karoseri } from "../../types";

const JENIS_OPTIONS = Object.entries(KAROSERI_LABEL) as [JenisKaroseri, string][];

interface KaroseriEdit {
  id: string;
  jenis: JenisKaroseri;
  panjang: string;
  lebar: string;
  tinggi: string;
  jumlah: string;
}

export function Step1Karoseri({ onAdvance }: { onAdvance?: () => void }) {
  const { karoseriList, armadaList, addKaroseri, addKaroseriBulk, removeKaroseri, updateKaroseri, updateKaroseriStatus } =
    useAppData();
  const fileRef = useRef<HTMLInputElement>(null);

  const [jenis, setJenis] = useState<JenisKaroseri>("box");
  const [panjang, setPanjang] = useState("");
  const [lebar, setLebar] = useState("");
  const [tinggi, setTinggi] = useState("");
  const [jumlah, setJumlah] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<KaroseriEdit | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(panjang);
    const l = parseFloat(lebar);
    const t = parseFloat(tinggi);
    const j = parseInt(jumlah, 10);
    if (!p || !l || !t || !j || p <= 0 || l <= 0 || t <= 0 || j <= 0) {
      setError("Isi dimensi dan jumlah dengan angka lebih besar dari 0.");
      return;
    }
    setError(null);
    addKaroseri({ jenis, panjang: p, lebar: l, tinggi: t, jumlah: j });
    setPanjang("");
    setLebar("");
    setTinggi("");
    setJumlah("1");
    onAdvance?.();
  };

  const handleCsv = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = (result.data as Record<string, string>[])
          .map((row) => ({
            jenis: (row.jenis?.trim() as JenisKaroseri) || "box",
            panjang: parseFloat(row.panjang),
            lebar: parseFloat(row.lebar),
            tinggi: parseFloat(row.tinggi),
            jumlah: parseInt(row.jumlah, 10) || 1,
          }))
          .filter((r) => r.panjang > 0 && r.lebar > 0 && r.tinggi > 0);
        if (rows.length) addKaroseriBulk(rows);
        if (rows.length) onAdvance?.();
      },
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const openEdit = (k: Karoseri) => {
    setEdit({
      id: k.id,
      jenis: k.jenis,
      panjang: String(k.panjang),
      lebar: String(k.lebar),
      tinggi: String(k.tinggi),
      jumlah: String(k.jumlah),
    });
    setEditError(null);
  };

  const saveEdit = () => {
    if (!edit) return;
    const p = parseFloat(edit.panjang);
    const l = parseFloat(edit.lebar);
    const t = parseFloat(edit.tinggi);
    const j = parseInt(edit.jumlah, 10);
    if (!p || !l || !t || !j || p <= 0 || l <= 0 || t <= 0 || j <= 0) {
      setEditError("Isi dimensi dan jumlah dengan angka lebih besar dari 0.");
      return;
    }
    const allocated = armadaList
      .filter((a) => a.karoseriId === edit.id)
      .reduce((sum, a) => sum + Math.max(1, a.jumlah ?? 1), 0);
    if (j < allocated) {
      setEditError(`Jumlah tidak boleh kurang dari ${allocated} unit yang sudah dipakai armada.`);
      return;
    }
    updateKaroseri(edit.id, { jenis: edit.jenis, panjang: p, lebar: l, tinggi: t, jumlah: j });
    setEdit(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Form input */}
      <Card className="lg:col-span-2 h-fit">
        <CardHeader>
          <CardTitle>Data Karoseri</CardTitle>
          <CardDescription>
            Tambahkan jenis karoseri / kontainer beserta dimensinya.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="jenis">Jenis Karoseri</Label>
              <Select id="jenis" value={jenis} onChange={(e) => setJenis(e.target.value as JenisKaroseri)}>
                {JENIS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="panjang">Panjang (cm)</Label>
                <Input id="panjang" type="number" min={0} value={panjang} onChange={(e) => setPanjang(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label htmlFor="lebar">Lebar (cm)</Label>
                <Input id="lebar" type="number" min={0} value={lebar} onChange={(e) => setLebar(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label htmlFor="tinggi">Tinggi (cm)</Label>
                <Input id="tinggi" type="number" min={0} value={tinggi} onChange={(e) => setTinggi(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div>
              <Label htmlFor="jumlah">Jumlah Unit</Label>
              <Input id="jumlah" type="number" min={1} value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" /> Tambah Karoseri
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className="bg-neutral-900 px-2 text-neutral-600">atau</span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Import via CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleCsv(e.target.files[0])}
          />
          <p className="flex items-center gap-1.5 text-[11px] text-neutral-600">
            <FileSpreadsheet className="h-3 w-3" /> Kolom: jenis, panjang, lebar, tinggi, jumlah
          </p>
        </CardContent>
      </Card>

      {/* Tabel */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Daftar Karoseri ({karoseriList.length})</CardTitle>
          <CardDescription>Setiap entri mendapat ID unik otomatis.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Dimensi (P×L×T)</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {karoseriList.length === 0 && <TableEmpty colSpan={6}>Belum ada data karoseri.</TableEmpty>}
              {karoseriList.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-mono text-xs text-teal-300">{k.id}</TableCell>
                  <TableCell>{KAROSERI_LABEL[k.jenis]}</TableCell>
                  <TableCell className="text-neutral-400">
                    {k.panjang} × {k.lebar} × {k.tinggi} cm
                  </TableCell>
                  <TableCell>{k.jumlah}</TableCell>
                  <TableCell>
                    <Select
                      value={k.status}
                      onChange={(e) => updateKaroseriStatus(k.id, e.target.value as typeof k.status)}
                      className="h-7 w-[110px] text-[11px] py-0"
                    >
                      <option value="aktif">Aktif</option>
                      <option value="ready">Ready</option>
                      <option value="maintenance">Maintenance</option>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                    <Dialog open={edit?.id === k.id} onOpenChange={(open) => !open && setEdit(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => openEdit(k)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent title="Edit Karoseri" description={`Perbarui data karoseri ${k.id}`}>
                        <div className="space-y-3">
                          <div>
                            <Label>Jenis Karoseri</Label>
                            <Select
                              value={edit?.jenis ?? ""}
                              onChange={(e) =>
                                setEdit((prev) => prev && { ...prev, jenis: e.target.value as JenisKaroseri })
                              }
                            >
                              {JENIS_OPTIONS.map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </Select>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label>Panjang (cm)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={edit?.panjang ?? ""}
                                onChange={(e) => setEdit((prev) => prev && { ...prev, panjang: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Lebar (cm)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={edit?.lebar ?? ""}
                                onChange={(e) => setEdit((prev) => prev && { ...prev, lebar: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Tinggi (cm)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={edit?.tinggi ?? ""}
                                onChange={(e) => setEdit((prev) => prev && { ...prev, tinggi: e.target.value })}
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Jumlah Unit</Label>
                            <Input
                              type="number"
                              min={1}
                              value={edit?.jumlah ?? ""}
                              onChange={(e) => setEdit((prev) => prev && { ...prev, jumlah: e.target.value })}
                            />
                          </div>
                          {editError && <p className="text-xs text-red-400">{editError}</p>}
                          <Button className="w-full" onClick={saveEdit}>Simpan Perubahan</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="icon" onClick={() => removeKaroseri(k.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
