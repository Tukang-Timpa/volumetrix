import re

with open("src/components/steps/Step4Barang.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Edit the add form
add_form_canvas = """
            <div className="h-48 w-full bg-neutral-900 rounded-md overflow-hidden relative mt-2 mb-2 border border-neutral-800">
              <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 10]} intensity={1} />
                <OrbitControls enableZoom={true} enablePan={false} />
                <BarangCanvas 
                  w={parseFloat(form.panjang) || 10} 
                  h={parseFloat(form.tinggi) || 10} 
                  d={parseFloat(form.lebar) || 10} 
                  bottomAxis={form.bottomAxis}
                  setBottomAxis={(val) => setForm(f => ({ ...f, bottomAxis: val }))}
                  fragilityLevel={form.stackable ? "normal" : "fragile"}
                />
              </Canvas>
              <div className="absolute bottom-2 left-2 text-[10px] text-neutral-400 pointer-events-none bg-black/50 px-2 py-1 rounded">
                Klik sisi untuk jadikan alas (merah). Putar dengan mouse.
              </div>
            </div>
"""

# Insert add_form_canvas before the submit button in add form
if "Klik sisi untuk jadikan alas" not in content:
    content = content.replace('{error && <p className="text-xs text-red-400">{error}</p>}', add_form_canvas + '\n            {error && <p className="text-xs text-red-400">{error}</p>}')

# Edit the EditBarangForm
edit_form_state = """
  const [stackable, setStackable] = useState(barang.bisaDitumpuk);
  const [bottomAxis, setBottomAxis] = useState<string | null>(barang.bottomAxis || null);
"""
if "setBottomAxis] = useState" not in content:
    content = content.replace('const [stackable, setStackable] = useState(barang.bisaDitumpuk);', edit_form_state)

edit_form_canvas = """
      <div className="h-40 w-full bg-neutral-900 rounded-md overflow-hidden relative mt-2 mb-2 border border-neutral-800">
        <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1} />
          <OrbitControls enableZoom={true} enablePan={false} />
          <BarangCanvas 
            w={parseFloat(panjang) || 10} 
            h={parseFloat(tinggi) || 10} 
            d={parseFloat(lebar) || 10} 
            bottomAxis={bottomAxis}
            setBottomAxis={setBottomAxis}
            fragilityLevel={stackable ? "normal" : "fragile"}
          />
        </Canvas>
      </div>
"""

if "h-40 w-full" not in content:
    content = content.replace('Bisa ditumpuk (stackable)\n      </label>', 'Bisa ditumpuk (stackable)\n      </label>' + edit_form_canvas)

# Update the onSave callback in EditBarangForm
if "fragilityLevel" not in content.split("Simpan Perubahan")[0].split("onSave({")[-1]:
    content = content.replace('bisaDitumpuk: stackable,', 'bisaDitumpuk: stackable,\n            fragilityLevel: stackable ? "normal" : "fragile",\n            bottomAxis,')

# Fix addBarang call in handleSubmit
if "fragilityLevel" not in content.split("addBarang({")[1]:
    content = content.replace('bisaDitumpuk: form.stackable,', 'bisaDitumpuk: form.stackable,\n      fragilityLevel: form.stackable ? "normal" : "fragile",\n      bottomAxis: form.bottomAxis,')

with open("src/components/steps/Step4Barang.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched Step4Barang.tsx part 2")
