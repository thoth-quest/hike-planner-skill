#!/usr/bin/env python3
"""Render a local Stage-1 activity JSON into a self-contained HTML snapshot.

Python standard library only. No network access, API credentials, or telemetry.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOKEN = "__ACTIVITY_JSON__"


def render(activity_path: Path, output_path: Path) -> Path:
    activity = json.loads(activity_path.read_text(encoding="utf-8"))
    if not isinstance(activity, dict):
        raise ValueError("Activity JSON must be an object")
    required = ("id", "schema_version", "revision", "destination", "goals", "constraints", "weather")
    missing = [field for field in required if field not in activity]
    if missing:
        raise ValueError("Missing activity fields: " + ", ".join(missing))
    if activity["schema_version"] != 1:
        raise ValueError("Unsupported schema_version")
    template = (ROOT / "templates" / "activity.html").read_text(encoding="utf-8")
    if template.count(TOKEN) != 1:
        raise ValueError("Expected exactly one data token in template")
    # Avoid breaking out of the JSON script node on user-supplied </script> or HTML.
    payload = json.dumps(activity, ensure_ascii=False, separators=(",", ":"))
    for source, target in (("&", "\\u0026"), ("<", "\\u003c"), (">", "\\u003e"),
                           ("\u2028", "\\u2028"), ("\u2029", "\\u2029")):
        payload = payload.replace(source, target)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(template.replace(TOKEN, payload), encoding="utf-8")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("activity", type=Path, help="Input activity.json")
    parser.add_argument("--output", type=Path, default=Path("dist/index.html"))
    args = parser.parse_args()
    print(render(args.activity, args.output))


if __name__ == "__main__":
    main()
