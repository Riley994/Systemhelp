/* ==========================================================================
   TEAM IQ — COST-OF-INACTION MODEL
   --------------------------------------------------------------------------
   The argument that closes the deal, in the champion's own numbers.

   Three costs are added up every year:
     1. Rework     — effort spent producing something that has to be redone
     2. Decision delay — capacity blocked while a decision sits unmade
     3. Stalled work   — initiatives that stopped after consuming budget

   Every assumption is visible and editable on the page. That is deliberate:
   a number the CFO can interrogate survives scrutiny; a black box does not.

   Defaults come from config.js so they can be changed in one place.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.querySelector("[data-calculator]");
  if (!root) return;

  var CFG = (window.TEAMIQ || {}).boardCase || {};
  var D = CFG.defaults || {};
  var WORKING_DAYS = CFG.workingDaysPerYear || 220;
  var PROGRAMME_PRICE = CFG.programmePrice || 45000;

  var FIELDS = [
    { key: "teams",              label: "Delivery teams",                      suffix: "",    min: 0, max: 500,  step: 1,    fallback: 10 },
    { key: "costPerTeam",        label: "Fully-loaded cost per team, per year", prefix: "£",  min: 0, max: 5000000, step: 1000, fallback: 420000 },
    { key: "reworkPct",          label: "Effort lost to rework",                suffix: "%",  min: 0, max: 60,   step: 1,    fallback: 15 },
    { key: "decisionLatencyDays", label: "Days to reach a decision",            suffix: " days", min: 0, max: 60, step: 1,  fallback: 7 },
    { key: "delayIntensity",     label: "Team capacity affected while waiting",  suffix: "%",  min: 0, max: 100,  step: 5,    fallback: 50 },
    { key: "stalledInitiatives", label: "Stalled initiatives, last 3 years",    suffix: "",    min: 0, max: 50,   step: 1,    fallback: 1 },
    { key: "stalledCost",        label: "Average cost of one stalled initiative", prefix: "£", min: 0, max: 10000000, step: 5000, fallback: 250000 }
  ];

  var inputs = {};

  function money(n) {
    return "£" + Math.round(n).toLocaleString("en-GB");
  }

  function readState() {
    var s = {};
    FIELDS.forEach(function (f) {
      var el = inputs[f.key];
      var v = parseFloat(el.value);
      if (isNaN(v) || v < 0) v = 0;
      s[f.key] = v;
    });
    return s;
  }

  function compute(s) {
    var rework = s.teams * s.costPerTeam * (s.reworkPct / 100);
    var delay = s.teams * s.costPerTeam * (s.decisionLatencyDays / WORKING_DAYS) * (s.delayIntensity / 100);
    var stalled = s.stalledInitiatives * s.stalledCost;
    return { rework: rework, delay: delay, stalled: stalled, total: rework + delay + stalled };
  }

  function render() {
    var s = readState();
    var r = compute(s);
    var max = Math.max(r.rework, r.delay, r.stalled, 1);

    root.querySelector("[data-calc-total]").textContent = money(r.total);
    root.querySelector("[data-calc-per-team]").textContent = s.teams > 0 ? money(r.total / s.teams) : "—";
    root.querySelector("[data-calc-percent]").textContent = (s.teams * s.costPerTeam) > 0
      ? ((r.total / (s.teams * s.costPerTeam)) * 100).toFixed(1) + "%"
      : "—";

    [["rework", r.rework], ["delay", r.delay], ["stalled", r.stalled]].forEach(function (pair) {
      var li = root.querySelector('[data-wf="' + pair[0] + '"]');
      if (!li) return;
      li.querySelector("[data-wf-value]").textContent = money(pair[1]);
      li.querySelector("[data-wf-bar]").style.width = ((pair[1] / max) * 100).toFixed(1) + "%";
    });

    // payback: how much of the annual cost a programme would have to recover
    var payback = root.querySelector("[data-calc-payback]");
    if (payback) {
      if (r.total > 0) {
        var pct = (PROGRAMME_PRICE / r.total) * 100;
        payback.textContent = pct.toFixed(1) + "%";
      } else {
        payback.textContent = "—";
      }
    }

    // the printable summary
    var summary = document.querySelector("[data-calc-summary]");
    if (summary) {
      summary.innerHTML =
        '<dl class="doc__meta">' +
        "<div><dt>Teams assessed</dt><dd>" + s.teams + "</dd></div>" +
        "<div><dt>Cost per team</dt><dd>" + money(s.costPerTeam) + "</dd></div>" +
        "<div><dt>Rework</dt><dd>" + s.reworkPct + "%</dd></div>" +
        "<div><dt>Decision latency</dt><dd>" + s.decisionLatencyDays + " days</dd></div>" +
        "</dl>" +
        "<p class=\"calc__total calc__total--accent num\">" + money(r.total) + "</p>" +
        "<p>Estimated annual cost of the current Team IQ across " + s.teams + " teams " +
        "(" + money(r.total / Math.max(s.teams, 1)) + " per team).</p>" +
        "<ul class=\"waterfall\">" +
        "<li><div class=\"wf__top\"><span>Rework</span><b>" + money(r.rework) + "</b></div></li>" +
        "<li><div class=\"wf__top\"><span>Decision delay</span><b>" + money(r.delay) + "</b></div></li>" +
        "<li><div class=\"wf__top\"><span>Stalled initiatives</span><b>" + money(r.stalled) + "</b></div></li>" +
        "</ul>" +
        "<p class=\"small muted\">Assumptions: " + s.delayIntensity + "% of team capacity affected while a decision is pending; " +
        WORKING_DAYS + " working days per year. A TEAM IQ programme (from " + money(PROGRAMME_PRICE) + " + VAT) would need to recover " +
        (r.total > 0 ? ((PROGRAMME_PRICE / r.total) * 100).toFixed(1) + "%" : "—") + " of this to pay for itself.</p>";
    }

    // carry the figures into the gated download form
    var hidden = document.querySelector("[data-calc-payload]");
    if (hidden) {
      hidden.value = "teams=" + s.teams + "; costPerTeam=" + s.costPerTeam + "; rework=" + s.reworkPct +
        "%; latency=" + s.decisionLatencyDays + "d; intensity=" + s.delayIntensity +
        "%; stalled=" + s.stalledInitiatives + " @ " + s.stalledCost +
        "; annual cost=" + Math.round(r.total);
    }

    // "send this to a colleague"
    var share = document.querySelector("[data-calc-share]");
    if (share) {
      var body = "I modelled what our current team performance is costing us using the TEAM IQ cost-of-inaction model.\n\n" +
        "Assumptions: " + s.teams + " teams at " + money(s.costPerTeam) + " fully loaded, " + s.reworkPct +
        "% of effort lost to rework, " + s.decisionLatencyDays + " days average decision latency, " +
        s.stalledInitiatives + " stalled initiatives at " + money(s.stalledCost) + " each.\n\n" +
        "Estimated annual cost: " + money(r.total) + "\n\n" +
        "The model is here, and every assumption is editable: https://systemhelp.co.uk/board-case/#calculator\n\n" +
        "Worth twenty minutes at the next board?";
      share.setAttribute("href", "mailto:?subject=" + encodeURIComponent("What our current team performance is costing us") + "&body=" + encodeURIComponent(body));
    }
  }

  /* build the input panel */
  var panel = root.querySelector("[data-calc-inputs]");
  FIELDS.forEach(function (f) {
    var value = D[f.key] !== undefined ? D[f.key] : f.fallback;
    var row = document.createElement("div");
    row.className = "calc__row";
    row.innerHTML =
      '<label for="calc-' + f.key + '">' + f.label + "</label>" +
      '<div style="display:flex;align-items:center;gap:6px">' +
        (f.prefix ? '<span class="muted">' + f.prefix + "</span>" : "") +
        '<input class="input" id="calc-' + f.key + '" data-calc="' + f.key + '" type="number" inputmode="numeric" ' +
        'value="' + value + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '">' +
        (f.suffix ? '<span class="muted small nowrap">' + f.suffix.trim() + "</span>" : "") +
      "</div>";
    panel.appendChild(row);
    inputs[f.key] = row.querySelector("input");
    inputs[f.key].addEventListener("input", render);
  });

  render();
})();