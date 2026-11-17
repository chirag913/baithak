/* Baithak Club — landing page behaviour */

// Google Apps Script web-app URL. Replace YOUR_DEPLOYMENT_ID at deploy time
// (Apps Script → Deploy → Manage deployments → Web app URL, ends in /exec).
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";

const MIN_AGE = 18;
const MAX_AGE = 35;
const AGE_MSG = "This baithak is for ages 18–35";
const FRIENDLY_ERROR = "Something went wrong on our side. Please try again in a minute, or DM us on Instagram @baithak.club.";

(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header border on scroll ---------- */
  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Fade-up + blur-to-sharp reveal ---------- */
  const reveals = document.querySelectorAll(".reveal");
  // gentle stagger for siblings in the same parent
  reveals.forEach((el) => {
    const sibs = Array.from(el.parentElement.children).filter((c) => c.classList.contains("reveal"));
    const i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty("--d", Math.min(i * 0.09, 0.45) + "s");
  });
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Mobile Apply dock: after the hero, hidden near the form ---------- */
  const dock = document.getElementById("dock");
  const hero = document.querySelector(".hero");
  const applySection = document.getElementById("apply");
  if (dock && "IntersectionObserver" in window) {
    let pastHero = false, nearForm = false;
    const sync = () => dock.classList.toggle("is-visible", pastHero && !nearForm);
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); }, { threshold: 0 }).observe(hero);
    new IntersectionObserver(([e]) => { nearForm = e.isIntersecting; sync(); }, { threshold: 0 }).observe(applySection);
  }

  /* ---------- Form ---------- */
  const form = document.getElementById("apply-form");
  if (!form) return;
  const alertBox = document.getElementById("form-alert");
  const success = document.getElementById("form-success");
  const submitBtn = document.getElementById("submit-btn");
  const $ = (id) => document.getElementById(id);

  // Normalise an Indian mobile: accepts 98765 43210, 098765..., +91 98765..., 91-98765...
  function normalisePhone(raw) {
    const trimmed = String(raw).trim();
    let d = trimmed.replace(/\D/g, "");
    if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
    else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
    if (/^[6-9]\d{9}$/.test(d)) return "+91 " + d.slice(0, 5) + " " + d.slice(5);
    // International numbers typed with a + and country code
    if (trimmed.startsWith("+") && !trimmed.startsWith("+91") && d.length >= 8 && d.length <= 15) return "+" + d;
    return null;
  }

  // Accepts "handle", "@handle" or a pasted profile URL
  function normaliseHandle(raw) {
    let h = String(raw).trim();
    const m = h.match(/instagram\.com\/([^/?#\s]+)/i);
    if (m) h = m[1];
    h = h.replace(/^@+/, "").replace(/\/+$/, "");
    return /^[A-Za-z0-9._]{1,30}$/.test(h) ? h.toLowerCase() : null;
  }

  const validators = {
    fullName: (v) => v.trim().length >= 2 || "Please enter your full name.",
    phone: (v) => !!normalisePhone(v) || (v.trim() ? "Enter a valid 10-digit WhatsApp number." : "We need a WhatsApp number to send your invite."),
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || (v.trim() ? "That email doesn’t look right." : "Please enter your email."),
    age: (v) => {
      if (v.trim() === "") return "Please enter your age.";
      const n = Number(v);
      if (!Number.isInteger(n)) return "Please enter your age in whole years.";
      return (n >= MIN_AGE && n <= MAX_AGE) || AGE_MSG;
    },
    gender: (v) => !!v || "Please choose an option.",
    city: (v) => v.trim().length >= 2 || "Where are you based?",
    instagram: (v) => !!normaliseHandle(v) || (v.trim() ? "Enter just your handle, e.g. @yourname." : "We verify through Instagram, so this is needed."),
    profession: (v) => v.trim().length >= 2 || "What do you do?",
    whyJoin: (v) => v.trim().length >= 10 || "A line or two, please — it helps us build the room.",
    source: (v) => !!v || "Please choose an option.",
    event: (v) => !!v || "Please choose the event.",
    consent: (_, el) => el.checked || "Please tick this to continue."
  };

  function setError(name, msg) {
    const el = $(name);
    const field = el.closest(".field");
    const err = $(name + "-error");
    if (msg) {
      field.classList.add("has-error");
      el.setAttribute("aria-invalid", "true");
      if (err) err.textContent = msg;
    } else {
      field.classList.remove("has-error");
      el.removeAttribute("aria-invalid");
      if (err) err.textContent = "";
    }
    if (err) {
      const ids = new Set((el.getAttribute("aria-describedby") || "").split(" ").filter(Boolean));
      ids.add(err.id);
      el.setAttribute("aria-describedby", Array.from(ids).join(" "));
    }
  }

  function validateField(name) {
    const el = $(name);
    const result = validators[name](el.value, el);
    setError(name, result === true ? "" : result);
    return result === true;
  }

  // Validate on blur; once a field has shown an error, re-check as they type.
  Object.keys(validators).forEach((name) => {
    const el = $(name);
    const evt = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "blur";
    el.addEventListener(evt, () => validateField(name));
    el.addEventListener("input", () => {
      if (el.closest(".field").classList.contains("has-error")) validateField(name);
    });
  });
  // Age error shows instantly — it's the one rule that hard-blocks.
  $("age").addEventListener("input", () => {
    const v = $("age").value;
    if (v.length >= 2) validateField("age");
  });

  function showAlert(msg) {
    alertBox.textContent = msg;
    alertBox.hidden = false;
    alertBox.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  }

  function setLoading(on) {
    submitBtn.classList.toggle("is-loading", on);
    submitBtn.disabled = on;
    submitBtn.querySelector(".btn-label").textContent = on ? "Sending…" : "Send my application";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertBox.hidden = true;

    const names = Object.keys(validators);
    const firstBad = names.find((n) => !validateField(n));
    if (firstBad) {
      // validate all so every error is visible, then focus the first
      names.forEach(validateField);
      $(firstBad).focus();
      return;
    }

    // Honeypot — quietly succeed for bots.
    if ($("company").value) { showSuccess(); return; }

    if (APPS_SCRIPT_URL.includes("YOUR_DEPLOYMENT_ID")) {
      console.warn("[Baithak] APPS_SCRIPT_URL is still the placeholder — set it in script.js.");
      showAlert("Applications aren’t connected yet. Please DM us on Instagram @baithak.club and we’ll sort you out.");
      return;
    }

    const body = new URLSearchParams({
      fullName: $("fullName").value.trim(),
      phone: normalisePhone($("phone").value),
      email: $("email").value.trim().toLowerCase(),
      age: String(Number($("age").value)),
      gender: $("gender").value,
      city: $("city").value.trim(),
      instagram: normaliseHandle($("instagram").value),
      profession: $("profession").value.trim(),
      whyJoin: $("whyJoin").value.trim(),
      source: $("source").value,
      event: $("event").value,
      consent: $("consent").checked ? "yes" : "no"
    });

    setLoading(true);
    try {
      // URLSearchParams body → application/x-www-form-urlencoded: a CORS simple request, no preflight.
      const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body, redirect: "follow" });
      let data = null;
      try { data = await res.json(); } catch (_) { /* non-JSON (e.g. Google login page) */ }

      if (data && data.ok === true) {
        showSuccess();
      } else if (data && data.error) {
        showAlert(data.error);
      } else {
        console.error("[Baithak] Unexpected response", res.status);
        showAlert(FRIENDLY_ERROR);
      }
    } catch (err) {
      console.error("[Baithak] Network error", err);
      showAlert(navigator.onLine === false
        ? "You seem to be offline. Check your connection and try again — your answers are still here."
        : "We couldn’t confirm that your application went through. Please try once more — if it keeps happening, DM us on Instagram @baithak.club.");
    } finally {
      setLoading(false);
    }
  });

  function showSuccess() {
    form.reset();
    form.hidden = true;
    success.hidden = false;
    success.focus({ preventScroll: true });
    success.closest(".form-card").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }
})();
