import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, ImageUp, ScanLine, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { decodeBarangQr, type BarangQrPayload } from "../../lib/qrBarang";

const SCANNER_ELEMENT_ID = "barang-qr-scanner-viewport";

type Mode = "camera" | "upload";

export function QrScanDialog({
  onDetected,
  onClose,
}: {
  onDetected: (payload: BarangQrPayload) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("camera");
  const [status, setStatus] = useState<"idle" | "scanning" | "error" | "detected">("scanning");
  const [message, setMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePayload = (raw: string) => {
    const payload = decodeBarangQr(raw);
    if (!payload) {
      setStatus("error");
      setMessage("QR terbaca, tapi formatnya tidak dikenali sebagai data barang.");
      return;
    }
    setStatus("detected");
    setMessage(`Terdeteksi: ${payload.namaBarang} (${payload.quantity}x)`);
    onDetected(payload);
  };

  useEffect(() => {
    if (mode !== "camera") return;

    let cancelled = false;
    // Delay start sampai animasi dialog selesai: kalau kamera di-start saat elemen
    // masih diskalakan (Radix dialog masuk), area video berukuran 0 -> layar hitam.
    const startTimer = window.setTimeout(() => {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (cancelled) return;
            handlePayload(decodedText);
          },
          () => {
            // decode error per-frame, diabaikan (normal saat kamera belum fokus ke QR)
          }
        )
        .catch(() => {
          if (cancelled) return;
          setStatus("error");
          setMessage("Tidak dapat mengakses kamera. Periksa izin browser atau gunakan mode Upload Gambar.");
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      const current = scannerRef.current;
      scannerRef.current = null;
      if (current) {
        current
          .stop()
          .then(() => current.clear())
          .catch(() => {
            /* scanner sudah berhenti / belum sempat start, aman diabaikan */
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleFile = async (file: File) => {
    setStatus("scanning");
    setMessage(null);
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
    try {
      const result = await scanner.scanFile(file, false);
      handlePayload(result);
    } catch {
      setStatus("error");
      setMessage("Tidak ditemukan QR code yang valid pada gambar tersebut.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-neutral-800 bg-neutral-950 p-1">
        <button
          type="button"
          onClick={() => { setMode("camera"); setStatus("idle"); setMessage(null); }}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
            mode === "camera" ? "bg-teal-400/15 text-teal-300" : "text-neutral-500 hover:text-neutral-300"
          )}
        >
          <Camera className="h-3.5 w-3.5" /> Kamera
        </button>
        <button
          type="button"
          onClick={() => { setMode("upload"); setStatus("idle"); setMessage(null); }}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
            mode === "upload" ? "bg-teal-400/15 text-teal-300" : "text-neutral-500 hover:text-neutral-300"
          )}
        >
          <ImageUp className="h-3.5 w-3.5" /> Upload Gambar
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-black">
        <div id={SCANNER_ELEMENT_ID} className="w-full min-h-[240px] [&_video]:w-full [&_video]:rounded-xl" />
        {mode === "camera" && status === "scanning" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <ScanLine className="h-8 w-8 text-teal-400/70 animate-pulse" />
          </div>
        )}
        {mode === "upload" && (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-6">
            <ImageUp className="h-8 w-8 text-neutral-600" />
            <p className="text-center text-xs text-neutral-500">
              Unggah foto atau screenshot QR code label barang.
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              Pilih Gambar
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        )}
      </div>

      {message && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
            status === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-400"
              : "border-teal-400/30 bg-teal-400/10 text-teal-300"
          )}
        >
          {status === "error" ? (
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          )}
          {message}
        </div>
      )}

      <p className="text-[11px] text-neutral-600">
        Format QR yang didukung: JSON <code className="text-neutral-500">{"{n,p,l,t,b,q,s}"}</code> atau teks
        dipisah "|" — nama|panjang|lebar|tinggi|berat|quantity|stackable.
      </p>

      <Button type="button" variant="outline" className="w-full" onClick={onClose}>
        Tutup
      </Button>
    </div>
  );
}
