(() => {
  "use strict";

  const scene = document.getElementById("scene");
  const envelope = document.getElementById("envelope");
  const flap = document.getElementById("flap");
  const card = document.getElementById("card");
  const opener = document.getElementById("opener");
  const tagline = document.getElementById("tagline");
  const cardClip = document.getElementById("card-clip");
  const countdownStart = document.getElementById("countdown-start");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  let opened = false;

  /* ---------- Blondekant på klaffen (tegnes i SVG) ---------- */

  function drawLace(group) {
    const fill = group.dataset.fill;
    const dot = group.dataset.dot;
    const tip = { x: 200, y: 212 };
    const add = (tag, attrs) => {
      const el = document.createElementNS(NS, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      group.appendChild(el);
    };

    add("path", { d: "M0 0 L400 0 L200 216 Z", fill });

    [{ x: 0, y: 6, side: -1 }, { x: 400, y: 6, side: 1 }].forEach((start) => {
      const dx = tip.x - start.x;
      const dy = tip.y - start.y;
      const len = Math.hypot(dx, dy);
      // Normal som peker utover (bort fra klaffen)
      const nx = start.side < 0 ? -dy / len : dy / len;
      const ny = start.side < 0 ? dx / len : -dx / len;
      const count = Math.round(len / 17);
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const px = start.x + dx * t;
        const py = start.y + dy * t;
        const cx = px + nx * 4;
        const cy = py + ny * 4;
        add("circle", { cx, cy, r: 10, fill, stroke: dot, "stroke-width": 0.9 });
        add("circle", { cx: cx - 0.6, cy: cy - 0.8, r: 8.2, fill: "none", stroke: group.dataset.hi, "stroke-width": 1 });
        add("circle", { cx: cx + nx * 1.5, cy: cy + ny * 1.5, r: 5.2, fill: "none", stroke: dot, "stroke-width": 1, "stroke-dasharray": "1.6 1.4" });
        add("circle", { cx: cx + nx * 1.5, cy: cy + ny * 1.5, r: 1.6, fill: dot });
      }
    });
  }

  document.querySelectorAll(".lace").forEach(drawLace);

  /* ---------- Geometri ---------- */

  // offsetLeft/Top/Width påvirkes ikke av "puste"-skaleringen, så målene blir stabile.
  function geometry() {
    const W = envelope.offsetWidth;
    const H = envelope.offsetHeight;
    const ex = envelope.offsetLeft;
    const ey = envelope.offsetTop;

    const fw = card.offsetWidth;
    const fh = card.offsetHeight;
    const fcx = card.offsetLeft + fw / 2;
    const fcy = card.offsetTop + fh / 2;

    const s = (0.86 * W) / fw;
    const top = ey + 0.06 * H; // kortets overkant inne i konvolutten
    const icx = ex + W / 2;
    const icy = top + (fh * s) / 2;

    // Hvor langt kortet glir opp: ca. 80 % av konvoluttens høyde, men ikke ut av skjermen
    const lift = Math.max(0, Math.min(0.8 * H, top - 10));

    return {
      H,
      clipBottom: cardClip.offsetHeight - (ey + H) + 2,
      start: `translate(${icx - fcx}px, ${icy - fcy}px) scale(${s})`,
      peek: `translate(${icx - fcx}px, ${icy - fcy - lift}px) scale(${s})`,
    };
  }

  function placeCardInEnvelope() {
    if (opened) return;
    card.style.transform = geometry().start;
    card.classList.add("ready");
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function finish() {
    card.style.transform = "none";
    card.getAnimations().forEach((a) => a.cancel());
    cardClip.getAnimations().forEach((a) => a.cancel());
    cardClip.style.clipPath = "none";
    envelope.style.display = "none";
    tagline.style.visibility = "hidden";
    countdownStart.hidden = true;
    card.removeAttribute("aria-hidden");
    card.focus({ preventScroll: true });
    showRsvp();
  }

  /* ---------- Åpne-animasjonen ---------- */

  async function openEnvelope() {
    if (opened) return;
    opened = true;
    opener.disabled = true;
    opener.style.display = "none";

    // Stopp pustingen mykt
    const current = getComputedStyle(scene).transform;
    scene.classList.remove("breathing");
    if (current && current !== "none") {
      scene.animate([{ transform: current }, { transform: "none" }], { duration: 300, easing: "ease-out" });
    }

    const g = geometry();
    const fade = { duration: 700, easing: "ease-out", fill: "forwards" };
    tagline.animate([{ opacity: 1 }, { opacity: 0 }], fade);
    countdownStart.animate([{ opacity: 1 }, { opacity: 0 }], fade);
    envelope.querySelector(".env-glow").animate([{ opacity: 0.6 }, { opacity: 0 }], fade);

    // 1) Klaffen vipper opp (0–90°), bytter lag, og fortsetter bakover (90–180°)
    const rot = (deg) => ({ transform: `perspective(1000px) rotateX(${deg}deg)` });
    await flap.animate([rot(0), rot(90)], {
      duration: 380,
      easing: "cubic-bezier(.55, 0, .85, .4)",
      fill: "forwards",
    }).finished;
    flap.style.zIndex = "0";
    flap.animate([rot(90), rot(180)], {
      duration: 450,
      easing: "cubic-bezier(.15, .6, .4, 1)",
      fill: "forwards",
    });

    // 2) Kortet glir opp av konvolutten
    await wait(220);
    await card.animate([{ transform: g.start }, { transform: g.peek }], {
      duration: 950,
      easing: "cubic-bezier(.45, .05, .25, 1)",
      fill: "forwards",
    }).finished;

    await wait(120);

    // 3) Konvolutten glir ned og fader ut, kortet flytter seg til midten og blir større
    const out = { duration: 1050, easing: "cubic-bezier(.4, 0, .7, .3)", fill: "forwards" };
    envelope.querySelectorAll(".env-back, .env-front, .flap").forEach((el) => {
      el.animate(
        [
          { translate: "0 0", opacity: 1 },
          { translate: `0 ${g.H * 0.6}px`, opacity: 0 },
        ],
        out
      );
    });
    // Slipp opp klippingen under konvolutten, så resten av kortet kommer til syne
    cardClip.animate(
      [
        { clipPath: `inset(0px 0px ${g.clipBottom}px 0px)` },
        { clipPath: "inset(-60px -60px -60px -60px)" },
      ],
      out
    );

    await card.animate([{ transform: g.peek }, { transform: "none" }], {
      duration: 1250,
      easing: "cubic-bezier(.55, 0, .2, 1)",
      fill: "forwards",
    }).finished;

    finish();
  }

  /* ---------- Snø ---------- */

  function startSnow() {
    const canvas = document.getElementById("snow");
    const ctx = canvas.getContext("2d");
    let w = 0;
    let h = 0;
    let flakes = [];

    const makeFlake = (y) => {
      const r = 0.8 + Math.random() * 2.2;
      return {
        x: Math.random() * w,
        y: y ?? Math.random() * h,
        r,
        speed: 12 + r * 14 + Math.random() * 10, // px per sekund
        sway: 8 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.35 + Math.random() * 0.5,
      };
    };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(140, Math.round((w * h) / 9000));
      while (flakes.length < count) flakes.push(makeFlake());
      flakes.length = count;
    }

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.speed * dt;
        f.phase += dt * 0.8;
        if (f.y - f.r > h) Object.assign(f, makeFlake(-5));
        const x = f.x + Math.sin(f.phase) * f.sway;
        ctx.globalAlpha = f.alpha;
        ctx.beginPath();
        ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = "#fff8ec";
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    requestAnimationFrame(frame);
  }

  /* ---------- «Kommer du?» og tavla ---------- */

  const API = (window.RSVP_URL || "").trim();
  const DEMO_KEY = "pakkelek-demo-gjester";
  const actions = document.getElementById("rsvp-actions");
  const board = document.getElementById("board");
  const rowsEl = document.getElementById("board-rows");
  const boardSub = document.getElementById("board-sub");
  const boardNote = document.getElementById("board-note");
  const dialog = document.getElementById("rsvp");
  const form = document.getElementById("rsvp-form");
  const status = document.getElementById("rsvp-status");
  const submitBtn = document.getElementById("rsvp-submit");

  let guests = null; // null = ikke hentet ennå
  let loadError = false;

  function readDemo() {
    try {
      return JSON.parse(localStorage.getItem(DEMO_KEY)) || [];
    } catch {
      return [];
    }
  }

  async function fetchGuests() {
    if (!API) return readDemo();
    const res = await fetch(API, { cache: "no-store" });
    const data = await res.json();
    if (!data.ok) throw new Error(data.feil || "Ukjent feil");
    return data.gjester;
  }

  async function postGuest(entry) {
    if (!API) {
      const list = readDemo();
      list.push({ navn: entry.navn, hilsen: entry.hilsen, tid: new Date().toISOString() });
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(list));
      } catch {}
      return list;
    }
    // text/plain unngår CORS-preflight, som Google Apps Script ikke støtter
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(entry),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.feil || "Ukjent feil");
    return data.gjester;
  }

  async function loadGuests() {
    try {
      guests = await fetchGuests();
      loadError = false;
    } catch (err) {
      console.error(err);
      loadError = true;
    }
    if (!board.hidden) renderBoard();
  }

  /* Tegning av tavla */

  const SAG = 22; // hvor mye båndet henger ned på midten
  const TOP = 12; // båndets høyde over lappene i endene

  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function svgEl(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function ribbon(width) {
    const h = TOP + SAG + 20;
    const svg = svgEl("svg", { class: "ribbon", width, height: h, viewBox: `0 0 ${width} ${h}`, "aria-hidden": "true" });
    const d = `M6 ${TOP} Q ${width / 2} ${TOP + 2 * SAG} ${width - 6} ${TOP}`;
    svg.append(
      svgEl("path", { d, fill: "none", stroke: "rgba(0,0,0,.3)", "stroke-width": 9, transform: "translate(0 3)" }),
      svgEl("path", { d, fill: "none", stroke: "#b8935a", "stroke-width": 7, "stroke-linecap": "round" }),
      svgEl("path", { d, fill: "none", stroke: "#f6e4b8", "stroke-width": 2.4, "stroke-linecap": "round", transform: "translate(0 -1.2)", opacity: 0.9 })
    );
    // Små sløyfer i hver ende
    [16, width - 16].forEach((x) => {
      const g = svgEl("g", { transform: `translate(${x} ${TOP + 1})` });
      const silk = { fill: "#c9a468", stroke: "#8f6d3a", "stroke-width": 0.8 };
      g.append(
        svgEl("path", { d: "M-1 4 L-9 24 L-5 22 L-3 26 Z", ...silk }),
        svgEl("path", { d: "M1 4 L9 24 L5 22 L3 26 Z", ...silk }),
        svgEl("ellipse", { cx: -9, cy: -3, rx: 10, ry: 6, transform: "rotate(-20 -9 -3)", ...silk }),
        svgEl("ellipse", { cx: 9, cy: -3, rx: 10, ry: 6, transform: "rotate(20 9 -3)", ...silk }),
        svgEl("circle", { cx: 0, cy: 0, r: 4, fill: "#e2c48c", stroke: "#8f6d3a", "stroke-width": 0.8 })
      );
      svg.append(g);
    });
    return svg;
  }

  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function makeTag(g, i) {
    const tag = el("figure", "tag");
    tag.style.setProperty("--r", `${((hash(g.navn + i) % 9) - 4) * 0.7}deg`);
    tag.style.setProperty("--d", `${-(hash(g.navn) % 50) / 10}s`);
    const name = el("figcaption", "tag-name");
    name.textContent = g.navn;
    tag.append(name);
    if (g.hilsen) {
      const text = el("p", "tag-text");
      text.textContent = g.hilsen;
      tag.append(text);
    }
    return tag;
  }

  function renderBoard(highlightLast) {
    rowsEl.textContent = "";
    boardNote.textContent = API
      ? ""
      : "Demo-modus: tavla er ikke koblet til Google Regneark ennå, så svarene lagres bare i denne nettleseren.";

    if (guests === null && !loadError) {
      boardSub.textContent = "Henter tavla …";
      return;
    }
    if (loadError) {
      boardSub.textContent = "Klarte ikke å hente tavla akkurat nå. Prøv å laste siden på nytt.";
      return;
    }
    if (!guests.length) {
      boardSub.textContent = "Ingen hilsener på snora ennå – bli den første!";
      return;
    }
    boardSub.textContent = guests.length === 1 ? "1 hilsen på snora" : `${guests.length} hilsener på snora`;

    const width = rowsEl.clientWidth;
    const cord = parseFloat(getComputedStyle(board).getPropertyValue("--cord")) || 26;
    const perRow = Math.max(2, Math.min(5, Math.floor(width / 175)));
    let last = null;

    for (let i = 0; i < guests.length; i += perRow) {
      const row = el("div", "row");
      row.style.paddingTop = `${TOP + cord}px`;
      row.style.paddingBottom = `${SAG}px`;
      row.append(ribbon(width));
      const tags = el("div", "row-tags");
      guests.slice(i, i + perRow).forEach((g, j) => {
        last = makeTag(g, i + j);
        tags.append(last);
      });
      row.append(tags);
      rowsEl.append(row);

      // Heng hver lapp på det punktet der båndet faktisk er
      tags.querySelectorAll(".tag").forEach((t) => {
        const x = (t.offsetLeft + t.offsetWidth / 2) / width;
        t.style.marginTop = `${4 * SAG * x * (1 - x)}px`;
      });
    }

    if (highlightLast && last) {
      last.classList.add("new");
      last.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }
  }

  function showRsvp() {
    actions.hidden = false;
    actions.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], {
      duration: 600,
      easing: "ease-out",
    });
    board.hidden = false;
    renderBoard();
  }

  function scrollToBoard() {
    board.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  /* Skjemaet */

  function openForm() {
    status.textContent = "";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    form.navn.focus();
  }

  function closeForm() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  document.querySelectorAll("[data-open-rsvp]").forEach((b) => b.addEventListener("click", openForm));
  document.getElementById("board-link").addEventListener("click", scrollToBoard);
  document.getElementById("rsvp-cancel").addEventListener("click", closeForm);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeForm(); // klikk utenfor skjemaet
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const navn = form.navn.value.trim();
    const hilsen = form.hilsen.value.trim();
    if (!navn) {
      status.textContent = "Skriv inn navnet ditt først.";
      form.navn.focus();
      return;
    }
    submitBtn.disabled = true;
    status.textContent = "Henger opp hilsenen …";
    try {
      guests = await postGuest({ navn, hilsen, website: form.website.value });
      loadError = false;
      form.reset();
      closeForm();
      renderBoard(true);
    } catch (err) {
      console.error(err);
      status.textContent = "Det gikk ikke å sende. Sjekk nettet og prøv igjen.";
    } finally {
      submitBtn.disabled = false;
    }
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!board.hidden) renderBoard();
    }, 150);
  });

  /* ---------- Nedtelling ---------- */

  function startCountdown() {
    const cfg = window.NEDTELLING || {};
    const start = new Date(cfg.start).getTime();
    if (Number.isNaN(start)) return;
    const end = start + (cfg.varighetTimer || 6) * 3600e3;

    const units = [
      ["dag", "dager", 86400],
      ["time", "timer", 3600],
      ["minutt", "minutter", 60],
      ["sekund", "sekunder", 1],
    ];

    const blocks = [...document.querySelectorAll("[data-countdown]")].map((root) => {
      const wrap = root.querySelector(".countdown-units");
      const cells = units.map(() => {
        const unit = el("span", "cd-unit");
        const num = el("span", "cd-num");
        const lbl = el("span", "cd-lbl");
        unit.append(num, lbl);
        wrap.append(unit);
        return { num, lbl };
      });
      return { root, wrap, cells };
    });

    let timer;
    function tick() {
      const now = Date.now();
      if (now >= start) {
        const msg = now < end ? cfg.underveis : cfg.etter;
        blocks.forEach(({ root, wrap }) => {
          root.querySelector(".countdown-label").hidden = true;
          wrap.textContent = "";
          const p = el("p", "countdown-message");
          p.textContent = msg;
          wrap.append(p);
        });
        if (now >= end) return; // ferdig – ingen flere oppdateringer
        clearTimeout(timer);
        timer = setTimeout(tick, end - now + 1000);
        return;
      }
      let rest = Math.floor((start - now) / 1000);
      const values = units.map(([, , size]) => {
        const v = Math.floor(rest / size);
        rest -= v * size;
        return v;
      });
      blocks.forEach(({ cells }) => {
        cells.forEach((c, i) => {
          const v = values[i];
          const text = i === 0 ? String(v) : String(v).padStart(2, "0");
          if (c.num.textContent !== text) c.num.textContent = text;
          c.lbl.textContent = v === 1 ? units[i][0] : units[i][1];
        });
      });
      timer = setTimeout(tick, 1000 - (now % 1000) + 5);
    }
    tick();
  }

  /* ---------- Oppstart ---------- */

  startCountdown();

  loadGuests(); // hent tavla i bakgrunnen mens konvolutten åpnes

  startSnow();

  card.setAttribute("aria-hidden", "true");

  placeCardInEnvelope();
  if (!reduceMotion) scene.classList.add("breathing");
  opener.addEventListener("click", openEnvelope); // dekker mus, touch og Enter/mellomrom
  window.addEventListener("resize", placeCardInEnvelope);
})();
