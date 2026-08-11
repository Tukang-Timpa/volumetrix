import { useState } from "react";
import { AppDataProvider } from "./context/AppDataContext";
import { Header } from "./components/layout/Header";
import { StepNav, STEPS } from "./components/layout/StepNav";
import { Step1Karoseri } from "./components/steps/Step1Karoseri";
import { Step2Armada } from "./components/steps/Step2Armada";
import { Step3Pengiriman } from "./components/steps/Step3Pengiriman";
import { Step4Barang } from "./components/steps/Step4Barang";
import { Step5Rekomendasi } from "./components/steps/Step5Rekomendasi";
import { Step6Visualisasi } from "./components/steps/Step6Visualisasi";

const STEP_COMPONENTS: Record<string, React.FC<{ onAdvance?: () => void }>> = {
  karoseri: Step1Karoseri,
  armada: Step2Armada,
  pengiriman: Step3Pengiriman,
  barang: Step4Barang,
  rekomendasi: Step5Rekomendasi,
  visualisasi: Step6Visualisasi,
};

function AppShell() {
  const [active, setActive] = useState("karoseri");
  // Auto-advance maksimal sekali per step: input pertama yang sukses melompat ke
  // step berikutnya, input lanjutan di step yang sama tidak melompat lagi.
  const [autoAdvanced, setAutoAdvanced] = useState<Set<string>>(() => new Set());

  const handleAdvance = () => {
    if (autoAdvanced.has(active)) return;
    const idx = STEPS.findIndex((s) => s.key === active);
    const next = STEPS[idx + 1];
    if (!next) return;
    setAutoAdvanced((prev) => new Set(prev).add(active));
    setActive(next.key);
  };

  const ActiveStep = STEP_COMPONENTS[active];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Header />
      <StepNav active={active} onChange={setActive} />
      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <ActiveStep onAdvance={handleAdvance} />
      </main>
      <footer className="mx-auto max-w-[1400px] px-6 pb-8 pt-2 text-center text-[11px] text-neutral-700">
        Volumetrix &middot; visualisasi peletakan muatan berbasis heuristik extreme point
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <AppShell />
    </AppDataProvider>
  );
}
