/* ==========================================================================
   TEAM IQ — SHARED SITE JAVASCRIPT
   --------------------------------------------------------------------------
   Handles five things, and nothing else:
     1. Mobile navigation
     2. Settings from config.js (contact details, payment links, booking, dates)
     3. Scroll reveal + number counters
     4. Form submission to /api/lead
     5. Deferred embeds (booking calendar)

   The site works without this file: every page is readable HTML, all prices
   and copy are in the HTML, and forms fall back to a normal POST.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.TEAMIQ || {};
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------------------ 1. NAV */
  function initNav() {
    var header = $(".header");
    var burger = $(".burger");
    if (!header || !burger) return;

    burger.addEventListener("click", function () {
      var open = header.getAttribute("data-nav-open") === "true";
      header.setAttribute("data-nav-open", open ? "false" : "true");
      burger.setAttribute("aria-expanded", open ? "false" : "true");
    });

    // submenus: click to open on touch/small screens, hover is pure CSS-free
    $$(".nav__group").forEach(function (group) {
      var btn = $("button", group);
      if (!btn) return;
      group.setAttribute("data-open", "false");
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", function () {
        var open = group.getAttribute("data-open") === "true";
        $$(".nav__group").forEach(function (g) {
          g.setAttribute("data-open", "false");
          var b = $("button", g);
          if (b) b.setAttribute("aria-expanded", "false");
        });
        group.setAttribute("data-open", open ? "false" : "true");
        btn.setAttribute("aria-expanded", open ? "false" : "true");
      });
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest(".nav__group")) {
        $$(".nav__group").forEach(function (g) { g.setAttribute("data-open", "false"); });
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") header.setAttribute("data-nav-open", "false");
    });
  }

  /* ------------------------------------------------- 2. SETTINGS FROM CONFIG */
  function get(path) {
    return path.split(".").reduce(function (acc, key) {
      return acc && acc[key] !== undefined ? acc[key] : undefined;
    }, CFG);
  }

  function initConfig() {
    // text values, e.g. <span data-cfg="contact.email">
    $$("[data-cfg]").forEach(function (el) {
      var val = get(el.getAttribute("data-cfg"));
      if (val === undefined || val === null || val === "") return;
      el.textContent = val;
    });

    // mailto / tel / href values
    $$("[data-cfg-href]").forEach(function (el) {
      var spec = el.getAttribute("data-cfg-href").split("@");   // "contact.email@mailto"
      var val = get(spec[0]);
      if (!val) return;
      if (spec[1] === "mailto") el.setAttribute("href", "mailto:" + val);
      else if (spec[1] === "tel") el.setAttribute("href", "tel:" + String(val).replace(/[^\d+]/g, ""));
      else el.setAttribute("href", val);
      if (el.hasAttribute("data-hide-if-empty")) el.hidden = false;
    });

    // hide an element entirely when its setting is blank
    $$("[data-hide-if-empty]").forEach(function (el) {
      var key = el.getAttribute("data-hide-if-empty");
      var val = key ? get(key) : (el.getAttribute("data-cfg-href") ? get(el.getAttribute("data-cfg-href").split("@")[0]) : undefined);
      if (!val) el.hidden = true;
    });

    // payment buttons: use the Stripe link when it exists, otherwise the enquiry form
    $$("[data-pay]").forEach(function (el) {
      var key = el.getAttribute("data-pay");
      var url = (CFG.payments || {})[key];
      var product = el.getAttribute("data-pay-name") || key;
      if (url) {
        el.setAttribute("href", url);
      } else {
        el.setAttribute("href", "/contact-page/?interest=" + encodeURIComponent(product) + "#enquiry");
        el.setAttribute("data-pay-fallback", "true");
      }
    });

    // enquiry form prefill from ?interest=
    try {
      var interest = new URLSearchParams(window.location.search).get("interest");
      // matched by name, not id: the enquiry form's select is ct-interest, so
      // looking for #interest meant nothing was ever carried over from a link
      var sel = $('select[name="interest"]');
      var matched = false;
      if (interest && sel) {
        $$("option", sel).forEach(function (o) {
          if (o.value.toLowerCase() === interest.toLowerCase()) {
            sel.value = o.value;
            matched = true;
          }
        });
      }
      // A request for a time needs somewhere to write the times. Only ever fill
      // an empty box, so nothing already typed can be overwritten.
      var message = $('textarea[name="message"]');
      if (matched && message && !message.value.trim()) {
        message.value = "Area of concern:\n\nTwo or three times that suit:\n1. \n2. \n3. ";
      }
    } catch (e) { /* older browsers: ignore */ }

    // workshop date: "2026-11-03" -> "Tuesday 3 November 2026"
    $$("[data-workshop-date]").forEach(function (el) {
      var iso = (CFG.workshop || {}).nextDate;
      if (!iso) { el.textContent = "date to be confirmed"; return; }
      var d = new Date(iso + "T12:00:00");
      if (isNaN(d.getTime())) { el.textContent = iso; return; }
      el.textContent = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      el.setAttribute("datetime", iso);
    });

    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

    // analytics: only loads when a token is set
    var token = (CFG.analytics || {}).cloudflareToken;
    if (token) {
      var s = document.createElement("script");
      s.defer = true;
      s.src = "https://static.cloudflareinsights.com/beacon.min.js";
      s.setAttribute("data-cf-beacon", '{"token":"' + token + '"}');
      document.head.appendChild(s);
    }
  }

  /* -------------------------------------------------- 3. REVEAL + COUNTERS */
  function initReveal() {
    var items = $$(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
        if (entry.target.hasAttribute("data-count")) countUp(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    items.forEach(function (el) { io.observe(el); });
  }

  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    var prefix = el.getAttribute("data-count-prefix") || "";
    var suffix = el.getAttribute("data-count-suffix") || "";
    var decimals = parseInt(el.getAttribute("data-count-decimals") || "0", 10);
    var duration = 900;
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (target * eased).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // Safety net: requestAnimationFrame can be throttled or suspended (a
    // background tab, some headless renderers, reduced-motion settings).
    // Whatever happens, the real figure must end up on the page.
    window.setTimeout(function () {
      el.textContent = prefix + target.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix;
    }, duration + 250);
  }

  /* --------------------------------------------------------------- 4. FORMS */
  function initForms() {
    $$("form[data-lead-form]").forEach(function (form) {
      if (form.getAttribute("data-bound") === "1") return;   // never bind the same form twice
      form.setAttribute("data-bound", "1");
      var status = $("[data-form-status]", form);
      var button = $("button[type=submit]", form);
      var started = Date.now();

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!validate(form)) return;

        // spam checks
        var honey = $("input[name=website]", form);
        if (honey && honey.value) return finish(form);           // bot filled the trap
        // "Impossibly fast" is judged by the server, from startedAt below. Doing
        // it here too meant a visitor whose browser autofilled the form could be
        // dropped without the request even leaving the page.

        var payload = {};
        new FormData(form).forEach(function (value, key) {
          if (key !== "website") payload[key] = typeof value === "string" ? value.trim() : value;
        });
        payload.page = window.location.pathname;
        payload.submittedAt = new Date().toISOString();
        // when the form was rendered, not when it was sent: the server judges
        // "impossibly fast" against this, and the submit time is always ~now
        payload.startedAt = new Date(started).toISOString();

        if (status) { status.hidden = false; status.className = "form__status alert alert--info"; status.textContent = "Sending…"; }
        if (button) { button.disabled = true; button.setAttribute("aria-busy", "true"); }

        fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(payload)
        })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (!res.ok || res.data.ok === false) throw new Error(res.data.error || "send_failed");
            finish(form);
          })
          .catch(function () {
            if (status) {
              status.hidden = false;
              status.className = "form__status alert alert--error";
              status.innerHTML = "Sorry — we could not send that automatically. Please email us directly at " +
                '<a href="mailto:' + ((CFG.contact || {}).email || "andrew@systemhelp.co.uk") + '">' +
                ((CFG.contact || {}).email || "andrew@systemhelp.co.uk") + "</a> and we will reply the same working day.";
            }
            if (button) { button.disabled = false; button.removeAttribute("aria-busy"); }
          });
      });

      $$("input, select, textarea", form).forEach(function (el) {
        el.addEventListener("input", function () {
          var field = el.closest(".field");
          if (field && field.classList.contains("field--invalid")) validate(form, true);
        });
      });
    });
  }

  function finish(form) {
    var next = form.getAttribute("data-thankyou") || "/thank-you/";
    window.location.assign(next);
  }

  function validate(form, quiet) {
    var ok = true;
    $$("[required]", form).forEach(function (el) {
      var field = el.closest(".field");
      var value = (el.value || "").trim();
      var valid = value !== "";
      if (valid && el.type === "email") valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
      if (valid && el.type === "checkbox") valid = el.checked;
      if (!valid) {
        ok = false;
        if (field) {
          field.classList.add("field--invalid");
          if (!quiet) {
            var err = $(".field__error", field);
            if (err) err.textContent = el.type === "email" && value !== "" ? "Please check this email address." : err.getAttribute("data-default") || "This field is needed.";
          }
        }
      } else if (field) {
        field.classList.remove("field--invalid");
      }
    });
    if (!ok && !quiet) {
      var first = $(".field--invalid input, .field--invalid select, .field--invalid textarea", form);
      if (first) first.focus();
    }
    return ok;
  }

  /* -------------------------------------------------------------- 5. EMBEDS */
  function initBooking() {
    $$("[data-booking]").forEach(function (slot) {
      var url = (CFG.booking || {}).embedUrl;
      var link = (CFG.booking || {}).linkUrl;
      var embed = $("[data-booking-embed]", slot);
      var linkEl = $("[data-booking-link]", slot);

      if (url && embed) {
        embed.innerHTML = '<iframe src="' + url + '" title="Choose a time for your TEAM IQ session" ' +
          'scrolling="no" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
        // GoHighLevel's own widget script resizes the frame to fit the calendar.
        // Without it the frame stays at the fixed minimum height and clips the
        // later steps of the booking flow.
        if (!$("#ghl-embed-helper")) {
          var helper = document.createElement("script");
          helper.id = "ghl-embed-helper";
          helper.src = "https://link.msgsndr.com/js/form_embed.js";
          helper.async = true;
          document.body.appendChild(helper);
        }
        // The email route stays on the page, demoted. A browser that blocks the
        // calendar's own storage — Safari by default, and some privacy settings —
        // would otherwise leave the visitor with no way to ask for a time.
        slot.setAttribute("data-booking-embedded", "true");
        if (linkEl) linkEl.hidden = true;
      } else if (link && linkEl) {
        linkEl.setAttribute("href", link);
      }
    });
  }

  function init() {
    initConfig();
    initNav();
    initReveal();
    initForms();
    initBooking();
  }

  // scorecard.js renders its report form after load, so it needs to bind it
  window.TEAMIQBindForms = initForms;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
