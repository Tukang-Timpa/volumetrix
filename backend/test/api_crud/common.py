import json
import os
import unittest
import urllib.error
import urllib.request
from pathlib import Path


BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")

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


def load_json(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


class PrintingTestResult(unittest.TextTestResult):
    def startTest(self, test):
        super().startTest(test)
        print(f"{BOLD}{CYAN}TEST {test._testMethodName}{RESET} ...", end=" ")

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
