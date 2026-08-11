import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../ui/table";

export function Step3Pengiriman({ onAdvance }: { onAdvance?: () => void }) {
  const { pengirimanList, barangList, addPengiriman, removePengiriman, updatePengirimanStatus } =
    useAppData();
  const [kode, setKode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kode.trim()) {
      setError("Kode pengiriman tidak boleh kosong.");
      return;
    }
    if (pengirimanList.some((p) => p.kodePengiriman.toLowerCase() === kode.trim().toLowerCase())) {
      setError("Kode pengiriman sudah digunakan.");
      return;
    }
    setError(null);
    addPengiriman(kode.trim());
    setKode("");
    onAdvance?.();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-2 h-fit">
        <CardHeader>
          <CardTitle>Data Pengiriman</CardTitle>
          <CardDescription>Buat entri pengiriman baru dengan kode unik.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="kode">Kode Pengiriman</Label>
              <Input
                id="kode"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                placeholder="cth. SJ-2026-0810-01"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" /> Tambah Pengiriman
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Daftar Pengiriman ({pengirimanList.length})</CardTitle>
          <CardDescription>Status pengiriman diperbarui otomatis mengikuti proses berikutnya.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Kode Pengiriman</TableHead>
                <TableHead>Jumlah Item Barang</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pengirimanList.length === 0 && (
                <TableEmpty colSpan={5}>Belum ada data pengiriman.</TableEmpty>
              )}
              {pengirimanList.map((p) => {
                const jumlahBarang = barangList.filter((b) => b.pengirimanId === p.id).length;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-teal-300">{p.id}</TableCell>
                    <TableCell className="font-medium">{p.kodePengiriman}</TableCell>
                    <TableCell className="text-neutral-400">{jumlahBarang} jenis barang</TableCell>
                    <TableCell>
                      <Select
                        value={p.status}
                        onChange={(e) => updatePengirimanStatus(p.id, e.target.value as typeof p.status)}
                        className="h-7 w-[120px] text-[11px] py-0"
                      >
                        <option value="persiapan">Persiapan</option>
                        <option value="on-going">On-going</option>
                        <option value="selesai">Selesai</option>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="icon" onClick={() => removePengiriman(p.id)}>
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
