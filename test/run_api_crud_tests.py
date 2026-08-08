from pathlib import Path
import unittest

from api_crud.common import PrintingTestRunner


def main() -> int:
    test_dir = Path(__file__).with_name("api_crud")
    print(f"Running API CRUD tests from {test_dir}")
    suite = unittest.defaultTestLoader.discover(str(test_dir), pattern="test_*.py")
    result = PrintingTestRunner(verbosity=0).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())