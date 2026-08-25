import { useState } from "react";
import { Trash2, Plus, Search, Pencil } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent } from "../ui/dialog";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function ChangeView({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  if (bounds) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
  return null;
}

export function Step3Pengiriman({ onAdvance }: { onAdvance?: () => void }) {
  const { pengirimanList, addPengiriman, removePengiriman, updatePengirimanStatus, updatePengiriman } = useAppData();
  const [kode, setKode] = useState("");
  const [asal, setAsal] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [asalPos, setAsalPos] = useState<[number, number] | null>(null);
  const [tujuanPos, setTujuanPos] = useState<[number, number] | null>(null);
  const [jarak, setJarak] = useState<number | null>(null);
  const [loadingMap, setLoadingMap] = useState(false);

  // Edit Map Modal States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAsal, setEditAsal] = useState("");
  const [editTujuan, setEditTujuan] = useState("");
  const [editAsalPos, setEditAsalPos] = useState<[number, number] | null>(null);
  const [editTujuanPos, setEditTujuanPos] = useState<[number, number] | null>(null);
  const [editJarak, setEditJarak] = useState<number | null>(null);
  const [loadingEditMap, setLoadingEditMap] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setEditAsal(p.asal || "");
    setEditTujuan(p.tujuan || "");
    setEditJarak(p.jarakKm || null);
    setEditAsalPos(null); 
    setEditTujuanPos(null);
    setEditError(null);
    
    // Automatically search coordinates if asal and tujuan are already set
    if (p.asal && p.tujuan) {
      setTimeout(() => {
        const btn = document.getElementById("search-edit-btn");
        if (btn) btn.click();
      }, 300);
    }
  };

  const searchKota = async () => {
    if (!asal || !tujuan) {
      setError("Silakan isi kota asal dan tujuan.");
      return;
    }
    setLoadingMap(true);
    setError(null);
    try {
      const resAsal = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(asal)}&format=json&limit=1`);
      const dataAsal = await resAsal.json();
      const resTujuan = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(tujuan)}&format=json&limit=1`);
      const dataTujuan = await resTujuan.json();

      if (dataAsal.length > 0 && dataTujuan.length > 0) {
        const lat1 = parseFloat(dataAsal[0].lat);
        const lon1 = parseFloat(dataAsal[0].lon);
        const lat2 = parseFloat(dataTujuan[0].lat);
        const lon2 = parseFloat(dataTujuan[0].lon);

        setAsalPos([lat1, lon1]);
        setTujuanPos([lat2, lon2]);
        setJarak(getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2));
      } else {
        setError("Kota tidak ditemukan. Coba nama kota yang lebih spesifik.");
      }
    } catch (err) {
      setError("Gagal mencari koordinat kota.");
    } finally {
      setLoadingMap(false);
    }
  };

  const searchKotaEdit = async () => {
    if (!editAsal || !editTujuan) {
      setEditError("Silakan isi kota asal dan tujuan.");
      return;
    }
    setLoadingEditMap(true);
    setEditError(null);
    try {
      const resAsal = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(editAsal)}&format=json&limit=1`);
      const dataAsal = await resAsal.json();
      const resTujuan = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(editTujuan)}&format=json&limit=1`);
      const dataTujuan = await resTujuan.json();

      if (dataAsal.length > 0 && dataTujuan.length > 0) {
        const lat1 = parseFloat(dataAsal[0].lat);
        const lon1 = parseFloat(dataAsal[0].lon);
        const lat2 = parseFloat(dataTujuan[0].lat);
        const lon2 = parseFloat(dataTujuan[0].lon);

        setEditAsalPos([lat1, lon1]);
        setEditTujuanPos([lat2, lon2]);
        setEditJarak(getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2));
      } else {
        setEditError("Kota tidak ditemukan. Coba nama kota yang lebih spesifik.");
      }
    } catch (err) {
      setEditError("Gagal mencari koordinat kota.");
    } finally {
      setLoadingEditMap(false);
    }
  };

  const handleSaveEdit = () => {
    if (editingId && editJarak !== null) {
      updatePengiriman(editingId, {
        asal: editAsal.trim(),
        tujuan: editTujuan.trim(),
        jarakKm: editJarak
      });
      setEditingId(null);
    } else {
      setEditError("Silakan cari dan hitung jarak terlebih dahulu sebelum menyimpan.");
    }
  };

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
    if (!jarak) {
      setError("Silakan hitung jarak terlebih dahulu.");
      return;
    }
    setError(null);
    addPengiriman({
      kodePengiriman: kode.trim(),
      asal: asal.trim(),
      tujuan: tujuan.trim(),
      jarakKm: jarak
    });
    setKode("");
    setAsal("");
    setTujuan("");
    setAsalPos(null);
    setTujuanPos(null);
    setJarak(null);
    onAdvance?.();
  };

  let bounds: L.LatLngBounds | null = null;
  if (asalPos && tujuanPos) {
    bounds = L.latLngBounds([asalPos, tujuanPos]);
  } else if (asalPos) {
    bounds = L.latLngBounds([asalPos, asalPos]);
  } else if (tujuanPos) {
    bounds = L.latLngBounds([tujuanPos, tujuanPos]);
  }

  let editBounds: L.LatLngBounds | null = null;
  if (editAsalPos && editTujuanPos) {
    editBounds = L.latLngBounds([editAsalPos, editTujuanPos]);
  } else if (editAsalPos) {
    editBounds = L.latLngBounds([editAsalPos, editAsalPos]);
  } else if (editTujuanPos) {
    editBounds = L.latLngBounds([editTujuanPos, editTujuanPos]);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-2 h-fit">
        <CardHeader>
          <CardTitle>Data Pengiriman</CardTitle>
          <CardDescription>Buat entri pengiriman baru dan hitung jarak.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="kode">Kode Pengiriman</Label>
              <Input
                id="kode"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                placeholder="cth. SJ-2026-0810-01"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="asal">Kota Asal</Label>
                <Input id="asal" value={asal} onChange={(e) => setAsal(e.target.value)} placeholder="Jakarta" />
              </div>
              <div>
                <Label htmlFor="tujuan">Kota Tujuan</Label>
                <Input id="tujuan" value={tujuan} onChange={(e) => setTujuan(e.target.value)} placeholder="Surabaya" />
              </div>
            </div>
            
            <Button type="button" variant="secondary" className="w-full" onClick={searchKota} disabled={loadingMap}>
              {loadingMap ? "Mencari..." : <><Search className="h-4 w-4 mr-2" /> Cari & Hitung Jarak</>}
            </Button>

            {jarak !== null && (
              <div className="p-3 bg-neutral-900 rounded-md border border-neutral-800 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Jarak Estimasi:</span>
                  <span className="font-bold text-teal-400">{jarak.toFixed(2)} km</span>
                </div>
              </div>
            )}

            <div className="h-48 w-full rounded-md overflow-hidden border border-neutral-800 relative z-0">
              <MapContainer center={[-0.7893, 113.9213]} zoom={4} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <ChangeView bounds={bounds} />
                {asalPos && (
                  <Marker position={asalPos}>
                    <Popup>Kota Asal: {asal}</Popup>
                  </Marker>
                )}
                {tujuanPos && (
                  <Marker position={tujuanPos}>
                    <Popup>Kota Tujuan: {tujuan}</Popup>
                  </Marker>
                )}
                {asalPos && tujuanPos && (
                  <Polyline positions={[asalPos, tujuanPos]} color="#2dd4bf" weight={3} dashArray="5, 10" />
                )}
              </MapContainer>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button type="submit" className="w-full mt-2">
              <Plus className="h-4 w-4 mr-2" /> Simpan Pengiriman
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
                <TableHead>Kode</TableHead>
                <TableHead>Rute</TableHead>
                <TableHead>Jarak</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pengirimanList.length === 0 && (
                <TableEmpty colSpan={5}>Belum ada data pengiriman.</TableEmpty>
              )}
              {pengirimanList.map((p) => {
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.kodePengiriman}</TableCell>
                    <TableCell className="text-xs text-neutral-400">
                      {p.asal && p.tujuan ? `${p.asal} → ${p.tujuan}` : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <span>{p.jarakKm ? `${p.jarakKm.toFixed(1)} km` : "-"}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-neutral-400 hover:text-teal-400 cursor-pointer"
                          onClick={() => openEditModal(p)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={p.status}
                        onChange={(e) => updatePengirimanStatus(p.id, e.target.value as typeof p.status)}
                        className="h-7 w-[110px] text-[11px] py-0"
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

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        {editingId && (
          <DialogContent title="Edit Rute & Jarak">
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="editAsal">Kota Asal</Label>
                  <Input id="editAsal" value={editAsal} onChange={(e) => { setEditAsal(e.target.value); setEditJarak(null); setEditAsalPos(null); }} />
                </div>
                <div>
                  <Label htmlFor="editTujuan">Kota Tujuan</Label>
                  <Input id="editTujuan" value={editTujuan} onChange={(e) => { setEditTujuan(e.target.value); setEditJarak(null); setEditTujuanPos(null); }} />
                </div>
              </div>

              <Button id="search-edit-btn" type="button" variant="secondary" className="w-full" onClick={searchKotaEdit} disabled={loadingEditMap}>
                {loadingEditMap ? "Mencari..." : <><Search className="h-4 w-4 mr-2" /> Cari & Hitung Ulang Jarak</>}
              </Button>

              {editJarak !== null && (
                <div className="p-3 bg-neutral-800 rounded-md border border-neutral-700 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-300">Jarak Estimasi Baru:</span>
                    <span className="font-bold text-teal-400">{editJarak.toFixed(2)} km</span>
                  </div>
                </div>
              )}

              <div className="h-48 w-full rounded-md overflow-hidden border border-neutral-700 relative z-0">
                <MapContainer center={[-0.7893, 113.9213]} zoom={4} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <ChangeView bounds={editBounds} />
                  {editAsalPos && (
                    <Marker position={editAsalPos}>
                      <Popup>Kota Asal: {editAsal}</Popup>
                    </Marker>
                  )}
                  {editTujuanPos && (
                    <Marker position={editTujuanPos}>
                      <Popup>Kota Tujuan: {editTujuan}</Popup>
                    </Marker>
                  )}
                  {editAsalPos && editTujuanPos && (
                    <Polyline positions={[editAsalPos, editTujuanPos]} color="#2dd4bf" weight={3} dashArray="5, 10" />
                  )}
                </MapContainer>
              </div>

              {editError && <p className="text-xs text-red-400">{editError}</p>}
              <Button type="button" className="w-full" onClick={handleSaveEdit}>
                Simpan Perubahan
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
