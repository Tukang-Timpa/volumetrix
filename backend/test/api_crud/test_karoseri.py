from pathlib import Path

import unittest

from test.api_crud.common import BASE_URL, load_json, request_json


DATA_FILE = Path(__file__).with_name("data") / "karoseri_test_data.json"


class KaroseriAPITestCase(unittest.TestCase):
    created_ids: list[int] = []
    seed_data: list[dict] = []

    @classmethod
    def setUpClass(cls):
        if not DATA_FILE.exists():
            raise unittest.SkipTest(f"Data file not found: {DATA_FILE}")

        cls.seed_data = load_json(DATA_FILE)

        print(f"Testing API at {BASE_URL}")

        status, body = request_json("GET", "/")
        assert status == 200, f"GET / returned {status}: {body}"

        cls.created_ids = []
        for index, payload in enumerate(cls.seed_data, start=1):
            status, body = request_json("POST", "/karoseri/", payload)
            assert status in (200, 201), f"POST /karoseri/ #{index} returned {status}: {body}"
            assert isinstance(body, dict) and "id" in body, f"POST /karoseri/ #{index} did not return an id: {body}"
            cls.created_ids.append(body["id"])

    @classmethod
    def tearDownClass(cls):
        for karoseri_id in cls.created_ids:
            request_json("DELETE", f"/karoseri/{karoseri_id}")

    def test_root_health(self):
        status, body = request_json("GET", "/")
        self.assertEqual(status, 200)
        self.assertIsInstance(body, dict)
        self.assertEqual(body.get("status"), "ok")

    def test_seed_created(self):
        self.assertGreaterEqual(len(self.created_ids), len(self.seed_data))

    def test_list_karoseri(self):
        status, body = request_json("GET", "/karoseri/")
        self.assertEqual(status, 200)
        self.assertIsInstance(body, list)
        self.assertGreaterEqual(len(body), len(self.created_ids))

    def test_get_karoseri_by_id(self):
        karoseri_id = self.created_ids[0]
        status, body = request_json("GET", f"/karoseri/{karoseri_id}")
        self.assertEqual(status, 200)
        self.assertIsInstance(body, dict)
        self.assertEqual(body.get("id"), karoseri_id)

    def test_update_karoseri(self):
        karoseri_id = self.created_ids[0]
        status, body = request_json("GET", f"/karoseri/{karoseri_id}")
        self.assertEqual(status, 200)
        self.assertIsInstance(body, dict)

        update_payload = {
            "jenis_karoseri": body["jenis_karoseri"],
            "panjang": body["panjang"],
            "lebar": body["lebar"],
            "tinggi": body["tinggi"],
            "bahan": body.get("bahan"),
            "warna": "hitam",
            "model_3d_template": body.get("model_3d_template"),
        }

        status, body = request_json("PUT", f"/karoseri/{karoseri_id}", update_payload)
        self.assertEqual(status, 200)
        self.assertIsInstance(body, dict)
        self.assertEqual(body.get("warna"), "hitam")

    def test_delete_karoseri(self):
        payload = self.seed_data[0].copy()
        status, body = request_json("POST", "/karoseri/", payload)
        self.assertIn(status, (200, 201))
        self.assertIsInstance(body, dict)
        self.assertIn("id", body)

        karoseri_id = body["id"]
        status, _ = request_json("DELETE", f"/karoseri/{karoseri_id}")
        self.assertIn(status, (200, 204))

