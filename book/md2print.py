#!/usr/bin/env python3
"""Convert the TEAM IQ manuscript into a Typst body for the print edition.

The manuscript uses a deliberately small Markdown subset, which this converts
explicitly rather than guessing: H1 part, H2 chapter, H3 section, paragraphs,
bullet and numbered lists, pipe tables, bold, italic, scene breaks.

Usage:  python3 md2print.py                 # writes build/body.typ
        python3 md2print.py --sample        # only parts one to three
"""

import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MANUSCRIPT = os.path.join(HERE, "manuscript")
OUT = os.path.join(HERE, "build", "body.typ")

# the manuscript files in book order, each mapped to its part heading.
# parts one to three are the free sample; four to six are the paid edition.
PARTS = [
    ("part-one", "Part One", "Why capable teams underperform", ["ch01.md"]),
    ("part-two", "Part Two", "The value question", ["ch02.md"]),
    ("part-three", "Part Three", "The measurement cycle", ["ch03.md"]),
    ("part-four", "Part Four", "Target and Expression", ["ch04-07.md", "ch08-11.md"]),
    ("part-five", "Part Five", "Accountability and Mindset", ["ch12-13.md", "ch14-16.md"]),
    ("part-six", "Part Six", "Insight and Quality", ["ch17-19.md", "ch20-22.md"]),
]
SAMPLE_PARTS = {"part-one", "part-two", "part-three"}

# the introduction sets the scene for the whole book, and opens the free sample too
INTRO = "00-introduction.md"

# the page that closes the free sample, and does the only selling in the book
SAMPLE_CLOSING = """
#heading(level: 2)[What comes next]

These three chapters are the argument. The rest of the book is the work: eight chapters on
Target and Expression, five on Accountability and Mindset, six on Insight and Quality, each
ending with an exercise for a single session, something to measure, and one thing to do this
week. The fourteen instruments are listed at the back.

#v(0.3em)
Three things you can do before you spend anything. Score your own team with the free TEAM IQ
Scorecard at systemhelp.co.uk/scorecard, which takes about eight minutes. Come to the free
monthly workshop, where we work through one pillar at a time. And if you want to know which
pillar is holding your teams back, the diagnostic session works on one area of concern and the
fee is credited back if you continue.

#v(0.3em)
Read the evidence first. Every statistic in this book is published and linked at
systemhelp.co.uk/why-team-iq. If any of it does not hold up, tell us and we will correct or
remove it.

#v(0.8em)
#align(center)[#text(font: sans, size: 9.5pt, fill: luma(90))[The full edition, in print and as an ebook, is at systemhelp.co.uk/book]]
"""

# typst markup characters that must survive as literal text
ESCAPE = [
    ("\\", "\\\\"),
    ("#", "\\#"),
    ("$", "\\$"),
    ("@", "\\@"),
    ("<", "\\<"),
    (">", "\\>"),
    ("[", "\\["),
    ("]", "\\]"),
    ("~", "\\~"),
    ("`", "\\`"),
]


def esc(text: str) -> str:
    for a, b in ESCAPE:
        text = text.replace(a, b)
    return text


def inline(text: str) -> str:
    """Markdown inline -> Typst inline, on already-escaped text."""
    # bold first, so ** is not eaten by the italic rule
    text = re.sub(r"\*\*(.+?)\*\*", lambda m: "*" + m.group(1) + "*", text)
    text = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", lambda m: "_" + m.group(1) + "_", text)
    # typographic niceties
    text = text.replace("...", "…")
    return text


def rich(raw: str) -> str:
    return inline(esc(raw.strip()))


def is_table_row(line: str) -> bool:
    return line.strip().startswith("|") and line.strip().endswith("|")


def render_table(rows: list[str]) -> str:
    """A pipe table becomes #table with an emphasised header row."""
    cells = []
    for i, row in enumerate(rows):
        parts = [c.strip() for c in row.strip().strip("|").split("|")]
        if i == 1 and set("".join(parts)) <= set("-: "):
            continue  # the alignment rule
        cells.append(parts)
    if not cells:
        return ""
    ncol = max(len(r) for r in cells)
    cells = [r + [""] * (ncol - len(r)) for r in cells]
    head = cells[0]
    body = cells[1:]
    lines = [
        "#table(",
        f"  columns: {ncol},",
        "  inset: 5pt,",
        "  stroke: 0.4pt + luma(205),",
        "  align: left,",
        "  table.header("
        + ", ".join(
            '[#text(font: "Inter", size: 8.4pt, weight: 600)[' + rich(c) + "]]" for c in head
        )
        + "),",
    ]
    for r in body:
        lines.append(
            "  " + ", ".join('[#text(size: 8.8pt)[' + rich(c) + "]]" for c in r) + ","
        )
    lines += [")", "#v(0.5em)"]
    return "\n".join(lines)


def convert_chapter(lines: list[str]) -> str:
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if stripped in ("---", "***", "___"):
            out.append("#break-mark")
            i += 1
            continue

        if stripped.startswith("### "):
            out.append("#heading(level: 3)[" + rich(stripped[4:]) + "]")
            i += 1
            continue

        if is_table_row(line):
            rows = []
            while i < len(lines) and is_table_row(lines[i]):
                rows.append(lines[i])
                i += 1
            out.append(render_table(rows))
            continue

        if re.match(r"^[-*]\s+", stripped):
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
                items.append("- " + rich(re.sub(r"^[-*]\s+", "", lines[i].strip())))
                i += 1
            out.append("\n".join(items))
            continue

        if re.match(r"^\d+[.)]\s+", stripped):
            items = []
            while i < len(lines) and re.match(r"^\d+[.)]\s+", lines[i].strip()):
                items.append("+ " + rich(re.sub(r"^\d+[.)]\s+", "", lines[i].strip())))
                i += 1
            out.append("\n".join(items))
            continue

        # a paragraph, possibly wrapped over several lines
        para = [stripped]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(
            r"^(#{1,6}\s|[-*]\s|\d+[.)]\s)", lines[i].strip()
        ) and not is_table_row(lines[i]) and lines[i].strip() not in ("---", "***", "___"):
            para.append(lines[i].strip())
            i += 1
        out.append(rich(" ".join(para)))

    return "\n\n".join(out)


def part_opener(num: str, title: str) -> str:
    return (
        "#heading(level: 1)[" + esc(num) + " — " + esc(title) + "]\n"
    )


def build(sample: bool = False) -> str:
    body = []
    intro = os.path.join(MANUSCRIPT, INTRO)
    if os.path.exists(intro):
        text = io.open(intro, encoding="utf-8").read()
        lines = text.split("\n")
        if lines and lines[0].startswith("## "):
            body.append("#heading(level: 2)[" + rich(lines[0][3:]) + "]")
            body.append(convert_chapter(lines[1:]))
        else:
            body.append(convert_chapter(lines))

    for key, num, title, files in PARTS:
        if sample and key not in SAMPLE_PARTS:
            continue
        body.append(part_opener(num, title))
        for name in files:
            path = os.path.join(MANUSCRIPT, name)
            if not os.path.exists(path):
                print(f"  MISSING  {name}", file=sys.stderr)
                continue
            text = io.open(path, encoding="utf-8").read()
            lines = text.split("\n")
            # split on H2 chapter headings so each chapter is handled alone
            chunk = []
            for line in lines:
                if line.startswith("## "):
                    if chunk:
                        body.append(convert_chapter(chunk))
                    # normalise the chapter heading to the book's own wording
                    heading = line[3:].strip()
                    heading = re.sub(r"^Chapter\s+(\d+)\s*[—–-]\s*", r"\1. ", heading)
                    body.append("#heading(level: 2)[" + rich(heading) + "]")
                    chunk = []
                else:
                    chunk.append(line)
            if chunk:
                body.append(convert_chapter(chunk))

    if not sample:
        back = os.path.join(MANUSCRIPT, "99-backmatter.md")
        if os.path.exists(back):
            text = io.open(back, encoding="utf-8").read()
            # each H2 in the back matter becomes a top-level section of the book
            for block in re.split(r"\n(?=## )", text):
                block = block.strip()
                if not block:
                    continue
                lines = block.split("\n")
                if lines[0].startswith("## "):
                    body.append("#heading(level: 2)[" + rich(lines[0][3:]) + "]")
                    body.append(convert_chapter(lines[1:]))
                else:
                    body.append(convert_chapter(lines))

    return "\n\n".join(body) + "\n"


if __name__ == "__main__":
    sample = "--sample" in sys.argv
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    target = OUT.replace("body.typ", "body-sample.typ") if sample else OUT
    text = build(sample)
    io.open(target, "w", encoding="utf-8").write(text)
    words = len(re.sub(r"#\w+(\([^)]*\))?\[|\]|#\w+", " ", text).split())
    print(f"wrote {target}  ({words:,} words, {len(text):,} chars)")
