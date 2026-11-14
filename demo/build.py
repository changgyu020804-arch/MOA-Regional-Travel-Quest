"""Generate the standalone demo page from the editable files in src/."""

from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "src"


def build():
    template = (SOURCE / "index.template.html").read_text(encoding="utf-8")
    css = (SOURCE / "style.css").read_text(encoding="utf-8")
    scripts = ("data.js", "mascot.js", "app.js")
    javascript = "\n".join((SOURCE / script).read_text(encoding="utf-8") for script in scripts)

    if template.count("/*STYLE*/") != 1 or template.count("/*SCRIPT*/") != 1:
        raise ValueError("템플릿에는 STYLE과 SCRIPT 자리가 각각 하나씩 필요합니다.")

    output = template.replace("/*STYLE*/", css).replace("/*SCRIPT*/", javascript)
    destination = ROOT / "index.html"
    destination.write_text(output, encoding="utf-8", newline="\n")
    print(f"완료 {destination}")


if __name__ == "__main__":
    build()
