import { Boxes } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400/15 border border-teal-400/25">
            <Boxes className="h-4.5 w-4.5 text-teal-300" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-neutral-100 tracking-wide">
              Volumetrix <span className="text-teal-300">.</span>
            </h1>
            <p className="text-[11px] text-neutral-500 -mt-0.5">
              Perencanaan &amp; visualisasi muat kargo
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-[11px] text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-cream-100/70" />
          Mode pengembangan &middot; data tersimpan lokal di browser
        </div>
      </div>
    </header>
  );
}
