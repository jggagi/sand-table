#!/usr/bin/env python3
"""Package existing independent builds for one CloudBase static hosting origin."""
from hashlib import sha256
from pathlib import Path
import json
import os
import shutil
import subprocess
import tempfile
from zipfile import ZIP_DEFLATED, ZipFile

PORTAL = Path(__file__).resolve().parents[1]
COLLECTION = PORTAL.parent
REPO = COLLECTION.parent
GARDENS = {
    "liuyuan": "liuyuan-miniature-m1",
    "wangshiyuan": "wangshiyuan-miniature",
    "zhuozhengyuan": "zhuozhengyuan-miniature",
    "shizilin": "shizilin-miniature",
    "canglangting": "canglangting-miniature",
}


def main():
    # Builds remain owned by each garden. This script never installs or alters them.
    for key in GARDENS:
        dist = COLLECTION / key / "dist"
        if not (dist / "index.html").is_file() or not (dist / "assets").is_dir():
            raise SystemExit(f"Missing {key}/dist; run npm ci and npm run build in that garden first.")
    runtime = PORTAL / ".cloudbase-runtime"
    runtime.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="package-", dir=runtime) as scratch:
        stage = Path(scratch) / "upload"
        shutil.copytree(PORTAL / "dist", stage)
        index = stage / "index.html"
        html = index.read_text(encoding="utf-8")
        for key, slug in GARDENS.items():
            original = f'href="https://{slug}.jggagi.chatgpt.site/"'
            if html.count(original) != 1:
                raise SystemExit(f"Expected one unchanged portal link for {key}.")
            html = html.replace(original, f'href="./{key}/"')
            shutil.copytree(COLLECTION / key / "dist", stage / key)
        if "chatgpt.site" in html:
            raise SystemExit("Upload portal still points to a ChatGPT Site.")
        index.write_text(html, encoding="utf-8")
        files = sorted(p for p in stage.rglob("*") if p.is_file())
        archive = Path(scratch) / "suzhou-gardens-upload.zip"
        with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=9) as bundle:
            for file in files:
                relative = file.relative_to(stage)
                if any(part.startswith(".") or part == "node_modules" for part in relative.parts):
                    raise SystemExit(f"Unexpected private/build source file: {relative}")
                bundle.write(file, relative.as_posix())
        with ZipFile(archive) as bundle:
            if bundle.testzip() is not None:
                raise SystemExit("Archive integrity check failed.")
            names = set(bundle.namelist())
            required = {"index.html", "styles.css", *(f"{key}/index.html" for key in GARDENS)}
            if not required <= names:
                raise SystemExit("Archive root or garden entries are incomplete.")
        receipt = {
            "source_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip(),
            "archive_sha256": sha256(archive.read_bytes()).hexdigest(),
            "file_count": len(files),
            "bytes": archive.stat().st_size,
            "files": {p.relative_to(stage).as_posix(): sha256(p.read_bytes()).hexdigest() for p in files},
        }
        target = runtime / "upload"
        if target.exists():
            shutil.rmtree(target)
        shutil.move(stage, target)
        os.replace(archive, runtime / archive.name)
        (runtime / "package-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"folder": str(target), "zip": str(runtime / archive.name),
                          "file_count": len(files), "bytes": receipt["bytes"],
                          "sha256": receipt["archive_sha256"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
