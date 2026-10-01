/* ==========================================================================
   TEAM IQ SCORECARD
   --------------------------------------------------------------------------
   24 statements, four per pillar, answered on a 1-5 agreement scale.
   Produces a score out of 100, six pillar sub-scores, a hexagon radar, and a
   written interpretation of the weakest pillar with two starting exercises
   drawn from the course's own tools.

   The score is shown BEFORE the email is asked for: the tool gives value
   first. If the lead endpoint is unreachable the score still displays.
   ========================================================================== */
(function () {
  "use strict";

  var PILLARS = [
    { key: "target",         name: "TARGET",         short: "A clear, valuable result the whole team can see" },
    { key: "expression",     name: "EXPRESSION",     short: "Communication that creates understanding, not volume" },
    { key: "accountability", name: "ACCOUNTABILITY", short: "Shared certainty about who owns which outcome" },
    { key: "mindset",        name: "MINDSET",        short: "How the team reads challenge, failure and difference" },
    { key: "insight",        name: "INSIGHT",        short: "Sound, timely decisions where the information is richest" },
    { key: "quality",        name: "QUALITY",        short: "The right value, standard, cost and time" }
  ];

  var QUESTIONS = [
    { p: "target", t: "Everyone in the team can state, in one sentence, the valuable result we are trying to create." },
    { p: "target", t: "Our main objective has a written baseline, a target and a review date." },
    { p: "target", t: "The work we deliberately say no to is as clear as the work we say yes to." },
    { p: "target", t: "We can show evidence of progress against the objective, not just evidence of activity." },

    { p: "expression", t: "People raise problems and uncertainty early, without fear of being blamed." },
    { p: "expression", t: "When a decision is made, everyone leaves with the same understanding of what it means." },
    { p: "expression", t: "Disagreement is handled openly and quickly rather than avoided or escalated." },
    { p: "expression", t: "Feedback between colleagues is specific about the behaviour and its impact." },

    { p: "accountability", t: "For every outcome that matters, one person is clearly accountable." },
    { p: "accountability", t: "Handoffs between people and teams work without work getting lost." },
    { p: "accountability", t: "Our agreements are written down and reviewed rather than assumed." },
    { p: "accountability", t: "When something slips, we examine the system before we look for someone to blame." },

    { p: "mindset", t: "Challenge and failure are treated as information rather than as a threat." },
    { p: "mindset", t: "People ask for help across teams rather than defending their own patch." },
    { p: "mindset", t: "New ideas are tested quickly instead of being debated for weeks." },
    { p: "mindset", t: "The team recognises learning and contribution, not only results." },

    { p: "insight", t: "Decisions are made by the people closest to the information." },
    { p: "insight", t: "We can see the few measures that tell us whether we are winning." },
    { p: "insight", t: "Information is easy to find without having to ask someone to send it to you." },
    { p: "insight", t: "We review performance data on a regular rhythm, not only when something goes wrong." },

    { p: "quality", t: "We know what \u201Cgood\u201D looks like before we start building." },
    { p: "quality", t: "Value is defined by the customer outcome, not by our volume of output." },
    { p: "quality", t: "We fix the cause of a defect rather than only the defect." },
    { p: "quality", t: "We understand the true cost of the work, including rework and delay." }
  ];

  var BANDS = [
    { max: 39,  name: "Reactive",   text: "The team is managing events rather than directing outcomes. Individual effort is high, collective intelligence is not yet being used." },
    { max: 59,  name: "Emerging",   text: "There are pockets of good practice, but they depend on individuals rather than on the way the team works together." },
    { max: 74,  name: "Developing", text: "The team has the foundations. What is missing is consistency and the evidence to prove improvement." },
    { max: 89,  name: "Strong",     text: "The team runs most of the measurement cycle reliably. The remaining gains come from tightening the weakest pillar." },
    { max: 100, name: "Exemplary",  text: "The team can set a target, evidence it, own it, learn and re-decide. Protect this: measure it so it does not drift." }
  ];

  var EXERCISES = {
    target: [
      "Run a T.A.R.G.E.T Value Index on the team's current objective: name the value that must change, its baseline, its target and the review date.",
      "Agree a Target Risk Burn-Down for the three risks most likely to stop the target being met, and review it weekly."
    ],
    expression: [
      "Apply the C.L.E.A.R.L.Y Evidence Standard to one recurring meeting: what do we know, what are we assuming, and what has changed?",
      "Run a Yin Yang feedback round with the person you work with most: one thing to keep, one thing to change."
    ],
    accountability: [
      "Write a D.R.E.A.M Outcome Contract for the outcome that most often slips: what is delivered, by whom, by when, against what evidence.",
      "Quantify the D.R.E.A.M Boundaries: what is in scope, what is out, and what triggers escalation."
    ],
    mindset: [
      "Run a Risk-First Learning Loop: take the riskiest assumption in your current plan and design the smallest test that would disprove it.",
      "Use M.I.N.D.S.E.T Value Engineering to turn one \u201Cwe cannot do that\u201D into a measurable experiment with a date."
    ],
    insight: [
      "Use D.I.R.E.C.T Value Routing on the current work list: what should continue, change, stop or scale?",
      "Set three Insight Risk Triggers \u2014 the thresholds at which the team stops and re-decides."
    ],
    quality: [
      "Run the 7 C's Value Engineering Standard across one value stream and score it honestly.",
      "Set your 7 C's Outcome Metrics for the next delivery cycle, including rework and cost of delay."
    ]
  };

  var root = document.querySelector("[data-scorecard]");
  if (!root) return;

  var state = { index: 0, answers: new Array(QUESTIONS.length).fill(0), done: false };
  var elIntro = root.querySelector("[data-sc-intro]");
  var elQuiz = root.querySelector("[data-sc-quiz]");
  var elResult = root.querySelector("[data-sc-result]");

  /* ------------------------------------------------------------- scoring */
  function scores() {
    var byPillar = {};
    PILLARS.forEach(function (p) { byPillar[p.key] = { sum: 0, count: 0 }; });
    QUESTIONS.forEach(function (q, i) {
      byPillar[q.p].sum += state.answers[i] || 0;
      byPillar[q.p].count += 1;
    });
    var total = 0;
    var list = PILLARS.map(function (p) {
      var d = byPillar[p.key];
      var score = Math.round(((d.sum - d.count) / (d.count * 4)) * 100);
      total += score;
      return { key: p.key, name: p.name, short: p.short, score: score };
    });
    total = Math.round(total / PILLARS.length);
    list.sort(function (a, b) { return a.score - b.score; });
    return { total: total, pillars: list, weakest: list[0], strongest: list[list.length - 1] };
  }

  function band(total) {
    for (var i = 0; i < BANDS.length; i++) if (total <= BANDS[i].max) return BANDS[i];
    return BANDS[BANDS.length - 1];
  }

  /* ------------------------------------------------------------ rendering */
  function renderIntro() {
    elIntro.hidden = false;
    elQuiz.hidden = true;
    elResult.hidden = true;
  }

  function renderQuestion() {
    var i = state.index;
    var q = QUESTIONS[i];
    var pillar = PILLARS.filter(function (p) { return p.key === q.p; })[0];
    elIntro.hidden = true;
    elResult.hidden = true;
    elQuiz.hidden = false;

    elQuiz.querySelector("[data-sc-pillar]").textContent = pillar.name;
    elQuiz.querySelector("[data-sc-count]").textContent = "Statement " + (i + 1) + " of " + QUESTIONS.length;
    elQuiz.querySelector("[data-sc-q]").textContent = q.t;
    elQuiz.querySelector("[data-sc-bar]").style.width = ((i) / QUESTIONS.length) * 100 + "%";
    elQuiz.querySelector("[data-sc-hint]").textContent = "1 = strongly disagree \u00B7 5 = strongly agree. Use the number keys or Tab and Enter.";

    var back = elQuiz.querySelector("[data-sc-back]");
    back.disabled = i === 0;

    var inputs = elQuiz.querySelectorAll("input[name=sc]");
    Array.prototype.forEach.call(inputs, function (input) {
      input.checked = state.answers[i] === parseInt(input.value, 10);
      input.tabIndex = input.checked ? 0 : -1;
    });
    var first = inputs[0];
    if (first && !document.body.classList.contains("no-focus")) first.focus({ preventScroll: true });
  }

  function answer(value) {
    state.answers[state.index] = value;
    if (state.index < QUESTIONS.length - 1) { state.index++; renderQuestion(); }
    else finish();
  }

  function finish() {
    state.done = true;
    elQuiz.hidden = true;
    elIntro.hidden = true;
    elResult.hidden = false;
    elResult.innerHTML = resultMarkup(scores());
    var heading = elResult.querySelector("h2");
    if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus(); }
    initResultForm();
  }

  function radarMarkup(pillars) {
    // pillars arrive sorted by score; use a fixed order for the shape
    var ordered = PILLARS.map(function (p) {
      return pillars.filter(function (x) { return x.key === p.key; })[0];
    });
    var cx = 150, cy = 150, r = 104;
    var points = ordered.map(function (p, i) {
      var a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      var v = r * (p.score / 100);
      return [cx + v * Math.cos(a), cy + v * Math.sin(a)];
    });
    var rings = [0.25, 0.5, 0.75, 1].map(function (f) {
      var pts = [];
      for (var i = 0; i < 6; i++) {
        var a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        pts.push((cx + r * f * Math.cos(a)).toFixed(1) + "," + (cy + r * f * Math.sin(a)).toFixed(1));
      }
      return '<polygon points="' + pts.join(" ") + '" fill="none" stroke="#E1E6EE" stroke-width="1"/>';
    }).join("");
    var axes = ordered.map(function (p, i) {
      var a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      return '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + r * Math.cos(a)).toFixed(1) + '" y2="' + (cy + r * Math.sin(a)).toFixed(1) + '" stroke="#E1E6EE" stroke-width="1"/>';
    }).join("");
    var labels = ordered.map(function (p, i) {
      var a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      var lx = cx + (r + 26) * Math.cos(a), ly = cy + (r + 26) * Math.sin(a);
      var anchor = Math.abs(Math.cos(a)) < 0.2 ? "middle" : (Math.cos(a) > 0 ? "start" : "end");
      var weakest = p.key === pillars[0].key;
      return '<text x="' + lx.toFixed(0) + '" y="' + (ly + 4).toFixed(0) + '" text-anchor="' + anchor + '" ' +
        'font-size="10" font-weight="600" letter-spacing="0.08em" fill="' + (weakest ? "#C98A0E" : "#5A6472") + '">' + p.name + "</text>";
    }).join("");
    var shape = '<polygon points="' + points.map(function (pt) { return pt[0].toFixed(1) + "," + pt[1].toFixed(1); }).join(" ") + '" ' +
      'fill="rgba(17,56,149,0.14)" stroke="#113895" stroke-width="2"/>';
    var dots = points.map(function (pt) { return '<circle cx="' + pt[0].toFixed(1) + '" cy="' + pt[1].toFixed(1) + '" r="3" fill="#113895"/>'; }).join("");
    return '<svg class="radar" viewBox="0 0 300 300" role="img" aria-label="Six pillar radar chart">' +
      rings + axes + shape + dots + labels + "</svg>";
  }

  function resultMarkup(s) {
    var b = band(s.total);
    var weakest = s.weakest;
    var ex = EXERCISES[weakest.key] || [];
    var bars = PILLARS.map(function (p) {
      var item = s.pillars.filter(function (x) { return x.key === p.key; })[0];
      return '<li data-weakest="' + (item.key === weakest.key) + '">' +
        "<span>" + item.name + "</span>" +
        '<span class="bar"><i style="width:' + item.score + '%"></i></span>' +
        '<span class="val">' + item.score + "</span></li>";
    }).join("");

    return '' +
      '<div class="result">' +
        "<div>" +
          '<p class="eyebrow"><span class="eyebrow__num">RESULT</span> Your Team IQ Score</p>' +
          '<h2 class="visually-hidden">Your Team IQ Score</h2>' +
          '<p class="result__score num" aria-live="polite">' + s.total + '<span class="result__of"> / 100</span></p>' +
          '<p class="result__band">' + b.name + "</p>" +
          "<p class=\"lead\">" + b.text + "</p>" +
          "<p><strong>Strongest pillar:</strong> " + s.strongest.name + " (" + s.strongest.score + "/100). " +
          "This is the part of your operating system to protect while you fix the weakest.</p>" +
          "<p><strong>Weakest pillar:</strong> " + weakest.name + " (" + weakest.score + "/100) \u2014 " + weakest.short.toLowerCase() + ".</p>" +
          "<h3 class=\"mt-2\">Start here \u2014 two exercises for the " + weakest.name + " pillar</h3>" +
          '<ol class="prose">' + ex.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ol>" +
          '<p class="muted" style="font-size:.875rem">These are drawn from the TEAM IQ Creator course. The full diagnostic session works through all four chapters of this pillar with your team and leaves you with a written action plan.</p>' +
          '<div class="cta-row mt-2 no-print">' +
            '<a class="btn btn--primary" href="/diagnostic-session/">Book a diagnostic session</a>' +
            '<a class="btn btn--quiet" href="/how-it-works/">See the method</a>' +
          "</div>" +
        "</div>" +
        "<div>" +
          radarMarkup(s.pillars) +
          '<ul class="pillar-scores mt-2">' + bars + "</ul>" +
        "</div>" +
      "</div>" +
      '<div class="card mt-3" id="report">' +
        "<h3>Get the written report</h3>" +
        "<p>We will email the full breakdown: each pillar scored, what the score implies for your next quarter, and the benchmark line for your organisation size.</p>" +
        '<form data-lead-form data-thankyou="/thank-you/diagnostic/" novalidate>' +
          '<input type="hidden" name="form" value="scorecard">' +
          '<input type="hidden" name="subject" value="TEAM IQ Scorecard report">' +
          '<input type="hidden" name="score" value="' + s.total + '">' +
          '<input type="hidden" name="weakest_pillar" value="' + weakest.name + '">' +
          '<input type="hidden" name="pillar_scores" value="' + s.pillars.map(function (p) { return p.name + ":" + p.score; }).join(", ") + '">' +
          '<div class="formgrid">' +
            '<div class="field"><label for="sc-name">Your name</label><input class="input" id="sc-name" name="name" required autocomplete="name"></div>' +
            '<div class="field"><label for="sc-email">Work email</label><input class="input" id="sc-email" name="email" type="email" required autocomplete="email"><span class="field__error" data-default="We need an email address to send the report."></span></div>' +
            '<div class="field"><label for="sc-company">Organisation</label><input class="input" id="sc-company" name="company" required autocomplete="organization"></div>' +
            '<div class="field"><label for="sc-size">Delivery teams</label>' +
              '<select id="sc-size" name="team_size">' +
                '<option value="1-3">1\u20133</option><option value="4-9" selected>4\u20139</option>' +
                '<option value="10-19">10\u201319</option><option value="20+">20+</option>' +
              "</select></div>" +
          "</div>" +
          '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<button class="btn btn--primary" type="submit">Email me the full report</button>' +
          '<p class="form__note">No newsletter unless you ask for it. Unsubscribe in one click.</p>' +
          '<p class="form__status" data-form-status hidden></p>' +
        "</form>" +
      "</div>";
  }

  function initResultForm() {
    // site.js binds forms on load; bind the freshly rendered one here
    if (window.TEAMIQBindForms) window.TEAMIQBindForms();
  }

  /* ---------------------------------------------------------------- events */
  root.addEventListener("click", function (e) {
    var startBtn = e.target.closest("[data-sc-start]");
    if (startBtn) { state.index = 0; renderQuestion(); return; }

    var backBtn = e.target.closest("[data-sc-back]");
    if (backBtn) { state.index = Math.max(0, state.index - 1); renderQuestion(); return; }

    var opt = e.target.closest("[data-sc-opt]");
    if (opt) { answer(parseInt(opt.getAttribute("data-sc-opt"), 10)); return; }

    var restart = e.target.closest("[data-sc-restart]");
    if (restart) {
      state = { index: 0, answers: new Array(QUESTIONS.length).fill(0), done: false };
      renderIntro();
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  root.addEventListener("change", function (e) {
    if (e.target.name === "sc") answer(parseInt(e.target.value, 10));
  });

  document.addEventListener("keydown", function (e) {
    if (!state || state.done || elQuiz.hidden) return;
    if (["TEXTAREA", "SELECT"].indexOf(e.target.tagName) !== -1) return;
    if (e.target.tagName === "INPUT" && e.target.type !== "radio") return;
    if (e.key >= "1" && e.key <= "5") answer(parseInt(e.key, 10));
  });

  renderIntro();
})();
