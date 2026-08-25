import re

with open("src/components/steps/Step4Barang.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
if "Canvas" not in content:
    imports = """import { Canvas } from "@react-three/fiber";
import { OrbitControls, Edges } from "@react-three/drei";
"""
    content = content.replace('import { Trash2', imports + 'import { Trash2')

# Replace emptyForm
old_empty_form = 'const emptyForm = { nama: "", panjang: "", lebar: "", tinggi: "", berat: "", quantity: "1", stackable: true };'
new_empty_form = 'const emptyForm = { nama: "", panjang: "", lebar: "", tinggi: "", berat: "", quantity: "1", stackable: true, fragilityLevel: "normal", bottomAxis: null as string | null };'
content = content.replace(old_empty_form, new_empty_form)

# Add BarangCanvas component
canvas_comp = """
function BarangCanvas({ w, h, d, bottomAxis, setBottomAxis, fragilityLevel }: { w: number, h: number, d: number, bottomAxis: string | null, setBottomAxis: (a: string) => void, fragilityLevel: string }) {
  const maxDim = Math.max(w, h, d) || 1;
  const scale = 2 / maxDim;
  const sw = w * scale || 1;
  const sh = h * scale || 1;
  const sd = d * scale || 1;

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (fragilityLevel === "fragile" || fragilityLevel === "do_not_stack") return; // Locked
    const fIdx = e.face?.materialIndex;
    if (fIdx === 0 || fIdx === 1) setBottomAxis("panjang");
    else if (fIdx === 2 || fIdx === 3) setBottomAxis("tinggi");
    else if (fIdx === 4 || fIdx === 5) setBottomAxis("lebar");
  };

  const color = fragilityLevel !== "normal" ? "#e8926b" : "#5b8def";
  const hlColor = "#ef4444"; // Red highlight

  const mats = Array(6).fill(null).map((_, i) => {
    const isX = (i === 0 || i === 1) && bottomAxis === "panjang";
    const isY = (i === 2 || i === 3) && bottomAxis === "tinggi";
    const isZ = (i === 4 || i === 5) && bottomAxis === "lebar";
    const highlight = isX || isY || isZ;
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
"""

if "BarangCanvas" not in content:
    content = content.replace('export function Step4Barang', canvas_comp + '\nexport function Step4Barang')

with open("src/components/steps/Step4Barang.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched Step4Barang.tsx")
