// ============================================================================
// TEAM IQ — print interior
// ----------------------------------------------------------------------------
// 6 x 9 inch trade paperback, print-on-demand ready (KDP 6x9, no bleed).
// Mirrored margins, running heads that skip chapter openers, centred folios,
// part openers on their own page, and a contents list with page numbers.
//
// Build:  typst compile book.typ out/team-iq-sample.pdf --font-path ./fonts
// ============================================================================

#let book-title    = "TEAM IQ"
#let book-full     = "Team IQ: why your best people don't make your best teams"
#let book-subtitle = "The six pillars of predictable high performance"
#let book-author   = "Andrew Phillips"
#let book-publisher = "Network Advansys Limited, trading as Systemhelp"

#let serif = "EB Garamond"
#let sans  = "Inter"

// the folio and the running head
#let folio-size = 9.5pt
#let head-size  = 8pt

// pages that open a chapter carry no running head
#let openers = state("openers", ())

#set page(
  paper: "us-trade",   // 6in x 9in, the standard trade paperback trim
  margin: (inside: 0.7in, outside: 0.55in, top: 0.72in, bottom: 0.68in),
  header: context {
    let n = counter(page).get().first()
    if n == 1 or n in openers.get() { none } else {
      set text(size: head-size, font: sans, fill: luma(95))
      if calc.even(n) [
        #align(left)[#book-title]
      ] else [
        #align(right)[#current-chapter.get()]
      ]
    }
  },
  footer: context {
    let n = counter(page).get().first()
    set text(size: folio-size, font: sans, fill: luma(70))
    align(center)[#n]
  },
)

// the current chapter, used by the running head on recto pages
#let current-chapter = state("chapter", "")

#set text(font: serif, size: 10.8pt, lang: "en", region: "gb", hyphenate: true)
#set par(justify: true, leading: 1.28em, spacing: 1.05em, first-line-indent: 1.1em)

#show heading.where(level: 1): it => pagebreak(weak: true) + pagebreak(weak: true) + [
  #set text(font: sans, size: 26pt, weight: 600, fill: rgb("#0A0F2C"), hyphenate: false)
  #v(0.35in)
  #align(left)[#it.body]
  #v(0.12in)
  #line(length: 100%, stroke: 0.9pt + rgb("#EFAC23"))
  #v(0.28in)
]

#show heading.where(level: 2): it => [
  #pagebreak(weak: true)
  #context openers.update(o => o + (counter(page).get().first(),))
  #current-chapter.update(it.body)
  #v(0.85in)
  #set text(font: sans, size: 19pt, weight: 600, fill: rgb("#0A0F2C"), hyphenate: false)
  #align(left)[#it.body]
  #v(0.32in)
  #set par(first-line-indent: 0em)
]

#show heading.where(level: 3): it => [
  #v(0.55em)
  #set text(font: sans, size: 11.3pt, weight: 600, fill: rgb("#113895"), hyphenate: false)
  #align(left)[#it.body]
  #v(0.12em)
]

// a scene break
#let break-mark = align(center)[#v(0.35em)#text(fill: luma(140))[· · ·]#v(0.35em)]

// ---------------------------------------------------------------------------
// front matter
// ---------------------------------------------------------------------------

#set page(numbering: none, header: none, footer: none)

#align(center)[
  #v(1.9in)
  #text(font: sans, size: 27pt, weight: 700, fill: rgb("#0A0F2C"))[TEAM IQ]
  #v(0.3in)
  #text(font: serif, size: 17pt, style: "italic", fill: luma(60))[why your best people]
  #v(0.02in)
  #text(font: serif, size: 17pt, style: "italic", fill: luma(60))[don't make your best teams]
  #v(1.5in)
  #text(font: sans, size: 12pt, weight: 600)[#book-author]
  #v(0.9in)
  #text(font: sans, size: 9.5pt, fill: luma(110))[#book-publisher]
]

#pagebreak()

#set par(first-line-indent: 0em)
#set text(size: 9pt, fill: luma(60))

*#book-full*#linebreak()
Copyright © 2026 Network Advansys Limited. All rights reserved.

#v(0.35in)
First edition, 2026. Published by Network Advansys Limited, 49 Station Road, Polegate, East Sussex, BN26 6EA, United Kingdom. Company number 3503850. TEAM IQ Creator is a registered trademark of Network Advansys Limited, and is used in this book to refer to the method and the accompanying instruments.

#v(0.25in)
No part of this publication may be reproduced, distributed or transmitted in any form without the prior written permission of the publisher, except for brief quotations in a review or in internal business documents, which are permitted with attribution.

#v(0.25in)
ISBN (paperback): to be assigned#linebreak()
ISBN (ebook): to be assigned#linebreak()
Edition: 1.0

#v(0.25in)
The exercises and instruments described in this book are published so that teams can use them without buying anything. You do not need to work with us to use them.

#v(0.25in)
Every statistic in this book is either drawn from published research, named in the text and listed in the references, or identified as our own observation. Where a figure is quoted, it is quoted as published. Nothing here is a guarantee of a commercial result, and nothing here is professional advice for your particular circumstances.

#v(0.25in)
Written in the United Kingdom in British English. Set in EB Garamond and Inter.

#v(0.2in)
#text(fill: luma(90))[systemhelp.co.uk]

#pagebreak()

// ---------------------------------------------------------------------------
// contents
// ---------------------------------------------------------------------------

#set text(size: 10.5pt, fill: black)
#align(left)[
  #text(font: sans, size: 19pt, weight: 600, fill: rgb("#0A0F2C"))[Contents]
]
#v(0.3in)

#show outline.entry.where(level: 1): it => {
  v(0.85em, weak: true)
  set text(font: sans, size: 10pt, weight: 600, fill: rgb("#0A0F2C"))
  it
}
#show outline.entry.where(level: 2): it => {
  v(0.14em, weak: true)
  set text(font: serif, size: 10.4pt)
  it
}

#outline(title: none, depth: 2, indent: 1.1em)

#pagebreak()

// ---------------------------------------------------------------------------
// how to use this book
// ---------------------------------------------------------------------------

#set text(size: 10.8pt, fill: black)
#set par(first-line-indent: 0em)
#align(left)[
  #text(font: sans, size: 17pt, weight: 600, fill: rgb("#0A0F2C"))[How to use this book]
]
#v(0.25in)

This book has three jobs. The first is to convince you that the performance of a team is a measurable property of the team, not a sum of the people in it. The second is to give you six things to work on. The third is to give you a way to show the movement to whoever holds your budget.

#v(0.15in)
Six parts follow. The first three set up the argument, the value question and the measurement cycle. Parts four, five and six are the six pillars in practice, and they are the working part of the book: each chapter ends with an exercise you can run with your team, something to measure, and one thing to do this week.

#v(0.15in)
You can read it straight through in an evening or two. You will get more from it if you run the exercises as you go, on one real team, rather than making notes for later. Every exercise is designed for a single session of forty-five to sixty minutes, with the team in the room.

#v(0.15in)
Nothing here requires you to buy a framework, a licence or a subscription. The instruments are published in the book and on the website, and they are yours to use.

#v(0.35in)
#set text(font: sans, size: 11pt, weight: 600, fill: rgb("#0A0F2C"))
A note on the evidence
#v(0.12in)
#set text(size: 10.4pt)

Business writing has a credibility problem, and most of it comes from numbers that nobody can trace. Three rules were applied to every page of this book.

#v(0.12in)
First, every published figure is named where it appears and listed in the references at the back. If you want to check a number, you can. Second, where a claim comes from our own work rather than from published research, the text says so in the sentence, and the numbers come from programmes we can name. Third, where we could not source something, it is described rather than quantified.

#v(0.12in)
That third rule cost us some good lines. A widely quoted figure about rework reduction appeared on our previous website without a source; we removed it rather than repeat it. You will find that attitude throughout: occasionally irritating, consistently honest, and the reason the arguments in this book survive being taken to somebody sceptical.

#pagebreak()

// ---------------------------------------------------------------------------
// body
// ---------------------------------------------------------------------------

#set page(numbering: "1", header: auto, footer: auto)
#set text(fill: black)
#set par(first-line-indent: 1.1em)
#counter(page).update(1)

#include "build/body-sample.typ"
