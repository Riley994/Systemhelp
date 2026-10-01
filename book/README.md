# TEAM IQ — the book

Everything needed to produce the book, and to change it. The words are Markdown,
the print edition is Typst, and the ebook is built from the same manuscript. No
external service, no converter you cannot read, nothing to install beyond Typst
and two Python packages.

**Title:** Team IQ: why your best people don't make your best teams
**Author:** Andrew Phillips · **Publisher:** Network Advansys Limited, trading as Systemhelp

---

## What is here

| Path | What it is |
| --- | --- |
| `manuscript/` | The book itself, one file per part. **This is what you edit.** |
| `BOOK-BRIEF.md` | The writing contract: voice, banned words, evidence rules, chapter shape |
| `source/` | The course material and the evidence paper the book is built from |
| `book.typ` | The print interior: 6×9, mirrored margins, running heads, folio |
| `md2print.py` | Converts the manuscript to the print body |
| `md2epub.py` | Builds the ebook, and the free sample |
| `cover/` | The cover, laid out in HTML so the type is exact |
| `fonts/` | EB Garamond and Inter, the two faces the print edition uses |
| `out/` | Built PDFs |
| `build/` | Built ebooks, and the generated print body |

## The manuscript

| File | Chapters | Part |
| --- | --- | --- |
| `ch01.md` | 1 | One — Why capable teams underperform |
| `ch02.md` | 2 | Two — The value question |
| `ch03.md` | 3 | Three — The measurement cycle |
| `ch04-07.md` | 4–7 | Four — Target |
| `ch08-11.md` | 8–11 | Four — Expression |
| `ch12-13.md` | 12–13 | Five — Accountability |
| `ch14-16.md` | 14–16 | Five — Mindset |
| `ch17-19.md` | 17–19 | Six — Insight |
| `ch20-22.md` | 20–22 | Six — Quality |
| `99-backmatter.md` | — | Instruments, references, author, working with us |

Chapters are written in a small Markdown subset: `## ` for a chapter, `### ` for
its eight sections, plain paragraphs, `-` bullets, `1.` steps, and pipe tables.
Bold is `**like this**`, italic is `*like this*`, and `---` on its own line is a
scene break. Nothing else is needed, and nothing else is understood.

The eight sections every chapter carries, in order: an opening scene with no
heading, then **The principle**, **What it looks like when it is missing**,
**What it looks like when it is working**, **How to do it**, **The exercise**,
**What to measure**, and **One thing to do this week**.

## Rebuilding

```bash
cd book

# the print edition (about 240 pages, 6 x 9 inches)
python3 md2print.py
typst compile book.typ out/team-iq-print.pdf --font-path ./fonts

# the free sample: parts one, two and three
python3 md2print.py --sample
typst compile book-sample.typ out/team-iq-sample.pdf --font-path ./fonts

# both ebooks
python3 md2epub.py
python3 md2epub.py --sample

# the cover
chromium --headless=new --no-sandbox --hide-scrollbars \
  --window-size=1600,2560 --screenshot=cover/cover-ebook.png \
  file://$PWD/cover/cover.html
```

`book-sample.typ` is `book.typ` with two substitutions — the body and the output
name. If you change the template, regenerate it:

```bash
sed 's|build/body.typ|build/body-sample.typ|; s|out/team-iq-print.pdf|out/team-iq-sample.pdf|' \
  book.typ > book-sample.typ
```

Typst is the only build tool you need for print, and it is a single binary.
The two Python scripts use only the standard library plus `ebooklib`.

## Changing the words

Edit the chapter file, then rebuild. A few things worth knowing:

- **Length matters.** The print layout assumes chapters of roughly 2,000 words.
  A chapter that doubles in length will reflow the contents and the page numbers,
  which is fine, but check the contents page after a large change.
- **Chapter numbering is automatic** in the contents and the running heads. The
  number in the heading text (`## Chapter 7 — Traceable`) is rewritten to the
  house style (`7. Traceable`) during conversion, so keep the pattern.
- **Do not add an H1** to a chapter file. H1 is the part heading, and the parts
  are declared in `md2print.py`.
- **Tables** must be pipe tables with a header row and a `| --- |` rule.
- **Evidence.** The book's promise is that every statistic is sourced. If you add
  a number, add it to the references too, or say in the sentence that it is our
  own observation.

## The print file, and what the printer needs

- Trim 6in × 9in, no bleed — a text-only interior, which is what a print-on-demand
  service expects.
- Margins: inside 0.7in, outside 0.55in, top 0.72in, bottom 0.68in.
- 236 pages at the current setting, giving a spine of **0.531in** on white paper
  (page count × 0.002252). Recalculate if the page count changes: the spine width
  is the one number a cover file cannot guess.

Still outstanding before publication: the ISBN, the copyright line if you want a
Library of Congress or British Library entry, and a full cover wrap — back, spine
and front in one file, with the spine width above.

## The website's free sample

`out/team-iq-sample.pdf` and `build/team-iq-sample.epub` are copied into
`site/assets/downloads/` and linked from `/book/` and `/thank-you/book/`. Rebuild
them and copy them across after any edit to the first three chapters, otherwise
the sample will disagree with the book.