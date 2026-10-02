#!/usr/bin/env python3
"""Build the TEAM IQ ebook (EPUB 3) from the manuscript.

No external converter: the manuscript uses a small Markdown subset and this
converts it explicitly, so the output is predictable and inspectable.

Usage:  python3 md2epub.py             # the full book
        python3 md2epub.py --sample    # chapters 1-3, the free sample
"""

import io
import os
import re
import sys

from ebooklib import epub

from md2print import PARTS, SAMPLE_PARTS, MANUSCRIPT, INTRO

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
COVER = os.path.join(HERE, "cover", "cover-ebook.png")

TITLE = "Team IQ: why your best people don't make your best teams"
SUBTITLE = "The six pillars of predictable high performance"
AUTHOR = "Andrew Phillips"
PUBLISHER = "Network Advansys Limited, trading as Systemhelp"
DESCRIPTION = (
    "Collective intelligence is a measurable property of a team, not a sum of the "
    "people in it. This book sets out the six TEAM IQ pillars, the measurement cycle "
    "that raises them, and the fourteen instruments that produce the evidence."
)

CSS = """
@namespace epub "http://www.idpf.org/2007/ops";
body { font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
       line-height: 1.5; margin: 0 5%; text-align: justify; hyphens: auto; }
h1.part { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 1.5em;
       text-align: left; margin: 2.5em 0 0.2em; page-break-before: always;
       color: #0A0F2C; }
h1.part + p.partsub { font-family: "Helvetica Neue", Arial, sans-serif;
       font-size: 1em; color: #555; margin: 0 0 2em; text-align: left; }
h2 { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 1.35em;
       color: #0A0F2C; text-align: left; margin: 1.8em 0 0.6em;
       page-break-before: always; }
h2.first { page-break-before: avoid; }
h3 { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 1em;
       color: #113895; text-align: left; margin: 1.6em 0 0.35em; }
p { margin: 0 0 0.85em; text-indent: 1.2em; }
p.first, h2 + p, h3 + p, blockquote p, li p { text-indent: 0; }
ul, ol { margin: 0 0 1em 1.2em; }
li { margin-bottom: 0.35em; }
strong { font-weight: bold; }
em { font-style: italic; }
hr.break { border: 0; text-align: center; margin: 1.4em 0; }
hr.break:after { content: "· · ·"; color: #999; letter-spacing: 0.4em; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.9em; }
th, td { border: 1px solid #ccc; padding: 0.4em 0.5em; text-align: left;
         vertical-align: top; }
th { background: #f2f4f8; font-family: "Helvetica Neue", Arial, sans-serif; }
figcaption { font-style: italic; font-size: 0.9em; color: #555; }
"""


def esc(t: str) -> str:
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def inline(t: str) -> str:
    t = esc(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<em>\1</em>", t)
    return t.replace("...", "…")


def is_row(l: str) -> bool:
    s = l.strip()
    return s.startswith("|") and s.endswith("|")


def table_html(rows):
    cells = []
    for i, row in enumerate(rows):
        parts = [c.strip() for c in row.strip().strip("|").split("|")]
        if i == 1 and set("".join(parts)) <= set("-: "):
            continue
        cells.append(parts)
    if not cells:
        return ""
    head, body = cells[0], cells[1:]
    out = ["<table>", "<thead><tr>"]
    out += [f"<th>{inline(c)}</th>" for c in head]
    out.append("</tr></thead><tbody>")
    for r in body:
        out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>")
    out.append("</tbody></table>")
    return "\n".join(out)


def chapter_html(lines):
    out, i, first_para = [], 0, True
    while i < len(lines):
        s = lines[i].strip()
        if not s:
            i += 1
            continue
        if s in ("---", "***", "___"):
            out.append('<hr class="break"/>')
            i += 1
            continue
        if s.startswith("### "):
            out.append(f"<h3>{inline(s[4:])}</h3>")
            first_para = True
            i += 1
            continue
        if is_row(lines[i]):
            rows = []
            while i < len(lines) and is_row(lines[i]):
                rows.append(lines[i])
                i += 1
            out.append(table_html(rows))
            continue
        if re.match(r"^[-*]\s+", s):
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
                items.append(inline(re.sub(r"^[-*]\s+", "", lines[i].strip())))
                i += 1
            out.append("<ul>" + "".join(f"<li>{x}</li>" for x in items) + "</ul>")
            continue
        if re.match(r"^\d+[.)]\s+", s):
            items = []
            while i < len(lines) and re.match(r"^\d+[.)]\s+", lines[i].strip()):
                items.append(inline(re.sub(r"^\d+[.)]\s+", "", lines[i].strip())))
                i += 1
            out.append("<ol>" + "".join(f"<li>{x}</li>" for x in items) + "</ol>")
            continue
        para = [s]
        i += 1
        while (i < len(lines) and lines[i].strip()
               and not re.match(r"^(#{1,6}\s|[-*]\s|\d+[.)]\s)", lines[i].strip())
               and not is_row(lines[i]) and lines[i].strip() not in ("---", "***", "___")):
            para.append(lines[i].strip())
            i += 1
        cls = ' class="first"' if first_para else ""
        out.append(f"<p{cls}>{inline(' '.join(para))}</p>")
        first_para = False
    return "\n".join(out)


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60]


def build(sample=False):
    book = epub.EpubBook()
    book.set_identifier("systemhelp.co.uk.team-iq." + ("sample" if sample else "first-edition"))
    book.set_title(TITLE + (" — free sample" if sample else ""))
    book.set_language("en-GB")
    book.add_author(AUTHOR)
    book.add_metadata("DC", "publisher", PUBLISHER)
    book.add_metadata("DC", "rights", "© 2026 Network Advansys Limited. All rights reserved.")
    book.add_metadata("DC", "description", DESCRIPTION)
    book.add_metadata("DC", "date", "2026")
    book.add_metadata("DC", "subject", "Business")
    book.add_metadata("DC", "subject", "Management")
    book.add_metadata("DC", "subject", "Teams")

    style = epub.EpubItem(uid="style", file_name="style/book.css",
                          media_type="text/css", content=CSS)
    book.add_item(style)

    if os.path.exists(COVER):
        book.set_cover("cover.png", io.open(COVER, "rb").read())

    # front matter as its own chapter
    fm = epub.EpubHtml(title="About this book", file_name="front.xhtml", lang="en-GB")
    fm.content = f"""<h2 class="first">Team IQ</h2>
<p class="first">Why your best people don't make your best teams.</p>
<p>{inline(SUBTITLE)}.</p>
<p><em>{inline(TITLE)}</em><br/>{inline(AUTHOR)}<br/>{inline(PUBLISHER)}</p>
<p>First edition, 2026. Copyright © 2026 Network Advansys Limited. All rights reserved.
Company number 3503850. TEAM IQ Creator is a registered trademark of Network Advansys Limited.</p>
<p>Every statistic in this book is either drawn from published research, named in the text and
listed in the references, or identified as our own observation. Nothing here is a guarantee of a
commercial result.</p>
<p><strong>How to use this book.</strong> The first three parts set up the argument, the value
question and the measurement cycle. Parts four, five and six are the six pillars in practice,
and each chapter ends with an exercise for a single forty-five to sixty minute session, something
to measure, and one thing to do this week. Nothing here needs a licence, a subscription or a
purchase.</p>"""
    fm.add_item(style)
    book.add_item(fm)

    spine = ["nav", fm]
    toc = []
    n = 0

    # the introduction opens the book in both editions
    intro_path = os.path.join(MANUSCRIPT, INTRO)
    if os.path.exists(intro_path):
        text = io.open(intro_path, encoding="utf-8").read()
        lines = text.split("\n")
        head = lines[0][3:].strip() if lines and lines[0].startswith("## ") else "Introduction"
        page = epub.EpubHtml(title=head, file_name="intro.xhtml", lang="en-GB")
        page.content = f"<h2 class=\"first\">{inline(head)}</h2>\n" + chapter_html(lines[1:])
        page.add_item(style)
        book.add_item(page)
        spine.append(page)
        toc.append(page)

    for key, num, title, files in PARTS:
        if sample and key not in SAMPLE_PARTS:
            continue
        part_page = epub.EpubHtml(title=f"{num} — {title}", file_name=f"{key}.xhtml", lang="en-GB")
        part_page.content = (f'<h1 class="part">{inline(num)} — {inline(title)}</h1>'
                             f'<p class="partsub">Part {num.split()[-1].lower()}</p>')
        part_page.add_item(style)
        book.add_item(part_page)
        kids = []
        for name in files:
            path = os.path.join(MANUSCRIPT, name)
            if not os.path.exists(path):
                print(f"  MISSING {name}", file=sys.stderr)
                continue
            text = io.open(path, encoding="utf-8").read()
            chunks, cur, head = [], [], None
            for line in text.split("\n"):
                if line.startswith("## "):
                    if head is not None:
                        chunks.append((head, cur))
                    head = re.sub(r"^Chapter\s+(\d+)\s*[—–-]\s*", r"\1. ", line[3:].strip())
                    cur = []
                else:
                    cur.append(line)
            if head is not None:
                chunks.append((head, cur))
            for head, body_lines in chunks:
                n += 1
                fname = f"ch{n:02d}-{slug(head)}.xhtml"
                page = epub.EpubHtml(title=head, file_name=fname, lang="en-GB")
                cls = ' class="first"' if n == 1 else ""
                page.content = f'<h2{cls}>{inline(head)}</h2>\n' + chapter_html(body_lines)
                page.add_item(style)
                book.add_item(page)
                spine.append(page)
                kids.append(page)
        spine.append(part_page)
        # let the part page sit before its chapters in the spine order
        spine.remove(part_page)
        idx = spine.index(kids[0]) if kids else len(spine)
        spine.insert(idx, part_page)
        toc.append((epub.Section(f"{num} — {title}", href=part_page.file_name), kids))

    if not sample:
        back = os.path.join(MANUSCRIPT, "99-backmatter.md")
        if os.path.exists(back):
            text = io.open(back, encoding="utf-8").read()
            back_links = []
            for block in re.split(r"\n(?=## )", text):
                block = block.strip()
                if not block:
                    continue
                lines = block.split("\n")
                if lines[0].startswith("## "):
                    head = lines[0][3:].strip()
                    body_lines = lines[1:]
                else:
                    head, body_lines = "Back matter", lines
                n += 1
                page = epub.EpubHtml(title=head, file_name=f"back-{slug(head)}.xhtml", lang="en-GB")
                page.content = f"<h2>{inline(head)}</h2>\n" + chapter_html(body_lines)
                page.add_item(style)
                book.add_item(page)
                spine.append(page)
                back_links.append(page)
            if back_links:
                toc.append((epub.Section("Reference and next steps"), back_links))

    book.toc = tuple(toc)
    book.spine = spine
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    os.makedirs(BUILD, exist_ok=True)
    out = os.path.join(BUILD, "team-iq-sample.epub" if sample else "team-iq.epub")
    epub.write_epub(out, book)
    print(f"wrote {out}  ({os.path.getsize(out)/1024:.0f} KB, {n} chapters)")
    return out


if __name__ == "__main__":
    build(sample="--sample" in sys.argv)
