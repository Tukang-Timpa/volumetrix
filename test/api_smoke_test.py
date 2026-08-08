import json
import os
import unittest
import urllib.error
import urllib.request
from pathlib import Path


BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
DATA_FILE = Path(__file__).with_name("armada_test_data.json")

RESET = "\033[0m"
BOLD = "\033[1m"
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"


def request_json(method: str, path: str, payload: dict | None = None):
    url = f"{BASE_URL}{path}"
    data = None
    headers = {"Accept": "application/json"}

    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
            return response.status, json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        detail = None
        if body:
            try:
                detail = json.loads(body)
            except json.JSONDecodeError:
                detail = body
        return exc.code, detail


class ArmadaAPITestCase(unittest.TestCase):
    created_ids: list[int] = []
    seed_data: list[dict] = []

    @classmethod
    def setUpClass(cls):
        if not DATA_FILE.exists():
            raise unittest.SkipTest(f"Data file not found: {DATA_FILE}")

        with DATA_FILE.open("r", encoding="utf-8") as file:
            cls.seed_data = json.load(file)

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
        armada_id = self.created_ids[0]
        status, _ = request_json("DELETE", f"/armada/{armada_id}")
        self.assertIn(status, (200, 204))

        if armada_id in self.created_ids:
            self.created_ids.remove(armada_id)


class PrintingTestResult(unittest.TextTestResult):
    def startTest(self, test):
        super().startTest(test)
        print(f"{BOLD}{CYAN}TEST {RESET}{test._testMethodName}{RESET} ...", end=" ")

    def addSuccess(self, test):
        super().addSuccess(test)
        print(f"{GREEN}PASS{RESET}")

    def addFailure(self, test, err):
        super().addFailure(test, err)
        print(f"{RED}FAIL{RESET}")
        self._print_error(err)

    def addError(self, test, err):
        super().addError(test, err)
        print(f"{YELLOW}ERROR{RESET}")
        self._print_error(err)

    def _print_error(self, err):
        exception = err[1]
        print(f"  {RED}{exception}{RESET}")


class PrintingTestRunner(unittest.TextTestRunner):
    resultclass = PrintingTestResult


def main() -> int:
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(ArmadaAPITestCase)
    runner = PrintingTestRunner(verbosity=0)
    result = runner.run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())