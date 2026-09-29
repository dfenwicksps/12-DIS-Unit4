"""Bundle the game into one self-contained HTML file (for LMS upload or emailing).

Usage:  python3 tools/build_single.py [output.html]
Default output: dist/nexus-unit4.html
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def build(out: Path) -> Path:
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    def inline_css(m: re.Match) -> str:
        return "<style>\n" + (ROOT / m.group(1)).read_text(encoding="utf-8") + "\n</style>"

    def inline_js(m: re.Match) -> str:
        src = (ROOT / m.group(1)).read_text(encoding="utf-8")
        return "<script>\n" + src.replace("</script", "<\\/script") + "\n</script>"

    html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', inline_css, html)
    html = re.sub(r'<script src="(js/[^"]+)"></script>', inline_js, html)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    return out


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist" / "nexus-unit4.html"
    path = build(target)
    print(f"Wrote {path} ({path.stat().st_size // 1024} KB)")
