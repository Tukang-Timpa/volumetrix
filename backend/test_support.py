from app.py3dbp.core.main import Packer, Bin, Item
packer = Packer()
packer.add_bin(Bin("bin", 100, 100, 100, 1000))
# Item 1: bottom
packer.add_item(Item("1", 50, 50, 50, 10, support_surface_ratio=0.8))
# Item 2: top
packer.add_item(Item("2", 50, 50, 50, 10, support_surface_ratio=0.8))
# Item 3: beside 1
packer.add_item(Item("3", 50, 50, 50, 10, support_surface_ratio=0.8))
# Item 4: small item on top of gap
packer.add_item(Item("4", 10, 10, 10, 1, support_surface_ratio=0.8))

packer.pack()
for b in packer.bins:
    for item in b.items:
        print(f"{item.name} pos:{item.position} dim:{item.get_dimension()}")
    for unf in b.unfitted_items:
        print(f"UNFIT: {unf.name}")
