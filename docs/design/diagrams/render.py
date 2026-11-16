#!/usr/bin/env python3
"""Render the doc's Mermaid figures through mermaid.ink, in the doc's green palette.

    python3 -I render.py OUT_DIR NAME [NAME ...]   # writes OUT_DIR/NAME.png and updates urls.json
    python3 -I render.py --url NAME [NAME ...]     # print the image URL only (no network)
    python3 -I render.py --check                   # every .mmd + theme.json reproduces urls.json

NAME is a file here without .mmd (a01 to a11 Architecture, d01 to d10 Database).
theme.json holds the Mermaid config every figure uses; keep it so new figures match.
urls.json records each figure's URL, PNG width and the size it is shown at in the doc.
Insert a URL into the doc exactly as urls.json has it; one mistyped character breaks the image.
"""
import base64
import json
import os
import sys
import urllib.request
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name):
    with open(os.path.join(HERE, "urls.json")) as f:
        urls = json.load(f)
    with open(os.path.join(HERE, "theme.json")) as f:
        theme = json.load(f)
    with open(os.path.join(HERE, name + ".mmd")) as f:
        code = f.read()
    return urls, theme, code


def url_for(code, theme, width):
    payload = json.dumps({"code": code, "mermaid": theme}, separators=(",", ":"))
    packed = base64.urlsafe_b64encode(zlib.compress(payload.encode("utf-8"), 9)).decode().rstrip("=")
    return f"https://mermaid.ink/img/pako:{packed}?type=png&bgColor=FFFFFF&width={width}"


def main(args):
    if args == ["--check"]:
        names = sorted(n[:-4] for n in os.listdir(HERE) if n.endswith(".mmd"))
        bad = []
        for name in names:
            urls, theme, code = load(name)
            if url_for(code, theme, urls[name]["png_width"]) != urls[name]["url"]:
                bad.append(name)
        print(f"{len(names) - len(bad)}/{len(names)} figures reproduce their doc URL" + (f"; differ: {bad}" if bad else ""))
        return 1 if bad else 0
    if args and args[0] == "--url":
        for name in args[1:]:
            urls, theme, code = load(name)
            print(url_for(code, theme, urls.get(name, {}).get("png_width", 1600)))
        return 0
    if len(args) < 2:
        print(__doc__)
        return 2
    out_dir, names = args[0], args[1:]
    os.makedirs(out_dir, exist_ok=True)
    for name in names:
        urls, theme, code = load(name)
        entry = urls.get(name, {"png_width": 1600})
        url = url_for(code, theme, entry["png_width"])
        req = urllib.request.Request(url, headers={"User-Agent": "twig-diagrams"})
        with urllib.request.urlopen(req, timeout=60) as resp, open(os.path.join(out_dir, name + ".png"), "wb") as f:
            f.write(resp.read())
        entry["url"] = url
        urls[name] = entry
        with open(os.path.join(HERE, "urls.json"), "w") as f:
            json.dump(urls, f, indent=1)
        print(f"{name}: {os.path.join(out_dir, name + '.png')}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
