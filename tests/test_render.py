"""Smoke tests for portable HTML export. Run: python3 -m unittest discover -s tests"""
import json
import tempfile
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from render import render


class RenderTests(unittest.TestCase):
    def setUp(self):
        self.sample = json.loads((ROOT / "examples" / "oyama.activity.json").read_text(encoding="utf-8"))

    def _generate(self, data):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "activity.json"
            result = Path(tmp) / "index.html"
            source.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            render(source, result)
            return result.read_text(encoding="utf-8")

    def test_self_contained_stage_1_snapshot(self):
        html = self._generate(self.sample)
        self.assertIn("<!doctype html>", html.lower())
        self.assertIn("大山登山", html)
        self.assertIn("script type=\"application/json\"", html)
        self.assertNotIn("__ACTIVITY_JSON__", html)
        self.assertNotIn("https://cdn", html)

    def test_untrusted_text_cannot_close_script_node(self):
        self.sample["title"] = '</script><script>alert("unsafe")</script>'
        html = self._generate(self.sample)
        self.assertNotIn('</script><script>alert("unsafe")', html)
        self.assertIn(r'\\u003c/script\\u003e', html)

    def test_missing_core_data_rejected(self):
        self.sample.pop("weather")
        with self.assertRaises(ValueError):
            self._generate(self.sample)


if __name__ == "__main__":
    unittest.main()
