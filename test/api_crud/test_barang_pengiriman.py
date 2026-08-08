from pathlib import Path

import unittest

from api_crud.common import BASE_URL, load_json, request_json


ROOT = Path(__file__).with_name("data")
ARMADA_FILE = ROOT / "armada_test_data.json"
BARANG_FILE = ROOT / "barang_test_data.json"
PENGIRIMAN_FILE = ROOT / "pengiriman_test_data.json"


class BarangPengirimanAPITestCase(unittest.TestCase):
    armada_seed: list[dict] = []
    barang_seed: list[dict] = []
    pengiriman_seed: list[dict] = []

    @classmethod
    def setUpClass(cls):
        if not ARMADA_FILE.exists():
            raise unittest.SkipTest(f"Data file not found: {ARMADA_FILE}")
        if not BARANG_FILE.exists():
            raise unittest.SkipTest(f"Data file not found: {BARANG_FILE}")
        if not PENGIRIMAN_FILE.exists():
            raise unittest.SkipTest(f"Data file not found: {PENGIRIMAN_FILE}")

        cls.armada_seed = load_json(ARMADA_FILE)
        cls.barang_seed = load_json(BARANG_FILE)
        cls.pengiriman_seed = load_json(PENGIRIMAN_FILE)

        print(f"Testing API at {BASE_URL}")

        status, body = request_json("GET", "/")
        assert status == 200, f"GET / returned {status}: {body}"

    def create_armada_fixture(self):
        payload = self.armada_seed[0].copy()
        status, body = request_json("POST", "/armada/", payload)
        self.assertIn(status, (200, 201))
        self.assertIsInstance(body, dict)
        self.assertIn("id", body)
        self.addCleanup(lambda: request_json("DELETE", f"/armada/{body['id']}"))
        return body

    def create_pengiriman_fixture(self, armada_id: int):
        payload = self.pengiriman_seed[0].copy()
        payload["armada_id"] = armada_id
        status, body = request_json("POST", "/pengiriman/", payload)
        self.assertIn(status, (200, 201))
        self.assertIsInstance(body, dict)
        self.assertIn("id", body)
        self.addCleanup(lambda: request_json("DELETE", f"/pengiriman/{body['id']}"))
        return body

    def create_barang_fixture(self, pengiriman_id: int):
        payload = self.barang_seed[0].copy()
        payload["pengiriman_id"] = pengiriman_id
        status, body = request_json("POST", "/barang/", payload)
        self.assertIn(status, (200, 201))
        self.assertIsInstance(body, dict)
        self.assertIn("id", body)
        self.addCleanup(lambda: request_json("DELETE", f"/barang/{body['id']}"))
        return body

    def test_pengiriman_crud(self):
        armada = self.create_armada_fixture()
        pengiriman = self.create_pengiriman_fixture(armada["id"])

        status, body = request_json("GET", f"/pengiriman/{pengiriman['id']}")
        self.assertEqual(status, 200)
        self.assertIsInstance(body, dict)
        self.assertEqual(body.get("id"), pengiriman["id"])

        update_payload = {
            "kode_pengiriman": pengiriman["kode_pengiriman"],
            "armada_id": armada["id"],
            "tanggal_pengiriman": pengiriman.get("tanggal_pengiriman"),
            "status": "terkirim",
            "total_berat": pengiriman.get("total_berat"),
            "total_volume": pengiriman.get("total_volume"),
        }

        status, body = request_json("PUT", f"/pengiriman/{pengiriman['id']}", update_payload)
        self.assertEqual(status, 200)
        self.assertIsInstance(body, dict)
        self.assertEqual(body.get("status"), "terkirim")

    def test_barang_crud(self):
        armada = self.create_armada_fixture()
        pengiriman = self.create_pengiriman_fixture(armada["id"])
        barang = self.create_barang_fixture(pengiriman["id"])

        status, body = request_json("GET", f"/barang/{barang['id']}")
        self.assertEqual(status, 200)
        self.assertIsInstance(body, dict)
        self.assertEqual(body.get("id"), barang["id"])

        update_payload = {
            "pengiriman_id": pengiriman["id"],
            "nama_barang": barang["nama_barang"],
            "bentuk_barang": barang.get("bentuk_barang"),
            "panjang": barang["panjang"],
            "lebar": barang["lebar"],
            "tinggi": barang["tinggi"],
            "berat": barang["berat"],
            "quantity": barang["quantity"] + 1,
            "kategori": barang.get("kategori"),
            "is_fragile": barang.get("is_fragile", False),
            "butuh_pendingin": barang.get("butuh_pendingin", False),
            "orientable": barang.get("orientable", False),
        }

        status, body = request_json("PUT", f"/barang/{barang['id']}", update_payload)
        self.assertEqual(status, 200)
        self.assertIsInstance(body, dict)
        self.assertEqual(body.get("quantity"), barang["quantity"] + 1)

    def test_list_endpoints(self):
        armada = self.create_armada_fixture()
        pengiriman = self.create_pengiriman_fixture(armada["id"])
        barang = self.create_barang_fixture(pengiriman["id"])

        status, body = request_json("GET", "/pengiriman/")
        self.assertEqual(status, 200)
        self.assertIsInstance(body, list)
        self.assertTrue(any(item.get("id") == pengiriman["id"] for item in body))

        status, body = request_json("GET", "/barang/")
        self.assertEqual(status, 200)
        self.assertIsInstance(body, list)
        self.assertTrue(any(item.get("id") == barang["id"] for item in body))

