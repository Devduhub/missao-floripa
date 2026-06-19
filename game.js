/*
  Missão Floripa: A Nutri Aventureira — v3.0
  Sprites pixel art bonitos, gato pet funcional, assets reais integrados.
*/

const LINK_DA_SURPRESA = "https://www.youtube.com/watch?v=4VXErA63_eg&list=RD4VXErA63_eg&start_radio=1";
const TEXTO_CARTA_FINAL = `Você completou a missão Floripa...\npassou pelas tentações,\ne encontrou o baú secreto.\n\nMas a verdadeira surpresa ainda está aqui.\n\nClique no botão abaixo para abrir sua recompensa.`;
const GAME_TITLE = "Missão Floripa:\nA Nutri Aventureira";

const CLASS_CONFIGS = {
  guerreira: {
    name: "Guerreira da Cenoura", short: "Cenoura", weapon: "carrot", weaponEmoji: "🥕",
    joke: "Arremessa lâminas de cenoura afiadas. Rápida e certeira.",
    weaponDesc: "Espada de cenoura: lâmina veloz em linha reta.",
    attackColor: 0xff8a3d, trailColor: 0xffb86b, speed: 205, dashSpeed: 560, maxHp: 7, maxMana: 100,
    attackDamage: 5.0, attackCooldown: 300, specialDamage: 8, specialStyle: "cenoura"
  },
  estrategista: {
    name: "Nutri Estrategista", short: "Estrategista", weapon: "clipboard", weaponEmoji: "📋",
    joke: "Lança a prancheta giratória que volta pra mão. Atravessa tudo.",
    weaponDesc: "Prancheta-bumerangue: gira, atravessa inimigos e volta.",
    attackColor: 0x4fe39a, trailColor: 0xbfffe0, speed: 196, dashSpeed: 540, maxHp: 6, maxMana: 120,
    attackDamage: 3.5, attackCooldown: 560, specialDamage: 9, specialStyle: "marmita"
  },
  sereia: {
    name: "Sereia de Floripa", short: "Sereia", weapon: "trident", weaponEmoji: "🔱",
    joke: "Tridente que cospe rajadas d'água em sequência. Hidratação ofensiva.",
    weaponDesc: "Tridente: rajada rápida de 3 jatos d'água.",
    attackColor: 0x44d4ff, trailColor: 0x9fe8ff, speed: 218, dashSpeed: 650, maxHp: 6, maxMana: 110,
    attackDamage: 2.5, attackCooldown: 230, specialDamage: 8, specialStyle: "agua"
  }
};

const LEVELS = {
  1: { name: "Fase 1 — Arrumando as malas", hudName: "Fase 1", theme: "room", message: "Partiu Floripa, mas antes precisa sobreviver à bagunça!", objective: "Sobreviva às 2 ondas e derrote o chefe!", nextMessage: "Aviãozinho liberado! Floripa chamou." },
  2: { name: "Fase 2 — Cheguei em Floripa", hudName: "Fase 2", theme: "beach", message: "Cuidado: saudade nível hard detectada!", objective: "Derrote os bolinhos e atravesse a praia.", nextMessage: "Praia dominada com estilo nutricional." },
  3: { name: "Fase 3 — A Nutri contra as tentações", hudName: "Fase 3", theme: "market", message: "Monte a marmita lendária e vença as tentações.", objective: "Colete arroz, frango, salada, legumes e água.", nextMessage: "Marmita lendária criada com sucesso!" },
  4: { name: "Fase 4 — Portal da Surpresa", hudName: "Fase 4", theme: "night", message: "O Monstro da Saudade apareceu. Agora é pessoal.", objective: "Derrote o boss Pizza da Saudade.", nextMessage: "Saudade tentou, mas perdeu." }
};

const gameState = { selectedClassKey: "guerreira", run: null };
const inputState = { joyX: 0, joyY: 0, attack: false, attackPressed: false, dash: false, dashPressed: false, special: false, specialPressed: false, catAttack: false, catAttackPressed: false, open: false, openPressed: false };

function consumeInput(action) {
  const key = `${action}Pressed`;
  if (inputState[key]) { inputState[key] = false; return true; }
  return false;
}

function setMobileControlsVisible(v) {
  const el = document.getElementById("mobile-controls");
  if (el) el.classList.toggle("hidden", !v);
}

// Marca o botão do gato como em recarga (feedback visual) pelo tempo do cooldown
function setCatButtonCooldown(ms) {
  const btn = document.getElementById("btn-cat");
  if (!btn) return;
  btn.classList.add("on-cooldown");
  clearTimeout(btn._cdTimer);
  btn._cdTimer = setTimeout(() => btn.classList.remove("on-cooldown"), ms);
}

function vibrate(ms = 18) { if (navigator.vibrate) navigator.vibrate(ms); }

const SoundFX = {
  ctx: null, unlocked: false,
  unlock() {
    if (this.unlocked) return Promise.resolve();
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return Promise.resolve();
      this.ctx = this.ctx || new AC();
      const p = this.ctx.state === "suspended" ? this.ctx.resume() : Promise.resolve();
      return p.then(() => { this.unlocked = true; }).catch(() => {});
    } catch (e) { return Promise.resolve(); }
  },
  tone(freq = 440, dur = 0.08, type = "sine", gain = 0.035) {
    try { this.unlock(); if (!this.ctx) return; const o = this.ctx.createOscillator(), a = this.ctx.createGain(); o.type = type; o.frequency.value = freq; a.gain.value = gain; o.connect(a); a.connect(this.ctx.destination); o.start(); a.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur); o.stop(this.ctx.currentTime + dur + 0.02); } catch (e) { }
  },
  attack() { this.tone(520, 0.055, "square", 0.025); },
  hit() { this.tone(130, 0.09, "sawtooth", 0.03); },
  collect() { this.tone(820, 0.07, "triangle", 0.035); },
  special() { this.tone(220, 0.15, "sine", 0.04); setTimeout(() => this.tone(780, 0.18, "triangle", 0.035), 70); },
  portal() { this.tone(660, 0.12, "sine", 0.035); setTimeout(() => this.tone(990, 0.12, "sine", 0.03), 100); }
};

// =========================================================
// TRILHA SONORA — melodia chiptune alegre, gerada e em loop
// =========================================================
const Music = {
  on: true, playing: false, timer: null, step: 0,
  // Melodia (Hz) — linha alegre tropical; 0 = pausa
  melody: [659,0,784,880,  784,659,587,0,  523,587,659,784,  880,0,784,0,
           880,988,1047,988,  880,784,659,0,  587,659,784,659,  587,0,523,0],
  // Baixo simples acompanhando
  bass:   [262,0,0,0,  196,0,0,0,  220,0,0,0,  247,0,0,0,
           175,0,0,0,  196,0,0,0,  262,0,0,0,  196,0,0,0],
  start() {
    if (!SoundFX.ctx || this.playing || !this.on) return;
    this.playing = true; this._loop();
  },
  _loop() {
    if (!this.playing || !SoundFX.ctx) { this.playing = false; return; }
    const i = this.step % this.melody.length;
    const m = this.melody[i], bs = this.bass[i];
    if (m > 0) this._note(m, 0.26, "triangle", 0.045);
    if (bs > 0) this._note(bs, 0.34, "sine", 0.05);
    // brilho leve no tempo forte
    if (i % 4 === 0 && m > 0) this._note(m * 2, 0.12, "sine", 0.012);
    this.step++;
    this.timer = setTimeout(() => this._loop(), 235);
  },
  _note(freq, dur, type, gain) {
    const ctx = SoundFX.ctx; if (!ctx) return;
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(a); a.connect(ctx.destination);
    a.gain.setValueAtTime(gain, ctx.currentTime);
    a.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.start(); o.stop(ctx.currentTime + dur + 0.03);
  },
  stop() { this.playing = false; if (this.timer) { clearTimeout(this.timer); this.timer = null; } },
  toggle() {
    this.on = !this.on;
    if (this.on) SoundFX.unlock().then(() => this.start()); else this.stop();
    const btn = document.getElementById("btn-sound");
    if (btn) btn.textContent = this.on ? "🔊" : "🔇";
    return this.on;
  }
};

// =========================================================
// CONTROLES MOBILE
// =========================================================
window.addEventListener("DOMContentLoaded", () => {
  const joy = document.getElementById("joystick"), knob = document.getElementById("joystick-knob");
  const btnA = document.getElementById("btn-attack"), btnD = document.getElementById("btn-dash"), btnS = document.getElementById("btn-special"), btnCat = document.getElementById("btn-cat");

  const resetJoy = () => { inputState.joyX = 0; inputState.joyY = 0; if (knob) knob.style.transform = "translate(-50%,-50%)"; };
  const updateJoy = (e) => {
    if (!joy || !knob) return;
    const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy, max = r.width * 0.33, dist = Math.hypot(dx, dy);
    if (dist > max) { dx = (dx / dist) * max; dy = (dy / dist) * max; }
    inputState.joyX = Phaser.Math.Clamp(dx / max, -1, 1);
    inputState.joyY = Phaser.Math.Clamp(dy / max, -1, 1);
    knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  };
  if (joy) {
    joy.addEventListener("pointerdown", e => { SoundFX.unlock(); joy.setPointerCapture(e.pointerId); updateJoy(e); });
    joy.addEventListener("pointermove", updateJoy);
    joy.addEventListener("pointerup", resetJoy);
    joy.addEventListener("pointercancel", resetJoy);
    joy.addEventListener("lostpointercapture", resetJoy);
  }
  const wire = (btn, act) => {
    if (!btn) return;
    btn.addEventListener("pointerdown", e => { e.preventDefault(); SoundFX.unlock(); inputState[act] = true; inputState[act + "Pressed"] = true; btn.classList.add("is-pressed"); });
    const up = e => { e.preventDefault(); inputState[act] = false; btn.classList.remove("is-pressed"); };
    btn.addEventListener("pointerup", up); btn.addEventListener("pointercancel", up); btn.addEventListener("pointerleave", up);
  };
  wire(btnA, "attack"); wire(btnD, "dash"); wire(btnS, "special"); wire(btnCat, "catAttack");
  document.body.addEventListener("pointerdown", () => { SoundFX.unlock().then(() => Music.start()); }, { passive: true });
  // Botão liga/desliga som
  const btnSound = document.getElementById("btn-sound");
  if (btnSound) btnSound.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); Music.toggle(); });
});

// =========================================================
// HELPERS
// =========================================================
function centerX(s) { return s.scale.width / 2; }
function centerY(s) { return s.scale.height / 2; }

function addPixelText(scene, x, y, text, size = 22, color = "#fff8fb", align = "center") {
  return scene.add.text(x, y, text, { fontFamily: "Verdana,system-ui,sans-serif", fontSize: `${size}px`, color, align, stroke: "#19142e", strokeThickness: Math.max(3, Math.floor(size / 7)), lineSpacing: 5, wordWrap: { width: Math.min(scene.scale.width - 34, 620) } }).setOrigin(0.5);
}

function addMenuButton(scene, x, y, label, cb, w = 270, h = 58, fill = 0xff6fb1) {
  const c = scene.add.container(x, y);
  const sh = scene.add.rectangle(4, 6, w, h, 18, 0x000000, 0.22);
  const bg = scene.add.rectangle(0, 0, w, h, 18, fill, 1).setStrokeStyle(3, 0xffffff, 0.66);
  const shine = scene.add.rectangle(0, -h * 0.24, w * 0.84, h * 0.18, 10, 0xffffff, 0.22);
  const tx = scene.add.text(0, 0, label, { fontFamily: "Verdana,system-ui,sans-serif", fontSize: "18px", fontStyle: "900", color: "#ffffff", stroke: "#5b1742", strokeThickness: 4 }).setOrigin(0.5);
  c.add([sh, bg, shine, tx]); c.setSize(w, h); c.setInteractive({ useHandCursor: true });
  c.on("pointerdown", () => { SoundFX.collect(); scene.tweens.add({ targets: c, scale: 0.96, duration: 70, yoyo: true }); cb(); });
  return c;
}

function addBeachBackdrop(scene) {
  const w = scene.scale.width, h = scene.scale.height, g = scene.add.graphics();
  g.fillGradientStyle(0x6bdcff, 0x6bdcff, 0xffb6d9, 0xffe4a3, 1); g.fillRect(0, 0, w, h);
  g.fillStyle(0xffdb83, 1); g.fillRect(0, h * 0.58, w, h * 0.42);
  g.fillStyle(0x5bd4ff, 0.72); g.fillRect(0, h * 0.48, w, h * 0.12);
  g.fillStyle(0xffffff, 0.35); for (let i = 0; i < 9; i++) g.fillRoundedRect(i * 120 - 40, h * 0.53 + Math.sin(i) * 8, 90, 8, 5);
  g.fillStyle(0xfff06f, 1); g.fillCircle(w * 0.78, h * 0.18, Math.max(34, Math.min(w, h) * 0.07));
  for (let i = 0; i < 12; i++) {
    const heart = scene.add.text(Phaser.Math.Between(18, w - 18), Phaser.Math.Between(20, h - 20), "❤", { fontSize: `${Phaser.Math.Between(16, 32)}px`, color: ["#ff6fb1", "#ffffff", "#ff4d8d"][i % 3] }).setAlpha(0.3).setOrigin(0.5);
    scene.tweens.add({ targets: heart, y: heart.y - Phaser.Math.Between(12, 38), alpha: 0.72, yoyo: true, repeat: -1, duration: Phaser.Math.Between(1100, 2300) });
  }
  return g;
}

// =========================================================
// PIXEL ART — todas as texturas do jogo
// =========================================================
// CT — gera textura pixel art; se falhar, registra no console e continua
function CT(scene, key, w, h, fn) {
  if (scene.textures.exists(key)) return;
  try {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    fn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  } catch (e) {
    console.warn('[CT] falhou ao gerar textura:', key, e);
  }
}

function buildAllTextures(scene) {

  // ─── PLAYER ────────────────────────────────────────────────
  CT(scene, "player", 64, 64, g => {
    // sombra
    g.fillStyle(0x000000, 0.18); g.fillEllipse(32, 61, 38, 8);
    // sapatos
    g.fillStyle(0xff6fb1, 1); g.fillRoundedRect(19, 54, 10, 8, { bl: 4, br: 4, tl: 2, tr: 2 });
    g.fillRoundedRect(35, 54, 10, 8, { bl: 4, br: 4, tl: 2, tr: 2 });
    // meias / pernas
    g.fillStyle(0xffd4bf, 1); g.fillRect(21, 44, 7, 12); g.fillRect(36, 44, 7, 12);
    // jaleco (corpo)
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(14, 30, 36, 26, 6);
    // jaleco linhas
    g.fillStyle(0xdde8f0, 0.6); g.fillRect(14, 42, 36, 2);
    g.fillStyle(0x2a2a55, 1); g.fillRoundedRect(20, 32, 24, 20, 3);
    // cross vermelho
    g.fillStyle(0xff6fb1, 1); g.fillRect(30, 34, 4, 16); g.fillRect(23, 39, 18, 4);
    // luvas / punhos
    g.fillStyle(0x44d4ff, 1); g.fillRoundedRect(13, 40, 8, 6, 3); g.fillRoundedRect(43, 40, 8, 6, 3);
    // pescoço
    g.fillStyle(0xffd4bf, 1); g.fillRoundedRect(27, 26, 10, 8, 4);
    // cabeça
    g.fillStyle(0xffd4bf, 1); g.fillRoundedRect(16, 10, 32, 26, 12);
    // cabelo (escuro, volumoso)
    g.fillStyle(0x1a1228, 1);
    g.fillRoundedRect(14, 8, 36, 16, 10);   // topo
    g.fillCircle(17, 26, 9);              // lateral esq
    g.fillCircle(47, 26, 9);              // lateral dir
    g.fillRoundedRect(14, 16, 8, 14, 4);    // franja esq
    g.fillRoundedRect(42, 16, 8, 14, 4);    // franja dir
    // olhos
    g.fillStyle(0xffffff, 1); g.fillEllipse(25, 22, 8, 9); g.fillEllipse(39, 22, 8, 9);
    g.fillStyle(0x2a1a55, 1); g.fillEllipse(25, 23, 5, 6); g.fillEllipse(39, 23, 5, 6);
    g.fillStyle(0xffffff, 1); g.fillCircle(24, 21, 1.5); g.fillCircle(38, 21, 1.5);
    // sobrancelhas
    g.fillStyle(0x1a1228, 1); g.fillRoundedRect(21, 16, 7, 2, 1); g.fillRoundedRect(36, 16, 7, 2, 1);
    // bochechas
    g.fillStyle(0xff7aa9, 0.65); g.fillCircle(19, 27, 4); g.fillCircle(45, 27, 4);
    // boca
    g.fillStyle(0xff5b8f, 1); g.fillRoundedRect(27, 31, 10, 3, 2);
  });

  CT(scene, "player_shadow", 64, 64, g => {
    g.fillStyle(0xff6fb1, 0.38); g.fillRoundedRect(10, 10, 44, 50, 12);
  });

  // ─── GATO ──────────────────────────────────────────────────
  CT(scene, "cat_fallback", 32, 34, g => {
    // sombra
    g.fillStyle(0x000000, 0.15); g.fillEllipse(16, 32, 24, 5);
    // corpo
    g.fillStyle(0xf5a623, 1); g.fillEllipse(16, 24, 22, 14);
    // cabeça
    g.fillStyle(0xf5a623, 1); g.fillCircle(16, 14, 10);
    // orelhas
    g.fillStyle(0xf5a623, 1); g.fillTriangle(9, 8, 6, 1, 15, 6); g.fillTriangle(23, 8, 17, 6, 26, 1);
    g.fillStyle(0xff8fa8, 1); g.fillTriangle(10, 7, 8, 2, 14, 6); g.fillTriangle(22, 7, 18, 6, 24, 2);
    // listras cabeça
    g.fillStyle(0xda8a15, 0.5); g.fillRect(13, 6, 2, 5); g.fillRect(17, 6, 2, 5);
    // olhos verdes
    g.fillStyle(0xffffff, 1); g.fillEllipse(12, 13, 6, 7); g.fillEllipse(20, 13, 6, 7);
    g.fillStyle(0x2dd47a, 1); g.fillEllipse(12, 14, 4, 5); g.fillEllipse(20, 14, 4, 5);
    g.fillStyle(0x0a1a0e, 1); g.fillEllipse(12, 14, 2, 4); g.fillEllipse(20, 14, 2, 4);
    g.fillStyle(0xffffff, 1); g.fillCircle(11, 12, 1); g.fillCircle(19, 12, 1);
    // nariz
    g.fillStyle(0xff8fa8, 1); g.fillTriangle(15, 16, 17, 16, 16, 18);
    // bigodes
    g.lineStyle(1, 0x2a1a1a, 0.7);
    g.lineBetween(5, 14, 12, 15); g.lineBetween(4, 17, 11, 16);
    g.lineBetween(27, 14, 20, 15); g.lineBetween(28, 17, 21, 16);
    // cauda
    g.fillStyle(0xf5a623, 1); g.fillRoundedRect(22, 22, 8, 3, 2); g.fillRoundedRect(27, 17, 3, 6, 2);
    g.fillStyle(0xda8a15, 0.6); g.fillRoundedRect(28, 17, 2, 3, 1);
  });

  // ─── INIMIGO: BATATA FRITA ─────────────────────────────────
  CT(scene, "coxinha", 34, 44, g => {
    g.fillStyle(0x000000, 0.15); g.fillEllipse(17, 41, 26, 6);
    // copo vermelho listrado
    g.fillStyle(0xdd1111, 1); g.fillRoundedRect(7, 22, 20, 18, { bl: 3, br: 3, tl: 0, tr: 0 });
    g.fillStyle(0xffffff, 0.8); for (let i = 0; i < 3; i++) g.fillRect(8 + i * 7, 22, 4, 18);
    g.fillStyle(0xdd1111, 0.9);
    g.fillRect(7, 22, 20, 18); // reaplica para misturar
    g.fillStyle(0xffffff, 0.5); for (let i = 0; i < 3; i++) g.fillRect(8 + i * 7, 22, 3, 18);
    // borda superior do copo
    g.fillStyle(0xbb0000, 1); g.fillRect(5, 20, 24, 4);
    // batatas (fries)
    g.fillStyle(0xffd500, 1); g.fillRoundedRect(9, 6, 5, 16, 2);
    g.fillStyle(0xffd500, 1); g.fillRoundedRect(15, 4, 5, 18, 2);
    g.fillStyle(0xffd500, 1); g.fillRoundedRect(21, 8, 5, 14, 2);
    // topo das batatas (queimado)
    g.fillStyle(0xe8a800, 1); g.fillRect(9, 6, 5, 3); g.fillRect(15, 4, 5, 3); g.fillRect(21, 8, 5, 3);
    // olhos malvados no copo
    g.fillStyle(0xffffff, 1); g.fillCircle(13, 30, 3); g.fillCircle(21, 30, 3);
    g.fillStyle(0x110000, 1); g.fillCircle(14, 31, 2); g.fillCircle(22, 31, 2);
    // sobrancelhas raivosas
    g.fillStyle(0x110000, 1); g.fillRect(11, 26, 4, 2); g.fillRect(19, 26, 4, 2);
    // boca raivosa
    g.lineStyle(2, 0x110000, 1);
    g.beginPath(); g.moveTo(10, 36); g.lineTo(12, 34); g.lineTo(16, 36); g.lineTo(20, 34); g.lineTo(24, 36); g.strokePath();
  });

  // ─── INIMIGO: SORVETE ──────────────────────────────────────
  CT(scene, "refri", 30, 46, g => {
    g.fillStyle(0x000000, 0.15); g.fillEllipse(15, 43, 22, 6);
    // casquinha
    g.fillStyle(0xe8c070, 1); g.fillTriangle(15, 42, 5, 24, 25, 24);
    g.lineStyle(1.5, 0xc4943a, 0.8);
    g.lineBetween(10, 24, 12, 40); g.lineBetween(15, 24, 15, 42); g.lineBetween(20, 24, 18, 40);
    g.lineBetween(5, 30, 25, 30); g.lineBetween(6, 35, 24, 35);
    // bola de sorvete chocolate
    g.fillStyle(0x6b3a1f, 1); g.fillCircle(15, 20, 11);
    g.fillStyle(0x8b5030, 0.4); g.fillCircle(12, 17, 5);
    // bola de sorvete morango
    g.fillStyle(0xff6fa1, 1); g.fillCircle(15, 11, 8);
    g.fillStyle(0xff90b8, 0.5); g.fillCircle(13, 9, 4);
    // chantilly no topo
    g.fillStyle(0xffffff, 0.95); g.fillCircle(15, 5, 5); g.fillCircle(12, 7, 3); g.fillCircle(18, 7, 3);
    // olhos malvados na bola de chocolate
    g.fillStyle(0xffffff, 1); g.fillCircle(11, 20, 3); g.fillCircle(19, 20, 3);
    g.fillStyle(0x110000, 1); g.fillCircle(11, 21, 2); g.fillCircle(20, 21, 2);
    // sobrancelhas
    g.fillStyle(0x3a1a0a, 1); g.fillRect(8, 16, 5, 2); g.fillRect(17, 16, 5, 2);
    // boca triste
    g.lineStyle(2, 0x3a1a0a, 1);
    g.beginPath(); g.moveTo(10, 27); g.quadraticBezierTo(15, 24, 20, 27); g.strokePath();
  });

  // ─── INIMIGO: HAMBURGUER ───────────────────────────────────
  CT(scene, "hamburger", 42, 36, g => {
    g.fillStyle(0x000000, 0.15); g.fillEllipse(21, 34, 34, 6);
    // pão de baixo
    g.fillStyle(0xc57828, 1); g.fillRoundedRect(4, 24, 34, 10, { bl: 5, br: 5, tl: 2, tr: 2 });
    g.fillStyle(0xe8943a, 0.5); g.fillRoundedRect(4, 24, 34, 4, { tl: 2, tr: 2 });
    // alface
    g.fillStyle(0x3dba4e, 1); g.fillRoundedRect(2, 20, 38, 6, 2);
    g.fillStyle(0x5ec44b, 0.8); for (let i = 0; i < 5; i++) g.fillRoundedRect(3 + i * 7, 18, 6, 4, 2);
    // queijo
    g.fillStyle(0xffcc22, 1); g.fillRoundedRect(4, 16, 34, 6, 1);
    // tomate
    g.fillStyle(0xdd3311, 1); g.fillRect(4, 13, 34, 4);
    g.fillStyle(0xff5533, 0.4); g.fillRect(4, 13, 34, 2);
    // carne
    g.fillStyle(0x6b3520, 1); g.fillRoundedRect(5, 9, 32, 6, 2);
    g.fillStyle(0x8b4530, 0.5); g.fillRect(7, 9, 28, 2);
    // pão de cima
    g.fillStyle(0xd4923a, 1); g.fillRoundedRect(3, 2, 36, 10, 8);
    g.fillStyle(0xc07828, 0.35); g.fillRoundedRect(3, 8, 36, 4, { bl: 8, br: 8 });
    // gergelim
    g.fillStyle(0xfff0b0, 1);
    g.fillEllipse(13, 6, 5, 2); g.fillEllipse(21, 4, 5, 2); g.fillEllipse(29, 6, 5, 2);
    // olhos malvados no pão
    g.fillStyle(0x3a1a00, 1); g.fillCircle(16, 8, 2); g.fillCircle(26, 8, 2);
    g.fillRect(13, 6, 5, 1); g.fillRect(23, 6, 5, 1); // sobrancelhas
  });

  // ─── INIMIGO: BOLO DE CHOCOLATE ────────────────────────────
  CT(scene, "brigadeiro", 38, 38, g => {
    g.fillStyle(0x000000, 0.15); g.fillEllipse(19, 35, 28, 6);
    // prato
    g.fillStyle(0xffffff, 0.9); g.fillEllipse(19, 32, 30, 10);
    g.lineStyle(2, 0xcccccc, 1); g.strokeEllipse(19, 32, 30, 10);
    // lado do bolo
    g.fillStyle(0x3a180e, 1); g.fillRect(5, 18, 28, 14);
    // topo do bolo  
    g.fillStyle(0x4a251c, 1); g.fillEllipse(19, 18, 28, 12);
    // cobertura de chocolate escorrendo
    g.fillStyle(0x2a100a, 1);
    const drips = [[7, 14, 3, 8], [13, 13, 3, 9], [19, 12, 3, 10], [25, 13, 3, 8], [31, 14, 3, 7]];
    drips.forEach(([dx, dy, dw, dh]) => g.fillRoundedRect(dx, dy, dw, dh, { bl: 2, br: 2 }));
    // granulado
    g.fillStyle(0xff6fb1, 1); g.fillRect(14, 15, 4, 2); g.fillRect(22, 14, 4, 2);
    g.fillStyle(0xffe066, 1); g.fillRect(10, 16, 3, 2); g.fillRect(26, 17, 3, 2);
    g.fillStyle(0x44d4ff, 1); g.fillRect(18, 13, 3, 2);
    // olhos
    g.fillStyle(0xffffff, 1); g.fillCircle(14, 22, 3.5); g.fillCircle(24, 22, 3.5);
    g.fillStyle(0x2a100a, 1); g.fillCircle(14, 23, 2); g.fillCircle(25, 23, 2);
    g.fillStyle(0xffffff, 1); g.fillCircle(13, 22, 1); g.fillCircle(24, 22, 1);
    // sorriso maligno
    g.lineStyle(2, 0x2a100a, 1);
    g.beginPath(); g.moveTo(12, 28); g.quadraticBezierTo(19, 33, 26, 28); g.strokePath();
    g.fillStyle(0xff1111, 0.7); g.fillRect(14, 28, 10, 2);
  });

  // ─── INIMIGO: BOLINHO / CRAB ───────────────────────────────
  CT(scene, "crab", 44, 34, g => {
    g.fillStyle(0x000000, 0.15); g.fillEllipse(22, 31, 34, 6);
    // bolinho principal
    g.fillStyle(0xf5dba8, 1); g.fillEllipse(22, 18, 36, 20);
    g.fillStyle(0xfff0d0, 0.7); g.fillEllipse(18, 14, 22, 12);
    // pregas
    g.lineStyle(2, 0xd4a060, 0.8);
    for (let i = 0; i < 5; i++) g.lineBetween(12 + i * 5, 10, 10 + i * 6, 26);
    // vapor
    g.lineStyle(2, 0xffffff, 0.5);
    const steam = [[15, 8], [22, 6], [29, 8]];
    steam.forEach(([sx, sy]) => { g.beginPath(); g.moveTo(sx, sy); g.quadraticBezierTo(sx - 3, sy - 3, sx, sy - 6); g.strokePath(); });
    // olhos zangados
    g.fillStyle(0x111111, 1); g.fillCircle(16, 18, 3); g.fillCircle(28, 18, 3);
    g.fillStyle(0xffffff, 1); g.fillCircle(15, 17, 1.5); g.fillCircle(27, 17, 1.5);
    // sobrancelhas
    g.fillStyle(0x6b3a00, 1); g.fillRect(13, 14, 5, 2); g.fillRect(26, 14, 5, 2);
    // boca
    g.lineStyle(2, 0x8b5030, 1);
    g.beginPath(); g.moveTo(16, 24); g.quadraticBezierTo(22, 21, 28, 24); g.strokePath();
  });

  // ─── BOSS: PIZZA ───────────────────────────────────────────
  CT(scene, "saudadeBoss", 88, 88, g => {
    g.fillStyle(0x000000, 0.22); g.fillEllipse(44, 80, 66, 12);
    // massa da pizza
    g.fillStyle(0xe8c070, 1); g.fillCircle(44, 40, 36);
    // crosta
    g.fillStyle(0xd4923a, 1);
    for (let a = 0; a < 360; a += 30) {
      const rad = a * Math.PI / 180;
      g.fillCircle(44 + Math.cos(rad) * 32, 40 + Math.sin(rad) * 32, 7);
    }
    // molho
    g.fillStyle(0xcc3311, 1); g.fillCircle(44, 40, 28);
    // queijo
    g.fillStyle(0xffdd66, 1); g.fillCircle(44, 40, 23);
    // manchas de queijo derretido
    g.fillStyle(0xfff0a0, 0.6); g.fillCircle(38, 35, 8); g.fillCircle(50, 36, 7); g.fillCircle(44, 46, 8);
    // pepperoni
    g.fillStyle(0xaa2211, 1);
    [[34, 31], [49, 35], [38, 46], [50, 26], [28, 38]].forEach(([px, py]) => g.fillCircle(px, py, 5));
    g.fillStyle(0xcc3322, 0.6);
    [[34, 31], [49, 35], [38, 46]].forEach(([px, py]) => g.fillCircle(px, py, 3));
    // ROSTO MALVADO
    // olhos (brancos com pupila)
    g.fillStyle(0xffffff, 1); g.fillCircle(34, 32, 7); g.fillCircle(54, 32, 7);
    g.fillStyle(0xff1111, 1); g.fillCircle(34, 33, 5); g.fillCircle(54, 33, 5);
    g.fillStyle(0x110000, 1); g.fillCircle(34, 34, 3); g.fillCircle(54, 34, 3);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(32, 31, 1.5); g.fillCircle(52, 31, 1.5);
    // sobrancelhas furiosas
    g.lineStyle(4, 0x330000, 1);
    g.lineBetween(28, 25, 40, 29); g.lineBetween(48, 29, 60, 25);
    // boca malvada
    g.lineStyle(5, 0x110000, 1);
    g.beginPath(); g.moveTo(30, 50); g.quadraticBezierTo(44, 62, 58, 50); g.strokePath();
    // dentes
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < 5; i++) g.fillTriangle(31 + i * 6, 52, 34 + i * 6, 52, 33 + i * 6, 58);
  });

  // ─── COLETÁVEIS ────────────────────────────────────────────
  CT(scene, "item_morango", 28, 30, g => {
    g.fillStyle(0x000000, 0.12); g.fillEllipse(14, 28, 20, 5);
    // folha
    g.fillStyle(0x3dba4e, 1); g.fillTriangle(14, 6, 10, 1, 14, 11); g.fillTriangle(14, 6, 18, 1, 14, 11);
    g.fillStyle(0x2ea03c, 1); g.fillRect(13, 3, 2, 9);
    // corpo morango
    g.fillStyle(0xff3355, 1); g.fillRoundedRect(5, 8, 18, 18, { tl: 8, tr: 8, bl: 5, br: 5 });
    g.fillStyle(0xff6680, 0.5); g.fillRoundedRect(7, 9, 8, 7, 4);
    // sementes
    g.fillStyle(0xffd166, 1);
    [[9, 13], [14, 11], [18, 14], [10, 18], [15, 17], [12, 22]].forEach(([sx, sy]) => g.fillEllipse(sx, sy, 2.5, 3));
  });

  CT(scene, "item_banana", 32, 28, g => {
    g.fillStyle(0x000000, 0.12); g.fillEllipse(16, 26, 24, 5);
    g.fillStyle(0xffd700, 1); g.fillRoundedRect(4, 8, 24, 14, 7);
    g.fillStyle(0xffe84d, 0.65); g.fillRoundedRect(6, 9, 20, 6, 5);
    g.fillStyle(0xbf8800, 1); g.fillRoundedRect(2, 10, 5, 4, 2); g.fillRoundedRect(25, 10, 5, 4, 2);
    g.fillStyle(0xffff99, 0.35); g.fillEllipse(13, 11, 10, 5);
  });

  CT(scene, "item_marmita", 30, 28, g => {
    g.fillStyle(0x000000, 0.12); g.fillEllipse(15, 26, 22, 5);
    // container
    g.fillStyle(0x9abfad, 1); g.fillRoundedRect(4, 12, 22, 14, 3);
    g.fillStyle(0x7da393, 1); g.fillRect(4, 20, 22, 6);
    // tampa
    g.fillStyle(0xbdd9cb, 1); g.fillRoundedRect(3, 9, 24, 6, 3);
    g.lineStyle(2, 0x6a9080, 1); g.strokeRoundedRect(3, 9, 24, 18, 3);
    // comida visível
    g.fillStyle(0x5ec44b, 1); g.fillCircle(10, 16, 3);
    g.fillStyle(0xffb56b, 1); g.fillCircle(17, 15, 3);
    g.fillStyle(0xffffff, 0.9); g.fillRect(9, 18, 12, 2);
    g.fillStyle(0xffe066, 0.8); g.fillRect(9, 18, 12, 1);
  });

  CT(scene, "item_coco", 26, 30, g => {
    g.fillStyle(0x000000, 0.12); g.fillEllipse(13, 28, 18, 5);
    g.fillStyle(0x7ce9ff, 0.9); g.fillRoundedRect(4, 14, 18, 14, { bl: 5, br: 5, tl: 2, tr: 2 });
    g.fillStyle(0x4ddaff, 1); g.fillRect(4, 14, 18, 5);
    g.fillStyle(0x8b6914, 1); g.fillCircle(13, 14, 7);
    g.fillStyle(0xffffff, 1); g.fillCircle(13, 14, 5);
    g.fillStyle(0x8b6914, 0.35); g.fillCircle(13, 14, 5);
    // canudo
    g.fillStyle(0xff6fb1, 1); g.fillRect(18, 5, 3, 16);
    g.fillStyle(0xff4d9e, 1); for (let i = 0; i < 4; i++) g.fillRect(18, 5 + i * 4, 3, 2);
  });

  CT(scene, "item_heart", 28, 28, g => {
    g.fillStyle(0x000000, 0.12); g.fillEllipse(14, 26, 20, 5);
    // torta de maçã
    g.fillStyle(0xd49843, 1); g.fillRoundedRect(4, 16, 20, 10, { bl: 4, br: 4, tl: 2, tr: 2 });
    g.fillStyle(0xe8b060, 1); g.fillRoundedRect(4, 10, 20, 8, { tl: 4, tr: 4 });
    g.lineStyle(1, 0xc07828, 0.8);
    for (let i = 0; i < 3; i++) g.lineBetween(7 + i * 5, 10, 7 + i * 5, 18);
    g.lineBetween(4, 14, 24, 14);
    // coração flutuando
    g.fillStyle(0xff6fb1, 0.9); g.fillCircle(9, 6, 2.5); g.fillCircle(13, 6, 2.5); g.fillTriangle(7, 6, 15, 6, 11, 12);
    g.fillStyle(0xff9ec8, 0.7); g.fillCircle(19, 5, 2); g.fillCircle(23, 5, 2); g.fillTriangle(17, 5, 25, 5, 21, 10);
  });

  // ─── ITENS OBJETIVO ────────────────────────────────────────
  const goalBox = (key, fn) => CT(scene, key, 36, 36, g => {
    g.fillStyle(0xffffff, 0.2); g.fillCircle(18, 18, 16);
    fn(g);
    g.fillStyle(0x000000, 0.12); g.fillEllipse(18, 34, 24, 5);
  });

  goalBox("goal_mala", g => {
    g.fillStyle(0x44b4ff, 1); g.fillRoundedRect(5, 12, 26, 18, 4);
    g.fillStyle(0x2299cc, 1); g.fillRect(5, 21, 26, 9);
    g.lineStyle(2, 0x1177aa, 1); g.strokeRoundedRect(5, 12, 26, 18, 4); g.lineBetween(5, 21, 31, 21);
    g.fillStyle(0xffd166, 1); g.fillRoundedRect(14, 18, 8, 6, 2);
    g.fillStyle(0x1177aa, 1); g.fillRoundedRect(10, 8, 16, 6, { tl: 5, tr: 5 });
    g.fillStyle(0x44b4ff, 1); g.fillRoundedRect(12, 9, 12, 5, { tl: 4, tr: 4 });
  });

  goalBox("goal_protetor", g => {
    g.fillStyle(0xffd700, 1); g.fillRoundedRect(11, 8, 14, 22, 6);
    g.fillStyle(0xff6fb1, 1); g.fillRoundedRect(11, 8, 14, 10, { tl: 6, tr: 6 });
    g.fillStyle(0xffffff, 0.9); g.fillRect(13, 20, 10, 2); g.fillRect(13, 23, 10, 1);
    g.fillStyle(0xeeaa00, 1); g.fillRoundedRect(13, 4, 10, 6, { tl: 4, tr: 4 });
    g.fillStyle(0xffffff, 1); g.fillRect(14, 10, 4, 2); g.fillRect(14, 13, 4, 1);
    // sol
    g.fillStyle(0xfff06f, 0.9); g.fillCircle(28, 9, 5);
    g.lineStyle(1.5, 0xfff06f, 0.8);
    for (let a = 0; a < 360; a += 45) { const r = a * Math.PI / 180; g.lineBetween(28 + Math.cos(r) * 5, 9 + Math.sin(r) * 5, 28 + Math.cos(r) * 8, 9 + Math.sin(r) * 8); }
  });

  goalBox("goal_passagem", g => {
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(4, 10, 28, 18, 3);
    g.fillStyle(0xff6fb1, 1); g.fillRect(4, 10, 28, 6);
    g.lineStyle(1, 0xdddddd, 1); g.strokeRoundedRect(4, 10, 28, 18, 3);
    for (let i = 0; i < 3; i++) g.fillStyle(0xcccccc, 1), g.fillRect(6, 19 + i * 3, 14, 1);
    g.fillStyle(0xffffff, 1); g.fillRect(22, 19, 8, 8);
    g.fillStyle(0xff6fb1, 1); g.fillRect(24, 21, 4, 2);
    // avião
    g.fillStyle(0x44d4ff, 1); g.fillRect(6, 12, 10, 2); g.fillTriangle(16, 11, 20, 13, 16, 15);
    g.fillRect(7, 14, 4, 3);
  });

  goalBox("goal_arroz", g => {
    g.fillStyle(0xffffff, 1); g.fillEllipse(18, 26, 26, 14);
    g.fillStyle(0xeeeeee, 1); g.fillEllipse(18, 22, 26, 12);
    g.lineStyle(2, 0xcccccc, 1); g.strokeEllipse(18, 26, 26, 14);
    g.fillStyle(0xffffff, 1); g.fillEllipse(18, 19, 22, 8);
    g.fillStyle(0xe0e0e0, 0.9);
    for (let i = 0; i < 12; i++) g.fillEllipse(10 + (i % 4) * 3, 17 + Math.floor(i / 4) * 2, 2, 3);
  });

  goalBox("goal_frango", g => {
    g.fillStyle(0xd47a2a, 1); g.fillRoundedRect(9, 9, 18, 18, 9);
    g.fillStyle(0xffb56b, 1); g.fillRoundedRect(11, 9, 14, 14, 7);
    g.fillStyle(0xe8943a, 0.5); g.fillRoundedRect(11, 19, 14, 7, { bl: 7, br: 7 });
    g.fillStyle(0xfff0d4, 1); g.fillRoundedRect(14, 22, 8, 10, 4); g.fillCircle(18, 31, 5);
    g.fillStyle(0x8b4910, 0.4);
    [[12, 13], [18, 12], [14, 17], [21, 15]].forEach(([cx, cy]) => g.fillCircle(cx, cy, 2));
  });

  goalBox("goal_salada", g => {
    g.fillStyle(0xffffff, 1); g.fillEllipse(18, 28, 28, 14);
    g.fillStyle(0xf0f0f0, 1); g.fillEllipse(18, 24, 28, 10);
    g.fillStyle(0x5ec44b, 1); g.fillEllipse(18, 20, 26, 12);
    g.fillStyle(0x82e06f, 0.8); for (let i = 0; i < 4; i++) g.fillEllipse(8 + i * 5, 18, 5, 6);
    g.fillStyle(0xff3355, 1); g.fillCircle(12, 19, 3); g.fillStyle(0xff6680, 0.6); g.fillCircle(11, 18, 1.5);
    g.fillStyle(0xffcc22, 1); g.fillRect(19, 18, 5, 3);
  });

  goalBox("goal_legumes", g => {
    // cenoura
    g.fillStyle(0xff8a3d, 1); g.fillTriangle(9, 30, 15, 30, 11, 10);
    g.fillStyle(0xffaa66, 0.6); g.fillTriangle(10, 22, 13, 22, 11, 13);
    g.fillStyle(0x3dba4e, 1); g.fillTriangle(9, 10, 12, 5, 11, 11); g.fillTriangle(11, 10, 13, 5, 12, 11); g.fillTriangle(12, 10, 15, 5, 13, 11);
    // brócolis
    g.fillStyle(0x3dba4e, 1); g.fillCircle(24, 14, 7);
    g.fillStyle(0x5ec44b, 1); g.fillCircle(22, 12, 4); g.fillCircle(26, 12, 4); g.fillCircle(24, 10, 4);
    g.fillStyle(0x2ea03c, 0.5); g.fillCircle(24, 12, 3);
    g.fillStyle(0x6b9a50, 1); g.fillRect(23, 19, 3, 10);
  });

  goalBox("goal_agua", g => {
    g.fillStyle(0x7ce9ff, 0.9); g.fillRoundedRect(10, 10, 16, 22, 5);
    g.fillStyle(0x4ddaff, 1); g.fillRoundedRect(10, 10, 16, 8, { tl: 5, tr: 5 });
    g.lineStyle(2, 0x22aacc, 1); g.strokeRoundedRect(10, 10, 16, 22, 5);
    g.fillStyle(0x22aacc, 0.35); g.fillRect(10, 24, 16, 8);
    g.fillStyle(0x2299bb, 1); g.fillRoundedRect(12, 6, 12, 6, { tl: 3, tr: 3 });
    g.fillStyle(0xffffff, 0.5); g.fillRect(12, 11, 4, 14);
    g.fillStyle(0xffffff, 0.9); g.fillRect(12, 22, 12, 6);
    g.fillStyle(0x22aacc, 0.9); g.fillRect(13, 23, 10, 2); g.fillRect(13, 26, 10, 1);
  });

  // ─── CHÃO DE MADEIRA (gerado; fallback quando bg_wood.png não carrega) ───
  CT(scene, "wood_floor_gen", 64, 64, g => {
    g.fillStyle(0x8b5e3c, 1); g.fillRect(0, 0, 64, 64);
    // Veias horizontais suaves
    g.lineStyle(1, 0x7a4f2e, 0.5);
    for (let i = 0; i < 7; i++) g.lineBetween(0, 9 + i * 9, 64, 9 + i * 9 + (i % 2 === 0 ? 2 : -2));
    // Separação entre tábuas (vertical e horizontal)
    g.lineStyle(2, 0x4e2a0e, 0.85);
    g.lineBetween(0, 32, 64, 32);
    g.lineBetween(0, 0, 0, 64); g.lineBetween(32, 0, 32, 64); g.lineBetween(63, 0, 63, 64);
    // Offset nas tábuas de baixo (aspecto de assoalho corrido)
    g.lineBetween(16, 32, 16, 64); g.lineBetween(48, 32, 48, 64);
    // Reflexo sutil
    g.fillStyle(0xffffff, 0.05); g.fillRect(1, 1, 30, 30); g.fillRect(33, 33, 30, 30);
    // Nós da madeira
    g.fillStyle(0x5a3318, 0.45); g.fillEllipse(14, 13, 9, 5); g.fillEllipse(46, 47, 9, 5);
  });

  // ─── AREIA DE PRAIA (fase 2) — tons de bege quentes, sem repetição óbvia ───
  CT(scene, "sand_floor_gen", 64, 64, g => {
    g.fillStyle(0xf2d59b, 1); g.fillRect(0, 0, 64, 64);
    // Manchas suaves de areia molhada/seca
    g.fillStyle(0xe8c47e, 0.55); g.fillEllipse(16, 18, 30, 22); g.fillEllipse(48, 46, 28, 20);
    g.fillStyle(0xf7e1b0, 0.5); g.fillEllipse(46, 14, 22, 16); g.fillEllipse(14, 50, 24, 18);
    // Grãozinhos espalhados
    g.fillStyle(0xc9a567, 0.5);
    for (let i = 0; i < 46; i++) g.fillRect((i * 37) % 64, (i * 53) % 64, 2, 2);
    g.fillStyle(0xfff4d6, 0.5);
    for (let i = 0; i < 30; i++) g.fillRect((i * 29 + 11) % 64, (i * 41 + 7) % 64, 1, 1);
    // Ondulações de maré
    g.lineStyle(1, 0xddb877, 0.4);
    for (let i = 0; i < 5; i++) g.lineBetween(0, 8 + i * 14, 64, 12 + i * 14);
  });

  // ─── PISO DE MERCADO (fase 3) — ladrilho claro de supermercado ───
  CT(scene, "tile_floor_gen", 64, 64, g => {
    g.fillStyle(0xeef1f4, 1); g.fillRect(0, 0, 64, 64);
    // 4 ladrilhos com leve variação de tom
    const shades = [0xe6eaef, 0xf3f5f8, 0xe9edf1, 0xf0f2f5];
    [[0, 0], [32, 0], [0, 32], [32, 32]].forEach(([tx, ty], i) => { g.fillStyle(shades[i], 1); g.fillRect(tx + 1, ty + 1, 30, 30); });
    // Rejunte (linhas entre ladrilhos)
    g.lineStyle(2, 0xc4ccd6, 0.9);
    g.lineBetween(32, 0, 32, 64); g.lineBetween(0, 32, 64, 32);
    g.lineStyle(1, 0xb4bcc7, 0.6);
    g.strokeRect(0, 0, 64, 64);
    // Brilho de piso encerado
    g.fillStyle(0xffffff, 0.22); g.fillEllipse(16, 16, 12, 7); g.fillEllipse(48, 48, 12, 7);
  });

  // ─── CHÃO NOTURNO MÁGICO (fase 4) — roxo profundo com brilho ───
  CT(scene, "night_floor_gen", 64, 64, g => {
    g.fillStyle(0x191334, 1); g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x231a47, 0.7); g.fillEllipse(18, 20, 34, 26); g.fillEllipse(48, 46, 30, 24);
    // Poeira estelar fixa no chão
    g.fillStyle(0x6b5bbf, 0.45);
    for (let i = 0; i < 24; i++) g.fillRect((i * 43) % 64, (i * 47) % 64, 2, 2);
    g.fillStyle(0xb9a9ff, 0.55);
    for (let i = 0; i < 14; i++) g.fillCircle((i * 53 + 9) % 64, (i * 31 + 5) % 64, 1);
    // Veios mágicos sutis
    g.lineStyle(1, 0x3a2d6e, 0.5); g.lineBetween(0, 40, 64, 34); g.lineBetween(0, 12, 64, 18);
  });

  // ─── PARTÍCULA DE AURA (labareda macia p/ efeito Dragon Ball) ───
  CT(scene, "aura_particle", 16, 16, g => {
    g.fillStyle(0xffffff, 0.22); g.fillCircle(8, 8, 8);
    g.fillStyle(0xffffff, 0.45); g.fillCircle(8, 8, 5.5);
    g.fillStyle(0xffffff, 0.85); g.fillCircle(8, 8, 3);
    g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 1.5);
  });

  // Partícula macia (borda bem suave) p/ a coluna de energia da aura
  CT(scene, "aura_soft", 20, 20, g => {
    g.fillStyle(0xffffff, 0.10); g.fillCircle(10, 10, 10);
    g.fillStyle(0xffffff, 0.20); g.fillCircle(10, 10, 7.5);
    g.fillStyle(0xffffff, 0.40); g.fillCircle(10, 10, 5);
    g.fillStyle(0xffffff, 0.75); g.fillCircle(10, 10, 3);
    g.fillStyle(0xffffff, 1.0);  g.fillCircle(10, 10, 1.5);
  });

  // ─── OBSTÁCULOS TEMÁTICOS (gerados, coerentes com cada fase) ───
  // Praia: pedras
  CT(scene, "obs_rock", 64, 50, g => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(32, 46, 54, 8);
    g.fillStyle(0x7e848c, 1); g.fillEllipse(23, 32, 34, 28);
    g.fillStyle(0x9097a0, 1); g.fillEllipse(44, 28, 32, 28);
    g.fillStyle(0xb0b7c0, 0.55); g.fillEllipse(40, 22, 14, 10);
    g.fillStyle(0x676d75, 0.5); g.fillEllipse(22, 40, 16, 7);
    g.lineStyle(1, 0x565b62, 0.5); g.lineBetween(34, 18, 30, 40);
    g.fillStyle(0x6aa84f, 0.5); g.fillEllipse(48, 20, 12, 5); // musguinho
  });
  // Praia: coqueiro
  CT(scene, "obs_palm", 60, 86, g => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(30, 82, 42, 8);
    g.fillStyle(0xa9794a, 1); g.fillRoundedRect(25, 34, 10, 48, 3);
    g.fillStyle(0x8a6038, 0.6); g.fillRect(25, 34, 4, 48);
    g.lineStyle(1, 0x7a5430, 0.7); for (let i = 0; i < 5; i++) g.lineBetween(25, 44 + i * 8, 35, 44 + i * 8);
    g.fillStyle(0x2f9d40, 1);
    g.fillEllipse(30, 28, 52, 14); g.fillEllipse(15, 20, 30, 12); g.fillEllipse(45, 20, 30, 12);
    g.fillEllipse(23, 13, 22, 12); g.fillEllipse(37, 13, 22, 12);
    g.fillStyle(0x49bd57, 0.7); g.fillEllipse(30, 23, 34, 10);
    g.fillStyle(0x5e3a1e, 1); g.fillCircle(25, 34, 4); g.fillCircle(34, 35, 4); g.fillCircle(30, 32, 4);
  });
  // Mercado: prateleira com produtos
  CT(scene, "obs_shelf", 92, 64, g => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(46, 60, 84, 8);
    g.fillStyle(0xc9ccd1, 1); g.fillRoundedRect(4, 6, 84, 52, 3);
    g.fillStyle(0xa9adb4, 1); g.fillRect(4, 6, 84, 4);
    g.fillStyle(0x8f939a, 1); g.fillRect(6, 26, 80, 4); g.fillRect(6, 46, 80, 4);
    const prod = [0xff6b6b, 0xffd166, 0x6ad06a, 0x6bb8ff, 0xff9ec8];
    for (let i = 0; i < 5; i++) { g.fillStyle(prod[i], 1); g.fillRect(11 + i * 15, 14, 11, 11); g.fillStyle(prod[(i + 2) % 5], 1); g.fillRect(11 + i * 15, 34, 11, 11); }
    g.lineStyle(2, 0x82868d, 0.8); g.strokeRoundedRect(4, 6, 84, 52, 3);
  });
  // Mercado: caixote de feira com frutas
  CT(scene, "obs_crate", 56, 54, g => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(28, 50, 46, 7);
    g.fillStyle(0xff6b6b, 1); g.fillCircle(16, 13, 7); g.fillStyle(0xffd166, 1); g.fillCircle(29, 10, 7); g.fillStyle(0x6ad06a, 1); g.fillCircle(42, 13, 7);
    g.fillStyle(0xb5803f, 1); g.fillRoundedRect(6, 16, 44, 34, 3);
    g.fillStyle(0xa06d30, 1); for (let i = 0; i < 3; i++) g.fillRect(8, 20 + i * 10, 40, 3);
    g.lineStyle(2, 0x7d5424, 0.8); g.strokeRoundedRect(6, 16, 44, 34, 3); g.lineBetween(28, 16, 28, 50);
  });
  // Mercado: balcão refrigerado
  CT(scene, "obs_freezer", 96, 60, g => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(48, 56, 88, 8);
    g.fillStyle(0xbcd4e6, 0.95); g.fillRoundedRect(8, 8, 80, 16, 4);
    g.fillStyle(0xffffff, 0.4); g.fillRect(12, 10, 30, 9);
    g.fillStyle(0xdfe6ec, 1); g.fillRoundedRect(4, 22, 88, 32, 4);
    g.fillStyle(0x9fb6c9, 1); g.fillRect(4, 42, 88, 4);
    g.lineStyle(2, 0x9aa6b2, 0.8); g.strokeRoundedRect(4, 22, 88, 32, 4);
    g.fillStyle(0xffffff, 0.7); g.fillCircle(22, 34, 3); g.fillCircle(70, 36, 3); g.fillCircle(50, 30, 2);
  });
  // Noite: cristal mágico (claro p/ aceitar tint de cor)
  CT(scene, "obs_crystal", 52, 70, g => {
    g.fillStyle(0x000000, 0.22); g.fillEllipse(26, 66, 38, 7);
    g.fillStyle(0xffffff, 0.95); g.fillTriangle(26, 4, 9, 42, 43, 42); g.fillTriangle(9, 42, 43, 42, 26, 66);
    g.fillStyle(0xdfe8ff, 0.9); g.fillTriangle(26, 4, 18, 42, 26, 42);
    g.fillStyle(0xb9c8ee, 0.8); g.fillTriangle(26, 42, 43, 42, 26, 66);
    g.fillStyle(0xffffff, 1); g.fillRect(24, 12, 3, 22);
    g.fillStyle(0xeaf0ff, 0.95); g.fillTriangle(8, 46, 3, 62, 15, 62); g.fillTriangle(44, 48, 37, 64, 49, 64);
  });

  // ─── PLAQUINHA DE MADEIRA (interativa) ───
  CT(scene, "sign_wood", 60, 64, g => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(30, 60, 32, 6);
    // estaca
    g.fillStyle(0x8a5a2e, 1); g.fillRect(26, 32, 8, 26);
    g.fillStyle(0x6f4622, 0.6); g.fillRect(26, 32, 3, 26);
    // placa
    g.fillStyle(0x7d5424, 1); g.fillRoundedRect(5, 7, 50, 32, 5);  // moldura
    g.fillStyle(0xc9954c, 1); g.fillRoundedRect(8, 10, 44, 26, 4); // tábua
    g.fillStyle(0xb5803f, 1); g.fillRect(8, 20, 44, 3);            // ripa
    g.lineStyle(1, 0x9a6a32, 0.7); g.lineBetween(8, 15, 52, 15); g.lineBetween(8, 30, 52, 30);
    // parafusos
    g.fillStyle(0x5e3a1e, 1); g.fillCircle(12, 13, 1.6); g.fillCircle(48, 13, 1.6); g.fillCircle(12, 33, 1.6); g.fillCircle(48, 33, 1.6);
  });

  // ─── SLASH DE ATAQUE NORMAL ─────────────────────────────────────────────
  CT(scene, "attack_slash", 48, 48, g => {
    // Brilho externo
    g.lineStyle(10, 0xffffff, 0.18);
    g.beginPath(); g.moveTo(2, 46); g.lineTo(46, 2); g.strokePath();
    // Linha principal do slash
    g.lineStyle(5, 0xffffff, 0.92);
    g.beginPath(); g.moveTo(4, 44); g.lineTo(44, 4); g.strokePath();
    // Linha de cor da classe (sobreposta)
    g.lineStyle(2, 0xffe066, 0.85);
    g.beginPath(); g.moveTo(6, 44); g.lineTo(44, 6); g.strokePath();
    // Ponta brilhante
    g.fillStyle(0xffffff, 0.9); g.fillCircle(44, 4, 4);
    g.fillStyle(0xffe066, 0.7); g.fillCircle(44, 4, 2);
  });

  // ─── PROJÉTEIS ─────────────────────────────────────────────
  CT(scene, "heartProjectile", 24, 24, g => {
    g.fillStyle(0xff5e98, 1); g.fillCircle(8, 8, 6); g.fillCircle(16, 8, 6); g.fillTriangle(3, 10, 21, 10, 12, 22);
    g.fillStyle(0xff9fc8, 0.6); g.fillCircle(7, 7, 3);
  });

  CT(scene, "marmitaShot", 28, 28, g => {
    g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(4, 7, 20, 14, 4);
    g.lineStyle(2, 0xcccccc, 1); g.strokeRoundedRect(4, 7, 20, 14, 4);
    g.fillStyle(0x9ff56f, 1); g.fillCircle(9, 14, 4);
    g.fillStyle(0xffe066, 1); g.fillCircle(16, 12, 3.5);
    g.fillStyle(0xff6b6b, 1); g.fillRect(12, 17, 7, 3);
    g.fillStyle(0xff9900, 1); g.fillCircle(13, 11, 2);
  });

  // ─── ARMAS / PROJÉTEIS POR CLASSE ───
  // Lâmina de cenoura voadora (aponta para +x; gira pela direção do tiro)
  CT(scene, "proj_carrot", 32, 18, g => {
    g.fillStyle(0x3dba4e, 1); g.fillTriangle(8, 9, 0, 3, 8, 8); g.fillTriangle(8, 9, 0, 15, 8, 10); // folhas
    g.fillStyle(0xff8a3d, 1); g.fillTriangle(8, 3, 8, 15, 31, 9);  // corpo
    g.fillStyle(0xffb579, 0.75); g.fillTriangle(9, 5, 9, 9, 24, 8.5);
    g.lineStyle(1, 0xe0701f, 0.7); g.lineBetween(14, 6, 16, 11); g.lineBetween(20, 7, 21, 10);
    g.fillStyle(0xffffff, 0.7); g.fillCircle(11, 7, 1.4);
  });
  // Prancheta (bumerangue)
  CT(scene, "proj_clipboard", 32, 38, g => {
    g.fillStyle(0x000000, 0.12); g.fillRoundedRect(5, 6, 26, 32, 3);
    g.fillStyle(0x8a5a2e, 1); g.fillRoundedRect(3, 4, 26, 32, 3);
    g.fillStyle(0xfdfdf5, 1); g.fillRoundedRect(6, 8, 20, 26, 2);
    g.fillStyle(0xb0b6bd, 1); g.fillRoundedRect(11, 2, 10, 6, 2);
    g.fillStyle(0x8f959c, 1); g.fillRect(13, 4, 6, 3);
    g.lineStyle(1, 0x6bb8ff, 0.8); for (let i = 0; i < 5; i++) g.lineBetween(8, 13 + i * 4, 24, 13 + i * 4);
    g.lineStyle(2, 0x4fe39a, 1); g.beginPath(); g.moveTo(9, 30); g.lineTo(12, 33); g.lineTo(18, 26); g.strokePath();
  });
  // Jato d'água (aponta para +x)
  CT(scene, "proj_water", 28, 16, g => {
    g.fillStyle(0x9fe8ff, 0.55); g.fillEllipse(14, 8, 26, 13);
    g.fillStyle(0x44d4ff, 1); g.fillEllipse(13, 8, 20, 8);
    g.fillStyle(0x1fa8e0, 1); g.fillTriangle(22, 4, 22, 12, 28, 8);
    g.fillStyle(0xffffff, 0.9); g.fillEllipse(9, 7, 7, 3.5);
  });
  // Tridente (arma equipada da Sereia; aponta para cima)
  CT(scene, "weap_trident", 20, 42, g => {
    g.fillStyle(0xffd166, 1); g.fillRect(8, 12, 4, 28);
    g.fillStyle(0xe0a800, 0.6); g.fillRect(8, 12, 2, 28);
    g.fillStyle(0x9fe8ff, 1);
    g.fillTriangle(10, 0, 6, 13, 14, 13);              // ponta central
    g.fillRect(2, 9, 3, 5); g.fillTriangle(3.5, 2, 2, 9, 5, 9);   // ponta esq
    g.fillRect(15, 9, 3, 5); g.fillTriangle(16.5, 2, 15, 9, 18, 9); // ponta dir
    g.fillStyle(0x44d4ff, 1); g.fillRect(3, 12, 14, 3);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(10, 6, 1.5);
  });

  // ─── PORTAL + BAÚ ──────────────────────────────────────────
  CT(scene, "portal", 58, 72, g => {
    g.lineStyle(9, 0x6be9ff, 0.85); g.strokeEllipse(29, 36, 40, 58);
    g.lineStyle(5, 0xff6fb1, 0.85); g.strokeEllipse(29, 36, 27, 44);
    g.lineStyle(2, 0xffffff, 0.5); g.strokeEllipse(29, 36, 15, 30);
    g.fillStyle(0x44d4ff, 0.4); g.fillCircle(29, 36, 12);
    g.fillStyle(0xffffff, 0.6); g.fillCircle(29, 36, 6);
  });

  CT(scene, "chest", 56, 48, g => {
    g.fillStyle(0x000000, 0.2); g.fillEllipse(28, 44, 42, 8);
    // corpo
    g.fillStyle(0x8a4f24, 1); g.fillRoundedRect(7, 19, 42, 24, 5);
    g.fillStyle(0xc07838, 0.3); g.fillRect(7, 19, 42, 8);
    // tampa
    g.fillStyle(0xd99043, 1); g.fillRoundedRect(7, 10, 42, 16, 8);
    // faixas metálicas
    g.lineStyle(3, 0x5a2f19, 1); g.strokeRoundedRect(7, 10, 42, 32, 5);
    g.lineStyle(2, 0x7a4f29, 0.7); g.lineBetween(7, 22, 49, 22);
    // cadeado dourado
    g.fillStyle(0xffe066, 1); g.fillRoundedRect(24, 25, 8, 9, 2);
    g.fillStyle(0xd4c000, 1); g.fillCircle(28, 24, 5);
    g.fillStyle(0x7a6000, 1); g.fillCircle(28, 24, 2.5);
    // brilhos
    g.fillStyle(0xffffff, 0.8); g.fillCircle(12, 14, 2); g.fillCircle(19, 12, 1.5); g.fillCircle(44, 13, 2);
  });

  // ─── ARCO DE CORTE (espada de cenoura, melee) ───
  CT(scene, "slash_arc", 64, 52, g => {
    g.lineStyle(9, 0xffffff, 0.85); g.beginPath(); g.arc(6, 26, 50, -0.95, 0.95, false); g.strokePath();
    g.lineStyle(4, 0xffe9c4, 0.95); g.beginPath(); g.arc(6, 26, 50, -0.85, 0.85, false); g.strokePath();
    g.fillStyle(0xffffff, 0.95); g.fillCircle(6 + 50 * Math.cos(0.95), 26 + 50 * Math.sin(0.95), 5);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(6 + 50 * Math.cos(-0.95), 26 + 50 * Math.sin(-0.95), 4);
  });

  // ─── LABAREDA DE KI (aura Dragon Ball — pontuda, branca p/ tint) ───
  CT(scene, "ki_flame", 20, 36, g => {
    g.fillStyle(0xffffff, 0.5); g.fillTriangle(1, 34, 19, 34, 10, 1);
    g.fillStyle(0xffffff, 0.85); g.fillTriangle(4, 34, 16, 34, 10, 8);
    g.fillStyle(0xffffff, 1); g.fillTriangle(7, 34, 13, 34, 10, 16);
  });
  // Faísca elétrica da aura (raio curto)
  CT(scene, "ki_spark", 16, 16, g => {
    g.lineStyle(2, 0xffffff, 1); g.beginPath(); g.moveTo(8, 0); g.lineTo(4, 7); g.lineTo(9, 8); g.lineTo(5, 16); g.strokePath();
  });

  // ─── BOSS: MAROMBEIRO (short azul, sem camisa, loiro, olhos azuis) ───
  CT(scene, "boss_maromba", 64, 94, g => {
    g.fillStyle(0x000000, 0.22); g.fillEllipse(32, 90, 48, 9);
    // pernas
    g.fillStyle(0xe0a878, 1); g.fillRect(22, 70, 9, 18); g.fillRect(33, 70, 9, 18);
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(20, 85, 12, 6, 2); g.fillRoundedRect(32, 85, 12, 6, 2); // tênis
    // short azul
    g.fillStyle(0x2a6fd0, 1); g.fillRoundedRect(19, 57, 26, 17, 3);
    g.fillStyle(0x1f57a8, 1); g.fillRect(31, 57, 2, 17);
    // torso musculoso
    g.fillStyle(0xe8b487, 1); g.fillRoundedRect(17, 33, 30, 27, 6);
    g.fillStyle(0xd9a06f, 0.6); g.fillEllipse(26, 40, 13, 9); g.fillEllipse(38, 40, 13, 9); // peitoral
    g.lineStyle(1, 0xc98f5e, 0.85); g.lineBetween(32, 46, 32, 58); g.lineBetween(24, 50, 40, 50); g.lineBetween(25, 55, 39, 55); // abdômen
    // braços fortes
    g.fillStyle(0xe8b487, 1); g.fillRoundedRect(6, 35, 13, 22, 6); g.fillRoundedRect(45, 35, 13, 22, 6);
    g.fillStyle(0xd9a06f, 0.55); g.fillCircle(12, 40, 6); g.fillCircle(52, 40, 6); // bíceps
    // pescoço + cabeça
    g.fillStyle(0xe8b487, 1); g.fillRect(28, 28, 8, 7);
    g.fillStyle(0xf0c9a0, 1); g.fillRoundedRect(22, 9, 20, 21, 8);
    // cabelo loiro
    g.fillStyle(0xffd84d, 1); g.fillRoundedRect(20, 5, 24, 13, 6); g.fillRect(20, 11, 5, 9); g.fillRect(39, 11, 5, 9);
    g.fillStyle(0xffe680, 0.7); g.fillRect(24, 7, 16, 4);
    // olhos azuis
    g.fillStyle(0xffffff, 1); g.fillCircle(28, 19, 3); g.fillCircle(36, 19, 3);
    g.fillStyle(0x2aa3ee, 1); g.fillCircle(28, 19, 2); g.fillCircle(36, 19, 2);
    g.fillStyle(0x10243a, 1); g.fillCircle(28, 19, 1); g.fillCircle(36, 19, 1);
    g.fillStyle(0xd9a800, 1); g.fillRect(25, 15, 6, 2); g.fillRect(33, 15, 6, 2); // sobrancelhas
    g.lineStyle(2, 0xa86a3a, 1); g.beginPath(); g.moveTo(28, 24); g.lineTo(36, 24); g.strokePath(); // boca durona
  });

  // ─── NPC: FEIRANTE (avental, bigode) ───
  CT(scene, "npc_feirante", 44, 64, g => {
    g.fillStyle(0x000000, 0.18); g.fillEllipse(22, 61, 30, 7);
    g.fillStyle(0x3a4a6a, 1); g.fillRect(14, 44, 7, 16); g.fillRect(23, 44, 7, 16); // calça
    g.fillStyle(0xf0d0b0, 1); g.fillRect(7, 30, 6, 13); g.fillRect(31, 30, 6, 13);  // braços
    g.fillStyle(0x6abf6a, 1); g.fillRoundedRect(11, 27, 22, 23, 4);               // avental
    g.fillStyle(0x4fa34f, 0.6); g.fillRect(21, 27, 2, 23);
    g.fillStyle(0xffffff, 0.7); g.fillRect(15, 33, 14, 3);                        // bolso
    g.fillStyle(0xf0c9a0, 1); g.fillRoundedRect(13, 8, 18, 18, 7);                 // cabeça
    g.fillStyle(0x8a4a2a, 1); g.fillRoundedRect(12, 5, 20, 8, 4);                  // cabelo
    g.fillStyle(0x6a3a1a, 1); g.fillRect(16, 20, 12, 3);                          // bigode
    g.fillStyle(0x222222, 1); g.fillCircle(18, 15, 1.5); g.fillCircle(26, 15, 1.5);
    g.lineStyle(1.5, 0xa86a3a, 1); g.beginPath(); g.moveTo(19, 24); g.lineTo(25, 24); g.strokePath();
  });
}

// =========================================================
// ANIMAÇÕES (Female Adventurer + Cat)
// =========================================================
function buildPlayerAnims(scene) {
  if (scene.anims.exists("player_walk_down")) return;
  const dirs = ["Down", "Up", "Right_Down", "Left_Down"];
  const names = ["down", "up", "right", "left"];
  dirs.forEach((d, i) => {
    const walkTex = "fa_walk_" + names[i];
    if (scene.textures.exists(walkTex)) {
      // 8 frames por tira (0-7), frame de 48px
      scene.anims.create({ key: "player_walk_" + names[i], frames: scene.anims.generateFrameNumbers(walkTex, { start: 0, end: 7 }), frameRate: 11, repeat: -1 });
    }
    const idleTex = "fa_idle_" + names[i];
    if (scene.textures.exists(idleTex)) {
      scene.anims.create({ key: "player_idle_" + names[i], frames: scene.anims.generateFrameNumbers(idleTex, { start: 0, end: 7 }), frameRate: 6, repeat: -1 });
    }
    const dk = "fa_dash_" + names[i];
    if (scene.textures.exists(dk))
      scene.anims.create({ key: "player_dash_" + names[i], frames: scene.anims.generateFrameNumbers(dk, { start: 0, end: -1 }), frameRate: 14, repeat: 0 });
  });
  if (scene.textures.exists("fa_death_down"))
    scene.anims.create({ key: "player_death_down", frames: scene.anims.generateFrameNumbers("fa_death_down", { start: 0, end: -1 }), frameRate: 10, repeat: 0 });
}

// -- Animacoes de efeitos visuais (Super Pixel Effects Gigapack) --
function buildFxAnims(scene) {
  if (scene.anims.exists("anim_fx_explode")) return;
  const mk = (animKey, texKey, endFrame, fps) => {
    if (scene.textures.exists(texKey))
      scene.anims.create({ key: animKey, frames: scene.anims.generateFrameNumbers(texKey, { start: 0, end: endFrame }), frameRate: fps, repeat: 0 });
  };
  mk("anim_fx_explode", "fx_explode", 12, 14); // 13 frames explosao
  mk("anim_fx_heart", "fx_heart", 22, 18); // 23 frames coração burst
  mk("anim_fx_sparkle", "fx_sparkle", 13, 16); // 14 frames sparkle
  mk("anim_fx_impact", "fx_impact", 6, 20); //  7 frames impacto
  // Anims das arvores sunnyside (4 frames de balanco)
  if (scene.textures.exists("prop_tree1"))
    scene.anims.create({ key: "anim_tree1", frames: scene.anims.generateFrameNumbers("prop_tree1", { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
  if (scene.textures.exists("prop_tree2"))
    scene.anims.create({ key: "anim_tree2", frames: scene.anims.generateFrameNumbers("prop_tree2", { start: 0, end: 3 }), frameRate: 4, repeat: -1 });
}

function spawnFx(scene, x, y, animKey, scale = 1, depth = 50) {
  if (!scene.anims.exists(animKey)) return;
  const texKey = scene.anims.get(animKey).frames[0].textureKey;
  const spr = scene.add.sprite(x, y, texKey, 0).setDepth(depth).setScale(scale);
  spr.play(animKey);
  spr.on("animationcomplete", () => spr.destroy());
}

// -- Animacoes do Gato (320x32 → 10 frames de 32px cada) --
function buildCatAnims(scene) {
  if (scene.anims.exists("cat_idle")) return;
  if (scene.textures.exists("cat_real")) {
    scene.anims.create({ key: "cat_idle", frames: scene.anims.generateFrameNumbers("cat_real", { start: 0, end: 9 }), frameRate: 10, repeat: -1 });
  } else if (scene.textures.exists("cat_fallback")) {
    scene.anims.create({ key: "cat_idle", frames: [{ key: "cat_fallback", frame: 0 }], frameRate: 1, repeat: -1 });
  }
}

// =========================================================
// PRELOADER — mostra loading e vai para MenuScene
// =========================================================
class PreloaderScene extends Phaser.Scene {
  constructor() { super("PreloaderScene"); }

  preload() {
    const W = this.scale.width, H = this.scale.height;
    const NC = "Nutri_Custom/";
    const SS = "sunnyside/Sunnyside_World_ASSET_PACK_V2.1/Sunnyside_World_Assets/";
    const FX = "Super Pixel Effects Gigapack (Free Version)/spritesheet/";

    // ── Tela de loading ────────────────────────────────────────────────────
    this.add.rectangle(0, 0, W, H, 0x151329, 1).setOrigin(0);
    this.add.text(W / 2, H / 2 - 70, "Missao Floripa", { fontFamily: "Verdana", fontSize: "30px", color: "#ff6fb1", stroke: "#19142e", strokeThickness: 5 }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 - 30, "A Nutri Aventureira", { fontFamily: "Verdana", fontSize: "18px", color: "#fff8fb", stroke: "#19142e", strokeThickness: 4 }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 + 10, "Carregando assets...", { fontFamily: "Verdana", fontSize: "14px", color: "#9eeaff" }).setOrigin(0.5);
    const barW = Math.min(360, W - 60);
    this.add.rectangle(W / 2, H / 2 + 50, barW, 16, 0x2a2545, 1).setStrokeStyle(2, 0xff6fb1, 0.5).setOrigin(0.5);
    const bar = this.add.rectangle(W / 2 - barW / 2 + 2, H / 2 + 50, 0, 12, 0xff6fb1, 1).setOrigin(0, 0.5);
    const pct = this.add.text(W / 2, H / 2 + 74, "0%", { fontFamily: "Verdana", fontSize: "12px", color: "#fff8fb" }).setOrigin(0.5);
    this.load.on("progress", v => { bar.width = (barW - 4) * v; pct.setText(Math.round(v * 100) + "%"); });
    this.load.on("loaderror", () => { });

    // ── Personagem Nutri (jaleco branco, cabelo preto, olhos verdes) ────────
    // Todos os frames são 64×64 (6 frames por tira de 384px)
    this.load.spritesheet("fx_explode",
      FX + "Explosions/epic_explosion_001/epic_explosion_001_large_orange/spritesheet.png",
      { frameWidth: 128, frameHeight: 128 });

    // ── Texturas de Cenário ──────────────────────────────────────────────
    this.load.image("bg_grass", "grass_tile.png");
    this.load.image("bg_dirt", "dirt_tile.png");
    this.load.image("bg_wood", "wood_tile.png");
    // ── Mobiliário pixel art (gerado por build_furniture.py) ──────────────
    this.load.image("prop_bed", "prop_bed.png");
    this.load.image("prop_wardrobe", "prop_wardrobe.png");
    this.load.image("prop_box", "prop_box.png");
    this.load.image("prop_mess", "prop_mess.png");
    // IMPORTANTE: cada frame tem 48px de largura × 64 de altura (8 frames por tira).
    // Carregar como 64 fazia o Phaser pegar pedaços de 2 personagens → duplicação e "teletransporte".
    const FW = 48, FH = 64;
    this.load.spritesheet("fa_idle_down", NC + "Idle_Down.png", { frameWidth: FW, frameHeight: FH });
    this.load.spritesheet("fa_idle_up", NC + "Idle_Up.png", { frameWidth: FW, frameHeight: FH });
    this.load.spritesheet("fa_idle_right", NC + "Idle_Right_Down.png", { frameWidth: FW, frameHeight: FH });
    this.load.spritesheet("fa_idle_left", NC + "Idle_Left_Down.png", { frameWidth: FW, frameHeight: FH });
    this.load.spritesheet("fa_walk_down", NC + "walk_Down.png", { frameWidth: FW, frameHeight: FH });
    this.load.spritesheet("fa_walk_up", NC + "walk_Up.png", { frameWidth: FW, frameHeight: FH });
    this.load.spritesheet("fa_walk_right", NC + "walk_Right_Down.png", { frameWidth: FW, frameHeight: FH });
    this.load.spritesheet("fa_walk_left", NC + "walk_Left_Down.png", { frameWidth: FW, frameHeight: FH });
    this.load.spritesheet("fa_death_down", NC + "death_Down.png", { frameWidth: FW, frameHeight: FH });

    // ── Gato (320×32 → 10 frames de 32px) ──────────────────────────────────
    this.load.spritesheet("cat_real", "cat/CatPackFree/Idle.png", { frameWidth: 32, frameHeight: 32 });

    // ── Efeitos visuais reais do pacote ────────────────────────────────────
    // Explosão/burst ao derrotar inimigos (1664×128 → 13 frames de 128px)
    this.load.spritesheet("fx_explode",
      FX + "Explosions/epic_explosion_001/epic_explosion_001_large_orange/spritesheet.png",
      { frameWidth: 128, frameHeight: 128 });
    // Heart burst ao coletar item saudável (2944×128 → 23 frames de 128px)
    this.load.spritesheet("fx_heart",
      FX + "Magic Bursts/round_heart_burst_001/round_heart_burst_001_large_red/spritesheet.png",
      { frameWidth: 128, frameHeight: 128 });
    // Sparkle burst ao abrir portal (896×64 → 14 frames de 64px)
    this.load.spritesheet("fx_sparkle",
      FX + "Magic Bursts/round_sparkle_burst_001/round_sparkle_burst_001_large_blue/spritesheet.png",
      { frameWidth: 64, frameHeight: 64 });
    // Impacto quando ataca (448×64 → 7 frames de 64px)
    this.load.spritesheet("fx_impact",
      FX + "Impacts/directional_impact_001/directional_impact_001_large_blue/spritesheet.png",
      { frameWidth: 64, frameHeight: 64 });

    // ── Cenário Sunnyside ──────────────────────────────────────────────────
    this.load.image("bg_tileset", SS + "Tileset/spr_tileset_sunnysideworld_16px.png");
    this.load.spritesheet("prop_tree1", SS + "Elements/Plants/spr_deco_tree_01_strip4.png", { frameWidth: 32, frameHeight: 34 });
    this.load.spritesheet("prop_tree2", SS + "Elements/Plants/spr_deco_tree_02_strip4.png", { frameWidth: 32, frameHeight: 34 });
    this.load.spritesheet("prop_mush", SS + "Elements/Plants/spr_deco_mushroom_red_01_strip4.png", { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("prop_fire", SS + "Elements/VFX/Fire/spr_deco_fire_01_strip4.png", { frameWidth: 16, frameHeight: 16 });

    // ── Comida (inimigos e coletáveis) ─────────────────────────────────────
    [
      "fi_burger:food/15_burger.png", "fi_fries:food/44_frenchfries.png",
      "fi_pizza:food/81_pizza.png", "fi_icecream:food/57_icecream.png",
      "fi_cake:food/30_chocolatecake.png", "fi_dump:food/36_dumplings.png",
      "fi_salad:food/40_eggsalad.png", "fi_chicken:food/85_roastedchicken.png",
      "fi_strawb:food/90_strawberrycake.png", "fi_bowl:food/04_bowl.png"
    ].forEach(s => { const [k, p] = s.split(":"); this.load.image(k, p); });
  }

  create() {
    this.scene.start("MenuScene");
  }
}

// =========================================================
// HELPER — cria pet gato com posição CORRETA
// =========================================================
function spawnCatPet(scene, player) {
  const hasCatReal = scene.textures.exists("cat_real");
  const texKey = hasCatReal ? "cat_real" : "cat_fallback";
  const catScale = 1.6;

  const cat = scene.add.sprite(player.x - 60, player.y + 30, texKey)
    .setDepth(19).setScale(catScale).setOrigin(0.5, 1); // origem nos pés → squash natural

  buildCatAnims(scene);
  if (scene.anims.exists("cat_idle")) cat.play("cat_idle");

  const shadow = scene.add.ellipse(cat.x, cat.y, 24, 7, 0x000000, 0.22).setDepth(18);
  cat._shadow = shadow;
  // Posição "base" no chão — o hop é um offset visual sobre ela (não acumula drift)
  cat._baseX = cat.x;
  cat._baseY = cat.y;
  cat._attackPunch = 0;   // impulso visual (squash) quando o gato ataca
  cat._lungeX = 0; cat._lungeY = 0; // investida na direção do golpe (decai)
  cat._attackSpin = 0;    // giro de ataque (decai)
  cat._nextAttack = 0;   // cooldown de ataque automático
  cat._nextCommand = 0;   // cooldown da ORDEM de ataque (botão)
  cat._commandedTarget = null; // inimigo alvo quando recebe ordem de ataque

  cat.follow = function (px, py, minDist) {
    const targetX = px, targetY = py + 26;
    const dist = Phaser.Math.Distance.Between(this._baseX, this._baseY, targetX, targetY);
    const MIN = minDist || 56;

    let moving = false;
    if (dist > MIN) {
      moving = true;
      const dx = this._baseX - targetX, dy = this._baseY - targetY, len = Math.hypot(dx, dy) || 1;
      const tx = targetX + (dx / len) * MIN, ty = targetY + (dy / len) * MIN;
      const lerpSpeed = dist > 150 ? 0.17 : 0.09;
      this._baseX = Phaser.Math.Linear(this._baseX, tx, lerpSpeed);
      this._baseY = Phaser.Math.Linear(this._baseY, ty, lerpSpeed);
    }

    this.setFlipX(this._baseX < px);

    const t = scene.time.now;
    const punch = this._attackPunch;
    let rot;
    if (moving) {
      // Trote: pulinho rítmico + squash/stretch (sensação de patas) + balanço
      const phase = t / 85;
      const hop = Math.abs(Math.sin(phase)) * 8;          // pulo (sempre ≥ 0)
      const squash = 1 + Math.sin(phase * 2) * 0.09;          // estica/comprime
      this.y = this._baseY - hop;
      this.setScale(catScale / squash * (1 + punch), catScale * squash * (1 + punch));
      rot = Math.sin(phase) * 0.11;
      shadow.setScale(1 - hop / 16, 1 - hop / 26);                // sombra encolhe no alto do pulo
    } else {
      // Parado: respiração suave
      const breathe = 1 + Math.sin(t / 380) * 0.05;
      this.y = this._baseY + Math.sin(t / 400) * 0.6;
      this.setScale(catScale * (1 + punch), catScale * breathe * (1 + punch));
      rot = 0;
      shadow.setScale(1, 1);
    }
    // Investida + giro de ataque (sobrepõem o movimento normal e decaem)
    this.x = this._baseX + this._lungeX;
    this.y = this.y + this._lungeY;
    this.rotation = rot + this._attackSpin;

    if (this._attackPunch > 0.01) this._attackPunch *= 0.82; else this._attackPunch = 0;
    this._lungeX *= 0.78; this._lungeY *= 0.78; this._attackSpin *= 0.80;
    if (Math.abs(this._lungeX) < 0.3) this._lungeX = 0;
    if (Math.abs(this._lungeY) < 0.3) this._lungeY = 0;
    if (Math.abs(this._attackSpin) < 0.01) this._attackSpin = 0;
    shadow.setPosition(this._baseX, this._baseY + 2);
  };

  return cat;
}

// =========================================================
// CENA: MENU
// =========================================================
class MenuScene extends Phaser.Scene {
  constructor() { super("MenuScene"); }

  create() {
    setMobileControlsVisible(false);
    buildAllTextures(this);
    buildPlayerAnims(this);
    buildCatAnims(this);
    const W = this.scale.width, H = this.scale.height, cx = centerX(this), cy = centerY(this);
    addBeachBackdrop(this);

    // Corações/emojis subindo continuamente (clima fofo)
    this.time.addEvent({
      delay: 650, loop: true, callback: () => {
        const h = this.add.text(Phaser.Math.Between(20, W - 20), H + 20, ["❤", "💖", "✨", "🐱"][Phaser.Math.Between(0, 3)], { fontSize: `${Phaser.Math.Between(15, 27)}px` }).setOrigin(0.5).setDepth(3).setAlpha(0.6);
        this.tweens.add({ targets: h, y: -30, x: h.x + Phaser.Math.Between(-40, 40), alpha: 0, rotation: Phaser.Math.FloatBetween(-0.6, 0.6), duration: Phaser.Math.Between(4200, 7000), onComplete: () => h.destroy() });
      }
    });

    // Título com brilho pulsante (interativo = easter egg)
    const title = addPixelText(this, cx, cy - 150, GAME_TITLE, Math.min(42, Math.max(28, W / 12)), "#fff8fb");
    this.tweens.add({ targets: title, scale: 1.04, yoyo: true, repeat: -1, duration: 1400, ease: "Sine.easeInOut" });
    addPixelText(this, cx, cy - 64, "Uma viagem, muitos obstáculos\ne uma surpresa no final...", 16, "#ffffff");
    const won = localStorage.getItem("missaoFloripaZerou") === "sim";
    if (won) addPixelText(this, cx, cy - 12, "bom jogo 💖", 14, "#fff4a8");

    addMenuButton(this, cx, cy + 62, "🌟 Começar aventura", () => this.scene.start("ClassSelectScene"), 286, 60, 0xff6fb1);
    addMenuButton(this, cx, cy + 133, "📖 Como jogar", () => this.scene.start("HowToScene"), 250, 54, 0x44a7ff);

    // Nutri animada abaixo dos botões (não cobre os botões)
    const ptex = this.textures.exists("fa_walk_down") ? "fa_walk_down" : "player";
    const nutri = this.add.sprite(cx + 120, H - 108, ptex).setScale(3).setDepth(5);
    if (this.anims.exists("player_idle_down")) nutri.play("player_idle_down");
    this.tweens.add({ targets: nutri, y: nutri.y - 6, yoyo: true, repeat: -1, duration: 1200, ease: "Sine.easeInOut" });

    // GATO clicável — easter egg de cliques
    const catTex = this.textures.exists("cat_real") ? "cat_real" : "cat_fallback";
    const dcat = this.add.sprite(cx - 120, H - 108, catTex).setScale(2.8).setDepth(5).setInteractive({ useHandCursor: true });
    if (this.anims.exists("cat_idle")) dcat.play("cat_idle");
    this.tweens.add({ targets: dcat, y: dcat.y - 7, yoyo: true, repeat: -1, duration: 700, ease: "Sine.easeInOut" });
    this._catClicks = 0;
    const catMsgs = ["miau! 🐱", "prrr... 😺", "cadê o petisco? 🐟", "miaaau! 💕", "ronronando..."];
    dcat.on("pointerdown", () => {
      SoundFX.tone(680 + Math.random() * 220, 0.06, "sine", 0.02);
      this.tweens.add({ targets: dcat, scaleX: 2.5, scaleY: 3.1, duration: 90, yoyo: true });
      const fala = this.add.text(dcat.x, dcat.y - 52, catMsgs[this._catClicks % catMsgs.length], { fontSize: "14px", color: "#fff", stroke: "#a0408a", strokeThickness: 4 }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: fala, y: fala.y - 18, alpha: 0, duration: 900, onComplete: () => fala.destroy() });
      for (let i = 0; i < 4; i++) { const h = this.add.text(dcat.x, dcat.y - 20, "❤", { fontSize: "14px" }).setOrigin(0.5).setDepth(20); const a = Math.random() * Math.PI * 2; this.tweens.add({ targets: h, x: h.x + Math.cos(a) * 40, y: h.y + Math.sin(a) * 40, alpha: 0, duration: 700, onComplete: () => h.destroy() }); }
      if (++this._catClicks === 7) this.showEasterEgg('🐾 Segredo do gatinho:\n"A nutri mais incrível do mundo\né você. Bora pra Floripa! 💖"');
    });

    // Avião cruzando o céu
    const plane = this.add.text(-40, 72, "✈️", { fontSize: "34px" }).setOrigin(0.5).setDepth(4);
    this.tweens.add({ targets: plane, x: W + 60, y: 102, duration: 6000, repeat: -1, ease: "Sine.easeInOut" });

    // EASTER EGG: tocar 5x no título → chuva de corações
    this._titleClicks = 0;
    title.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      this.tweens.add({ targets: title, angle: Phaser.Math.Between(-4, 4), duration: 80, yoyo: true });
      if (++this._titleClicks >= 5) { this._titleClicks = 0; this.heartRain(); this.showEasterEgg("💖 Easter egg!\nFeito com muito carinho\npra te ver sorrir jogando. 🥰"); }
    });

    this.add.text(W - 10, H - 8, "🐱 dica: toque no gatinho...", { fontSize: "11px", color: "#ffffff" }).setOrigin(1, 1).setAlpha(0.5).setDepth(6);
  }

  heartRain() {
    const W = this.scale.width, H = this.scale.height;
    for (let i = 0; i < 40; i++) {
      const h = this.add.text(Phaser.Math.Between(10, W - 10), Phaser.Math.Between(-200, -10), ["❤", "💖", "🌟", "🐱", "✨"][i % 5], { fontSize: `${Phaser.Math.Between(18, 34)}px` }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: h, y: H + 30, rotation: Phaser.Math.FloatBetween(-1.4, 1.4), duration: Phaser.Math.Between(2200, 4200), delay: Phaser.Math.Between(0, 800), onComplete: () => h.destroy() });
    }
    SoundFX.special();
  }

  showEasterEgg(text) {
    if (this._eggEls) return;
    const W = this.scale.width, H = this.scale.height, pw = Math.min(W - 50, 430), ph = 200;
    const dim = this.add.rectangle(0, 0, W, H, 0x05030b, 0.55).setOrigin(0).setDepth(3000).setInteractive();
    const panel = this.add.rectangle(W / 2, H / 2, pw, ph, 0xfff8fb, 0.98).setStrokeStyle(4, 0xff6fb1, 1).setDepth(3001);
    const txt = this.add.text(W / 2, H / 2 - 10, text, { fontFamily: "Verdana,system-ui,sans-serif", fontSize: "17px", color: "#c43d7a", fontStyle: "900", align: "center", lineSpacing: 5, wordWrap: { width: pw - 40 } }).setOrigin(0.5).setDepth(3002);
    const hint = this.add.text(W / 2, H / 2 + ph / 2 - 22, "toque para fechar", { fontSize: "12px", color: "#9a6a85" }).setOrigin(0.5).setDepth(3002);
    const els = [dim, panel, txt, hint]; this._eggEls = els;
    dim.on("pointerdown", () => { els.forEach(e => e.destroy()); this._eggEls = null; });
    SoundFX.collect();
  }
}

// =========================================================
// CENA: COMO JOGAR
// =========================================================
class HowToScene extends Phaser.Scene {
  constructor() { super("HowToScene"); }
  create() {
    setMobileControlsVisible(false);
    addBeachBackdrop(this);
    addPixelText(this, centerX(this), 70, "Como jogar", 34, "#fff8fb");
    const ins = ["🕹️ Joystick ou WASD para andar", "🗡️ Ataque: sua arma voa até o inimigo", "🐱 Botão do gato: manda ele atacar (tem recarga)", "💨 Dash para desviar dos perigos", "✨ Especial quando a mana encher", "🍓 Colete comidas saudáveis pra curar", "🎁 Vença as fases até o baú secreto"];
    const pw = Math.min(640, this.scale.width - 28);
    this.add.rectangle(centerX(this), centerY(this), pw, 340, 0x1d2544, 0.74).setStrokeStyle(3, 0xffffff, 0.28).setOrigin(0.5);
    ins.forEach((l, i) => this.add.text(centerX(this), centerY(this) - 125 + i * 40, l, { fontFamily: "Verdana,system-ui,sans-serif", fontSize: "16px", color: "#ffffff", stroke: "#151329", strokeThickness: 3 }).setOrigin(0.5));
    addMenuButton(this, centerX(this), this.scale.height - 72, "Voltar", () => this.scene.start("MenuScene"), 220, 54, 0xff6fb1);
  }
}

// =========================================================
// CENA: ESCOLHA DE CLASSE
// =========================================================
class ClassSelectScene extends Phaser.Scene {
  constructor() { super("ClassSelectScene"); }
  create() {
    setMobileControlsVisible(false);
    buildAllTextures(this);
    addBeachBackdrop(this);
    addPixelText(this, centerX(this), 46, "Escolha sua classe", 30, "#fff8fb");
    addPixelText(this, centerX(this), 84, "Cada uma tem uma arma e poder diferente.", 14, "#ffffff");
    const keys = ["guerreira", "estrategista", "sereia"];
    const colors = { guerreira: 0xff8a3d, estrategista: 0x4fe39a, sereia: 0x44d4ff };
    const wkeyMap = { carrot: "proj_carrot", clipboard: "proj_clipboard", trident: "weap_trident" };
    const cW = Math.min(340, this.scale.width - 30), cH = 132, sY = this.scale.height < 700 ? 150 : 172;
    keys.forEach((key, idx) => {
      const cfg = CLASS_CONFIGS[key], y = sY + idx * (cH + 16);
      const card = this.add.container(centerX(this), y);
      const bgC = colors[key];
      const els = [
        this.add.rectangle(5, 7, cW, cH, 20, 0x000000, 0.22),
        this.add.rectangle(0, 0, cW, cH, 20, bgC, 0.96).setStrokeStyle(3, 0xffffff, 0.6),
        // medalhão da arma
        this.add.circle(-cW / 2 + 44, 0, 34, 0xffffff, 0.22),
        this.add.image(-cW / 2 + 44, 0, wkeyMap[cfg.weapon]).setScale(cfg.weapon === "proj_carrot" ? 2 : 1.7),
        this.add.text(-cW / 2 + 88, -46, cfg.name, { fontFamily: "Verdana,system-ui,sans-serif", fontSize: "19px", fontStyle: "900", color: "#ffffff", stroke: "#32142d", strokeThickness: 4 }).setOrigin(0, 0.5),
        this.add.text(-cW / 2 + 88, -16, cfg.weaponDesc, { fontFamily: "Verdana,system-ui,sans-serif", fontSize: "12px", color: "#fff9cf", wordWrap: { width: cW - 110 } }).setOrigin(0, 0.5),
        this.add.text(-cW / 2 + 88, 30, `❤ ${cfg.maxHp}   ✦ Mana ${cfg.maxMana}`, { fontFamily: "Verdana,system-ui,sans-serif", fontSize: "13px", color: "#ffffff", stroke: "#32142d", strokeThickness: 2 }).setOrigin(0, 0.5),
        this.add.text(-cW / 2 + 88, 50, `💨 Dash ${cfg.dashSpeed}   🗡 Dano ${cfg.attackDamage}`, { fontFamily: "Verdana,system-ui,sans-serif", fontSize: "13px", color: "#ffffff", stroke: "#32142d", strokeThickness: 2 }).setOrigin(0, 0.5)
      ];
      card.add(els);
      card.setSize(cW, cH).setInteractive({ useHandCursor: true });
      // gira a arminha de leve no card
      const wimg = els[3];
      this.tweens.add({ targets: wimg, angle: cfg.weapon === "clipboard" ? 360 : 0, y: cfg.weapon === "clipboard" ? 0 : "-=4", yoyo: cfg.weapon !== "clipboard", repeat: -1, duration: cfg.weapon === "clipboard" ? 2200 : 900, ease: cfg.weapon === "clipboard" ? "Linear" : "Sine.easeInOut" });
      card.on("pointerover", () => this.tweens.add({ targets: card, scale: 1.03, duration: 120 }));
      card.on("pointerout", () => this.tweens.add({ targets: card, scale: 1, duration: 120 }));
      card.on("pointerdown", () => { SoundFX.collect(); this.tweens.add({ targets: card, scale: 0.97, duration: 70, yoyo: true }); gameState.selectedClassKey = key; gameState.run = null; this.time.delayedCall(120, () => this.scene.start("GameScene", { level: 1, fresh: true })); });
    });
    addMenuButton(this, centerX(this), this.scale.height - 44, "Voltar", () => this.scene.start("MenuScene"), 190, 46, 0x44a7ff);
  }
}

// =========================================================
// CENA PRINCIPAL DO JOGO
// =========================================================
class GameScene extends Phaser.Scene {
  constructor() { super("GameScene"); }

  init(data) {
    this.level = data.level || 1;
    this.levelData = LEVELS[this.level];
    this.classKey = gameState.selectedClassKey || "guerreira";
    this.classCfg = CLASS_CONFIGS[this.classKey];
    if (!gameState.run || data.fresh) gameState.run = { hp: this.classCfg.maxHp, mana: 0, score: 0 };
    else { gameState.run.hp = Math.min(gameState.run.hp, this.classCfg.maxHp); gameState.run.mana = Math.min(gameState.run.mana, this.classCfg.maxMana); }
  }

  create() {
    setMobileControlsVisible(true);
    this.cameras.main.resetFX(); // limpa qualquer fade/flash herdado da fase anterior
    buildAllTextures(this);
    buildPlayerAnims(this);
    buildCatAnims(this);
    buildFxAnims(this);

    this.worldW = 1280; this.worldH = 860;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);

    this.requiredItems = new Set(); this.collectedRequired = new Set();
    this.enemyKillGoal = 0; this.enemyKills = 0; this.portalSpawned = false;
    this.useWaves = false; this.waveIndex = 0; this.totalWaves = 0; this._waveSpawner = null; this._portalPos = [1160, 735];
    this.physics.resume(); // garante que física nunca fica pausada entre fases
    this.gameOver = false; this.lastDir = new Phaser.Math.Vector2(0, 1);
    this.facing = "down"; this.nextAttackAt = 0; this.nextDashAt = 0;
    this.invulnerableUntil = 0; this.speedBoostUntil = 0; this.attackId = 0; this.boss = null;
    this.transitioning = false;
    this._wasMoving = false; this._pendingFacing = null; this._pendingFrames = 0;

    this.buildBackground();

    this.obstacles = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.collectables = this.physics.add.group();
    this.requiredGroup = this.physics.add.group();
    this.portals = this.physics.add.group();
    this.enemyProj = this.physics.add.group();
    this.playerProj = this.physics.add.group();

    // Determina textura do player (usa walk_down direto: idle e walk compartilham essa textura)
    const playerTex = this.textures.exists("fa_walk_down") ? "fa_walk_down" : "player";
    this.player = this.physics.add.sprite(110, 120, playerTex).setDepth(20).setScale(3);
    this.playerShadow = this.add.ellipse(this.player.x, this.player.y + 24, 30, 10, 0x000000, 0.25).setDepth(19);
    this.player.setCollideWorldBounds(true);
    // Body pequeno centralizado no personagem (frame 48×64, personagem em x≈23, pés em y≈42)
    this.player.body.setSize(12, 14).setOffset(17, 30);
    if (this.anims.exists("player_idle_down")) this.player.play("player_idle_down");

    // AURA — só ativa ao usar o ESPECIAL (dura 10s). Refs começam nulas.
    this.auraGlow = null; this.auraRing = null; this.auraEmitter = null; this.auraCoreEmitter = null; this._auraTimer = null;

    // ARMA EQUIPADA visível ao lado da personagem (espada de cenoura / prancheta / tridente)
    const wkey = { carrot: "proj_carrot", clipboard: "proj_clipboard", trident: "weap_trident" }[this.classCfg.weapon] || "proj_carrot";
    this.weaponSprite = this.add.image(this.player.x, this.player.y, wkey).setDepth(21).setScale(1.4);
    this._weaponSwing = 0;

    // PET GATO — agora com posição correta
    this.cat = spawnCatPet(this, this.player);

    this.buildLevel();

    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemies, this.obstacles);
    this.physics.add.collider(this.playerProj, this.obstacles, s => s.destroy());
    this.physics.add.overlap(this.player, this.enemies, this.onEnemyTouch, null, this);
    this.physics.add.overlap(this.player, this.enemyProj, this.onEnemyProjHit, null, this);
    this.physics.add.overlap(this.player, this.collectables, this.onCollect, null, this);
    this.physics.add.overlap(this.player, this.requiredGroup, this.onRequiredCollect, null, this);
    this.physics.add.overlap(this.player, this.portals, this.onPortalEnter, null, this);
    this.physics.add.overlap(this.playerProj, this.enemies, this.onPlayerProjHit, null, this);

    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(this.scale.width < 700 ? 1.02 : 1.1);

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D,
      up2: Phaser.Input.Keyboard.KeyCodes.UP, down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left2: Phaser.Input.Keyboard.KeyCodes.LEFT, right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      attack: Phaser.Input.Keyboard.KeyCodes.SPACE, dash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      special: Phaser.Input.Keyboard.KeyCodes.E, catAttack: Phaser.Input.Keyboard.KeyCodes.Q
    });

    this.createHUD();
    this.showMsg(this.levelData.message, 2800);
    this.fadeIn();
  }

  buildBackground() {
    const g = this.add.graphics().setDepth(-50);
    const t = this.levelData.theme;

    if (t === "room") {
      // bg_wood é verde no projeto — sempre usa textura gerada de madeira
      if (this.textures.exists("wood_floor_gen"))
        this.add.tileSprite(0, 0, this.worldW, this.worldH, "wood_floor_gen").setOrigin(0).setDepth(-60);
      else { g.fillStyle(0x8b5e3c, 1); g.fillRect(0, 0, this.worldW, this.worldH); }
      // Janela decorativa
      g.fillStyle(0x9de4ff, 0.45); g.fillRoundedRect(780, 60, 340, 210, 12);
      g.fillStyle(0xede5ff, 0.6); g.fillRoundedRect(800, 78, 300, 158, 8);
      g.lineStyle(3, 0xc0a0c0, 0.8); g.strokeRoundedRect(780, 60, 340, 210, 12);
      g.lineBetween(780, 165, 1120, 165); g.lineBetween(950, 60, 950, 270);
    }

    if (t === "beach") {
      // Chão de AREIA gerado (os tiles .png do projeto são verdes/errados)
      this.add.tileSprite(0, 0, this.worldW, this.worldH, "sand_floor_gen").setOrigin(0).setDepth(-60);
      // Faixa de MAR no topo, com transição de espuma para a areia
      g.fillStyle(0x2aa3dd, 1); g.fillRect(0, 0, this.worldW, 180);
      g.fillStyle(0x4ec3ee, 1); g.fillRect(0, 150, this.worldW, 46);
      // Linha de espuma da arrebentação
      g.fillStyle(0xffffff, 0.75); for (let x = 0; x < this.worldW; x += 70) g.fillRoundedRect(x, 190 + Math.sin(x / 60) * 7, 52, 8, 4);
      g.fillStyle(0xffffff, 0.35); for (let x = 0; x < this.worldW; x += 90) g.fillRoundedRect(x + 20, 168 + Math.sin(x / 80) * 6, 60, 6, 3);
      // sol
      g.fillStyle(0xffdd33, 0.35); g.fillCircle(this.worldW - 120, 80, 66);
      g.fillStyle(0xfff06f, 1); g.fillCircle(this.worldW - 120, 80, 46);
      // estrela do mar + concha na areia
      this.add.star(360, 640, 5, 8, 20, 0xff7755, 0.7).setDepth(-45);
      this.add.star(360, 640, 5, 4, 12, 0xff5533, 0.95).setDepth(-45);
      g.fillStyle(0xffeedd, 0.9); g.fillCircle(820, 560, 20); g.lineStyle(2, 0xddbbaa, 0.9);
      for (let a = 0; a < 5; a++) g.lineBetween(820, 560, 820 + Math.cos(a * 1.25) * 20, 560 + Math.sin(a * 1.25) * 20);
    }

    if (t === "market") {
      // Piso de SUPERMERCADO (ladrilho) gerado
      this.add.tileSprite(0, 0, this.worldW, this.worldH, "tile_floor_gen").setOrigin(0).setDepth(-60);
      // Faixa/parede de fundo com prateleiras
      g.fillStyle(0xd8e4ee, 1); g.fillRect(0, 0, this.worldW, 150);
      g.fillStyle(0xb9c9d8, 1); g.fillRect(0, 150, this.worldW, 8);
      // Prateleiras com produtos (retângulos coloridos = itens fit)
      const prateleira = (px, py, cor) => {
        g.fillStyle(0x9a6a3c, 1); g.fillRect(px, py, 250, 16); g.fillStyle(cor, 0.9);
        for (let i = 0; i < 7; i++) g.fillRect(px + 8 + i * 34, py - 22, 26, 22);
      };
      prateleira(90, 70, 0x6ad06a); prateleira(420, 70, 0xffb84d); prateleira(760, 70, 0xff7a9c);
      this.add.text(this.worldW / 2, 118, "🛒 SETOR FIT — 100% saudável", { fontSize: "20px", color: "#2b4a63", fontStyle: "900" }).setOrigin(0.5).setDepth(-40);
      // (Comidas soltas no chão removidas: confundiam com os itens a coletar)
    }

    if (t === "night") {
      // Chão noturno mágico gerado + gradiente de céu por cima das bordas
      this.add.tileSprite(0, 0, this.worldW, this.worldH, "night_floor_gen").setOrigin(0).setDepth(-60);
      g.fillStyle(0x12102b, 0.55); g.fillRect(0, 0, this.worldW, this.worldH);
      for (let i = 0; i < 90; i++) {
        g.fillStyle(Phaser.Math.Between(0, 1) ? 0xffffff : 0xffb6df, Phaser.Math.FloatBetween(0.3, 0.9));
        g.fillCircle(Phaser.Math.Between(20, this.worldW - 20), Phaser.Math.Between(20, this.worldH - 20), Phaser.Math.Between(1, 2.5));
      }
      g.lineStyle(3, 0xb06bff, 0.25); for (let i = 0; i < 8; i++) g.strokeCircle(Phaser.Math.Between(100, this.worldW - 100), Phaser.Math.Between(100, this.worldH - 100), Phaser.Math.Between(20, 60));
      // lua
      g.fillStyle(0xfffbe0, 0.95); g.fillCircle(200, 120, 40);
      g.fillStyle(0x191334, 1); g.fillCircle(220, 112, 33);
    }
  }

  buildLevel() {
    this.spawnCommons();
    if (this.level === 1) this.lvl1();
    if (this.level === 2) this.lvl2();
    if (this.level === 3) this.lvl3();
    if (this.level === 4) this.lvl4();
  }

  lvl1() {
    this.player.setPosition(110, 120);
    this.addObs(420, 165, 160, 56, 0x6c4b3d, "📦 caixas", "fi_bowl");
    this.addObs(810, 360, 220, 60, 0x8b5e42, "👗 roupas", "fi_salad");
    this.addObs(335, 560, 230, 60, 0xa07060, "bagunça", "fi_cake");
    this.addObs(1040, 605, 160, 80, 0x6c4b3d, "📦 caixas", "fi_burger");
    this.addObs(650, 700, 250, 46, 0x7a5a48, "🛏️ cama", "fi_icecream");
    // Combate em 2 ondas — portal só abre depois de limpar tudo (boss na 2ª onda)
    this.useWaves = true; this.totalWaves = 2; this.waveIndex = 0;
    this._waveSpawner = (i) => this.spawnWaveLvl1(i); this._portalPos = [1160, 735];
    this.spawnWaveLvl1(0);
  }

  spawnWaveLvl1(index) {
    if (index === 0) {
      this.addEnemy("coxinha", 565, 420); this.addEnemy("coxinha", 940, 505);
      this.addEnemy("refri", 740, 170); this.addEnemy("refri", 210, 490);
      this.showMsg("🌊 Onda 1: derrote as tentações!", 2000);
    } else {
      this.addEnemy("coxinha", 420, 300); this.addEnemy("refri", 900, 560);
      this.addEnemy("hamburger", 650, 260);
      this.boss = this.addEnemy("boss", 640, 170, 16); // boss da fase 1 (HP reduzido)
      this.showMsg("⚠ Onda 2: o CHEFE da Saudade apareceu!", 2400);
      SoundFX.special();
    }
  }

  lvl2() {
    this.player.setPosition(90, 720);
    this.addObs(260, 300, 140, 44, 0x806f65, "🌴 coqueiro");
    this.addObs(560, 520, 130, 52, 0x806f65, "🪨 pedras");
    this.addObs(890, 360, 150, 46, 0x806f65, "🌴 coqueiro");
    this.addObs(1110, 300, 100, 52, 0x806f65, "🪨 pedras");
    this.addCol("coco", 245, 410); this.addCol("morango", 690, 250); this.addCol("banana", 1000, 670);
    // NPC salva-vidas dá uma força antes do chefe
    this.addNpc(150, 560, "Salva-vidas 🛟", ["Cuidado com o marombeiro galego!", "Ele parece forte... mas você é mais 💪"],
      { text: "🎁 +1 de vida!", apply: () => { gameState.run.hp = Math.min(this.classCfg.maxHp, gameState.run.hp + 1); this.updateHUD(); } });
    // Plaquinha de madeira interativa com recadinho
    this.addSign(700, 620, "Boa viagem e sucesso\nminha nutri 💖");
    // Combate em 2 ondas — bolinhos e depois o CHEFE Marombeiro
    this.useWaves = true; this.totalWaves = 2; this.waveIndex = 0;
    this._waveSpawner = (i) => this.spawnWaveLvl2(i); this._portalPos = [1160, 720];
    this.spawnWaveLvl2(0);
  }

  spawnWaveLvl2(index) {
    if (index === 0) {
      for (let i = 0; i < 5; i++) this.addEnemy("crab", 380 + i * 135, Phaser.Math.Between(300, 640));
      this.showMsg("🌊 Onda 1: os bolinhos do glúten!", 2000);
    } else {
      this.addEnemy("crab", 320, 420); this.addEnemy("crab", 1000, 560);
      this.boss = this.addEnemy("maromba", 640, 280);
      this.showMsg("💪 CHEFE: o Marombeiro da Saudade chegou!", 2400);
      SoundFX.special();
    }
  }

  lvl3() {
    this.player.setPosition(100, 420);
    this.addObs(250, 180, 270, 72, 0x3d7a60, "🥦 hortifruti", "fi_salad");
    this.addObs(690, 180, 270, 72, 0x9a7040, "🥫 prateleira", "fi_bowl");
    this.addObs(1030, 405, 200, 82, 0x3d7a60, "📦 caixa fit", "fi_burger");
    this.addObs(430, 660, 260, 72, 0x9a7040, "🏪 balcão", "fi_cake");
    this.addReq("arroz", "Arroz", 240, 430, "goal_arroz");
    this.addReq("frango", "Frango", 565, 315, "goal_frango");
    this.addReq("salada", "Salada", 910, 180, "goal_salada");
    this.addReq("legumes", "Legumes", 980, 690, "goal_legumes");
    this.addReq("agua", "Água", 715, 600, "goal_agua");
    this.addObs(150, 640, 120, 60, 0x9a7040, "📦 caixa fit", "fi_burger");
    this.addEnemy("hamburger", 410, 420); this.addEnemy("hamburger", 880, 510);
    this.addEnemy("brigadeiro", 735, 350); this.addEnemy("brigadeiro", 1130, 610);
    this.addEnemy("refri", 1050, 220);
    // NPC feirante que ajuda a nutri no mercado
    this.addNpc(120, 250, "Seu Zé 🥕", ["Bem-vinda ao Setor Fit, dotôra!", "Mate todas as besteira 💪", "Comida de verdade é o melhor remédio."],
      { text: "🎁 +2 de vida do Seu Zé!", apply: () => { gameState.run.hp = Math.min(this.classCfg.maxHp, gameState.run.hp + 2); this.updateHUD(); } });
    this.addSign(560, 470, "Fique apenas com alguem mais feio que o edu!");
  }

  lvl4() {
    this.player.setPosition(150, 700);
    this.addObs(285, 250, 170, 56, 0x593b84, "💎 cristal", "fi_pizza");
    this.addObs(990, 240, 180, 56, 0x593b84, "✨ brilho", "fi_icecream");
    this.addObs(580, 615, 230, 56, 0x593b84, "🌀 cristal", "fi_dump");
    this.addCol("heart", 210, 520); this.addCol("banana", 380, 690); this.addCol("coco", 970, 610);
    this.boss = this.addEnemy("boss", 980, 420);
    // Gato vampiro decorativo no nível noturno
    if (this.textures.exists("cat_drac")) {
      const drac = this.add.image(490, 620, "cat_drac").setScale(3).setDepth(6).setTint(0xcc99ff);
      this.tweens.add({ targets: drac, y: drac.y - 10, yoyo: true, repeat: -1, duration: 1100, ease: "Sine.easeInOut" });
      this.add.text(490, 668, "gato vampiro", { fontSize: "12px", color: "#cc99ff", stroke: "#1a1025", strokeThickness: 3 }).setOrigin(0.5).setDepth(7);
    }
  }

  addScenTxt(x, y, text, color = "#ffffff") {
    this.add.text(x, y, text, { fontFamily: "Verdana,system-ui,sans-serif", fontSize: "15px", color, align: "center", stroke: "#ffffff", strokeThickness: 2 }).setOrigin(0.5).setDepth(-10);
  }

  // Plaquinha de madeira clicável que abre uma mensagem
  addSign(x, y, msg) {
    const sign = this.add.image(x, y, "sign_wood").setDepth(8).setScale(1.5);
    sign.setInteractive({ useHandCursor: true });
    // Indicador flutuante de que é interativa
    const hint = this.add.text(x, y - 52, "💌", { fontSize: "24px" }).setOrigin(0.5).setDepth(9);
    this.tweens.add({ targets: hint, y: hint.y - 7, yoyo: true, repeat: -1, duration: 720, ease: "Sine.easeInOut" });
    this.add.text(x, y + 44, "toque na plaquinha 💖", { fontSize: "12px", color: "#5d3d2e", stroke: "#fff", strokeThickness: 3 }).setOrigin(0.5).setDepth(9);
    const open = () => this.showSignMessage(msg);
    sign.on("pointerdown", open);
    hint.setInteractive({ useHandCursor: true }).on("pointerdown", open);
    return sign;
  }

  // NPC clicável que conversa e (opcional) dá uma recompensa uma vez
  addNpc(x, y, name, falas, reward) {
    const npc = this.add.image(x, y, "npc_feirante").setDepth(8).setScale(1.5).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: npc, y: y - 4, yoyo: true, repeat: -1, duration: 1100, ease: "Sine.easeInOut" });
    const tag = this.add.text(x, y - 48, "💬", { fontSize: "20px" }).setOrigin(0.5).setDepth(9);
    this.tweens.add({ targets: tag, y: tag.y - 6, yoyo: true, repeat: -1, duration: 700, ease: "Sine.easeInOut" });
    this.add.text(x, y + 40, name, { fontSize: "12px", color: "#fff", stroke: "#3a2a18", strokeThickness: 4 }).setOrigin(0.5).setDepth(9);
    let used = false, idx = 0;
    const talk = () => {
      let msg = falas[idx % falas.length]; idx++;
      if (reward && !used) { used = true; msg += "\n\n" + reward.text; reward.apply(); }
      this.showSignMessage(msg);
    };
    npc.on("pointerdown", talk);
    tag.setInteractive({ useHandCursor: true }).on("pointerdown", talk);
    return npc;
  }

  // Painel central com a mensagem da plaquinha (toque em qualquer lugar fecha)
  showSignMessage(text) {
    if (this._signEls) return; // já aberto
    const W = this.scale.width, H = this.scale.height;
    const pw = Math.min(W - 50, 470), ph = 220;
    const dim = this.add.rectangle(0, 0, W, H, 0x05030b, 0.55).setOrigin(0).setScrollFactor(0).setDepth(3000).setInteractive();
    const panel = this.add.rectangle(W / 2, H / 2, pw, ph, 0xfff8fb, 0.98).setStrokeStyle(4, 0xff6fb1, 1).setScrollFactor(0).setDepth(3001);
    const heart = this.add.text(W / 2, H / 2 - ph / 2 + 34, "💌", { fontSize: "34px" }).setOrigin(0.5).setScrollFactor(0).setDepth(3002);
    const txt = this.add.text(W / 2, H / 2 - 2, text, { fontFamily: "Verdana,system-ui,sans-serif", fontSize: "22px", color: "#c43d7a", fontStyle: "900", align: "center", lineSpacing: 6, wordWrap: { width: pw - 50 } }).setOrigin(0.5).setScrollFactor(0).setDepth(3002);
    const hint = this.add.text(W / 2, H / 2 + ph / 2 - 26, "toque para fechar", { fontFamily: "Verdana,system-ui,sans-serif", fontSize: "13px", color: "#9a6a85" }).setOrigin(0.5).setScrollFactor(0).setDepth(3002);
    const els = [dim, panel, heart, txt, hint];
    this._signEls = els;
    dim.on("pointerdown", () => { els.forEach(e => e && e.destroy()); this._signEls = null; });
    SoundFX.collect(); vibrate(10);
  }

  addObs(x, y, w, h, color, label = "", tex = "") {
    const lbl = label.replace(/\p{Emoji}/gu, "").trim().toLowerCase();
    const theme = this.levelData.theme;

    // Escolhe o sprite coerente com a fase pelo tema + palavra-chave do label
    let spriteKey = null, tint = 0xffffff;
    if (theme === "room") {
      const m = { "caixas": "prop_box", "roupas": "prop_wardrobe", "bagunça": "prop_mess", "cama": "prop_bed" };
      const k = Object.keys(m).find(k => lbl.includes(k)); spriteKey = k ? m[k] : null;
    } else if (theme === "beach") {
      spriteKey = (lbl.includes("coqueiro") || lbl.includes("palm")) ? "obs_palm" : "obs_rock";
    } else if (theme === "market") {
      if (lbl.includes("caixa")) spriteKey = "obs_crate";
      else if (lbl.includes("balcão") || lbl.includes("balcao") || lbl.includes("freezer")) spriteKey = "obs_freezer";
      else spriteKey = "obs_shelf"; // hortifruti / prateleira
    } else if (theme === "night") {
      spriteKey = "obs_crystal";
      tint = lbl.includes("brilho") ? 0xffe066 : lbl.includes("portal") ? 0x6be9ff : 0xc08bff;
    }

    // Corpo de colisão por tipo (cobre a base do objeto, não a copa/topo alto)
    const bodyByKey = {
      prop_box: [0.8, 0.7, 0.1, 0.15], prop_wardrobe: [0.8, 0.7, 0.1, 0.15], prop_mess: [0.8, 0.7, 0.1, 0.15], prop_bed: [0.8, 0.7, 0.1, 0.15],
      obs_rock: [0.82, 0.5, 0.09, 0.45], obs_palm: [0.28, 0.22, 0.36, 0.72],
      obs_shelf: [0.86, 0.6, 0.07, 0.18], obs_crate: [0.78, 0.6, 0.11, 0.28], obs_freezer: [0.88, 0.55, 0.06, 0.32],
      obs_crystal: [0.6, 0.32, 0.2, 0.55]
    };

    // Os nomes/escritas dos objetos foram removidos para deixar o cenário limpo.
    let r;
    if (spriteKey && this.textures.exists(spriteKey)) {
      r = this.add.image(x, y, spriteKey).setDepth(8);
      if (tint !== 0xffffff) r.setTint(tint);
      this.physics.add.existing(r, true);
      const bb = bodyByKey[spriteKey] || [0.8, 0.6, 0.1, 0.25];
      r.body.setSize(r.width * bb[0], r.height * bb[1]).setOffset(r.width * bb[2], r.height * bb[3]);
    } else {
      // Fallback: caixa colorida discreta
      r = this.add.rectangle(x, y, w, h, color, 0.88).setStrokeStyle(2, 0xffffff, 0.4).setDepth(8);
      this.physics.add.existing(r, true);
    }

    this.obstacles.add(r);
    return r;
  }

  spawnCommons() {
    [[190, 210, "morango"], [555, 295, "banana"], [755, 735, "marmita"], [1130, 140, "coco"], [1180, 755, "heart"]]
      .forEach(([x, y, t]) => { if (Phaser.Math.Between(0, 100) > 26) this.addCol(t, x, y); });
  }

  addCol(type, x, y) {
    // Tenta usar imagem real do food/ se carregou, senão usa pixel art
    const realMap = { morango: "fi_strawb", banana: null, marmita: "fi_salad", coco: "fi_bowl", heart: null };
    const fbMap = { morango: "item_morango", banana: "item_banana", marmita: "item_marmita", coco: "item_coco", heart: "item_heart" };
    const rk = realMap[type], hasr = rk && this.textures.exists(rk);
    const tex = hasr ? rk : fbMap[type];
    const obj = this.collectables.create(x, y, tex);
    obj.setData("type", type);
    obj.setScale(hasr ? 1.4 : 1);
    obj.body.setSize(24, 24).setOffset(hasr ? 4 : 4, hasr ? 4 : 4);
    obj.setDepth(12);
    this.tweens.add({ targets: obj, y: y - 9, yoyo: true, repeat: -1, duration: 900 + Phaser.Math.Between(0, 400), ease: "Sine.easeInOut" });
    return obj;
  }

  addReq(key, label, x, y, fbTex) {
    this.requiredItems.add(key);
    // Mapeia para imagens reais se disponíveis
    const realMap = { arroz: "fi_egg", frango: "fi_chicken", salada: "fi_salad", legumes: "fi_curry", agua: "fi_bowl" };
    const rk = realMap[key]; const hasr = rk && this.textures.exists(rk);
    const tex = hasr ? rk : fbTex;
    const obj = this.requiredGroup.create(x, y, tex);
    obj.setData("key", key); obj.setData("label", label);
    obj.setScale(hasr ? 1.6 : 1);
    obj.body.setSize(26, 26).setOffset(hasr ? 3 : 5, hasr ? 3 : 5);
    obj.setDepth(12);
    // Glow de partículas ao redor
    this.add.text(x, y + 36, label, { fontSize: "13px", color: "#fff8fb", stroke: "#19142e", strokeThickness: 3 }).setOrigin(0.5).setDepth(13);
    this.tweens.add({ targets: obj, angle: 7, yoyo: true, repeat: -1, duration: 860 });
    // Halo brilhante
    const halo = this.add.circle(x, y, hasr ? 26 : 20, 0xffd166, 0.22).setDepth(11);
    this.tweens.add({ targets: halo, scale: 1.35, alpha: 0.05, yoyo: true, repeat: -1, duration: 800 });
    return obj;
  }

  addEnemy(type, x, y, hpOverride) {
    // Dados dos inimigos com mapeamento para imagens reais do food/
    const D = {
      coxinha: { tex: "coxinha", real: "fi_fries", name: "🍟 Batata Frita Sombria", hp: 4, sp: 82, dmg: 1, sc: 80 },
      refri: { tex: "refri", real: "fi_icecream", name: "🍦 Sorvete Tóxico", hp: 3.3, sp: 105, dmg: 1, sc: 85 },
      hamburger: { tex: "hamburger", real: "fi_burger", name: "🍔 Hambúrguer Malvado", hp: 5.2, sp: 86, dmg: 1, sc: 110 },
      brigadeiro: { tex: "brigadeiro", real: "fi_cake", name: "🎂 Bolo de Chocolate Rebelde", hp: 4.2, sp: 98, dmg: 1, sc: 100 },
      crab: { tex: "crab", real: "fi_dump", name: "🥟 Bolinho do Glúten", hp: 4.4, sp: 116, dmg: 1, sc: 95 },
      boss: { tex: "saudadeBoss", real: "fi_pizza", name: "🍕 Pizza Monstro da Saudade", hp: 16, sp: 74, dmg: 1, sc: 900, boss: true },
      maromba: { tex: "boss_maromba", real: null, name: "💪 Marombeiro da Saudade", hp: 12, sp: 84, dmg: 1, sc: 700, boss: true }
    }[type];
    if (!D) return null;

    // Usa imagem real se carregada, senão pixel art próprio
    const hasReal = D.real && this.textures.exists(D.real);
    const tex = hasReal ? D.real : D.tex;
    const enemy = this.enemies.create(x, y, tex);
    const hp = hpOverride || D.hp;
    enemy.setData("type", type); enemy.setData("name", D.name);
    enemy.setData("hp", hp); enemy.setData("maxHp", hp);
    enemy.setData("speed", D.sp); enemy.setData("damage", D.dmg);
    enemy.setData("score", D.sc); enemy.setData("boss", !!D.boss);
    enemy.setData("nextShoot", this.time.now + 1300);
    enemy.setDepth(D.boss ? 18 : 16);
    enemy.body.setCollideWorldBounds(true);

    if (D.boss) {
      enemy.setScale(hasReal ? 3.2 : 1.2);
      enemy.body.setSize(hasReal ? 24 : 60, hasReal ? 24 : 60).setOffset(hasReal ? 4 : 13, hasReal ? 4 : 20);
      this.addBossBar(enemy);
    } else {
      enemy.setScale(hasReal ? 2.0 : 1);
      enemy.body.setSize(hasReal ? 24 : enemy.width * 0.72, hasReal ? 24 : enemy.height * 0.68)
        .setOffset(hasReal ? 4 : enemy.width * 0.14, hasReal ? 4 : enemy.height * 0.22);
    }

    // Sombra embaixo do inimigo
    const sh = this.add.ellipse(x, y + (D.boss ? 38 : 20), D.boss ? 50 : 30, 8, 0x000000, 0.18).setDepth(15);
    enemy.setData("shadow", sh);
    return enemy;
  }

  createHUD() {
    this.hud = {};
    this.hud.bg = this.add.rectangle(0, 0, this.scale.width, 84, 0x080d1f, 0.75).setOrigin(0).setScrollFactor(0).setDepth(1000);
    this.hud.hearts = this.add.text(14, 10, "", { fontSize: "24px", color: "#ff6fb1", stroke: "#1a1025", strokeThickness: 4 }).setScrollFactor(0).setDepth(1001);
    this.hud.info = this.add.text(14, 44, "", { fontSize: "13px", color: "#fff8fb", stroke: "#1a1025", strokeThickness: 3 }).setScrollFactor(0).setDepth(1001);
    this.hud.score = this.add.text(this.scale.width - 14, 12, "", { fontSize: "16px", color: "#fff4a8", stroke: "#1a1025", strokeThickness: 4, align: "right" }).setOrigin(1, 0).setScrollFactor(0).setDepth(1001);
    this.hud.manaT = this.add.text(this.scale.width - 14, 44, "", { fontSize: "13px", color: "#9eeaff", stroke: "#1a1025", strokeThickness: 3, align: "right" }).setOrigin(1, 0).setScrollFactor(0).setDepth(1001);
    this.hud.manaB = this.add.graphics().setScrollFactor(0).setDepth(1001);
    this.hud.obj = this.add.text(centerX(this), 86, this.levelData.objective, { fontSize: "14px", color: "#ffffff", align: "center", stroke: "#1a1025", strokeThickness: 4, wordWrap: { width: this.scale.width - 24 } }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1001);
    this.hud.cat = this.add.text(14, 66, "🐱 te segue!", { fontSize: "11px", color: "#ffcce8", stroke: "#1a1025", strokeThickness: 3 }).setScrollFactor(0).setDepth(1001);
    this.updateHUD();
  }

  addBossBar(enemy) {
    this.bossBarBg = this.add.rectangle(centerX(this), 118, Math.min(this.scale.width - 40, 470), 18, 0x26152d, 0.86).setScrollFactor(0).setDepth(1002).setStrokeStyle(2, 0xffffff, 0.22);
    this.bossBar = this.add.rectangle(this.bossBarBg.x - this.bossBarBg.width / 2 + 2, 118, this.bossBarBg.width - 4, 12, 0xff6fb1, 1).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1003);
    this.bossLabel = this.add.text(centerX(this), 94, "Chefe: " + (enemy.getData("name") || ""), { fontSize: "14px", color: "#fff8fb", stroke: "#1a1025", strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(1003);
  }

  updateHUD() {
    if (!this.hud) return;
    const r = gameState.run;
    this.hud.hearts.setText("❤".repeat(Math.max(0, r.hp)) + "♡".repeat(Math.max(0, this.classCfg.maxHp - r.hp)));
    this.hud.info.setText(`${this.levelData.hudName} • ${this.classCfg.name}`);
    this.hud.score.setText(`⭐ ${r.score}`);
    this.hud.manaT.setText(`Mana ${Math.floor(r.mana)}/${this.classCfg.maxMana}`);
    const bW = Math.min(165, this.scale.width * 0.34), x2 = this.scale.width - 14 - bW, y2 = 68;
    const ratio = Phaser.Math.Clamp(r.mana / this.classCfg.maxMana, 0, 1);
    this.hud.manaB.clear();
    this.hud.manaB.fillStyle(0x1e2445, 0.95).fillRoundedRect(x2, y2, bW, 10, 5);
    this.hud.manaB.fillStyle(0x44d4ff, 1).fillRoundedRect(x2, y2, bW * ratio, 10, 5);
    this.hud.manaB.lineStyle(2, 0xffffff, 0.35).strokeRoundedRect(x2, y2, bW, 10, 5);
    if (this.boss && this.boss.active && this.bossBar) {
      this.bossBar.width = (this.bossBarBg.width - 4) * Phaser.Math.Clamp(this.boss.getData("hp") / this.boss.getData("maxHp"), 0, 1);
    }
  }

  update(time) {
    if (this.gameOver) return;
    const moving = this.movePlayer(time);
    if (consumeInput("attack") || Phaser.Input.Keyboard.JustDown(this.keys.attack)) this.doAttack(time);
    if (consumeInput("dash") || Phaser.Input.Keyboard.JustDown(this.keys.dash)) this.doDash(time);
    if (consumeInput("special") || Phaser.Input.Keyboard.JustDown(this.keys.special)) this.doSpecial(time);
    if (consumeInput("catAttack") || Phaser.Input.Keyboard.JustDown(this.keys.catAttack)) this.commandCatAttack();
    this.moveEnemies(time);
    this.tickProj();
    this.updateHUD();
    // Atualizar gato (segue o player ou vai atacar quando comandado)
    if (this.cat && this.cat.active) this.updateCat(time);
    // Aura segue o corpo (os emitters seguem sozinhos via follow)
    if (this.auraGlow) this.auraGlow.setPosition(this.player.x, this.player.y - 6);
    if (this.auraRing) this.auraRing.setPosition(this.player.x, this.player.y + 26);
    // Arma SEGURA NA MÃO: fica ao lado do corpo, espelha esquerda/direita,
    // não gira com o movimento. Só dá um "swing" ao atacar.
    if (this.weaponSprite) {
      const w = this.weaponSprite;
      const left = this.facing === "left";
      const side = left ? -1 : 1;
      const bob = Math.sin(time / 240) * 1.5;
      // mão: ao lado do tronco, um pouco à frente
      w.setPosition(this.player.x + side * 15, this.player.y + 4 + bob);
      w.setFlipX(left);
      // arma fica em pé na mão (leve inclinação); o tridente quase vertical
      const restRot = this.classCfg.weapon === "trident" ? side * 0.18 : side * 0.45;
      w.setRotation(restRot + this._weaponSwing * side);
      // quem olha pra cima fica atrás do corpo; senão na frente
      w.setDepth(this.facing === "up" ? 19 : 21);
      this._weaponSwing = Math.abs(this._weaponSwing) > 0.01 ? this._weaponSwing * 0.78 : 0;
    }
  }

  // Gato: segue o player; quando recebe ordem, corre até o alvo, golpeia e volta a seguir
  updateCat(time) {
    const cat = this.cat;
    const target = cat._commandedTarget;
    if (target && target.active) {
      cat.follow(target.x, target.y - 26, 22);  // corre direto até o inimigo (sem manter distância)
      if (Phaser.Math.Distance.Between(cat.x, cat.y, target.x, target.y) < 54) {
        this.catStrike(target, 1.4, 1.0);     // golpe comandado: dano forte
        cat._commandedTarget = null;            // missão cumprida → volta a seguir
      }
    } else {
      cat._commandedTarget = null;
      cat.follow(this.player.x, this.player.y);
      this.catAutoAttack(time);               // perto de inimigos, dá beliscões fracos sozinho
    }
  }

  // Ordem do botão/tecla: manda o gato no inimigo mais próximo do player
  commandCatAttack() {
    if (!this.cat || !this.cat.active) return;
    const now = this.time.now;
    // Cooldown: evita spam do ataque forte do gato
    if (now < this.cat._nextCommand) {
      const s = Math.ceil((this.cat._nextCommand - now) / 1000);
      this.showMsg(`🐱 Gatinho recarregando... (${s}s)`, 700);
      return;
    }
    if (this.cat._commandedTarget && this.cat._commandedTarget.active) {
      this.showMsg("🐱 Já estou indo!", 700); return;
    }
    let nearest = null, nd = 1e9;
    this.enemies.children.iterate(en => {
      if (!en || !en.active) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, en.x, en.y);
      if (d < nd) { nd = d; nearest = en; }
    });
    if (nearest) {
      const CD = 3500; // 3,5s de cooldown
      this.cat._nextCommand = now + CD;
      this.cat._commandedTarget = nearest;
      setCatButtonCooldown(CD);
      vibrate(12); SoundFX.tone(880, 0.05, "square", 0.02);
      this.showMsg("🐱 Vai, gatinho! Ataca!", 900);
    } else {
      this.showMsg("Nenhum inimigo por perto 🐱", 800);
    }
  }

  // Golpe do gato: animação de investida (lunge + giro) + patinha + dano
  catStrike(en, dmg, scale = 0.6) {
    if (!en || !en.active) return;
    const cat = this.cat;
    cat._attackPunch = 0.32 + scale * 0.2;
    // Investida na direção do inimigo + giro (animação de ataque)
    const ang = Phaser.Math.Angle.Between(cat.x, cat.y, en.x, en.y);
    const reach = 14 + scale * 10;
    cat._lungeX = Math.cos(ang) * reach;
    cat._lungeY = Math.sin(ang) * reach;
    cat._attackSpin = (en.x < cat.x ? -1 : 1) * (0.5 + scale * 0.5);
    cat.setFlipX(en.x < cat.x);
    // Patinha no inimigo + faíscas
    const claw = this.add.text(en.x, en.y - 12, "🐾", { fontSize: `${Math.round(15 + scale * 8)}px` }).setOrigin(0.5).setDepth(46);
    this.tweens.add({ targets: claw, y: claw.y - 16, alpha: 0, scale: 1.2 + scale, angle: Phaser.Math.Between(-30, 30), duration: 360, onComplete: () => claw.destroy() });
    for (let i = 0; i < Math.round(3 + scale * 4); i++) this.sparkle(en.x, en.y, 0xffd166, 24 + scale * 16);
    SoundFX.tone(720, 0.04, "square", 0.014);
    this.damageEnemy(en, dmg);
  }

  // Aura de energia (ativada SÓ pelo especial, dura 10 segundos)
  activateAura() {
    this.deactivateAura(); // limpa uma aura anterior, se houver
    const colors = { 1: 0xff6fb1, 2: 0x44d4ff, 3: 0x5ec44b, 4: 0xb06bff }; // rosa/azul/verde/roxo
    const color = colors[this.level] || 0xff6fb1;
    this.auraColor = color;
    const power = 1.0 + this.level * 0.12;
    const soft = this.textures.exists("aura_soft") ? "aura_soft" : "aura_particle";

    // Brilho oval grande e suave atrás do corpo
    this.auraGlow = this.add.ellipse(this.player.x, this.player.y - 6, 78 * power, 138 * power, color, 0.12)
      .setDepth(18).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.auraGlow, scaleX: 1.12, scaleY: 1.06, alpha: 0.22, yoyo: true, repeat: -1, duration: 520, ease: "Sine.easeInOut" });

    // Disco de energia girando na base (no chão), dá o "levantando poeira de ki"
    this.auraRing = this.add.ellipse(this.player.x, this.player.y + 26, 92 * power, 28 * power, color, 0)
      .setStrokeStyle(3, color, 0.75).setDepth(18).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.auraRing, scaleX: 1.22, scaleY: 1.1, alpha: 0.35, yoyo: true, repeat: -1, duration: 560, ease: "Sine.easeInOut" });

    // Coluna de energia: muitas partículas macias subindo (corpo da aura)
    this.auraEmitter = this.add.particles(0, 0, soft, {
      follow: this.player, followOffset: { x: 0, y: 18 },
      lifespan: 640, frequency: 9, quantity: 3,
      speedY: { min: -160, max: -75 }, speedX: { min: -30, max: 30 },
      scale: { start: 0.85 * power, end: 0 }, alpha: { start: 0.5, end: 0 },
      tint: [color, 0xffffff], blendMode: "ADD",
      emitZone: { type: "random", source: new Phaser.Geom.Ellipse(0, 0, 50, 44) }
    });
    this.auraEmitter.setDepth(19);

    // Núcleo branco-quente: partículas menores e mais rápidas no centro
    this.auraCoreEmitter = this.add.particles(0, 0, soft, {
      follow: this.player, followOffset: { x: 0, y: 14 },
      lifespan: 440, frequency: 16, quantity: 2,
      speedY: { min: -210, max: -120 }, speedX: { min: -14, max: 14 },
      scale: { start: 0.5 * power, end: 0 }, alpha: { start: 0.7, end: 0 },
      tint: 0xffffff, blendMode: "ADD",
      emitZone: { type: "random", source: new Phaser.Geom.Ellipse(0, 0, 24, 32) }
    });
    this.auraCoreEmitter.setDepth(20);

    this.aura = this.auraGlow;
    this._auraTimer = this.time.delayedCall(10000, () => this.deactivateAura());
  }

  // Desliga a aura e limpa todos os elementos/tweens dela
  deactivateAura() {
    if (this._auraTimer) { this._auraTimer.remove(); this._auraTimer = null; }
    [this.auraGlow, this.auraRing].forEach(o => { if (o) { this.tweens.killTweensOf(o); o.destroy(); } });
    if (this.auraEmitter) this.auraEmitter.destroy();
    if (this.auraCoreEmitter) this.auraCoreEmitter.destroy();
    this.auraGlow = null; this.auraRing = null; this.auraEmitter = null; this.auraCoreEmitter = null; this.aura = null;
  }

  // Gato ajudante: belisca sozinho o inimigo mais próximo, dano pequeno
  catAutoAttack(time) {
    if (time < this.cat._nextAttack) return;
    let nearest = null, nd = 1e9;
    this.enemies.children.iterate(en => {
      if (!en || !en.active) return;
      const d = Phaser.Math.Distance.Between(this.cat.x, this.cat.y, en.x, en.y);
      if (d < nd) { nd = d; nearest = en; }
    });
    if (nearest && nd < 100) {
      this.cat._nextAttack = time + 620;   // cooldown entre beliscões
      this.catStrike(nearest, 0.4, 0.5); // pouco HP, efeito pequeno
    }
  }

  movePlayer(time) {
    let x = 0, y = 0;
    if (this.keys.left.isDown || this.keys.left2.isDown) x -= 1;
    if (this.keys.right.isDown || this.keys.right2.isDown) x += 1;
    if (this.keys.up.isDown || this.keys.up2.isDown) y -= 1;
    if (this.keys.down.isDown || this.keys.down2.isDown) y += 1;
    if (Math.abs(inputState.joyX) > 0.12 || Math.abs(inputState.joyY) > 0.12) { x = inputState.joyX; y = inputState.joyY; }

    const len = Math.hypot(x, y), moving = len > 0.1;
    if (moving) { x /= len; y /= len; this.lastDir.set(x, y); }

    // Direção só é redefinida ao INICIAR o movimento (saindo do idle)
    // Enquanto em movimento contínuo, a direção fica travada — elimina troca
    // de sprite sheet durante o movimento e o salto visual resultante
    // Direção pelo eixo dominante. Esquerda = right espelhado (sem troca de textura esq/dir)
    if (moving) {
      const absX = Math.abs(x), absY = Math.abs(y);
      this.facing = absX > absY ? (x > 0 ? "right" : "left") : (y > 0 ? "down" : "up");
      this._wasMoving = true;
      const facingTex = this.facing === "left" ? "right" : this.facing;
      this.player.setFlipX(this.facing === "left");
      const ak = "player_walk_" + facingTex;
      if (this.anims.exists(ak)) {
        if (this.player.anims.currentAnim?.key !== ak) this.player.play(ak, true);
      } else this.player.rotation = Math.sin(time / 90) * 0.045;
    } else {
      this._wasMoving = false;
      const facingTex = this.facing === "left" ? "right" : this.facing;
      this.player.setFlipX(this.facing === "left");
      const ik = "player_idle_" + facingTex;
      if (this.anims.exists(ik)) {
        if (this.player.anims.currentAnim?.key !== ik) this.player.play(ik, true);
      } else this.player.rotation = 0;
    }

    // Animação de dash tem prioridade sobre walk
    if (time < this.dashingUntil) {
      const dk = "player_dash_" + this.facing;
      if (this.anims.exists(dk) && this.player.anims.currentAnim?.key !== dk) this.player.play(dk, true);
    }

    let spd = this.classCfg.speed;
    if (time < this.speedBoostUntil) spd += 70;
    if (time < this.dashingUntil) spd = this.classCfg.dashSpeed;
    this.player.setVelocity(x * spd, y * spd);

    if (time < this.dashingUntil && Math.floor(time / 55) !== this.lastTrailTick) {
      this.lastTrailTick = Math.floor(time / 55);
      const g = this.add.image(this.player.x, this.player.y, this.player.texture.key).setDepth(10).setAlpha(0.38).setTint(this.classCfg.trailColor);
      try { g.setFrame(this.player.anims.currentFrame?.frame?.name ?? 0); } catch (e) { }
      g.setScale(this.player.scaleX, this.player.scaleY);
      this.tweens.add({ targets: g, alpha: 0, scaleX: this.player.scaleX * 1.15, scaleY: this.player.scaleY * 1.15, duration: 190, onComplete: () => g.destroy() });
    }

    if (this.playerShadow) {
      this.playerShadow.setPosition(this.player.x, this.player.y + 24);
    }
    return moving;
  }

  doAttack(time) {
    if (time < this.nextAttackAt) return;
    this.nextAttackAt = time + (this.classCfg.attackCooldown || 330);
    vibrate(10); SoundFX.attack();
    const d = this.lastDir.clone(); if (d.lengthSq() < 0.1) d.set(0, 1); d.normalize();
    this._weaponSwing = 0.8; // kick visual na arma equipada

    const w = this.classCfg.weapon;
    if (w === "clipboard") this.fireClipboard(d);
    else if (w === "trident") this.fireTrident(d);
    else this.fireCarrotSlash(d);

    // flashzinho na personagem
    this.player.setTint(0xffffff);
    this.time.delayedCall(80, () => { if (this.player?.active) this.player.clearTint(); });
  }

  // Empurrãozinho no inimigo ao ser golpeado (chefes não são empurrados)
  knockback(en, d, px = 14) {
    if (!en || !en.active || en.getData("boss")) return;
    en.setPosition(Phaser.Math.Clamp(en.x + d.x * px, 20, this.worldW - 20),
      Phaser.Math.Clamp(en.y + d.y * px, 20, this.worldH - 20));
  }

  // Guerreira: golpe de ESPADA de cenoura (corpo a corpo, arco de corte)
  fireCarrotSlash(d) {
    this.attackId += 1; const aid = this.attackId;
    const px = this.player.x + d.x * 44, py = this.player.y + d.y * 44 - 4;
    const zone = this.add.zone(px, py, 90, 76); this.physics.add.existing(zone);
    zone.body.setAllowGravity(false).setSize(90, 76);
    // arco de corte que abre na direção do golpe
    const slash = this.add.image(px, py, "slash_arc").setDepth(32).setRotation(d.angle()).setScale(0.5).setTint(0xffd9a0);
    this.tweens.add({ targets: slash, scale: 1.6, alpha: 0, duration: 200, ease: "Sine.easeOut", onComplete: () => slash.destroy() });
    this._weaponSwing = 2.1; // giro grande da espada equipada
    for (let i = 0; i < 6; i++) this.sparkle(px, py, 0xffb86b, 42);
    SoundFX.tone(300, 0.06, "sawtooth", 0.022);
    this.physics.add.overlap(zone, this.enemies, (z, en) => {
      if (!en.active || en.getData("lastAid") === aid) return;
      en.setData("lastAid", aid);
      this.damageEnemy(en, this.classCfg.attackDamage);
      this.knockback(en, d, 16);
    });
    this.time.delayedCall(140, () => zone.destroy());
  }

  // Estrategista: prancheta bumerangue — gira, atravessa e volta pra mão
  fireClipboard(d) {
    const cb = this.playerProj.create(this.player.x, this.player.y - 6, "proj_clipboard");
    if (!cb) return;
    cb.setData("dmg", this.classCfg.attackDamage).setData("born", this.time.now).setData("kind", "boomerang").setData("phase", "out");
    cb.setDepth(28).setScale(1.3);
    cb.body.setSize(24, 28);
    cb.setVelocity(d.x * 540, d.y * 540);
    SoundFX.tone(430, 0.06, "triangle", 0.02);
  }

  // Sereia: tridente dispara rajada de 3 jatos d'água em sequência
  fireTrident(d) {
    const base = d.angle();
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 85, () => {
        if (this.gameOver || !this.player?.active) return;
        const a = base + (Math.random() - 0.5) * 0.16;
        const shot = this.playerProj.create(this.player.x + Math.cos(a) * 24, this.player.y + Math.sin(a) * 24 - 6, "proj_water");
        if (!shot) return;
        shot.setData("dmg", this.classCfg.attackDamage).setData("born", this.time.now).setData("kind", "straight");
        shot.setDepth(28).setScale(1.5).setRotation(a);
        shot.body.setSize(16, 10);
        shot.setVelocity(Math.cos(a) * 700, Math.sin(a) * 700);
        SoundFX.tone(700 + i * 70, 0.04, "sine", 0.016);
      });
    }
  }

  doDash(time) {
    if (time < this.nextDashAt) { this.showMsg("Dash recarregando...", 900); return; }
    this.nextDashAt = time + 900; this.dashingUntil = time + 190;
    this.invulnerableUntil = Math.max(this.invulnerableUntil, time + 240);
    vibrate(12); SoundFX.tone(360, 0.06, "square", 0.025);
    this.showMsg("💨 Dash de praia!", 850);
    // Tremor no gato também (fofo)
    if (this.cat) this.tweens.add({ targets: this.cat, x: this.cat.x + 6, duration: 40, yoyo: true, repeat: 2 });
  }

  doSpecial(time) {
    const r = gameState.run;
    if (r.mana < this.classCfg.maxMana) { this.showMsg("Mana não encheu ainda! 🍌", 1000); return; }
    r.mana = 0; vibrate(26); SoundFX.special(); this.cameras.main.shake(220, 0.008);
    this.activateAura(); // aura DBZ liga aqui e dura 10s
    const s = this.classCfg.specialStyle;
    if (s === "marmita") this.specialMarmita();
    else if (s === "agua") this.specialAgua();
    else this.specialCarrot();
  }

  // Cria um leque/nova de projéteis em volta da personagem
  burstProjectiles(texKey, count, speed, dmg, kind = "straight") {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      const shot = this.playerProj.create(this.player.x, this.player.y, texKey);
      if (!shot) continue;
      shot.setData("dmg", dmg).setData("born", this.time.now).setData("kind", kind);
      shot.setDepth(28).setScale(1.4).setRotation(a);
      shot.body.setSize(20, 14);
      shot.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
    }
  }

  specialCarrot() {
    this.showMsg("🥕 FÚRIA DA CENOURA!", 1300);
    this.attackId += 1; const aid = this.attackId;
    // Giro de espada: dano em área grande em volta da personagem
    const zone = this.add.zone(this.player.x, this.player.y, 280, 280); this.physics.add.existing(zone);
    zone.body.setAllowGravity(false).setCircle(140);
    // arcos de corte girando em volta (360°)
    for (let k = 0; k < 7; k++) {
      const a = (Math.PI * 2 * k) / 7;
      const slash = this.add.image(this.player.x + Math.cos(a) * 60, this.player.y + Math.sin(a) * 60, "slash_arc").setDepth(32).setRotation(a).setScale(0.7).setTint(0xffb86b);
      this.tweens.add({ targets: slash, scale: 1.9, alpha: 0, rotation: a + 1.4, duration: 440, delay: k * 35, onComplete: () => slash.destroy() });
    }
    const ring = this.add.circle(this.player.x, this.player.y, 40, 0xff8a3d, 0.45).setDepth(31).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, scale: 6.5, alpha: 0, duration: 520, onComplete: () => ring.destroy() });
    for (let i = 0; i < 38; i++) this.sparkle(this.player.x, this.player.y, 0xffb86b, 160);
    this.physics.add.overlap(zone, this.enemies, (z, en) => { if (!en.active || en.getData("lastAid") === aid) return; en.setData("lastAid", aid); this.damageEnemy(en, this.classCfg.specialDamage); });
    this.time.delayedCall(220, () => zone.destroy());
    this.cameras.main.flash(180, 255, 180, 90);
  }

  specialMarmita() {
    this.showMsg("📋 PLANO NUTRICIONAL TOTAL!", 1400);
    this.burstProjectiles("proj_clipboard", 12, 440, this.classCfg.specialDamage);
    const b = this.add.circle(this.player.x, this.player.y, 46, 0x4fe39a, 0.45).setDepth(31).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: b, scale: 4.5, alpha: 0, duration: 540, onComplete: () => b.destroy() });
    for (let i = 0; i < 30; i++) this.sparkle(this.player.x, this.player.y, 0xbfffe0, 160);
    spawnFx(this, this.player.x, this.player.y, "anim_fx_heart", 1.6, 52);
    this.cameras.main.flash(180, 120, 255, 180);
  }

  specialAgua() {
    this.showMsg("🌊 MARÉ DE FLORIPA!", 1400);
    const radius = 205;
    for (let k = 0; k < 3; k++) {
      const ring = this.add.circle(this.player.x, this.player.y, 30, 0x44d4ff, 0.4).setDepth(31).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: ring, scale: radius / 30, alpha: 0, duration: 620, delay: k * 120, ease: "Sine.easeOut", onComplete: () => ring.destroy() });
    }
    for (let i = 0; i < 40; i++) this.sparkle(this.player.x, this.player.y, 0x9fe8ff, radius);
    spawnFx(this, this.player.x, this.player.y, "anim_fx_sparkle", 1.6, 52);
    this.enemies.children.iterate(en => { if (!en || !en.active) return; if (Phaser.Math.Distance.Between(this.player.x, this.player.y, en.x, en.y) <= radius) this.damageEnemy(en, this.classCfg.specialDamage); });
    gameState.run.hp = Math.min(this.classCfg.maxHp, gameState.run.hp + 1); // sereia se cura um pouco
    this.cameras.main.flash(180, 120, 220, 255);
  }

  moveEnemies(time) {
    this.enemies.children.iterate(en => {
      if (!en || !en.active) return;
      const dx = this.player.x - en.x, dy = this.player.y - en.y, len = Math.hypot(dx, dy) || 1;
      let spd = en.getData("speed");
      if (en.getData("boss") && en.getData("hp") < en.getData("maxHp") * 0.45) spd += 30;
      en.setVelocity((dx / len) * spd, (dy / len) * spd);
      en.setFlipX(dx < 0);
      en.rotation = Math.sin(time / 170 + en.x) * 0.06;
      // shadow
      const sh = en.getData("shadow");
      if (sh && sh.active) sh.setPosition(en.x, en.y + en.displayHeight * 0.42);
      if (en.getData("boss") && time > en.getData("nextShoot")) {
        en.setData("nextShoot", time + Phaser.Math.Between(1050, 1450));
        this.bossShoot(en);
      }
    });
  }

  bossShoot(en) {
    if (!en.active) return;
    const dx = this.player.x - en.x, dy = this.player.y - en.y, len = Math.hypot(dx, dy) || 1;
    const s = this.enemyProj.create(en.x, en.y, "heartProjectile");
    s.setData("dmg", 1).setData("born", this.time.now).setDepth(22);
    s.body.setCircle(10, 2, 2); s.setVelocity((dx / len) * 235, (dy / len) * 235); s.rotation = Math.atan2(dy, dx);
    SoundFX.tone(190, 0.07, "sawtooth", 0.02);
  }

  tickProj() {
    const now = this.time.now;
    this.enemyProj.children.iterate(s => { if (s && s.active && now - s.getData("born") > 4200) s.destroy(); });
    this.playerProj.children.iterate(s => {
      if (!s || !s.active) return;
      const kind = s.getData("kind"), age = now - s.getData("born");
      if (kind === "boomerang") {
        s.rotation += 0.45; // gira como bumerangue
        if (s.getData("phase") === "out" && age > 360) s.setData("phase", "back");
        if (s.getData("phase") === "back") {
          const dx = this.player.x - s.x, dy = this.player.y - s.y, len = Math.hypot(dx, dy) || 1;
          s.setVelocity(dx / len * 680, dy / len * 680);
          if (len < 34) { s.destroy(); return; }   // voltou pra mão
        }
        if (age > 2600) s.destroy();              // segurança
      } else {
        // projéteis retos: rotação fixa pela direção; vida curta
        if (age > 1100) s.destroy();
      }
    });
  }

  onPlayerProjHit(shot, en) {
    if (!shot.active || !en.active) return;
    spawnFx(this, en.x, en.y - 10, "anim_fx_impact", 0.5, 35);
    if (shot.getData("kind") === "boomerang") {
      // Atravessa: aplica dano com cooldown por inimigo (evita dano por frame)
      const last = en.getData("lastBoomHit") || 0;
      if (this.time.now - last < 280) return;
      en.setData("lastBoomHit", this.time.now);
      this.damageEnemy(en, shot.getData("dmg") || 2);
    } else {
      this.damageEnemy(en, shot.getData("dmg") || 3);
      shot.destroy();
    }
  }
  onEnemyTouch(p, en) { if (!en.active) return; this.hurtPlayer(en.getData("damage") || 1, `${en.getData("name")} encostou!`); }
  onEnemyProjHit(p, s) { if (!s.active) return; s.destroy(); this.hurtPlayer(1, "💔 Coração quebrado acertou!"); }

  hurtPlayer(amount, msg) {
    const now = this.time.now; if (now < this.invulnerableUntil) return;
    this.invulnerableUntil = now + 900;
    gameState.run.hp = Math.max(0, gameState.run.hp - amount);
    vibrate(40); SoundFX.hit(); this.cameras.main.shake(160, 0.01);
    this.player.setTint(0xff6b6b);
    this.time.delayedCall(130, () => { if (this.player?.active) this.player.clearTint(); });
    this.showMsg(msg, 900); this.updateHUD();
    if (gameState.run.hp <= 0) this.showDefeat();
  }

  damageEnemy(en, amount) {
    const hp = en.getData("hp") - amount; en.setData("hp", hp);
    en.setTint(0xff6b6b);
    if (en.getData("boss")) {
      // Chefe NÃO fica transparente — só pisca vermelho
      this.time.delayedCall(90, () => { if (en.active) en.clearTint(); });
    } else {
      this.tweens.add({ targets: en, alpha: 0.4, duration: 70, yoyo: true, repeat: 1, onComplete: () => { if (en.active) { en.clearTint(); en.setAlpha(1); } } });
    }
    this.dmgNum(en.x, en.y - 30, `-${amount.toFixed(amount % 1 ? 1 : 0)}`);
    spawnFx(this, en.x, en.y - 10, "anim_fx_impact", 0.5, 35);
    SoundFX.tone(620, 0.04, "square", 0.018);
    if (hp <= 0) this.killEnemy(en);
  }

  killEnemy(en) {
    if (!en.active) return;
    const name = en.getData("name"), boss = en.getData("boss");
    gameState.run.score += en.getData("score") || 50;
    gameState.run.mana = Math.min(this.classCfg.maxMana, gameState.run.mana + (boss ? 40 : 18));
    this.enemyKills += 1;
    this.showMsg(boss ? (this.level === 4 ? LEVELS[4].nextMessage : "💥 Chefe derrotado!") : `${name} derrotado! 🎉`, 1300);
    const sh = en.getData("shadow"); if (sh?.active) sh.destroy();
    for (let i = 0; i < (boss ? 36 : 10); i++) this.sparkle(en.x, en.y, boss ? 0xff6fb1 : this.classCfg.attackColor, boss ? 150 : 60);
    if (boss) { spawnFx(this, en.x, en.y, "anim_fx_heart", 1.4, 52); this.heartExplosion(en.x, en.y); this.clearBossBar(); this.boss = null; }
    else { spawnFx(this, en.x, en.y, "anim_fx_explode", 0.75, 48); }
    if (!boss && Phaser.Math.Between(0, 100) > 40) this.addCol(["morango", "banana", "marmita", "coco"][Phaser.Math.Between(0, 3)], en.x, en.y);
    en.destroy();
    this.checkProgress(boss);
  }

  // Remove a barra de vida do chefe da tela
  clearBossBar() {
    [this.bossBar, this.bossBarBg, this.bossLabel].forEach(o => { if (o && o.active) o.destroy(); });
    this.bossBar = this.bossBarBg = this.bossLabel = null;
  }

  // Decide quando liberar o portal — fases com ondas só liberam após limpar tudo
  checkProgress(boss) {
    if (this.useWaves) {
      if (this.enemies.countActive(true) > 0) return;   // ainda há inimigos vivos
      this.waveIndex++;
      if (this.waveIndex < this.totalWaves) {
        const spawn = this._waveSpawner || ((i) => this.spawnWaveLvl1(i));
        this.time.delayedCall(900, () => spawn(this.waveIndex));
      } else {
        this.showMsg("✨ Todas as ondas derrotadas!", 1600);
        this.spawnPortal(this._portalPos[0], this._portalPos[1]);
      }
      return;
    }
    if (this.level === 4 && boss) this.spawnPortal(640, 420);
  }

  onCollect(p, item) {
    if (!item.active) return;
    const t = item.getData("type"); const ix = item.x, iy = item.y; item.destroy();
    spawnFx(this, ix, iy, "anim_fx_sparkle", 0.8, 45);
    SoundFX.collect(); vibrate(8);
    if (t === "morango") { gameState.run.hp = Math.min(this.classCfg.maxHp, gameState.run.hp + 1); this.showMsg("🍓 +1 Vida!", 1100); }
    if (t === "banana") { gameState.run.mana = Math.min(this.classCfg.maxMana, gameState.run.mana + 35); this.showMsg("🍌 +35 Mana!", 1300); }
    if (t === "marmita") { gameState.run.score += 130; gameState.run.mana = Math.min(this.classCfg.maxMana, gameState.run.mana + 12); this.showMsg("🥗 Marmita fit!", 1200); }
    if (t === "coco") { this.speedBoostUntil = this.time.now + 5200; gameState.run.score += 60; this.showMsg("🥥 Velocidade tropical!", 1200); }
    if (t === "heart") { gameState.run.hp = Math.min(this.classCfg.maxHp, gameState.run.hp + 2); this.showMsg("💖 +2 Vida!", 1300); }
    this.updateHUD();
  }

  onRequiredCollect(p, item) {
    if (!item.active) return;
    const key = item.getData("key"), label = item.getData("label");
    const rx = item.x, ry = item.y;
    this.collectedRequired.add(key); item.destroy();
    spawnFx(this, rx, ry, "anim_fx_sparkle", 1.0, 45);
    gameState.run.score += 120; gameState.run.mana = Math.min(this.classCfg.maxMana, gameState.run.mana + 12);
    SoundFX.collect(); vibrate(10);
    this.showMsg(`✅ ${label} coletado!`, 1000);
    if (this.collectedRequired.size >= this.requiredItems.size) {
      if (this.level === 1) this.spawnPortal(1160, 735);
      if (this.level === 3) { this.showMsg("🌟 Marmita lendária criada!", 1700); this.time.delayedCall(600, () => this.spawnPortal(1160, 120)); }
    }
    this.updateHUD();
  }

  spawnPortal(x, y) {
    if (this.portalSpawned) return; this.portalSpawned = true;
    const portal = this.portals.create(x, y, "portal"); portal.setDepth(15);
    portal.body.setCircle(24, 5, 10);
    this.tweens.add({ targets: portal, angle: 360, repeat: -1, duration: 1800, ease: "Linear" });
    this.tweens.add({ targets: portal, scale: 1.18, yoyo: true, repeat: -1, duration: 720 });
    for (let i = 0; i < 20; i++) this.sparkle(x, y, 0x6be9ff, 95);
    SoundFX.portal(); this.showMsg(this.levelData.nextMessage, 1800);
  }

  onPortalEnter(p, portal) {
    if (!this.portalSpawned || this.transitioning) return;
    this.transitioning = true;
    this.player.setVelocity(0, 0);
    vibrate(20); SoundFX.portal();
    const nextLevel = this.level + 1;
    const isLast = this.level >= 4;
    // Método canônico do Phaser: fade de câmera + evento de conclusão.
    // scene.start é chamado FORA do ciclo de tween → sem travamento nem tela preta.
    this.cameras.main.fadeOut(450, 5, 3, 11);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      if (isLast) this.scene.start("FinalScene");
      else this.scene.start("GameScene", { level: nextLevel });
    });
  }

  showDefeat() {
    this.gameOver = true; setMobileControlsVisible(false);
    this.player.setVelocity(0, 0);
    if (this.anims.exists("player_death_down")) {
      this.player.play("player_death_down", true);
      this.time.delayedCall(680, () => { if (this.physics?.world) this.physics.pause(); });
    } else { this.physics.pause(); }
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x05030b, 0.78).setOrigin(0).setScrollFactor(0).setDepth(2000);
    addPixelText(this, centerX(this), centerY(this) - 90, "Fim da missão...", 28, "#ff9dcc").setScrollFactor(0).setDepth(2001);
    addPixelText(this, centerX(this), centerY(this) - 25, "A saudade bateu, mas nutri de verdade tenta de novo! 💪", 17, "#ffffff").setScrollFactor(0).setDepth(2001);
    const b = addMenuButton(this, centerX(this), centerY(this) + 65, "🔄 Reiniciar", () => { gameState.run = null; this.scene.start("GameScene", { level: 1, fresh: true }); }, 240, 58, 0xff6fb1).setScrollFactor(0).setDepth(2001);
    b.each?.(c => c.setScrollFactor && c.setScrollFactor(0));
  }

  transition(cb) {
    const c = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x05030b, 0).setOrigin(0).setScrollFactor(0).setDepth(3000);
    this.tweens.add({ targets: c, alpha: 1, duration: 520, onComplete: cb });
  }

  fadeIn() {
    this.cameras.main.fadeIn(450, 5, 3, 11);
  }

  dmgNum(x, y, txt) {
    const t = this.add.text(x, y, txt, { fontSize: "17px", color: "#fff8fb", stroke: "#27142d", strokeThickness: 4, fontStyle: "900" }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 640, onComplete: () => t.destroy() });
  }

  sparkle(x, y, color, radius = 60) {
    const ang = Phaser.Math.FloatBetween(0, Math.PI * 2), dist = Phaser.Math.FloatBetween(8, radius);
    const dot = this.add.circle(x, y, Phaser.Math.Between(2, 5), color, Phaser.Math.FloatBetween(0.45, 0.95)).setDepth(40);
    this.tweens.add({ targets: dot, x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist, alpha: 0, scale: 0.2, duration: Phaser.Math.Between(420, 860), ease: "Sine.easeOut", onComplete: () => dot.destroy() });
  }

  heartExplosion(x, y) {
    for (let i = 0; i < 30; i++) {
      const sym = ["❤", "🐱", "✨", "💖", "🌟"][i % 5];
      const h = this.add.text(x, y, sym, { fontSize: `${Phaser.Math.Between(16, 30)}px`, color: ["#ff6fb1", "#fff8fb", "#ffb6df"][i % 3] }).setOrigin(0.5).setDepth(55);
      const ang = Phaser.Math.FloatBetween(0, Math.PI * 2), dist = Phaser.Math.Between(60, 200);
      this.tweens.add({ targets: h, x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist, alpha: 0, rotation: Phaser.Math.FloatBetween(-1.4, 1.4), duration: Phaser.Math.Between(900, 1500), onComplete: () => h.destroy() });
    }
  }

  showMsg(text, dur = 1300) {
    if (this.msgText) this.msgText.destroy();
    this.msgText = this.add.text(centerX(this), this.scale.height - 118, text, { fontFamily: "Verdana,system-ui,sans-serif", fontSize: "15px", color: "#ffffff", align: "center", stroke: "#111128", strokeThickness: 4, wordWrap: { width: Math.min(this.scale.width - 30, 600) } }).setOrigin(0.5).setScrollFactor(0).setDepth(1200).setAlpha(0);
    this.tweens.add({ targets: this.msgText, alpha: 1, y: this.msgText.y - 8, duration: 120, yoyo: true, hold: dur, onComplete: () => { if (this.msgText) this.msgText.destroy(); } });
  }
}

// =========================================================
// CENA FINAL
// =========================================================
class FinalScene extends Phaser.Scene {
  constructor() { super("FinalScene"); }

  create() {
    setMobileControlsVisible(true);
    this.cameras.main.resetFX();
    buildAllTextures(this); buildPlayerAnims(this); buildCatAnims(this); buildFxAnims(this);
    this.worldW = 820; this.worldH = 620;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);

    const g = this.add.graphics();
    g.fillGradientStyle(0x05050d, 0x080817, 0x17122a, 0x080817, 1); g.fillRect(0, 0, this.worldW, this.worldH);
    for (let i = 0; i < 60; i++) { g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.1, 0.7)); g.fillCircle(Phaser.Math.Between(0, this.worldW), Phaser.Math.Between(0, this.worldH), Phaser.Math.Between(1, 3)); }

    const ptex = this.textures.exists("fa_walk_down") ? "fa_walk_down" : "player";
    this.player = this.physics.add.sprite(140, 500, ptex).setDepth(10).setScale(3);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(12, 14).setOffset(17, 30);
    if (this.anims.exists("player_idle_down")) this.player.play("player_idle_down");

    this.chest = this.physics.add.staticSprite(410, 285, "chest").setDepth(9);
    this.light = this.add.circle(this.chest.x, this.chest.y, 96, 0xffe066, 0.12).setDepth(1);
    this.tweens.add({ targets: this.light, scale: 1.4, alpha: 0.24, duration: 900, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.chest, y: this.chest.y - 6, duration: 860, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.cat = spawnCatPet(this, this.player);
    this.facing = "down";

    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(this.scale.width < 700 ? 1.18 : 1.35);

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D,
      up2: Phaser.Input.Keyboard.KeyCodes.UP, down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left2: Phaser.Input.Keyboard.KeyCodes.LEFT, right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      open: Phaser.Input.Keyboard.KeyCodes.E, attack: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    this.prompt = this.add.text(centerX(this), this.scale.height - 118, "", { fontFamily: "Verdana,system-ui,sans-serif", fontSize: "18px", color: "#fff8fb", align: "center", stroke: "#111128", strokeThickness: 5 }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.add.text(centerX(this), 32, "🎁 Sala do Baú Secreto", { fontSize: "22px", color: "#fff8fb", stroke: "#111128", strokeThickness: 5 }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.opened = false; this.fadeIn();
  }

  update() {
    if (this.opened) return;
    let x = 0, y = 0;
    if (this.keys.left.isDown || this.keys.left2.isDown) x -= 1;
    if (this.keys.right.isDown || this.keys.right2.isDown) x += 1;
    if (this.keys.up.isDown || this.keys.up2.isDown) y -= 1;
    if (this.keys.down.isDown || this.keys.down2.isDown) y += 1;
    if (Math.abs(inputState.joyX) > 0.12 || Math.abs(inputState.joyY) > 0.12) { x = inputState.joyX; y = inputState.joyY; }
    const len = Math.hypot(x, y), moving = len > 0.1;
    if (moving) { x /= len; y /= len; const ang = Math.atan2(y, x) * 180 / Math.PI; if (ang > -135 && ang < -45) this.facing = "up"; else if (ang >= -45 && ang <= 45) this.facing = "right"; else if (ang > 45 && ang < 135) this.facing = "down"; else this.facing = "left"; const wk = "player_walk_" + this.facing; if (this.anims.exists(wk) && this.player.anims.currentAnim?.key !== wk) this.player.play(wk, true); }
    else { const ik = "player_idle_" + this.facing; if (this.anims.exists(ik) && this.player.anims.currentAnim?.key !== ik) this.player.play(ik, true); }
    this.player.setVelocity(x * 205, y * 205);
    if (moving && !this.anims.exists("player_walk_left")) this.player.setFlipX(x < -0.1);
    if (this.cat?.active) this.cat.follow(this.player.x, this.player.y);

    const near = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.chest.x, this.chest.y) < 82;
    this.prompt.setText(near ? "Pressione ABRIR\n(E, Espaço ou botão Atacar)" : "Chegue perto do baú brilhante... 🐱");
    if (near && (consumeInput("attack") || Phaser.Input.Keyboard.JustDown(this.keys.open) || Phaser.Input.Keyboard.JustDown(this.keys.attack))) this.openChest();
  }

  openChest() {
    this.opened = true; setMobileControlsVisible(false);
    localStorage.setItem("missaoFloripaZerou", "sim"); vibrate(45); SoundFX.portal();
    this.player.setVelocity(0, 0); this.chest.setTint(0xfff4a8);
    this.cameras.main.flash(320, 255, 230, 120);
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x03020a, 0.88).setOrigin(0).setScrollFactor(0).setDepth(2000);
    for (let i = 0; i < 40; i++) {
      const h = this.add.text(Phaser.Math.Between(15, this.scale.width - 15), Phaser.Math.Between(-220, -10), ["❤", "🐱", "✨", "💖", "🌟"][i % 5], { fontSize: `${Phaser.Math.Between(18, 34)}px`, color: ["#ff6fb1", "#ffb6df", "#fff8fb"][i % 3] }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
      this.tweens.add({ targets: h, y: this.scale.height + Phaser.Math.Between(30, 230), rotation: Phaser.Math.FloatBetween(-1.2, 1.2), alpha: Phaser.Math.FloatBetween(0.45, 0.95), duration: Phaser.Math.Between(2600, 5200), repeat: -1, delay: Phaser.Math.Between(0, 1200) });
    }
    const cW = Math.min(this.scale.width - 30, 620), cH = Math.min(this.scale.height - 76, 470);
    this.add.rectangle(centerX(this), centerY(this), cW, cH, 0xfff8fb, 0.97).setScrollFactor(0).setDepth(2002).setStrokeStyle(4, 0xff6fb1, 1);
    this.add.text(centerX(this), centerY(this) - cH / 2 + 48, "Cartinha do Baú 💖", { fontFamily: "Verdana,system-ui,sans-serif", fontSize: "24px", color: "#e94992", fontStyle: "900", align: "center" }).setOrigin(0.5).setScrollFactor(0).setDepth(2003);
    this.add.text(centerX(this), centerY(this) - 25, TEXTO_CARTA_FINAL, { fontFamily: "Verdana,system-ui,sans-serif", fontSize: this.scale.width < 420 ? "15px" : "18px", color: "#25172d", align: "center", lineSpacing: 7, wordWrap: { width: cW - 44 } }).setOrigin(0.5).setScrollFactor(0).setDepth(2003);
    const btn = addMenuButton(this, centerX(this), centerY(this) + cH / 2 - 58, "🎁 ABRIR SURPRESA", () => { if (!LINK_DA_SURPRESA || LINK_DA_SURPRESA === "COLOCAR_LINK_AQUI") { alert("Troque o LINK_DA_SURPRESA no topo do game.js 💖"); return; } window.open(LINK_DA_SURPRESA, "_blank"); }, Math.min(320, cW - 52), 58, 0xff6fb1).setScrollFactor(0).setDepth(2004);
    btn.each?.(c => c.setScrollFactor && c.setScrollFactor(0));
  }

  fadeIn() {
    this.cameras.main.fadeIn(450, 5, 3, 11);
  }
}

// =========================================================
// PHASER CONFIG
// =========================================================
const phaserConfig = {
  type: Phaser.AUTO, parent: "game", backgroundColor: "#151329",
  pixelArt: true, roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: window.innerWidth, height: window.innerHeight },
  physics: { default: "arcade", arcade: { gravity: { y: 0 }, debug: false } },
  scene: [PreloaderScene, MenuScene, HowToScene, ClassSelectScene, GameScene, FinalScene]
};

window.addEventListener("load", () => { window.game = new Phaser.Game(phaserConfig); });
