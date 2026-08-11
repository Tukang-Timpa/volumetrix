import { useState } from "react";
import { Trash2, Plus, Pencil } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { ARMADA_LABEL, KAROSERI_LABEL, type Armada, type JenisArmada, type Karoseri } from "../../types";

const JENIS_OPTIONS = Object.entries(ARMADA_LABEL) as [JenisArmada, string][];

interface ArmadaEdit {
  id: string;
  nama: string;
  jenis: JenisArmada;
  karoseriId: string;
  jumlah: string;
  payload: string;
  bbm: string;
}

/** Berapa unit karoseri yang tersisa setelah dipakai armada lain (opsional: kecuali satu armada tertentu). */
function sisaKaroseri(k: Karoseri, armadaList: Armada[], excludeArmadaId?: string): number {
  const used = armadaList
    .filter((a) => a.karoseriId === k.id && a.id !== excludeArmadaId)
    .reduce((sum, a) => sum + Math.max(1, a.jumlah ?? 1), 0);
  return k.jumlah - used;
}

export function Step2Armada({ onAdvance }: { onAdvance?: () => void }) {
  const { armadaList, karoseriList, addArmada, removeArmada, updateArmada } = useAppData();

  const [nama, setNama] = useState("");
  const [jenisArmada, setJenisArmada] = useState<JenisArmada>("cdd");
  const [karoseriId, setKaroseriId] = useState("");
  const [jumlah, setJumlah] = useState("1");
  const [maxPayload, setMaxPayload] = useState("");
  const [konsumsiBbm, setKonsumsiBbm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<ArmadaEdit | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = parseFloat(maxPayload);
    const bbm = parseFloat(konsumsiBbm);
    const jml = parseInt(jumlah, 10);
    const karoseri = karoseriList.find((k) => k.id === karoseriId);
    if (!nama.trim() || !karoseriId || !payload || !bbm || payload <= 0 || bbm <= 0) {
      setError("Lengkapi semua kolom dengan nilai valid, termasuk pilihan karoseri.");
      return;
    }
    if (!jml || jml <= 0) {
      setError("Jumlah armada harus lebih besar dari 0.");
      return;
    }
    if (karoseri) {
      const sisa = sisaKaroseri(karoseri, armadaList);
      if (jml > sisa) {
        setError(`Karoseri ${karoseri.id} hanya tersisa ${sisa} unit (total ${karoseri.jumlah}).`);
        return;
      }
    }
    setError(null);
    addArmada({ namaKendaraan: nama.trim(), jenisArmada, karoseriId, jumlah: jml, maxPayload: payload, konsumsiBbm: bbm });
    setNama("");
    setKaroseriId("");
    setJumlah("1");
    setMaxPayload("");
    setKonsumsiBbm("");
    onAdvance?.();
  };

  const openEdit = (a: Armada) => {
    setEdit({
      id: a.id,
      nama: a.namaKendaraan,
      jenis: a.jenisArmada,
      karoseriId: a.karoseriId,
      jumlah: String(Math.max(1, a.jumlah ?? 1)),
      payload: String(a.maxPayload),
      bbm: String(a.konsumsiBbm),
    });
    setEditError(null);
  };

  const saveEdit = () => {
    if (!edit) return;
    const payload = parseFloat(edit.payload);
    const bbm = parseFloat(edit.bbm);
    const jml = parseInt(edit.jumlah, 10);
    const karoseri = karoseriList.find((k) => k.id === edit.karoseriId);
    if (!edit.nama.trim() || !edit.karoseriId || !payload || !bbm || payload <= 0 || bbm <= 0) {
      setEditError("Lengkapi semua kolom dengan nilai valid, termasuk pilihan karoseri.");
      return;
    }
    if (!jml || jml <= 0) {
      setEditError("Jumlah armada harus lebih besar dari 0.");
      return;
    }
    if (karoseri) {
      const sisa = sisaKaroseri(karoseri, armadaList, edit.id);
      if (jml > sisa) {
        setEditError(`Karoseri ${karoseri.id} hanya tersisa ${sisa} unit (total ${karoseri.jumlah}).`);
        return;
      }
    }
    updateArmada(edit.id, {
      namaKendaraan: edit.nama.trim(),
      jenisArmada: edit.jenis,
      karoseriId: edit.karoseriId,
      jumlah: jml,
      maxPayload: payload,
      konsumsiBbm: bbm,
    });
    setEdit(null);
  };

  const totalUnit = armadaList.reduce((sum, a) => sum + Math.max(1, a.jumlah ?? 1), 0);

  const karoseriOption = (k: Karoseri, excludeArmadaId?: string) => {
    const sisa = sisaKaroseri(k, armadaList, excludeArmadaId);
    return (
      <option key={k.id} value={k.id} disabled={sisa <= 0}>
        {k.id} · {KAROSERI_LABEL[k.jenis]} ({k.panjang}×{k.lebar}×{k.tinggi}) — sisa {sisa}
      </option>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-2 h-fit">
        <CardHeader>
          <CardTitle>Data Armada</CardTitle>
          <CardDescription>Daftarkan kendaraan beserta karoseri yang digunakan.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="nama">Nama Kendaraan</Label>
              <Input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="cth. B 9012 XYZ" />
            </div>
            <div>
              <Label htmlFor="jenisArmada">Jenis Armada</Label>
              <Select id="jenisArmada" value={jenisArmada} onChange={(e) => setJenisArmada(e.target.value as JenisArmada)}>
                {JENIS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="karoseri">Karoseri Digunakan</Label>
              <Select id="karoseri" value={karoseriId} onChange={(e) => setKaroseriId(e.target.value)}>
                <option value="">— Pilih karoseri —</option>
                {karoseriList.map((k) => karoseriOption(k))}
              </Select>
              {karoseriList.length === 0 && (
                <p className="mt-1 text-[11px] text-amber-500/80">
                  Tambahkan data karoseri terlebih dahulu di step sebelumnya.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="jumlah">Jumlah Armada</Label>
              <Input id="jumlah" type="number" min={1} value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="payload">Max Payload (kg)</Label>
                <Input id="payload" type="number" min={0} value={maxPayload} onChange={(e) => setMaxPayload(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="bbm">Konsumsi BBM (km/L)</Label>
                <Input id="bbm" type="number" min={0} value={konsumsiBbm} onChange={(e) => setKonsumsiBbm(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={karoseriList.length === 0}>
              <Plus className="h-4 w-4" /> Tambah Armada
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Daftar Armada ({armadaList.length} record · {totalUnit} unit)</CardTitle>
          <CardDescription>Data armada dapat diedit kapan saja.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Kendaraan</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Karoseri</TableHead>
                <TableHead>Payload</TableHead>
                <TableHead>BBM</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {armadaList.length === 0 && <TableEmpty colSpan={8}>Belum ada data armada.</TableEmpty>}
              {armadaList.map((a) => {
                const karoseri = karoseriList.find((k) => k.id === a.karoseriId);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs text-teal-300">{a.id}</TableCell>
                    <TableCell>{a.namaKendaraan}</TableCell>
                    <TableCell className="text-neutral-400">{ARMADA_LABEL[a.jenisArmada]}</TableCell>
                    <TableCell>{Math.max(1, a.jumlah ?? 1)}</TableCell>
                    <TableCell className="text-neutral-400">
                      {karoseri ? `${karoseri.id} · ${KAROSERI_LABEL[karoseri.jenis]}` : "—"}
                    </TableCell>
                    <TableCell>{a.maxPayload} kg</TableCell>
                    <TableCell>{a.konsumsiBbm} km/L</TableCell>
                    <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                      <Dialog open={edit?.id === a.id} onOpenChange={(open) => !open && setEdit(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => openEdit(a)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent title="Edit Armada" description={`Perbarui data armada ${a.namaKendaraan}`}>
                          <div className="space-y-3">
                            <div>
                              <Label>Nama Kendaraan</Label>
                              <Input
                                value={edit?.nama ?? ""}
                                onChange={(e) => setEdit((prev) => prev && { ...prev, nama: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Jenis Armada</Label>
                              <Select
                                value={edit?.jenis ?? ""}
                                onChange={(e) =>
                                  setEdit((prev) => prev && { ...prev, jenis: e.target.value as JenisArmada })
                                }
                              >
                                {JENIS_OPTIONS.map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </Select>
                            </div>
                            <div>
                              <Label>Karoseri Digunakan</Label>
                              <Select
                                value={edit?.karoseriId ?? ""}
                                onChange={(e) =>
                                  setEdit((prev) => prev && { ...prev, karoseriId: e.target.value })
                                }
                              >
                                {karoseriList.map((k) => karoseriOption(k, edit?.id))}
                              </Select>
                            </div>
                            <div>
                              <Label>Jumlah Armada</Label>
                              <Input
                                type="number"
                                min={1}
                                value={edit?.jumlah ?? ""}
                                onChange={(e) => setEdit((prev) => prev && { ...prev, jumlah: e.target.value })}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label>Max Payload (kg)</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={edit?.payload ?? ""}
                                  onChange={(e) => setEdit((prev) => prev && { ...prev, payload: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Konsumsi BBM (km/L)</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={edit?.bbm ?? ""}
                                  onChange={(e) => setEdit((prev) => prev && { ...prev, bbm: e.target.value })}
                                />
                              </div>
                            </div>
                            {editError && <p className="text-xs text-red-400">{editError}</p>}
                            <Button className="w-full" onClick={saveEdit}>Simpan Perubahan</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="destructive" size="icon" onClick={() => removeArmada(a.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
