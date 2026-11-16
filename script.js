(() => {
  "use strict";

  const scene = document.getElementById("scene");
  const envelope = document.getElementById("envelope");
  const flap = document.getElementById("flap");
  const card = document.getElementById("card");
  const opener = document.getElementById("opener");
  const tagline = document.getElementById("tagline");
  const cardClip = document.getElementById("card-clip");

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
    card.removeAttribute("aria-hidden");
    card.focus({ preventScroll: true });
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

  /* ---------- Oppstart ---------- */

  startSnow();

  card.setAttribute("aria-hidden", "true");

  placeCardInEnvelope();
  if (!reduceMotion) scene.classList.add("breathing");
  opener.addEventListener("click", openEnvelope); // dekker mus, touch og Enter/mellomrom
  window.addEventListener("resize", placeCardInEnvelope);
})();
