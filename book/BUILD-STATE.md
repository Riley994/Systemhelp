# TEAM IQ book — build state

Recorded 2 October 2026. Read this first after any context loss.

## What is being built

The book promised by `/book/` on the website, as a finished product in three forms:
an ebook (EPUB), a print edition (6×9 interior PDF), and a free sample of the first
three chapters for the site's lead magnet.

**Title:** Team IQ: why your best people don't make your best teams
**Subtitle:** The six pillars of predictable high performance
**Author:** Andrew Phillips
**Publisher:** Network Advansys Limited, trading as Systemhelp (company 3503850)
**Reader:** delivery directors, heads of transformation, PMO leads, COOs

## Structure: six parts, 22 chapters

| Part | Chapters | Subject |
| --- | --- | --- |
| One | 1 | Why capable teams underperform |
| Two | 2 | The value question |
| Three | 3 | The measurement cycle |
| Four | 4–11 | Target (4–7) and Expression (8–11) |
| Five | 12–16 | Accountability (12–13) and Mindset (14–16) |
| Six | 17–22 | Insight (17–19) and Quality (20–22) |

The site currently says "six parts, nineteen chapters" — 19 was the count of pillar
chapters only. Correct it to twenty-two once the book exists. The promise "read the
first three chapters free" stays true: parts one, two and three are chapters 1, 2 and 3.

## Files

| Path | What it is |
| --- | --- |
| `book/BOOK-BRIEF.md` | The writing contract: voice, banned words, evidence rules, chapter anatomy, chapter map |
| `book/source/` | Course material split per pillar, plus `evidence-and-sources.md` (the only permitted statistics) |
| `book/manuscript/` | The chapters. Written by nine parallel agents to these files |
| `book/fonts/` | EB Garamond and Inter variable TTFs, for the print edition |
| `book/book.typ` | The print interior template: 6×9, mirrored margins, running heads, folio |
| `book/md2print.py` | Markdown → Typst converter for the print body |
| `book/build/body.typ` | Generated print body (do not edit by hand) |

### Manuscript files and their writers

| File | Chapters | Job |
| --- | --- | --- |
| `ch01.md` | 1 | `job_8DAnHsH4` |
| `ch02.md` | 2 | `job_6bNR0dLo` |
| `ch03.md` | 3 | `job_3Dieiu2k` |
| `ch04-07.md` | 4–7 | `job_LVQUJ2NT` |
| `ch08-11.md` | 8–11 | `job_RAvtCyFw` |
| `ch12-13.md` | 12–13 | `job_iH8QME7z` |
| `ch14-16.md` | 14–16 | `job_BqhumHPu` |
| `ch17-19.md` | 17–19 | `job_5ZQH5nAG` |
| `ch20-22.md` | 20–22 | `job_4ZJP5WPp` |

## Chapter anatomy every writer followed

Opening scene (150–250 words, no heading) then: The principle · What it looks like when
it is missing · What it looks like when it works · How to do it · The exercise · What to
measure · One thing to do this week. 1,900–2,150 words per chapter.

## Print specification

- Trim 6in × 9in, no bleed (text-only interior, which is what KDP wants).
- Margins: inside 0.7in, outside 0.55in, top 0.72in, bottom 0.68in. Correct for the
  151–300 page band, where KDP requires at least 0.5in inside.
- Body 10.8pt EB Garamond on 1.28em leading; headings Inter; justified with hyphenation.
- Running head: verso = TEAM IQ, recto = chapter title; no head on chapter openers or
  page 1. Folio centred in the footer.
- Front matter unnumbered, body arabic from 1.

## Still to do

1. Write `md2print.py`, convert the manuscript, compile the print PDF.
2. Back matter: the fourteen tools, references, about the author, working with us.
3. EPUB build with ebooklib (confirmed installed) — pandoc is not installed and is not needed.
4. Free sample: chapters 1–3 as its own PDF and EPUB, uploaded and wired to `/book/`.
5. Cover artwork.
6. Correct the chapter count on the website, commit and push.