from pathlib import Path

import unittest

from test.api_crud.common import BASE_URL, load_json, request_json


DATA_FILE = Path(__file__).with_name("data") / "armada_test_data.json"


class ArmadaAPITestCase(unittest.TestCase):
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
            status, body = request_json("POST", "/armada/", payload)
            assert status in (200, 201), f"POST /armada/ #{index} returned {status}: {body}"
            assert isinstance(body, dict) and "id" in body, f"POST /armada/ #{index} did not return an id: {body}"
            cls.created_ids.append(body["id"])

    @classmethod
    def tearDownClass(cls):
        for armada_id in cls.created_ids:
            request_json("DELETE", f"/armada/{armada_id}")

    def test_root_health(self):
        status, body = request_json("GET", "/")
        self.assertEqual(status, 200)
        self.assertIsInstance(body, dict)
        self.assertEqual(body.get("status"), "ok")

    def test_create_armada_seed_data(self):
        self.assertGreaterEqual(len(self.created_ids), len(self.seed_data))

    def test_list_armada(self):
        status, body = request_json("GET", "/armada/")
        self.assertEqual(status, 200)
        self.assertIsInstance(body, list)
        self.assertGreaterEqual(len(body), len(self.created_ids))

    def test_get_armada_by_id(self):
        armada_id = self.created_ids[0]
        status, body = request_json("GET", f"/armada/{armada_id}")
        self.assertEqual(status, 200)
        self.assertIsInstance(body, dict)
        self.assertEqual(body.get("id"), armada_id)

    def test_update_armada(self):
        armada_id = self.created_ids[0]
        status, body = request_json("GET", f"/armada/{armada_id}")
        self.assertEqual(status, 200)
        self.assertIsInstance(body, dict)

        update_payload = {
            "nama_kendaraan": body["nama_kendaraan"],
            "jenis_armada": body.get("jenis_armada"),
            "max_payload": body["max_payload"],
            "karoseri_id": body.get("karoseri_id"),
            "konsumsi_bahan_bakar": body.get("konsumsi_bahan_bakar"),
            "status": "dipakai",
            "img": body.get("img"),
            "model_3d_template": body.get("model_3d_template"),
        }

        status, body = request_json("PUT", f"/armada/{armada_id}", update_payload)
        self.assertEqual(status, 200)
        self.assertIsInstance(body, dict)
        self.assertEqual(body.get("status"), "dipakai")

    def test_delete_armada(self):
        payload = self.seed_data[0].copy()
        status, body = request_json("POST", "/armada/", payload)
        self.assertIn(status, (200, 201))
        self.assertIsInstance(body, dict)
        self.assertIn("id", body)

        armada_id = body["id"]
        status, _ = request_json("DELETE", f"/armada/{armada_id}")
        self.assertIn(status, (200, 204))

