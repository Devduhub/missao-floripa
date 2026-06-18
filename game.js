/*
  Missão Floripa: A Nutri Aventureira — v3.0
  Sprites pixel art bonitos, gato pet funcional, assets reais integrados.
*/

const LINK_DA_SURPRESA = "COLOCAR_LINK_AQUI";
const TEXTO_CARTA_FINAL = `Você completou a missão Floripa...\npassou pelas tentações, derrotou a saudade\ne encontrou o baú secreto.\n\nMas a verdadeira surpresa ainda está aqui.\n\nClique no botão abaixo para abrir sua próxima missão comigo.`;
const GAME_TITLE = "Missão Floripa:\nA Nutri Aventureira";

const CLASS_CONFIGS = {
  guerreira: { name:"Nutri Guerreira", short:"Guerreira", joke:"Espada de cenoura equipada. Coxinha nenhuma passa.", attackColor:0xff8a3d, trailColor:0xffb86b, speed:205, dashSpeed:560, maxHp:6, maxMana:100, attackDamage:2, specialDamage:4, specialStyle:"cenoura" },
  marmita:   { name:"Maga da Marmita", short:"Marmita",   joke:"Quem tem marmita brilhante não teme tentação.",  attackColor:0xffe066, trailColor:0xfff4a8, speed:190, dashSpeed:520, maxHp:5, maxMana:140, attackDamage:1.7, specialDamage:5.2, specialStyle:"marmita" },
  rainha:    { name:"Rainha de Floripa", short:"Floripa", joke:"Dash de praia, brilho no cabelo e coração crítico.", attackColor:0xff6fb1, trailColor:0x44d4ff, speed:218, dashSpeed:650, maxHp:5, maxMana:105, attackDamage:1.8, specialDamage:4.3, specialStyle:"coracao" }
};

const LEVELS = {
  1:{ name:"Fase 1 — Arrumando as malas",    hudName:"Fase 1", theme:"room",   message:"Partiu Floripa, mas antes precisa sobreviver à bagunça!", objective:"Colete mala, protetor solar e passagem.", nextMessage:"Aviãozinho liberado! Floripa chamou." },
  2:{ name:"Fase 2 — Cheguei em Floripa",    hudName:"Fase 2", theme:"beach",  message:"Cuidado: saudade nível hard detectada!",                  objective:"Derrote os bolinhos e atravesse a praia.",  nextMessage:"Praia dominada com estilo nutricional." },
  3:{ name:"Fase 3 — A Nutri contra as tentações", hudName:"Fase 3", theme:"market", message:"Monte a marmita lendária e vença as tentações.",    objective:"Colete arroz, frango, salada, legumes e água.", nextMessage:"Marmita lendária criada com sucesso!" },
  4:{ name:"Fase 4 — Portal da Surpresa",    hudName:"Fase 4", theme:"night",  message:"O Monstro da Saudade apareceu. Agora é pessoal.",          objective:"Derrote o boss Pizza da Saudade.",      nextMessage:"Saudade tentou, mas perdeu." }
};

const gameState = { selectedClassKey:"guerreira", run:null };
const inputState = { joyX:0, joyY:0, attack:false, attackPressed:false, dash:false, dashPressed:false, special:false, specialPressed:false, open:false, openPressed:false };

function consumeInput(action) {
  const key = `${action}Pressed`;
  if (inputState[key]) { inputState[key]=false; return true; }
  return false;
}

function setMobileControlsVisible(v) {
  const el = document.getElementById("mobile-controls");
  if (el) el.classList.toggle("hidden", !v);
}

function vibrate(ms=18) { if(navigator.vibrate) navigator.vibrate(ms); }

const SoundFX = {
  ctx:null, unlocked:false,
  unlock() {
    if(this.unlocked) return;
    try { const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return; this.ctx=this.ctx||new AC(); if(this.ctx.state==="suspended")this.ctx.resume(); this.unlocked=true; } catch(e){}
  },
  tone(freq=440,dur=0.08,type="sine",gain=0.035) {
    try { this.unlock(); if(!this.ctx)return; const o=this.ctx.createOscillator(),a=this.ctx.createGain(); o.type=type; o.frequency.value=freq; a.gain.value=gain; o.connect(a); a.connect(this.ctx.destination); o.start(); a.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+dur); o.stop(this.ctx.currentTime+dur+0.02); } catch(e){}
  },
  attack() { this.tone(520,0.055,"square",0.025); },
  hit()    { this.tone(130,0.09,"sawtooth",0.03); },
  collect(){ this.tone(820,0.07,"triangle",0.035); },
  special(){ this.tone(220,0.15,"sine",0.04); setTimeout(()=>this.tone(780,0.18,"triangle",0.035),70); },
  portal() { this.tone(660,0.12,"sine",0.035); setTimeout(()=>this.tone(990,0.12,"sine",0.03),100); }
};

// =========================================================
// CONTROLES MOBILE
// =========================================================
window.addEventListener("DOMContentLoaded", ()=>{
  const joy=document.getElementById("joystick"), knob=document.getElementById("joystick-knob");
  const btnA=document.getElementById("btn-attack"), btnD=document.getElementById("btn-dash"), btnS=document.getElementById("btn-special");

  const resetJoy=()=>{ inputState.joyX=0; inputState.joyY=0; if(knob) knob.style.transform="translate(-50%,-50%)"; };
  const updateJoy=(e)=>{
    if(!joy||!knob)return;
    const r=joy.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
    let dx=e.clientX-cx, dy=e.clientY-cy, max=r.width*0.33, dist=Math.hypot(dx,dy);
    if(dist>max){dx=(dx/dist)*max; dy=(dy/dist)*max;}
    inputState.joyX=Phaser.Math.Clamp(dx/max,-1,1);
    inputState.joyY=Phaser.Math.Clamp(dy/max,-1,1);
    knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  };
  if(joy){
    joy.addEventListener("pointerdown",e=>{ SoundFX.unlock(); joy.setPointerCapture(e.pointerId); updateJoy(e); });
    joy.addEventListener("pointermove",updateJoy);
    joy.addEventListener("pointerup",resetJoy);
    joy.addEventListener("pointercancel",resetJoy);
    joy.addEventListener("lostpointercapture",resetJoy);
  }
  const wire=(btn,act)=>{
    if(!btn)return;
    btn.addEventListener("pointerdown",e=>{ e.preventDefault(); SoundFX.unlock(); inputState[act]=true; inputState[act+"Pressed"]=true; btn.classList.add("is-pressed"); });
    const up=e=>{ e.preventDefault(); inputState[act]=false; btn.classList.remove("is-pressed"); };
    btn.addEventListener("pointerup",up); btn.addEventListener("pointercancel",up); btn.addEventListener("pointerleave",up);
  };
  wire(btnA,"attack"); wire(btnD,"dash"); wire(btnS,"special");
  document.body.addEventListener("pointerdown",()=>SoundFX.unlock(),{passive:true});
});

// =========================================================
// HELPERS
// =========================================================
function centerX(s){return s.scale.width/2;}
function centerY(s){return s.scale.height/2;}

function addPixelText(scene,x,y,text,size=22,color="#fff8fb",align="center"){
  return scene.add.text(x,y,text,{fontFamily:"Verdana,system-ui,sans-serif",fontSize:`${size}px`,color,align,stroke:"#19142e",strokeThickness:Math.max(3,Math.floor(size/7)),lineSpacing:5,wordWrap:{width:Math.min(scene.scale.width-34,620)}}).setOrigin(0.5);
}

function addMenuButton(scene,x,y,label,cb,w=270,h=58,fill=0xff6fb1){
  const c=scene.add.container(x,y);
  const sh=scene.add.rectangle(4,6,w,h,18,0x000000,0.22);
  const bg=scene.add.rectangle(0,0,w,h,18,fill,1).setStrokeStyle(3,0xffffff,0.66);
  const shine=scene.add.rectangle(0,-h*0.24,w*0.84,h*0.18,10,0xffffff,0.22);
  const tx=scene.add.text(0,0,label,{fontFamily:"Verdana,system-ui,sans-serif",fontSize:"18px",fontStyle:"900",color:"#ffffff",stroke:"#5b1742",strokeThickness:4}).setOrigin(0.5);
  c.add([sh,bg,shine,tx]); c.setSize(w,h); c.setInteractive({useHandCursor:true});
  c.on("pointerdown",()=>{ SoundFX.collect(); scene.tweens.add({targets:c,scale:0.96,duration:70,yoyo:true}); cb(); });
  return c;
}

function addBeachBackdrop(scene){
  const w=scene.scale.width, h=scene.scale.height, g=scene.add.graphics();
  g.fillGradientStyle(0x6bdcff,0x6bdcff,0xffb6d9,0xffe4a3,1); g.fillRect(0,0,w,h);
  g.fillStyle(0xffdb83,1); g.fillRect(0,h*0.58,w,h*0.42);
  g.fillStyle(0x5bd4ff,0.72); g.fillRect(0,h*0.48,w,h*0.12);
  g.fillStyle(0xffffff,0.35); for(let i=0;i<9;i++) g.fillRoundedRect(i*120-40,h*0.53+Math.sin(i)*8,90,8,5);
  g.fillStyle(0xfff06f,1); g.fillCircle(w*0.78,h*0.18,Math.max(34,Math.min(w,h)*0.07));
  for(let i=0;i<12;i++){
    const heart=scene.add.text(Phaser.Math.Between(18,w-18),Phaser.Math.Between(20,h-20),"❤",{fontSize:`${Phaser.Math.Between(16,32)}px`,color:["#ff6fb1","#ffffff","#ff4d8d"][i%3]}).setAlpha(0.3).setOrigin(0.5);
    scene.tweens.add({targets:heart,y:heart.y-Phaser.Math.Between(12,38),alpha:0.72,yoyo:true,repeat:-1,duration:Phaser.Math.Between(1100,2300)});
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
    const g = scene.make.graphics({x:0, y:0, add:false});
    fn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  } catch(e) {
    console.warn('[CT] falhou ao gerar textura:', key, e);
  }
}

function buildAllTextures(scene) {

  // ─── PLAYER ────────────────────────────────────────────────
  CT(scene,"player",64,64,g=>{
    // sombra
    g.fillStyle(0x000000,0.18); g.fillEllipse(32,61,38,8);
    // sapatos
    g.fillStyle(0xff6fb1,1); g.fillRoundedRect(19,54,10,8,{bl:4,br:4,tl:2,tr:2});
    g.fillRoundedRect(35,54,10,8,{bl:4,br:4,tl:2,tr:2});
    // meias / pernas
    g.fillStyle(0xffd4bf,1); g.fillRect(21,44,7,12); g.fillRect(36,44,7,12);
    // jaleco (corpo)
    g.fillStyle(0xffffff,1); g.fillRoundedRect(14,30,36,26,6);
    // jaleco linhas
    g.fillStyle(0xdde8f0,0.6); g.fillRect(14,42,36,2);
    g.fillStyle(0x2a2a55,1); g.fillRoundedRect(20,32,24,20,3);
    // cross vermelho
    g.fillStyle(0xff6fb1,1); g.fillRect(30,34,4,16); g.fillRect(23,39,18,4);
    // luvas / punhos
    g.fillStyle(0x44d4ff,1); g.fillRoundedRect(13,40,8,6,3); g.fillRoundedRect(43,40,8,6,3);
    // pescoço
    g.fillStyle(0xffd4bf,1); g.fillRoundedRect(27,26,10,8,4);
    // cabeça
    g.fillStyle(0xffd4bf,1); g.fillRoundedRect(16,10,32,26,12);
    // cabelo (escuro, volumoso)
    g.fillStyle(0x1a1228,1);
    g.fillRoundedRect(14,8,36,16,10);   // topo
    g.fillCircle(17,26,9);              // lateral esq
    g.fillCircle(47,26,9);              // lateral dir
    g.fillRoundedRect(14,16,8,14,4);    // franja esq
    g.fillRoundedRect(42,16,8,14,4);    // franja dir
    // olhos
    g.fillStyle(0xffffff,1); g.fillEllipse(25,22,8,9); g.fillEllipse(39,22,8,9);
    g.fillStyle(0x2a1a55,1); g.fillEllipse(25,23,5,6); g.fillEllipse(39,23,5,6);
    g.fillStyle(0xffffff,1); g.fillCircle(24,21,1.5); g.fillCircle(38,21,1.5);
    // sobrancelhas
    g.fillStyle(0x1a1228,1); g.fillRoundedRect(21,16,7,2,1); g.fillRoundedRect(36,16,7,2,1);
    // bochechas
    g.fillStyle(0xff7aa9,0.65); g.fillCircle(19,27,4); g.fillCircle(45,27,4);
    // boca
    g.fillStyle(0xff5b8f,1); g.fillRoundedRect(27,31,10,3,2);
  });

  CT(scene,"player_shadow",64,64,g=>{
    g.fillStyle(0xff6fb1,0.38); g.fillRoundedRect(10,10,44,50,12);
  });

  // ─── GATO ──────────────────────────────────────────────────
  CT(scene,"cat_fallback",32,34,g=>{
    // sombra
    g.fillStyle(0x000000,0.15); g.fillEllipse(16,32,24,5);
    // corpo
    g.fillStyle(0xf5a623,1); g.fillEllipse(16,24,22,14);
    // cabeça
    g.fillStyle(0xf5a623,1); g.fillCircle(16,14,10);
    // orelhas
    g.fillStyle(0xf5a623,1); g.fillTriangle(9,8,6,1,15,6); g.fillTriangle(23,8,17,6,26,1);
    g.fillStyle(0xff8fa8,1); g.fillTriangle(10,7,8,2,14,6); g.fillTriangle(22,7,18,6,24,2);
    // listras cabeça
    g.fillStyle(0xda8a15,0.5); g.fillRect(13,6,2,5); g.fillRect(17,6,2,5);
    // olhos verdes
    g.fillStyle(0xffffff,1); g.fillEllipse(12,13,6,7); g.fillEllipse(20,13,6,7);
    g.fillStyle(0x2dd47a,1); g.fillEllipse(12,14,4,5); g.fillEllipse(20,14,4,5);
    g.fillStyle(0x0a1a0e,1); g.fillEllipse(12,14,2,4); g.fillEllipse(20,14,2,4);
    g.fillStyle(0xffffff,1); g.fillCircle(11,12,1); g.fillCircle(19,12,1);
    // nariz
    g.fillStyle(0xff8fa8,1); g.fillTriangle(15,16,17,16,16,18);
    // bigodes
    g.lineStyle(1,0x2a1a1a,0.7);
    g.lineBetween(5,14,12,15); g.lineBetween(4,17,11,16);
    g.lineBetween(27,14,20,15); g.lineBetween(28,17,21,16);
    // cauda
    g.fillStyle(0xf5a623,1); g.fillRoundedRect(22,22,8,3,2); g.fillRoundedRect(27,17,3,6,2);
    g.fillStyle(0xda8a15,0.6); g.fillRoundedRect(28,17,2,3,1);
  });

  // ─── INIMIGO: BATATA FRITA ─────────────────────────────────
  CT(scene,"coxinha",34,44,g=>{
    g.fillStyle(0x000000,0.15); g.fillEllipse(17,41,26,6);
    // copo vermelho listrado
    g.fillStyle(0xdd1111,1); g.fillRoundedRect(7,22,20,18,{bl:3,br:3,tl:0,tr:0});
    g.fillStyle(0xffffff,0.8); for(let i=0;i<3;i++) g.fillRect(8+i*7,22,4,18);
    g.fillStyle(0xdd1111,0.9);
    g.fillRect(7,22,20,18); // reaplica para misturar
    g.fillStyle(0xffffff,0.5); for(let i=0;i<3;i++) g.fillRect(8+i*7,22,3,18);
    // borda superior do copo
    g.fillStyle(0xbb0000,1); g.fillRect(5,20,24,4);
    // batatas (fries)
    g.fillStyle(0xffd500,1); g.fillRoundedRect(9,6,5,16,2);
    g.fillStyle(0xffd500,1); g.fillRoundedRect(15,4,5,18,2);
    g.fillStyle(0xffd500,1); g.fillRoundedRect(21,8,5,14,2);
    // topo das batatas (queimado)
    g.fillStyle(0xe8a800,1); g.fillRect(9,6,5,3); g.fillRect(15,4,5,3); g.fillRect(21,8,5,3);
    // olhos malvados no copo
    g.fillStyle(0xffffff,1); g.fillCircle(13,30,3); g.fillCircle(21,30,3);
    g.fillStyle(0x110000,1); g.fillCircle(14,31,2); g.fillCircle(22,31,2);
    // sobrancelhas raivosas
    g.fillStyle(0x110000,1); g.fillRect(11,26,4,2); g.fillRect(19,26,4,2);
    // boca raivosa
    g.lineStyle(2,0x110000,1);
    g.beginPath(); g.moveTo(10,36); g.lineTo(12,34); g.lineTo(16,36); g.lineTo(20,34); g.lineTo(24,36); g.strokePath();
  });

  // ─── INIMIGO: SORVETE ──────────────────────────────────────
  CT(scene,"refri",30,46,g=>{
    g.fillStyle(0x000000,0.15); g.fillEllipse(15,43,22,6);
    // casquinha
    g.fillStyle(0xe8c070,1); g.fillTriangle(15,42,5,24,25,24);
    g.lineStyle(1.5,0xc4943a,0.8);
    g.lineBetween(10,24,12,40); g.lineBetween(15,24,15,42); g.lineBetween(20,24,18,40);
    g.lineBetween(5,30,25,30); g.lineBetween(6,35,24,35);
    // bola de sorvete chocolate
    g.fillStyle(0x6b3a1f,1); g.fillCircle(15,20,11);
    g.fillStyle(0x8b5030,0.4); g.fillCircle(12,17,5);
    // bola de sorvete morango
    g.fillStyle(0xff6fa1,1); g.fillCircle(15,11,8);
    g.fillStyle(0xff90b8,0.5); g.fillCircle(13,9,4);
    // chantilly no topo
    g.fillStyle(0xffffff,0.95); g.fillCircle(15,5,5); g.fillCircle(12,7,3); g.fillCircle(18,7,3);
    // olhos malvados na bola de chocolate
    g.fillStyle(0xffffff,1); g.fillCircle(11,20,3); g.fillCircle(19,20,3);
    g.fillStyle(0x110000,1); g.fillCircle(11,21,2); g.fillCircle(20,21,2);
    // sobrancelhas
    g.fillStyle(0x3a1a0a,1); g.fillRect(8,16,5,2); g.fillRect(17,16,5,2);
    // boca triste
    g.lineStyle(2,0x3a1a0a,1);
    g.beginPath(); g.moveTo(10,27); g.quadraticBezierTo(15,24,20,27); g.strokePath();
  });

  // ─── INIMIGO: HAMBURGUER ───────────────────────────────────
  CT(scene,"hamburger",42,36,g=>{
    g.fillStyle(0x000000,0.15); g.fillEllipse(21,34,34,6);
    // pão de baixo
    g.fillStyle(0xc57828,1); g.fillRoundedRect(4,24,34,10,{bl:5,br:5,tl:2,tr:2});
    g.fillStyle(0xe8943a,0.5); g.fillRoundedRect(4,24,34,4,{tl:2,tr:2});
    // alface
    g.fillStyle(0x3dba4e,1); g.fillRoundedRect(2,20,38,6,2);
    g.fillStyle(0x5ec44b,0.8); for(let i=0;i<5;i++) g.fillRoundedRect(3+i*7,18,6,4,2);
    // queijo
    g.fillStyle(0xffcc22,1); g.fillRoundedRect(4,16,34,6,1);
    // tomate
    g.fillStyle(0xdd3311,1); g.fillRect(4,13,34,4);
    g.fillStyle(0xff5533,0.4); g.fillRect(4,13,34,2);
    // carne
    g.fillStyle(0x6b3520,1); g.fillRoundedRect(5,9,32,6,2);
    g.fillStyle(0x8b4530,0.5); g.fillRect(7,9,28,2);
    // pão de cima
    g.fillStyle(0xd4923a,1); g.fillRoundedRect(3,2,36,10,8);
    g.fillStyle(0xc07828,0.35); g.fillRoundedRect(3,8,36,4,{bl:8,br:8});
    // gergelim
    g.fillStyle(0xfff0b0,1);
    g.fillEllipse(13,6,5,2); g.fillEllipse(21,4,5,2); g.fillEllipse(29,6,5,2);
    // olhos malvados no pão
    g.fillStyle(0x3a1a00,1); g.fillCircle(16,8,2); g.fillCircle(26,8,2);
    g.fillRect(13,6,5,1); g.fillRect(23,6,5,1); // sobrancelhas
  });

  // ─── INIMIGO: BOLO DE CHOCOLATE ────────────────────────────
  CT(scene,"brigadeiro",38,38,g=>{
    g.fillStyle(0x000000,0.15); g.fillEllipse(19,35,28,6);
    // prato
    g.fillStyle(0xffffff,0.9); g.fillEllipse(19,32,30,10);
    g.lineStyle(2,0xcccccc,1); g.strokeEllipse(19,32,30,10);
    // lado do bolo
    g.fillStyle(0x3a180e,1); g.fillRect(5,18,28,14);
    // topo do bolo  
    g.fillStyle(0x4a251c,1); g.fillEllipse(19,18,28,12);
    // cobertura de chocolate escorrendo
    g.fillStyle(0x2a100a,1);
    const drips=[[7,14,3,8],[13,13,3,9],[19,12,3,10],[25,13,3,8],[31,14,3,7]];
    drips.forEach(([dx,dy,dw,dh])=>g.fillRoundedRect(dx,dy,dw,dh,{bl:2,br:2}));
    // granulado
    g.fillStyle(0xff6fb1,1); g.fillRect(14,15,4,2); g.fillRect(22,14,4,2);
    g.fillStyle(0xffe066,1); g.fillRect(10,16,3,2); g.fillRect(26,17,3,2);
    g.fillStyle(0x44d4ff,1); g.fillRect(18,13,3,2);
    // olhos
    g.fillStyle(0xffffff,1); g.fillCircle(14,22,3.5); g.fillCircle(24,22,3.5);
    g.fillStyle(0x2a100a,1); g.fillCircle(14,23,2); g.fillCircle(25,23,2);
    g.fillStyle(0xffffff,1); g.fillCircle(13,22,1); g.fillCircle(24,22,1);
    // sorriso maligno
    g.lineStyle(2,0x2a100a,1);
    g.beginPath(); g.moveTo(12,28); g.quadraticBezierTo(19,33,26,28); g.strokePath();
    g.fillStyle(0xff1111,0.7); g.fillRect(14,28,10,2);
  });

  // ─── INIMIGO: BOLINHO / CRAB ───────────────────────────────
  CT(scene,"crab",44,34,g=>{
    g.fillStyle(0x000000,0.15); g.fillEllipse(22,31,34,6);
    // bolinho principal
    g.fillStyle(0xf5dba8,1); g.fillEllipse(22,18,36,20);
    g.fillStyle(0xfff0d0,0.7); g.fillEllipse(18,14,22,12);
    // pregas
    g.lineStyle(2,0xd4a060,0.8);
    for(let i=0;i<5;i++) g.lineBetween(12+i*5,10,10+i*6,26);
    // vapor
    g.lineStyle(2,0xffffff,0.5);
    const steam=[[15,8],[22,6],[29,8]];
    steam.forEach(([sx,sy])=>{ g.beginPath(); g.moveTo(sx,sy); g.quadraticBezierTo(sx-3,sy-3,sx,sy-6); g.strokePath(); });
    // olhos zangados
    g.fillStyle(0x111111,1); g.fillCircle(16,18,3); g.fillCircle(28,18,3);
    g.fillStyle(0xffffff,1); g.fillCircle(15,17,1.5); g.fillCircle(27,17,1.5);
    // sobrancelhas
    g.fillStyle(0x6b3a00,1); g.fillRect(13,14,5,2); g.fillRect(26,14,5,2);
    // boca
    g.lineStyle(2,0x8b5030,1);
    g.beginPath(); g.moveTo(16,24); g.quadraticBezierTo(22,21,28,24); g.strokePath();
  });

  // ─── BOSS: PIZZA ───────────────────────────────────────────
  CT(scene,"saudadeBoss",88,88,g=>{
    g.fillStyle(0x000000,0.22); g.fillEllipse(44,80,66,12);
    // massa da pizza
    g.fillStyle(0xe8c070,1); g.fillCircle(44,40,36);
    // crosta
    g.fillStyle(0xd4923a,1);
    for(let a=0;a<360;a+=30){
      const rad=a*Math.PI/180;
      g.fillCircle(44+Math.cos(rad)*32,40+Math.sin(rad)*32,7);
    }
    // molho
    g.fillStyle(0xcc3311,1); g.fillCircle(44,40,28);
    // queijo
    g.fillStyle(0xffdd66,1); g.fillCircle(44,40,23);
    // manchas de queijo derretido
    g.fillStyle(0xfff0a0,0.6); g.fillCircle(38,35,8); g.fillCircle(50,36,7); g.fillCircle(44,46,8);
    // pepperoni
    g.fillStyle(0xaa2211,1);
    [[34,31],[49,35],[38,46],[50,26],[28,38]].forEach(([px,py])=>g.fillCircle(px,py,5));
    g.fillStyle(0xcc3322,0.6);
    [[34,31],[49,35],[38,46]].forEach(([px,py])=>g.fillCircle(px,py,3));
    // ROSTO MALVADO
    // olhos (brancos com pupila)
    g.fillStyle(0xffffff,1); g.fillCircle(34,32,7); g.fillCircle(54,32,7);
    g.fillStyle(0xff1111,1); g.fillCircle(34,33,5); g.fillCircle(54,33,5);
    g.fillStyle(0x110000,1); g.fillCircle(34,34,3); g.fillCircle(54,34,3);
    g.fillStyle(0xffffff,0.8); g.fillCircle(32,31,1.5); g.fillCircle(52,31,1.5);
    // sobrancelhas furiosas
    g.lineStyle(4,0x330000,1);
    g.lineBetween(28,25,40,29); g.lineBetween(48,29,60,25);
    // boca malvada
    g.lineStyle(5,0x110000,1);
    g.beginPath(); g.moveTo(30,50); g.quadraticBezierTo(44,62,58,50); g.strokePath();
    // dentes
    g.fillStyle(0xffffff,1);
    for(let i=0;i<5;i++) g.fillTriangle(31+i*6,52,34+i*6,52,33+i*6,58);
  });

  // ─── COLETÁVEIS ────────────────────────────────────────────
  CT(scene,"item_morango",28,30,g=>{
    g.fillStyle(0x000000,0.12); g.fillEllipse(14,28,20,5);
    // folha
    g.fillStyle(0x3dba4e,1); g.fillTriangle(14,6,10,1,14,11); g.fillTriangle(14,6,18,1,14,11);
    g.fillStyle(0x2ea03c,1); g.fillRect(13,3,2,9);
    // corpo morango
    g.fillStyle(0xff3355,1); g.fillRoundedRect(5,8,18,18,{tl:8,tr:8,bl:5,br:5});
    g.fillStyle(0xff6680,0.5); g.fillRoundedRect(7,9,8,7,4);
    // sementes
    g.fillStyle(0xffd166,1);
    [[9,13],[14,11],[18,14],[10,18],[15,17],[12,22]].forEach(([sx,sy])=>g.fillEllipse(sx,sy,2.5,3));
  });

  CT(scene,"item_banana",32,28,g=>{
    g.fillStyle(0x000000,0.12); g.fillEllipse(16,26,24,5);
    g.fillStyle(0xffd700,1); g.fillRoundedRect(4,8,24,14,7);
    g.fillStyle(0xffe84d,0.65); g.fillRoundedRect(6,9,20,6,5);
    g.fillStyle(0xbf8800,1); g.fillRoundedRect(2,10,5,4,2); g.fillRoundedRect(25,10,5,4,2);
    g.fillStyle(0xffff99,0.35); g.fillEllipse(13,11,10,5);
  });

  CT(scene,"item_marmita",30,28,g=>{
    g.fillStyle(0x000000,0.12); g.fillEllipse(15,26,22,5);
    // container
    g.fillStyle(0x9abfad,1); g.fillRoundedRect(4,12,22,14,3);
    g.fillStyle(0x7da393,1); g.fillRect(4,20,22,6);
    // tampa
    g.fillStyle(0xbdd9cb,1); g.fillRoundedRect(3,9,24,6,3);
    g.lineStyle(2,0x6a9080,1); g.strokeRoundedRect(3,9,24,18,3);
    // comida visível
    g.fillStyle(0x5ec44b,1); g.fillCircle(10,16,3);
    g.fillStyle(0xffb56b,1); g.fillCircle(17,15,3);
    g.fillStyle(0xffffff,0.9); g.fillRect(9,18,12,2);
    g.fillStyle(0xffe066,0.8); g.fillRect(9,18,12,1);
  });

  CT(scene,"item_coco",26,30,g=>{
    g.fillStyle(0x000000,0.12); g.fillEllipse(13,28,18,5);
    g.fillStyle(0x7ce9ff,0.9); g.fillRoundedRect(4,14,18,14,{bl:5,br:5,tl:2,tr:2});
    g.fillStyle(0x4ddaff,1); g.fillRect(4,14,18,5);
    g.fillStyle(0x8b6914,1); g.fillCircle(13,14,7);
    g.fillStyle(0xffffff,1); g.fillCircle(13,14,5);
    g.fillStyle(0x8b6914,0.35); g.fillCircle(13,14,5);
    // canudo
    g.fillStyle(0xff6fb1,1); g.fillRect(18,5,3,16);
    g.fillStyle(0xff4d9e,1); for(let i=0;i<4;i++) g.fillRect(18,5+i*4,3,2);
  });

  CT(scene,"item_heart",28,28,g=>{
    g.fillStyle(0x000000,0.12); g.fillEllipse(14,26,20,5);
    // torta de maçã
    g.fillStyle(0xd49843,1); g.fillRoundedRect(4,16,20,10,{bl:4,br:4,tl:2,tr:2});
    g.fillStyle(0xe8b060,1); g.fillRoundedRect(4,10,20,8,{tl:4,tr:4});
    g.lineStyle(1,0xc07828,0.8);
    for(let i=0;i<3;i++) g.lineBetween(7+i*5,10,7+i*5,18);
    g.lineBetween(4,14,24,14);
    // coração flutuando
    g.fillStyle(0xff6fb1,0.9); g.fillCircle(9,6,2.5); g.fillCircle(13,6,2.5); g.fillTriangle(7,6,15,6,11,12);
    g.fillStyle(0xff9ec8,0.7); g.fillCircle(19,5,2); g.fillCircle(23,5,2); g.fillTriangle(17,5,25,5,21,10);
  });

  // ─── ITENS OBJETIVO ────────────────────────────────────────
  const goalBox=(key,fn)=>CT(scene,key,36,36,g=>{
    g.fillStyle(0xffffff,0.2); g.fillCircle(18,18,16);
    fn(g);
    g.fillStyle(0x000000,0.12); g.fillEllipse(18,34,24,5);
  });

  goalBox("goal_mala",g=>{
    g.fillStyle(0x44b4ff,1); g.fillRoundedRect(5,12,26,18,4);
    g.fillStyle(0x2299cc,1); g.fillRect(5,21,26,9);
    g.lineStyle(2,0x1177aa,1); g.strokeRoundedRect(5,12,26,18,4); g.lineBetween(5,21,31,21);
    g.fillStyle(0xffd166,1); g.fillRoundedRect(14,18,8,6,2);
    g.fillStyle(0x1177aa,1); g.fillRoundedRect(10,8,16,6,{tl:5,tr:5});
    g.fillStyle(0x44b4ff,1); g.fillRoundedRect(12,9,12,5,{tl:4,tr:4});
  });

  goalBox("goal_protetor",g=>{
    g.fillStyle(0xffd700,1); g.fillRoundedRect(11,8,14,22,6);
    g.fillStyle(0xff6fb1,1); g.fillRoundedRect(11,8,14,10,{tl:6,tr:6});
    g.fillStyle(0xffffff,0.9); g.fillRect(13,20,10,2); g.fillRect(13,23,10,1);
    g.fillStyle(0xeeaa00,1); g.fillRoundedRect(13,4,10,6,{tl:4,tr:4});
    g.fillStyle(0xffffff,1); g.fillRect(14,10,4,2); g.fillRect(14,13,4,1);
    // sol
    g.fillStyle(0xfff06f,0.9); g.fillCircle(28,9,5);
    g.lineStyle(1.5,0xfff06f,0.8);
    for(let a=0;a<360;a+=45){ const r=a*Math.PI/180; g.lineBetween(28+Math.cos(r)*5,9+Math.sin(r)*5,28+Math.cos(r)*8,9+Math.sin(r)*8); }
  });

  goalBox("goal_passagem",g=>{
    g.fillStyle(0xffffff,1); g.fillRoundedRect(4,10,28,18,3);
    g.fillStyle(0xff6fb1,1); g.fillRect(4,10,28,6);
    g.lineStyle(1,0xdddddd,1); g.strokeRoundedRect(4,10,28,18,3);
    for(let i=0;i<3;i++) g.fillStyle(0xcccccc,1),g.fillRect(6,19+i*3,14,1);
    g.fillStyle(0xffffff,1); g.fillRect(22,19,8,8);
    g.fillStyle(0xff6fb1,1); g.fillRect(24,21,4,2);
    // avião
    g.fillStyle(0x44d4ff,1); g.fillRect(6,12,10,2); g.fillTriangle(16,11,20,13,16,15);
    g.fillRect(7,14,4,3);
  });

  goalBox("goal_arroz",g=>{
    g.fillStyle(0xffffff,1); g.fillEllipse(18,26,26,14);
    g.fillStyle(0xeeeeee,1); g.fillEllipse(18,22,26,12);
    g.lineStyle(2,0xcccccc,1); g.strokeEllipse(18,26,26,14);
    g.fillStyle(0xffffff,1); g.fillEllipse(18,19,22,8);
    g.fillStyle(0xe0e0e0,0.9);
    for(let i=0;i<12;i++) g.fillEllipse(10+(i%4)*3,17+Math.floor(i/4)*2,2,3);
  });

  goalBox("goal_frango",g=>{
    g.fillStyle(0xd47a2a,1); g.fillRoundedRect(9,9,18,18,9);
    g.fillStyle(0xffb56b,1); g.fillRoundedRect(11,9,14,14,7);
    g.fillStyle(0xe8943a,0.5); g.fillRoundedRect(11,19,14,7,{bl:7,br:7});
    g.fillStyle(0xfff0d4,1); g.fillRoundedRect(14,22,8,10,4); g.fillCircle(18,31,5);
    g.fillStyle(0x8b4910,0.4);
    [[12,13],[18,12],[14,17],[21,15]].forEach(([cx,cy])=>g.fillCircle(cx,cy,2));
  });

  goalBox("goal_salada",g=>{
    g.fillStyle(0xffffff,1); g.fillEllipse(18,28,28,14);
    g.fillStyle(0xf0f0f0,1); g.fillEllipse(18,24,28,10);
    g.fillStyle(0x5ec44b,1); g.fillEllipse(18,20,26,12);
    g.fillStyle(0x82e06f,0.8); for(let i=0;i<4;i++) g.fillEllipse(8+i*5,18,5,6);
    g.fillStyle(0xff3355,1); g.fillCircle(12,19,3); g.fillStyle(0xff6680,0.6); g.fillCircle(11,18,1.5);
    g.fillStyle(0xffcc22,1); g.fillRect(19,18,5,3);
  });

  goalBox("goal_legumes",g=>{
    // cenoura
    g.fillStyle(0xff8a3d,1); g.fillTriangle(9,30,15,30,11,10);
    g.fillStyle(0xffaa66,0.6); g.fillTriangle(10,22,13,22,11,13);
    g.fillStyle(0x3dba4e,1); g.fillTriangle(9,10,12,5,11,11); g.fillTriangle(11,10,13,5,12,11); g.fillTriangle(12,10,15,5,13,11);
    // brócolis
    g.fillStyle(0x3dba4e,1); g.fillCircle(24,14,7);
    g.fillStyle(0x5ec44b,1); g.fillCircle(22,12,4); g.fillCircle(26,12,4); g.fillCircle(24,10,4);
    g.fillStyle(0x2ea03c,0.5); g.fillCircle(24,12,3);
    g.fillStyle(0x6b9a50,1); g.fillRect(23,19,3,10);
  });

  goalBox("goal_agua",g=>{
    g.fillStyle(0x7ce9ff,0.9); g.fillRoundedRect(10,10,16,22,5);
    g.fillStyle(0x4ddaff,1); g.fillRoundedRect(10,10,16,8,{tl:5,tr:5});
    g.lineStyle(2,0x22aacc,1); g.strokeRoundedRect(10,10,16,22,5);
    g.fillStyle(0x22aacc,0.35); g.fillRect(10,24,16,8);
    g.fillStyle(0x2299bb,1); g.fillRoundedRect(12,6,12,6,{tl:3,tr:3});
    g.fillStyle(0xffffff,0.5); g.fillRect(12,11,4,14);
    g.fillStyle(0xffffff,0.9); g.fillRect(12,22,12,6);
    g.fillStyle(0x22aacc,0.9); g.fillRect(13,23,10,2); g.fillRect(13,26,10,1);
  });

  // ─── CHÃO DE MADEIRA (gerado; fallback quando bg_wood.png não carrega) ───
  CT(scene,"wood_floor_gen",64,64,g=>{
    g.fillStyle(0x8b5e3c,1); g.fillRect(0,0,64,64);
    // Veias horizontais suaves
    g.lineStyle(1,0x7a4f2e,0.5);
    for(let i=0;i<7;i++) g.lineBetween(0,9+i*9,64,9+i*9+(i%2===0?2:-2));
    // Separação entre tábuas (vertical e horizontal)
    g.lineStyle(2,0x4e2a0e,0.85);
    g.lineBetween(0,32,64,32);
    g.lineBetween(0,0,0,64); g.lineBetween(32,0,32,64); g.lineBetween(63,0,63,64);
    // Offset nas tábuas de baixo (aspecto de assoalho corrido)
    g.lineBetween(16,32,16,64); g.lineBetween(48,32,48,64);
    // Reflexo sutil
    g.fillStyle(0xffffff,0.05); g.fillRect(1,1,30,30); g.fillRect(33,33,30,30);
    // Nós da madeira
    g.fillStyle(0x5a3318,0.45); g.fillEllipse(14,13,9,5); g.fillEllipse(46,47,9,5);
  });

  // ─── SLASH DE ATAQUE NORMAL ─────────────────────────────────────────────
  CT(scene,"attack_slash",48,48,g=>{
    // Brilho externo
    g.lineStyle(10,0xffffff,0.18);
    g.beginPath(); g.moveTo(2,46); g.lineTo(46,2); g.strokePath();
    // Linha principal do slash
    g.lineStyle(5,0xffffff,0.92);
    g.beginPath(); g.moveTo(4,44); g.lineTo(44,4); g.strokePath();
    // Linha de cor da classe (sobreposta)
    g.lineStyle(2,0xffe066,0.85);
    g.beginPath(); g.moveTo(6,44); g.lineTo(44,6); g.strokePath();
    // Ponta brilhante
    g.fillStyle(0xffffff,0.9); g.fillCircle(44,4,4);
    g.fillStyle(0xffe066,0.7); g.fillCircle(44,4,2);
  });

  // ─── PROJÉTEIS ─────────────────────────────────────────────
  CT(scene,"heartProjectile",24,24,g=>{
    g.fillStyle(0xff5e98,1); g.fillCircle(8,8,6); g.fillCircle(16,8,6); g.fillTriangle(3,10,21,10,12,22);
    g.fillStyle(0xff9fc8,0.6); g.fillCircle(7,7,3);
  });

  CT(scene,"marmitaShot",28,28,g=>{
    g.fillStyle(0xffffff,0.9); g.fillRoundedRect(4,7,20,14,4);
    g.lineStyle(2,0xcccccc,1); g.strokeRoundedRect(4,7,20,14,4);
    g.fillStyle(0x9ff56f,1); g.fillCircle(9,14,4);
    g.fillStyle(0xffe066,1); g.fillCircle(16,12,3.5);
    g.fillStyle(0xff6b6b,1); g.fillRect(12,17,7,3);
    g.fillStyle(0xff9900,1); g.fillCircle(13,11,2);
  });

  // ─── PORTAL + BAÚ ──────────────────────────────────────────
  CT(scene,"portal",58,72,g=>{
    g.lineStyle(9,0x6be9ff,0.85); g.strokeEllipse(29,36,40,58);
    g.lineStyle(5,0xff6fb1,0.85); g.strokeEllipse(29,36,27,44);
    g.lineStyle(2,0xffffff,0.5);  g.strokeEllipse(29,36,15,30);
    g.fillStyle(0x44d4ff,0.4); g.fillCircle(29,36,12);
    g.fillStyle(0xffffff,0.6); g.fillCircle(29,36,6);
  });

  CT(scene,"chest",56,48,g=>{
    g.fillStyle(0x000000,0.2); g.fillEllipse(28,44,42,8);
    // corpo
    g.fillStyle(0x8a4f24,1); g.fillRoundedRect(7,19,42,24,5);
    g.fillStyle(0xc07838,0.3); g.fillRect(7,19,42,8);
    // tampa
    g.fillStyle(0xd99043,1); g.fillRoundedRect(7,10,42,16,8);
    // faixas metálicas
    g.lineStyle(3,0x5a2f19,1); g.strokeRoundedRect(7,10,42,32,5);
    g.lineStyle(2,0x7a4f29,0.7); g.lineBetween(7,22,49,22);
    // cadeado dourado
    g.fillStyle(0xffe066,1); g.fillRoundedRect(24,25,8,9,2);
    g.fillStyle(0xd4c000,1); g.fillCircle(28,24,5);
    g.fillStyle(0x7a6000,1); g.fillCircle(28,24,2.5);
    // brilhos
    g.fillStyle(0xffffff,0.8); g.fillCircle(12,14,2); g.fillCircle(19,12,1.5); g.fillCircle(44,13,2);
  });
}

// =========================================================
// ANIMAÇÕES (Female Adventurer + Cat)
// =========================================================
function buildPlayerAnims(scene) {
  if (scene.anims.exists("player_walk_down")) return;
  const dirs  = ["Down","Up","Right_Down","Left_Down"];
  const names = ["down","up","right","left"];
  dirs.forEach((d,i) => {
    if (scene.textures.exists("fa_walk_"+names[i]))
      scene.anims.create({ key:"player_walk_"+names[i], frames:scene.anims.generateFrameNumbers("fa_walk_"+names[i],{start:0,end:5}), frameRate:9, repeat:-1 });
    if (scene.textures.exists("fa_idle_"+names[i]))
      scene.anims.create({ key:"player_idle_"+names[i], frames:scene.anims.generateFrameNumbers("fa_idle_"+names[i],{start:0,end:0}), frameRate:1, repeat:-1 });
    const dk = "fa_dash_"+names[i];
    if (scene.textures.exists(dk))
      scene.anims.create({ key:"player_dash_"+names[i], frames:scene.anims.generateFrameNumbers(dk,{start:0,end:-1}), frameRate:14, repeat:0 });
  });
  if (scene.textures.exists("fa_death_down"))
    scene.anims.create({ key:"player_death_down", frames:scene.anims.generateFrameNumbers("fa_death_down",{start:0,end:-1}), frameRate:10, repeat:0 });
}

// -- Animacoes de efeitos visuais (Super Pixel Effects Gigapack) --
function buildFxAnims(scene) {
  if (scene.anims.exists("anim_fx_explode")) return;
  const mk = (animKey, texKey, endFrame, fps) => {
    if (scene.textures.exists(texKey))
      scene.anims.create({ key:animKey, frames:scene.anims.generateFrameNumbers(texKey,{start:0,end:endFrame}), frameRate:fps, repeat:0 });
  };
  mk("anim_fx_explode", "fx_explode",  12, 14); // 13 frames explosao
  mk("anim_fx_heart",   "fx_heart",    22, 18); // 23 frames coração burst
  mk("anim_fx_sparkle", "fx_sparkle",  13, 16); // 14 frames sparkle
  mk("anim_fx_impact",  "fx_impact",    6, 20); //  7 frames impacto
  // Anims das arvores sunnyside (4 frames de balanco)
  if (scene.textures.exists("prop_tree1"))
    scene.anims.create({ key:"anim_tree1", frames:scene.anims.generateFrameNumbers("prop_tree1",{start:0,end:3}), frameRate:4, repeat:-1 });
  if (scene.textures.exists("prop_tree2"))
    scene.anims.create({ key:"anim_tree2", frames:scene.anims.generateFrameNumbers("prop_tree2",{start:0,end:3}), frameRate:4, repeat:-1 });
}

function spawnFx(scene, x, y, animKey, scale=1, depth=50) {
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
    scene.anims.create({ key:"cat_idle", frames: scene.anims.generateFrameNumbers("cat_real",{start:0,end:9}), frameRate:10, repeat:-1 });
  } else if (scene.textures.exists("cat_fallback")) {
    scene.anims.create({ key:"cat_idle", frames:[{key:"cat_fallback",frame:0}], frameRate:1, repeat:-1 });
  }
}

// =========================================================
// PRELOADER — mostra loading e vai para MenuScene
// =========================================================
class PreloaderScene extends Phaser.Scene {
  constructor(){super("PreloaderScene");}

  preload(){
    const W=this.scale.width, H=this.scale.height;
    const NC = "Nutri_Custom/";
    const SS = "sunnyside/Sunnyside_World_ASSET_PACK_V2.1/Sunnyside_World_Assets/";
    const FX = "Super Pixel Effects Gigapack (Free Version)/spritesheet/";

    // ── Tela de loading ────────────────────────────────────────────────────
    this.add.rectangle(0,0,W,H,0x151329,1).setOrigin(0);
    this.add.text(W/2,H/2-70,"Missao Floripa",{fontFamily:"Verdana",fontSize:"30px",color:"#ff6fb1",stroke:"#19142e",strokeThickness:5}).setOrigin(0.5);
    this.add.text(W/2,H/2-30,"A Nutri Aventureira",{fontFamily:"Verdana",fontSize:"18px",color:"#fff8fb",stroke:"#19142e",strokeThickness:4}).setOrigin(0.5);
    this.add.text(W/2,H/2+10,"Carregando assets...",{fontFamily:"Verdana",fontSize:"14px",color:"#9eeaff"}).setOrigin(0.5);
    const barW=Math.min(360,W-60);
    this.add.rectangle(W/2,H/2+50,barW,16,0x2a2545,1).setStrokeStyle(2,0xff6fb1,0.5).setOrigin(0.5);
    const bar=this.add.rectangle(W/2-barW/2+2,H/2+50,0,12,0xff6fb1,1).setOrigin(0,0.5);
    const pct=this.add.text(W/2,H/2+74,"0%",{fontFamily:"Verdana",fontSize:"12px",color:"#fff8fb"}).setOrigin(0.5);
    this.load.on("progress",v=>{ bar.width=(barW-4)*v; pct.setText(Math.round(v*100)+"%"); });
    this.load.on("loaderror",()=>{});

    // ── Personagem Nutri (jaleco branco, cabelo preto, olhos verdes) ────────
    // Todos os frames são 64×64 (6 frames por tira de 384px)
    this.load.spritesheet("fx_explode",
      FX+"Explosions/epic_explosion_001/epic_explosion_001_large_orange/spritesheet.png",
      {frameWidth:128, frameHeight:128});

    // ── Texturas de Cenário ──────────────────────────────────────────────
    this.load.image("bg_grass", "grass_tile.png");
    this.load.image("bg_dirt",  "dirt_tile.png");
    this.load.image("bg_wood",  "wood_tile.png");
    // ── Mobiliário pixel art (gerado por build_furniture.py) ──────────────
    this.load.image("prop_bed",      "prop_bed.png");
    this.load.image("prop_wardrobe", "prop_wardrobe.png");
    this.load.image("prop_box",      "prop_box.png");
    this.load.image("prop_mess",     "prop_mess.png");
    this.load.spritesheet("fa_idle_down",  NC+"Idle_Down.png",       {frameWidth:64,frameHeight:64});
    this.load.spritesheet("fa_idle_up",    NC+"Idle_Up.png",         {frameWidth:64,frameHeight:64});
    this.load.spritesheet("fa_idle_right", NC+"Idle_Right_Down.png",  {frameWidth:64,frameHeight:64});
    this.load.spritesheet("fa_idle_left",  NC+"Idle_Left_Down.png",   {frameWidth:64,frameHeight:64});
    this.load.spritesheet("fa_walk_down",  NC+"walk_Down.png",        {frameWidth:64,frameHeight:64});
    this.load.spritesheet("fa_walk_up",    NC+"walk_Up.png",          {frameWidth:64,frameHeight:64});
    this.load.spritesheet("fa_walk_right", NC+"walk_Right_Down.png",  {frameWidth:64,frameHeight:64});
    this.load.spritesheet("fa_walk_left",  NC+"walk_Left_Down.png",   {frameWidth:64,frameHeight:64});
    this.load.spritesheet("fa_death_down", NC+"death_Down.png",       {frameWidth:64,frameHeight:64});

    // ── Gato (320×32 → 10 frames de 32px) ──────────────────────────────────
    this.load.spritesheet("cat_real", "cat/CatPackFree/Idle.png", {frameWidth:32,frameHeight:32});

    // ── Efeitos visuais reais do pacote ────────────────────────────────────
    // Explosão/burst ao derrotar inimigos (1664×128 → 13 frames de 128px)
    this.load.spritesheet("fx_explode",
      FX+"Explosions/epic_explosion_001/epic_explosion_001_large_orange/spritesheet.png",
      {frameWidth:128, frameHeight:128});
    // Heart burst ao coletar item saudável (2944×128 → 23 frames de 128px)
    this.load.spritesheet("fx_heart",
      FX+"Magic Bursts/round_heart_burst_001/round_heart_burst_001_large_red/spritesheet.png",
      {frameWidth:128, frameHeight:128});
    // Sparkle burst ao abrir portal (896×64 → 14 frames de 64px)
    this.load.spritesheet("fx_sparkle",
      FX+"Magic Bursts/round_sparkle_burst_001/round_sparkle_burst_001_large_blue/spritesheet.png",
      {frameWidth:64, frameHeight:64});
    // Impacto quando ataca (448×64 → 7 frames de 64px)
    this.load.spritesheet("fx_impact",
      FX+"Impacts/directional_impact_001/directional_impact_001_large_blue/spritesheet.png",
      {frameWidth:64, frameHeight:64});

    // ── Cenário Sunnyside ──────────────────────────────────────────────────
    this.load.image("bg_tileset",  SS+"Tileset/spr_tileset_sunnysideworld_16px.png");
    this.load.spritesheet("prop_tree1",SS+"Elements/Plants/spr_deco_tree_01_strip4.png",{frameWidth:32,frameHeight:34});
    this.load.spritesheet("prop_tree2",SS+"Elements/Plants/spr_deco_tree_02_strip4.png",{frameWidth:32,frameHeight:34});
    this.load.spritesheet("prop_mush", SS+"Elements/Plants/spr_deco_mushroom_red_01_strip4.png",{frameWidth:16,frameHeight:16});
    this.load.spritesheet("prop_fire", SS+"Elements/VFX/Fire/spr_deco_fire_01_strip4.png",{frameWidth:16,frameHeight:16});

    // ── Comida (inimigos e coletáveis) ─────────────────────────────────────
    [
      "fi_burger:food/15_burger.png",   "fi_fries:food/44_frenchfries.png",
      "fi_pizza:food/81_pizza.png",     "fi_icecream:food/57_icecream.png",
      "fi_cake:food/30_chocolatecake.png", "fi_dump:food/37_dumplings.png",
      "fi_salad:food/40_eggsalad.png",  "fi_chicken:food/85_roastedchicken.png",
      "fi_strawb:food/90_strawberrycake.png", "fi_bowl:food/04_bowl.png"
    ].forEach(s=>{ const [k,p]=s.split(":"); this.load.image(k,p); });
  }

  create(){
    this.scene.start("MenuScene");
  }
}

// =========================================================
// HELPER — cria pet gato com posição CORRETA
// =========================================================
function spawnCatPet(scene, player) {
  const hasCatReal = scene.textures.exists("cat_real");
  const texKey   = hasCatReal ? "cat_real" : "cat_fallback";
  const catScale = hasCatReal ? 1.5 : 1.5;

  const cat = scene.add.sprite(player.x - 60, player.y + 20, texKey)
    .setDepth(19).setScale(catScale);

  buildCatAnims(scene);
  if (scene.anims.exists("cat_idle")) cat.play("cat_idle");

  const shadow = scene.add.ellipse(cat.x, cat.y + 15, 22, 7, 0x000000, 0.22).setDepth(18);
  cat._shadow = shadow;

  // Gato mantém distância mínima de 60px — quando longe corre para alcançar
  cat.follow = function(px, py) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);
    const MIN  = 60;

    if (dist > MIN) {
      const dx = this.x - px, dy = this.y - py, len = Math.hypot(dx, dy) || 1;
      const tx = px + (dx/len)*MIN, ty = py + (dy/len)*MIN;
      const lerpSpeed = dist > 160 ? 0.14 : 0.065;
      this.x = Phaser.Math.Linear(this.x, tx, lerpSpeed);
      this.y = Phaser.Math.Linear(this.y, ty, lerpSpeed);
    }

    this.setFlipX(this.x < px);
    this.setScale(dist > 160 ? catScale*1.05 : catScale);

    // Bob de caminhada quando longe, bob suave quando parado
    this.y += dist > MIN * 0.8
      ? Math.sin(scene.time.now / 140) * 1.3
      : Math.sin(scene.time.now / 400) * 0.5;

    shadow.setPosition(this.x, this.y + 15);
  };

  return cat;
}

// =========================================================
// CENA: MENU
// =========================================================
class MenuScene extends Phaser.Scene {
  constructor(){super("MenuScene");}

  create(){
    setMobileControlsVisible(false);
    buildAllTextures(this);
    addBeachBackdrop(this);

    const won = localStorage.getItem("missaoFloripaZerou")==="sim";
    addPixelText(this,centerX(this),centerY(this)-145,GAME_TITLE,Math.min(42,Math.max(28,this.scale.width/12)),"#fff8fb");
    addPixelText(this,centerX(this),centerY(this)-55,"Uma viagem, muitos obstáculos\ne uma surpresa no final...",18,"#ffffff");
    if(won) addPixelText(this,centerX(this),centerY(this)+8,"Save secreto encontrado: ela já zerou essa missão 💖",15,"#fff4a8");

    addMenuButton(this,centerX(this),centerY(this)+72,"🌟 Começar aventura",()=>this.scene.start("ClassSelectScene"),286,60,0xff6fb1);
    addMenuButton(this,centerX(this),centerY(this)+143,"📖 Como jogar",()=>this.scene.start("HowToScene"),250,56,0x44a7ff);

    // Gato decorativo animado no menu
    buildCatAnims(this);
    const catTex = this.textures.exists("cat_real") ? "cat_real" : "cat_fallback";
    const dcat = this.add.sprite(centerX(this)-110, centerY(this)+68, catTex).setScale(2.8).setDepth(5);
    if(this.anims.exists("cat_idle")) dcat.play("cat_idle");
    this.tweens.add({targets:dcat, y:dcat.y-7, yoyo:true, repeat:-1, duration:700, ease:"Sine.easeInOut"});

    // Avião animado
    const plane=this.add.text(-40,75,"✈️",{fontSize:"34px"}).setOrigin(0.5);
    this.tweens.add({targets:plane,x:this.scale.width+60,y:105,duration:6000,repeat:-1,ease:"Sine.easeInOut"});

    // Itens de comida flutuantes decorativos (dos arquivos reais se carregados)
    const foodKeys=["fi_burger","fi_sushi","fi_ramen","fi_salad"].filter(k=>this.textures.exists(k));
    foodKeys.forEach((k,i)=>{
      const fx=this.add.image(Phaser.Math.Between(20,this.scale.width-20), Phaser.Math.Between(20,this.scale.height-20),k)
        .setScale(1.5).setAlpha(0.18).setDepth(2);
      this.tweens.add({targets:fx,y:fx.y-20,alpha:0.28,yoyo:true,repeat:-1,duration:1800+i*400,ease:"Sine.easeInOut"});
    });
  }
}

// =========================================================
// CENA: COMO JOGAR
// =========================================================
class HowToScene extends Phaser.Scene {
  constructor(){super("HowToScene");}
  create(){
    setMobileControlsVisible(false);
    addBeachBackdrop(this);
    addPixelText(this,centerX(this),70,"Como jogar",34,"#fff8fb");
    const ins=["🕹️ Joystick ou WASD para andar","🥕 Ataque para bater nas tentações","💨 Dash para desviar dos perigos","✨ Especial quando a mana estiver cheia","🍓 Colete comidas saudáveis","🐱 Seu gatinho te segue por todo o jogo!","🎁 Chegue até o baú secreto"];
    const pw=Math.min(640,this.scale.width-28);
    this.add.rectangle(centerX(this),centerY(this),pw,340,0x1d2544,0.74).setStrokeStyle(3,0xffffff,0.28).setOrigin(0.5);
    ins.forEach((l,i)=>this.add.text(centerX(this),centerY(this)-125+i*40,l,{fontFamily:"Verdana,system-ui,sans-serif",fontSize:"16px",color:"#ffffff",stroke:"#151329",strokeThickness:3}).setOrigin(0.5));
    addMenuButton(this,centerX(this),this.scale.height-72,"Voltar",()=>this.scene.start("MenuScene"),220,54,0xff6fb1);
  }
}

// =========================================================
// CENA: ESCOLHA DE CLASSE
// =========================================================
class ClassSelectScene extends Phaser.Scene {
  constructor(){super("ClassSelectScene");}
  create(){
    setMobileControlsVisible(false);
    addBeachBackdrop(this);
    addPixelText(this,centerX(this),48,"Escolha sua classe",30,"#fff8fb");
    addPixelText(this,centerX(this),88,"Cada uma muda ataque, mana ou dash.",15,"#ffffff");
    const keys=["guerreira","marmita","rainha"];
    const cW=Math.min(330,this.scale.width-34), cH=128, sY=this.scale.height<700?145:165;
    keys.forEach((key,idx)=>{
      const cfg=CLASS_CONFIGS[key], y=sY+idx*(cH+18);
      const card=this.add.container(centerX(this),y);
      const bgC=key==="guerreira"?0xff8a3d:key==="marmita"?0xffd166:0xff6fb1;
      card.add([
        this.add.rectangle(5,7,cW,cH,20,0x000000,0.22),
        this.add.rectangle(0,0,cW,cH,20,bgC,0.95).setStrokeStyle(3,0xffffff,0.6),
        this.add.text(-cW/2+20,-43,cfg.name,{fontFamily:"Verdana,system-ui,sans-serif",fontSize:"20px",fontStyle:"900",color:"#ffffff",stroke:"#32142d",strokeThickness:4}).setOrigin(0,0.5),
        this.add.text(-cW/2+20,-10,cfg.joke,{fontFamily:"Verdana,system-ui,sans-serif",fontSize:"13px",color:"#ffffff",wordWrap:{width:cW-40}}).setOrigin(0,0.5),
        this.add.text(-cW/2+20,38,`Vida ${cfg.maxHp}  •  Mana ${cfg.maxMana}  •  Dash ${cfg.dashSpeed}`,{fontFamily:"Verdana,system-ui,sans-serif",fontSize:"13px",color:"#fff9cf",stroke:"#32142d",strokeThickness:2}).setOrigin(0,0.5)
      ]);
      card.setSize(cW,cH).setInteractive({useHandCursor:true});
      card.on("pointerdown",()=>{ SoundFX.collect(); gameState.selectedClassKey=key; gameState.run=null; this.scene.start("GameScene",{level:1,fresh:true}); });
    });
    addMenuButton(this,centerX(this),this.scale.height-48,"Voltar",()=>this.scene.start("MenuScene"),190,48,0x44a7ff);
  }
}

// =========================================================
// CENA PRINCIPAL DO JOGO
// =========================================================
class GameScene extends Phaser.Scene {
  constructor(){super("GameScene");}

  init(data){
    this.level=data.level||1;
    this.levelData=LEVELS[this.level];
    this.classKey=gameState.selectedClassKey||"guerreira";
    this.classCfg=CLASS_CONFIGS[this.classKey];
    if(!gameState.run||data.fresh) gameState.run={hp:this.classCfg.maxHp,mana:0,score:0};
    else { gameState.run.hp=Math.min(gameState.run.hp,this.classCfg.maxHp); gameState.run.mana=Math.min(gameState.run.mana,this.classCfg.maxMana); }
  }

  create(){
    setMobileControlsVisible(true);
    buildAllTextures(this);
    buildPlayerAnims(this);
    buildCatAnims(this);
    buildFxAnims(this);

    this.worldW=1280; this.worldH=860;
    this.physics.world.setBounds(0,0,this.worldW,this.worldH);

    this.requiredItems=new Set(); this.collectedRequired=new Set();
    this.enemyKillGoal=0; this.enemyKills=0; this.portalSpawned=false;
    this.gameOver=false; this.lastDir=new Phaser.Math.Vector2(0,1);
    this.facing="down"; this.nextAttackAt=0; this.nextDashAt=0;
    this.invulnerableUntil=0; this.speedBoostUntil=0; this.attackId=0; this.boss=null;
    this._wasMoving=false;

    this.buildBackground();

    this.obstacles    =this.physics.add.staticGroup();
    this.enemies      =this.physics.add.group();
    this.collectables =this.physics.add.group();
    this.requiredGroup=this.physics.add.group();
    this.portals      =this.physics.add.group();
    this.enemyProj    =this.physics.add.group();
    this.playerProj   =this.physics.add.group();

    // Determina textura do player
    const playerTex = this.textures.exists("fa_idle_down") ? "fa_idle_down" : "player";
    // Escala 3x: sprites são 64×64 mas o personagem ocupa ~22px dentro deles
    // Escala 3 deixa o personagem com ~66px visíveis na tela
    this.player=this.physics.add.sprite(110,120,playerTex).setDepth(20).setScale(3);
    this.playerShadow = this.add.ellipse(this.player.x, this.player.y + 24, 30, 10, 0x000000, 0.25).setDepth(19);
    this.player.setCollideWorldBounds(true);
    // Body pequeno e centralizado: reduz travamento em cantos de obstáculos
    this.player.body.setSize(12, 12).setOffset(26, 38);
    if(this.anims.exists("player_idle_down")) this.player.play("player_idle_down");

    // PET GATO — agora com posição correta
    this.cat=spawnCatPet(this,this.player);

    this.buildLevel();

    this.physics.add.collider(this.player,this.obstacles);
    this.physics.add.collider(this.enemies,this.obstacles);
    this.physics.add.collider(this.playerProj,this.obstacles,s=>s.destroy());
    this.physics.add.overlap(this.player,this.enemies,this.onEnemyTouch,null,this);
    this.physics.add.overlap(this.player,this.enemyProj,this.onEnemyProjHit,null,this);
    this.physics.add.overlap(this.player,this.collectables,this.onCollect,null,this);
    this.physics.add.overlap(this.player,this.requiredGroup,this.onRequiredCollect,null,this);
    this.physics.add.overlap(this.player,this.portals,this.onPortalEnter,null,this);
    this.physics.add.overlap(this.playerProj,this.enemies,this.onPlayerProjHit,null,this);

    this.cameras.main.setBounds(0,0,this.worldW,this.worldH);
    this.cameras.main.startFollow(this.player,true,0.08,0.08);
    this.cameras.main.setZoom(this.scale.width<700?1.02:1.1);

    this.keys=this.input.keyboard.addKeys({
      up:Phaser.Input.Keyboard.KeyCodes.W, down:Phaser.Input.Keyboard.KeyCodes.S,
      left:Phaser.Input.Keyboard.KeyCodes.A, right:Phaser.Input.Keyboard.KeyCodes.D,
      up2:Phaser.Input.Keyboard.KeyCodes.UP, down2:Phaser.Input.Keyboard.KeyCodes.DOWN,
      left2:Phaser.Input.Keyboard.KeyCodes.LEFT, right2:Phaser.Input.Keyboard.KeyCodes.RIGHT,
      attack:Phaser.Input.Keyboard.KeyCodes.SPACE, dash:Phaser.Input.Keyboard.KeyCodes.SHIFT,
      special:Phaser.Input.Keyboard.KeyCodes.E
    });

    this.createHUD();
    this.showMsg(this.levelData.message,2800);
    this.fadeIn();
  }

  buildBackground(){
    const g=this.add.graphics().setDepth(-50);
    const t=this.levelData.theme;

    if(t==="room"){
      // bg_wood é verde no projeto — sempre usa textura gerada de madeira
      if(this.textures.exists("wood_floor_gen"))
        this.add.tileSprite(0,0,this.worldW,this.worldH,"wood_floor_gen").setOrigin(0).setDepth(-60);
      else { g.fillStyle(0x8b5e3c,1); g.fillRect(0,0,this.worldW,this.worldH); }
      // Janela decorativa
      g.fillStyle(0x9de4ff,0.45); g.fillRoundedRect(780,60,340,210,12);
      g.fillStyle(0xede5ff,0.6);  g.fillRoundedRect(800,78,300,158,8);
      g.lineStyle(3,0xc0a0c0,0.8); g.strokeRoundedRect(780,60,340,210,12);
      g.lineBetween(780,165,1120,165); g.lineBetween(950,60,950,270);
    }

    if(t==="beach"){
      if(this.textures.exists("bg_dirt")) this.add.tileSprite(0,0,this.worldW,this.worldH,"bg_dirt").setOrigin(0).setDepth(-60);
      else { g.fillStyle(0xffe99a,1); g.fillRect(0,0,this.worldW,this.worldH); }
      g.fillStyle(0x44bbee,1); g.fillRect(0,0,this.worldW,220);
      // ondas
      g.fillStyle(0xffffff,0.3); for(let x=0;x<this.worldW;x+=110) g.fillRoundedRect(x,208+Math.sin(x/80)*6,80,9,5);
      // sol
      g.fillStyle(0xfff06f,1); g.fillCircle(this.worldW-120,90,48);
      g.fillStyle(0xffdd33,0.3); g.fillCircle(this.worldW-120,90,64);
      // estrela do mar
      g.fillStyle(0xff7755,0.6); g.fillStar(860,590,5,8,20,0);
      g.fillStyle(0xff5533,0.9); g.fillStar(860,590,5,4,12,0);
      // concha decorativa
      g.fillStyle(0xffeedd,0.8); g.fillCircle(350,720,22); g.lineStyle(2,0xddbbaa,0.8); g.strokeCircle(350,720,22);
      this.add.text(940,542,"❤",{fontSize:"34px",color:"#ff6fb1"}).setOrigin(0.5).setDepth(-40);
    }

    if(t==="market"){
      if(this.textures.exists("bg_grass")) this.add.tileSprite(0,0,this.worldW,this.worldH,"bg_grass").setOrigin(0).setDepth(-60);
      else { g.fillStyle(0x2e4a56,1); g.fillRect(0,0,this.worldW,this.worldH); }
      // Prateleiras decorativas
      g.fillStyle(0x96e08b,0.25); g.fillRoundedRect(80,80,290,130,12);
      g.fillStyle(0xffd166,0.25); g.fillRoundedRect(820,120,320,150,12);
      this.add.text(980,195,"Setor Fit\n100% saudável",{fontSize:"22px",align:"center",color:"#ffffff",fontStyle:"900"}).setOrigin(0.5).setDepth(-40);
      // Comidas decorativas do pacote food/ (se carregaram)
      const deco=[["fi_salad",120,240,0.6],["fi_chicken",980,680,0.6],["fi_curry",250,580,0.55],["fi_sushi",850,250,0.6]];
      deco.forEach(([k,dx,dy,da])=>{ if(this.textures.exists(k)) this.add.image(dx,dy,k).setAlpha(da).setScale(1.5).setDepth(-40); });
    }

    if(t==="night"){
      g.fillGradientStyle(0x10132f,0x10132f,0x2d1b4c,0x121126,1); g.fillRect(0,0,this.worldW,this.worldH);
      for(let i=0;i<100;i++){
        g.fillStyle(Phaser.Math.Between(0,1)?0xffffff:0xffb6df,Phaser.Math.FloatBetween(0.3,0.9));
        g.fillCircle(Phaser.Math.Between(20,this.worldW-20),Phaser.Math.Between(20,this.worldH-20),Phaser.Math.Between(1,2.5));
      }
      g.lineStyle(3,0xff6fb1,0.3); for(let i=0;i<10;i++) g.strokeCircle(Phaser.Math.Between(100,this.worldW-100),Phaser.Math.Between(100,this.worldH-100),Phaser.Math.Between(20,60));
      // lua
      g.fillStyle(0xfffbe0,0.9); g.fillCircle(200,120,38);
      g.fillStyle(0x10132f,1); g.fillCircle(218,112,32);
    }
  }

  buildLevel(){
    this.spawnCommons();
    if(this.level===1) this.lvl1();
    if(this.level===2) this.lvl2();
    if(this.level===3) this.lvl3();
    if(this.level===4) this.lvl4();
  }

  lvl1(){
    this.player.setPosition(110,120);
    this.addObs(420,165,160,56,0x6c4b3d,"📦 caixas", "fi_bowl");
    this.addObs(810,360,220,60,0x8b5e42,"👗 roupas", "fi_salad");
    this.addObs(335,560,230,60,0xa07060,"bagunça", "fi_cake");
    this.addObs(1040,605,160,80,0x6c4b3d,"📦 caixas", "fi_burger");
    this.addObs(650,700,250,46,0x7a5a48,"🛏️ cama", "fi_icecream");
    this.addReq("mala","Mala",1040,155,"goal_mala");
    this.addReq("protetor","Protetor solar",270,720,"goal_protetor");
    this.addReq("passagem","Passagem",1120,690,"goal_passagem");
    this.addEnemy("coxinha",565,420); this.addEnemy("coxinha",940,505);
    this.addEnemy("refri",740,170); this.addEnemy("refri",210,490);
  }

  lvl2(){
    this.player.setPosition(90,720);
    this.enemyKillGoal=6;
    for(let i=0;i<6;i++) this.addEnemy("crab",390+i*125,Phaser.Math.Between(300,690));
    this.addObs(260,260,140,44,0x806f65,"🪨 pedras", "fi_dump");
    this.addObs(560,525,130,52,0x806f65,"🪨 pedras", "fi_chicken");
    this.addObs(890,390,150,46,0x806f65,"🐚 conchas", "fi_strawb");
    this.addObs(1110,270,100,52,0x806f65,"🌊 onda", "fi_pizza");
    this.addCol("coco",245,410); this.addCol("morango",690,250); this.addCol("banana",1000,670);
    this.addScenTxt(960,720,"placa: proibido\nsentir saudade\nsem mandar mensagem","#5d3d2e");
  }

  lvl3(){
    this.player.setPosition(100,420);
    this.addObs(250,180,270,72,0x3d7a60,"🥦 hortifruti", "fi_salad");
    this.addObs(690,180,270,72,0x9a7040,"🥫 prateleira", "fi_bowl");
    this.addObs(1030,405,200,82,0x3d7a60,"📦 caixa fit", "fi_burger");
    this.addObs(430,660,260,72,0x9a7040,"🏪 balcão", "fi_cake");
    this.addReq("arroz","Arroz",240,430,"goal_arroz");
    this.addReq("frango","Frango",565,315,"goal_frango");
    this.addReq("salada","Salada",910,180,"goal_salada");
    this.addReq("legumes","Legumes",980,690,"goal_legumes");
    this.addReq("agua","Água",715,600,"goal_agua");
    this.addEnemy("hamburger",410,420); this.addEnemy("hamburger",880,510);
    this.addEnemy("brigadeiro",735,350); this.addEnemy("brigadeiro",1130,610);
    this.addEnemy("refri",1050,220);
  }

  lvl4(){
    this.player.setPosition(150,700);
    this.addObs(285,250,170,56,0x593b84,"💎 cristal", "fi_pizza");
    this.addObs(990,240,180,56,0x593b84,"✨ brilho", "fi_icecream");
    this.addObs(580,615,230,56,0x593b84,"🌀 portal?", "fi_dump");
    this.addCol("heart",210,520); this.addCol("banana",380,690); this.addCol("coco",970,610);
    this.boss=this.addEnemy("boss",980,420);
    // Gato vampiro decorativo no nível noturno
    if(this.textures.exists("cat_drac")){
      const drac=this.add.image(490,620,"cat_drac").setScale(3).setDepth(6).setTint(0xcc99ff);
      this.tweens.add({targets:drac,y:drac.y-10,yoyo:true,repeat:-1,duration:1100,ease:"Sine.easeInOut"});
      this.add.text(490,668,"gato vampiro",{fontSize:"12px",color:"#cc99ff",stroke:"#1a1025",strokeThickness:3}).setOrigin(0.5).setDepth(7);
    }
  }

  addScenTxt(x,y,text,color="#ffffff"){
    this.add.text(x,y,text,{fontFamily:"Verdana,system-ui,sans-serif",fontSize:"15px",color,align:"center",stroke:"#ffffff",strokeThickness:2}).setOrigin(0.5).setDepth(-10);
  }

  addObs(x,y,w,h,color,label="", tex=""){
    // Detecta o sprite certo pelo label ou tema
    const lbl = label.replace(/\p{Emoji}/gu,"").trim().toLowerCase();
    const theme = this.levelData.theme;
    const isNature = theme==="beach" || theme==="market";

    // Mapa de label -> sprite de mobiliário
    const furnitureMap = {
      "caixas":    "prop_box",
      "roupas":    "prop_wardrobe",
      "bagunça":  "prop_mess",
      "cama":      "prop_bed",
    };
    const furnitureKey = Object.keys(furnitureMap).find(k => lbl.includes(k));
    const furSprite    = furnitureKey ? furnitureMap[furnitureKey] : null;

    let r;

    if(!isNature && furSprite && this.textures.exists(furSprite)){
      // Sprite de mobiliário pixelado
      r = this.add.image(x, y, furSprite).setDepth(8);
      this.physics.add.existing(r, true);
      r.body.setSize(r.width * 0.8, r.height * 0.7).setOffset(r.width*0.1, r.height*0.15);
      // Label em cima
      this.add.text(x, y + r.height/2 + 6, label, {
        fontSize:"13px", fontFamily:"monospace", color:"#ffffff",
        align:"center", stroke:"#111", strokeThickness:4
      }).setOrigin(0.5, 0).setDepth(9);

    } else if(isNature){
      // Árvores / natureza
      const propKeys=["prop_tree1","prop_tree2","prop_mush"];
      const rndProp = propKeys[Math.abs(Math.round(x+y))%propKeys.length];
      const sc = rndProp==="prop_mush" ? 4 : 3.5;
      r = this.add.sprite(x, y, rndProp, 0).setScale(sc).setDepth(8);
      if(this.anims.exists("anim_"+rndProp.replace("prop_",""))) r.play("anim_"+rndProp.replace("prop_",""));
      this.physics.add.existing(r, true);
      const bw = rndProp==="prop_mush" ? 22 : 40;
      r.body.setSize(bw, bw).setOffset((r.width-bw)/2, r.height-bw);
      if(label) this.add.text(x, y+(rndProp==="prop_mush"?28:56), label, {fontSize:"13px",fontFamily:"monospace",color:"#fff",stroke:"#111",strokeThickness:4}).setOrigin(0.5).setDepth(9);

    } else {
      // Fallback: caixa colorida discreta
      r = this.add.rectangle(x, y, w, h, color, 0.88).setStrokeStyle(2, 0xffffff, 0.4).setDepth(8);
      this.physics.add.existing(r, true);
      if(label) this.add.text(x, y, label, {fontSize:"13px",fontFamily:"monospace",color:"#fff",stroke:"#111",strokeThickness:4}).setOrigin(0.5).setDepth(9);
    }

    this.obstacles.add(r);
    return r;
  }

  spawnCommons(){
    [[190,210,"morango"],[555,295,"banana"],[755,735,"marmita"],[1130,140,"coco"],[1180,755,"heart"]]
      .forEach(([x,y,t])=>{ if(Phaser.Math.Between(0,100)>26) this.addCol(t,x,y); });
  }

  addCol(type,x,y){
    // Tenta usar imagem real do food/ se carregou, senão usa pixel art
    const realMap={morango:"fi_strawb",banana:null,marmita:"fi_salad",coco:"fi_bowl",heart:null};
    const fbMap={morango:"item_morango",banana:"item_banana",marmita:"item_marmita",coco:"item_coco",heart:"item_heart"};
    const rk=realMap[type], hasr=rk&&this.textures.exists(rk);
    const tex=hasr?rk:fbMap[type];
    const obj=this.collectables.create(x,y,tex);
    obj.setData("type",type);
    obj.setScale(hasr?1.4:1);
    obj.body.setSize(24,24).setOffset(hasr?4:4,hasr?4:4);
    obj.setDepth(12);
    this.tweens.add({targets:obj,y:y-9,yoyo:true,repeat:-1,duration:900+Phaser.Math.Between(0,400),ease:"Sine.easeInOut"});
    return obj;
  }

  addReq(key,label,x,y,fbTex){
    this.requiredItems.add(key);
    // Mapeia para imagens reais se disponíveis
    const realMap={arroz:"fi_egg",frango:"fi_chicken",salada:"fi_salad",legumes:"fi_curry",agua:"fi_bowl"};
    const rk=realMap[key]; const hasr=rk&&this.textures.exists(rk);
    const tex=hasr?rk:fbTex;
    const obj=this.requiredGroup.create(x,y,tex);
    obj.setData("key",key); obj.setData("label",label);
    obj.setScale(hasr?1.6:1);
    obj.body.setSize(26,26).setOffset(hasr?3:5,hasr?3:5);
    obj.setDepth(12);
    // Glow de partículas ao redor
    this.add.text(x,y+36,label,{fontSize:"13px",color:"#fff8fb",stroke:"#19142e",strokeThickness:3}).setOrigin(0.5).setDepth(13);
    this.tweens.add({targets:obj,angle:7,yoyo:true,repeat:-1,duration:860});
    // Halo brilhante
    const halo=this.add.circle(x,y,hasr?26:20,0xffd166,0.22).setDepth(11);
    this.tweens.add({targets:halo,scale:1.35,alpha:0.05,yoyo:true,repeat:-1,duration:800});
    return obj;
  }

  addEnemy(type,x,y){
    // Dados dos inimigos com mapeamento para imagens reais do food/
    const D={
      coxinha:   {tex:"coxinha",  real:"fi_fries",   name:"🍟 Batata Frita Sombria",     hp:4,   sp:82,  dmg:1,sc:80},
      refri:     {tex:"refri",    real:"fi_icecream", name:"🍦 Sorvete Tóxico",            hp:3.3, sp:105, dmg:1,sc:85},
      hamburger: {tex:"hamburger",real:"fi_burger",   name:"🍔 Hambúrguer Malvado",        hp:5.2, sp:86,  dmg:1,sc:110},
      brigadeiro:{tex:"brigadeiro",real:"fi_cake",    name:"🎂 Bolo de Chocolate Rebelde", hp:4.2, sp:98,  dmg:1,sc:100},
      crab:      {tex:"crab",     real:"fi_dump",     name:"🥟 Bolinho do Glúten",         hp:4.4, sp:116, dmg:1,sc:95},
      boss:      {tex:"saudadeBoss",real:"fi_pizza",  name:"🍕 Pizza Monstro da Saudade",  hp:32,  sp:74,  dmg:1,sc:900,boss:true}
    }[type];
    if(!D) return null;

    // Usa imagem real se carregada, senão pixel art próprio
    const hasReal=D.real&&this.textures.exists(D.real);
    const tex=hasReal?D.real:D.tex;
    const enemy=this.enemies.create(x,y,tex);
    enemy.setData("type",type); enemy.setData("name",D.name);
    enemy.setData("hp",D.hp); enemy.setData("maxHp",D.hp);
    enemy.setData("speed",D.sp); enemy.setData("damage",D.dmg);
    enemy.setData("score",D.sc); enemy.setData("boss",!!D.boss);
    enemy.setData("nextShoot",this.time.now+1300);
    enemy.setDepth(D.boss?18:16);
    enemy.body.setCollideWorldBounds(true);

    if(D.boss){
      enemy.setScale(hasReal?3.2:1.2);
      enemy.body.setSize(hasReal?24:60,hasReal?24:60).setOffset(hasReal?4:13,hasReal?4:20);
      this.addBossBar(enemy);
    } else {
      enemy.setScale(hasReal?2.0:1);
      enemy.body.setSize(hasReal?24:enemy.width*0.72,hasReal?24:enemy.height*0.68)
        .setOffset(hasReal?4:enemy.width*0.14,hasReal?4:enemy.height*0.22);
    }

    // Sombra embaixo do inimigo
    const sh=this.add.ellipse(x,y+(D.boss?38:20),D.boss?50:30,8,0x000000,0.18).setDepth(15);
    enemy.setData("shadow",sh);
    return enemy;
  }

  createHUD(){
    this.hud={};
    this.hud.bg   =this.add.rectangle(0,0,this.scale.width,84,0x080d1f,0.75).setOrigin(0).setScrollFactor(0).setDepth(1000);
    this.hud.hearts=this.add.text(14,10,"",{fontSize:"24px",color:"#ff6fb1",stroke:"#1a1025",strokeThickness:4}).setScrollFactor(0).setDepth(1001);
    this.hud.info  =this.add.text(14,44,"",{fontSize:"13px",color:"#fff8fb",stroke:"#1a1025",strokeThickness:3}).setScrollFactor(0).setDepth(1001);
    this.hud.score =this.add.text(this.scale.width-14,12,"",{fontSize:"16px",color:"#fff4a8",stroke:"#1a1025",strokeThickness:4,align:"right"}).setOrigin(1,0).setScrollFactor(0).setDepth(1001);
    this.hud.manaT =this.add.text(this.scale.width-14,44,"",{fontSize:"13px",color:"#9eeaff",stroke:"#1a1025",strokeThickness:3,align:"right"}).setOrigin(1,0).setScrollFactor(0).setDepth(1001);
    this.hud.manaB =this.add.graphics().setScrollFactor(0).setDepth(1001);
    this.hud.obj   =this.add.text(centerX(this),86,this.levelData.objective,{fontSize:"14px",color:"#ffffff",align:"center",stroke:"#1a1025",strokeThickness:4,wordWrap:{width:this.scale.width-24}}).setOrigin(0.5,0).setScrollFactor(0).setDepth(1001);
    this.hud.cat   =this.add.text(14,66,"🐱 te segue!",{fontSize:"11px",color:"#ffcce8",stroke:"#1a1025",strokeThickness:3}).setScrollFactor(0).setDepth(1001);
    this.updateHUD();
  }

  addBossBar(enemy){
    this.bossBarBg=this.add.rectangle(centerX(this),118,Math.min(this.scale.width-40,470),18,0x26152d,0.86).setScrollFactor(0).setDepth(1002).setStrokeStyle(2,0xffffff,0.22);
    this.bossBar=this.add.rectangle(this.bossBarBg.x-this.bossBarBg.width/2+2,118,this.bossBarBg.width-4,12,0xff6fb1,1).setOrigin(0,0.5).setScrollFactor(0).setDepth(1003);
    this.bossLabel=this.add.text(centerX(this),94,"🍕 Boss: Pizza Monstro da Saudade",{fontSize:"14px",color:"#fff8fb",stroke:"#1a1025",strokeThickness:4}).setOrigin(0.5).setScrollFactor(0).setDepth(1003);
  }

  updateHUD(){
    if(!this.hud) return;
    const r=gameState.run;
    this.hud.hearts.setText("❤".repeat(Math.max(0,r.hp))+"♡".repeat(Math.max(0,this.classCfg.maxHp-r.hp)));
    this.hud.info.setText(`${this.levelData.hudName} • ${this.classCfg.name}`);
    this.hud.score.setText(`⭐ ${r.score}`);
    this.hud.manaT.setText(`Mana ${Math.floor(r.mana)}/${this.classCfg.maxMana}`);
    const bW=Math.min(165,this.scale.width*0.34), x2=this.scale.width-14-bW, y2=68;
    const ratio=Phaser.Math.Clamp(r.mana/this.classCfg.maxMana,0,1);
    this.hud.manaB.clear();
    this.hud.manaB.fillStyle(0x1e2445,0.95).fillRoundedRect(x2,y2,bW,10,5);
    this.hud.manaB.fillStyle(0x44d4ff,1).fillRoundedRect(x2,y2,bW*ratio,10,5);
    this.hud.manaB.lineStyle(2,0xffffff,0.35).strokeRoundedRect(x2,y2,bW,10,5);
    if(this.boss&&this.boss.active&&this.bossBar){
      this.bossBar.width=(this.bossBarBg.width-4)*Phaser.Math.Clamp(this.boss.getData("hp")/this.boss.getData("maxHp"),0,1);
    }
  }

  update(time){
    if(this.gameOver) return;
    const moving=this.movePlayer(time);
    if(consumeInput("attack")||Phaser.Input.Keyboard.JustDown(this.keys.attack)) this.doAttack(time);
    if(consumeInput("dash")  ||Phaser.Input.Keyboard.JustDown(this.keys.dash))   this.doDash(time);
    if(consumeInput("special")||Phaser.Input.Keyboard.JustDown(this.keys.special)) this.doSpecial(time);
    this.moveEnemies(time);
    this.tickProj();
    this.updateHUD();
    // Atualizar gato
    if(this.cat&&this.cat.active) this.cat.follow(this.player.x,this.player.y);
  }

  movePlayer(time){
    let x=0,y=0;
    if(this.keys.left.isDown||this.keys.left2.isDown)  x-=1;
    if(this.keys.right.isDown||this.keys.right2.isDown) x+=1;
    if(this.keys.up.isDown||this.keys.up2.isDown)       y-=1;
    if(this.keys.down.isDown||this.keys.down2.isDown)   y+=1;
    if(Math.abs(inputState.joyX)>0.12||Math.abs(inputState.joyY)>0.12){ x=inputState.joyX; y=inputState.joyY; }

    const len=Math.hypot(x,y), moving=len>0.1;
    if(moving){ x/=len; y/=len; this.lastDir.set(x,y); }

    // Direção só é redefinida ao INICIAR o movimento (saindo do idle)
    // Enquanto em movimento contínuo, a direção fica travada — elimina troca
    // de sprite sheet durante o movimento e o salto visual resultante
    if(moving){
      if(!this._wasMoving){
        // Acabou de começar a mover: define direção pelo vetor atual
        const absX=Math.abs(x), absY=Math.abs(y);
        if(absX >= absY) this.facing = x>0 ? "right" : "left";
        else             this.facing = y>0 ? "down"  : "up";
      }
      this._wasMoving=true;
      // Garante que a animação de walk certa está tocando (sem mudar durante mov)
      const ak="player_walk_"+this.facing;
      if(this.anims.exists(ak) && this.player.anims.currentAnim?.key!==ak)
        this.player.play(ak,true);
      else if(!this.anims.exists(ak))
        this.player.rotation=Math.sin(time/90)*0.045;
    } else {
      this._wasMoving=false;
      // Parado: idle da direção atual
      const ik="player_idle_"+this.facing;
      if(this.anims.exists(ik) && this.player.anims.currentAnim?.key!==ik)
        this.player.play(ik,true);
      else if(!this.anims.exists(ik))
        this.player.rotation=0;
    }

    // Animação de dash tem prioridade sobre walk
    if(time<this.dashingUntil){
      const dk="player_dash_"+this.facing;
      if(this.anims.exists(dk)&&this.player.anims.currentAnim?.key!==dk) this.player.play(dk,true);
    }

    let spd=this.classCfg.speed;
    if(time<this.speedBoostUntil) spd+=70;
    if(time<this.dashingUntil)    spd=this.classCfg.dashSpeed;
    this.player.setVelocity(x*spd,y*spd);

    if(time<this.dashingUntil&&Math.floor(time/55)!==this.lastTrailTick){
      this.lastTrailTick=Math.floor(time/55);
      const g=this.add.image(this.player.x,this.player.y,this.player.texture.key).setDepth(10).setAlpha(0.38).setTint(this.classCfg.trailColor);
      try{ g.setFrame(this.player.anims.currentFrame?.frame?.name??0); }catch(e){}
      g.setScale(this.player.scaleX, this.player.scaleY);
      this.tweens.add({targets:g,alpha:0,scaleX:this.player.scaleX*1.15,scaleY:this.player.scaleY*1.15,duration:190,onComplete:()=>g.destroy()});
    }

    if(this.playerShadow){
      this.playerShadow.setPosition(this.player.x, this.player.y + 24);
    }
    return moving;
  }

  doAttack(time){
    if(time<this.nextAttackAt) return;
    this.nextAttackAt=time+330; this.attackId+=1; vibrate(10); SoundFX.attack();
    const d=this.lastDir.clone(); if(d.lengthSq()<0.1) d.set(0,1);
    const px=this.player.x+d.x*42, py=this.player.y+d.y*42;

    // Zona de hit
    const zone=this.add.zone(px,py,78,60); this.physics.add.existing(zone); zone.body.setAllowGravity(false).setSize(78,60); zone.setData("aid",this.attackId);

    // Elipse de impacto (efeito original)
    const sl=this.add.ellipse(px,py,88,50,this.classCfg.attackColor,0.4).setDepth(30); sl.rotation=d.angle(); sl.setScale(0.45);
    this.tweens.add({targets:sl,scale:1.08,alpha:0,duration:160,onComplete:()=>sl.destroy()});

    // Slash sprite — linha diagonal na direção do ataque
    if(this.textures.exists("attack_slash")){
      const slash=this.add.image(this.player.x+d.x*32, this.player.y+d.y*32,"attack_slash")
        .setDepth(32).setScale(0.5).setRotation(d.angle()-Math.PI/4)
        .setTint(this.classCfg.attackColor).setAlpha(1);
      this.tweens.add({targets:slash,scale:1.4,alpha:0,duration:200,ease:"Sine.easeOut",onComplete:()=>slash.destroy()});
    }

    // Flash de cor no player — não conflita com animação de walk
    this.player.setTint(0xffffff);
    this.time.delayedCall(90,()=>{ if(this.player?.active) this.player.clearTint(); });

    for(let i=0;i<4;i++) this.sparkle(px,py,this.classCfg.attackColor,28);
    this.physics.add.overlap(zone,this.enemies,(z,en)=>{ if(!en.active) return; if(en.getData("lastAid")===this.attackId) return; en.setData("lastAid",this.attackId); this.damageEnemy(en,this.classCfg.attackDamage); });
    this.time.delayedCall(150,()=>zone.destroy());
  }

  doDash(time){
    if(time<this.nextDashAt){ this.showMsg("Dash recarregando...",900); return; }
    this.nextDashAt=time+900; this.dashingUntil=time+190;
    this.invulnerableUntil=Math.max(this.invulnerableUntil,time+240);
    vibrate(12); SoundFX.tone(360,0.06,"square",0.025);
    this.showMsg("💨 Dash de praia!",850);
    // Tremor no gato também (fofo)
    if(this.cat) this.tweens.add({targets:this.cat,x:this.cat.x+6,duration:40,yoyo:true,repeat:2});
  }

  doSpecial(time){
    const r=gameState.run;
    if(r.mana<this.classCfg.maxMana){ this.showMsg("Mana não encheu ainda! 🍌",1000); return; }
    r.mana=0; vibrate(26); SoundFX.special(); this.cameras.main.shake(180,0.006);
    this.showMsg("✨ Nutri Power ativado!",1200);
    if(this.classCfg.specialStyle==="marmita") this.castMarmita(); else this.castArea();
  }

  castArea(){
    const radius=this.classCfg.specialStyle==="coracao"?178:154, c=this.classCfg.attackColor;
    const ring=this.add.circle(this.player.x,this.player.y,radius,c,0.22).setDepth(32).setScale(0.25);
    this.tweens.add({targets:ring,scale:1,alpha:0,duration:360,ease:"Sine.easeOut",onComplete:()=>ring.destroy()});
    for(let i=0;i<22;i++) this.sparkle(this.player.x,this.player.y,c,radius);
    this.enemies.children.iterate(en=>{ if(!en||!en.active) return; if(Phaser.Math.Distance.Between(this.player.x,this.player.y,en.x,en.y)<=radius) this.damageEnemy(en,this.classCfg.specialDamage); });
  }

  castMarmita(){
    for(let i=0;i<10;i++){
      const ang=(Math.PI*2*i)/10;
      const tex=this.textures.exists("fi_salad")?"fi_salad":"marmitaShot";
      const shot=this.playerProj.create(this.player.x,this.player.y,tex);
      shot.setData("dmg",this.classCfg.specialDamage).setData("born",this.time.now);
      shot.setScale(tex==="fi_salad"?0.8:1).setDepth(28);
      shot.body.setCircle(11,3,3); shot.setVelocity(Math.cos(ang)*360,Math.sin(ang)*360); shot.rotation=ang;
    }
    const b=this.add.circle(this.player.x,this.player.y,44,0xffe066,0.35).setDepth(31);
    this.tweens.add({targets:b,scale:3.4,alpha:0,duration:420,onComplete:()=>b.destroy()});
    this.showMsg("💥 Explosão de marmita fitness!",1200);
  }

  moveEnemies(time){
    this.enemies.children.iterate(en=>{
      if(!en||!en.active) return;
      const dx=this.player.x-en.x, dy=this.player.y-en.y, len=Math.hypot(dx,dy)||1;
      let spd=en.getData("speed");
      if(en.getData("boss")&&en.getData("hp")<en.getData("maxHp")*0.45) spd+=30;
      en.setVelocity((dx/len)*spd,(dy/len)*spd);
      en.setFlipX(dx<0);
      en.rotation=Math.sin(time/170+en.x)*0.06;
      // shadow
      const sh=en.getData("shadow");
      if(sh&&sh.active) sh.setPosition(en.x,en.y+en.displayHeight*0.42);
      if(en.getData("boss")&&time>en.getData("nextShoot")){
        en.setData("nextShoot",time+Phaser.Math.Between(1050,1450));
        this.bossShoot(en);
      }
    });
  }

  bossShoot(en){
    if(!en.active) return;
    const dx=this.player.x-en.x, dy=this.player.y-en.y, len=Math.hypot(dx,dy)||1;
    const s=this.enemyProj.create(en.x,en.y,"heartProjectile");
    s.setData("dmg",1).setData("born",this.time.now).setDepth(22);
    s.body.setCircle(10,2,2); s.setVelocity((dx/len)*235,(dy/len)*235); s.rotation=Math.atan2(dy,dx);
    SoundFX.tone(190,0.07,"sawtooth",0.02);
  }

  tickProj(){
    const now=this.time.now;
    this.enemyProj.children.iterate(s=>{ if(s&&s.active&&now-s.getData("born")>4200) s.destroy(); });
    this.playerProj.children.iterate(s=>{ if(s&&s.active){ s.rotation+=0.16; if(now-s.getData("born")>1600) s.destroy(); } });
  }

  onPlayerProjHit(shot,en){ if(!shot.active||!en.active) return; this.damageEnemy(en,shot.getData("dmg")||3); shot.destroy(); }
  onEnemyTouch(p,en){ if(!en.active) return; this.hurtPlayer(en.getData("damage")||1,`${en.getData("name")} encostou!`); }
  onEnemyProjHit(p,s){ if(!s.active) return; s.destroy(); this.hurtPlayer(1,"💔 Coração quebrado acertou!"); }

  hurtPlayer(amount,msg){
    const now=this.time.now; if(now<this.invulnerableUntil) return;
    this.invulnerableUntil=now+900;
    gameState.run.hp=Math.max(0,gameState.run.hp-amount);
    vibrate(40); SoundFX.hit(); this.cameras.main.shake(160,0.01);
    this.player.setTint(0xff6b6b);
    this.time.delayedCall(130,()=>{ if(this.player?.active) this.player.clearTint(); });
    this.showMsg(msg,900); this.updateHUD();
    if(gameState.run.hp<=0) this.showDefeat();
  }

  damageEnemy(en,amount){
    const hp=en.getData("hp")-amount; en.setData("hp",hp);
    en.setTint(0xffffff);
    this.tweens.add({targets:en,alpha:0.35,duration:70,yoyo:true,repeat:1,onComplete:()=>{ if(en.active) en.clearTint(); }});
    this.dmgNum(en.x,en.y-30,`-${amount.toFixed(amount%1?1:0)}`);
    spawnFx(this,en.x,en.y-10,"anim_fx_impact",0.5,35);
    SoundFX.tone(620,0.04,"square",0.018);
    if(hp<=0) this.killEnemy(en);
  }

  killEnemy(en){
    if(!en.active) return;
    const name=en.getData("name"), boss=en.getData("boss");
    gameState.run.score+=en.getData("score")||50;
    gameState.run.mana=Math.min(this.classCfg.maxMana,gameState.run.mana+(boss?40:18));
    this.enemyKills+=1;
    this.showMsg(boss?LEVELS[4].nextMessage:`${name} derrotado! 🎉`,1300);
    const sh=en.getData("shadow"); if(sh?.active) sh.destroy();
    for(let i=0;i<(boss?36:10);i++) this.sparkle(en.x,en.y,boss?0xff6fb1:this.classCfg.attackColor,boss?150:60);
    if(boss){ spawnFx(this,en.x,en.y,"anim_fx_heart",1.4,52); this.heartExplosion(en.x,en.y); }
    else { spawnFx(this,en.x,en.y,"anim_fx_explode",0.75,48); }
    if(!boss&&Phaser.Math.Between(0,100)>40) this.addCol(["morango","banana","marmita","coco"][Phaser.Math.Between(0,3)],en.x,en.y);
    en.destroy();
    if(this.level===2&&this.enemyKills>=this.enemyKillGoal) this.spawnPortal(1145,138);
    if(this.level===4&&boss) this.spawnPortal(640,420);
  }

  onCollect(p,item){
    if(!item.active) return;
    const t=item.getData("type"); const ix=item.x,iy=item.y; item.destroy();
    spawnFx(this,ix,iy,"anim_fx_sparkle",0.8,45);
    SoundFX.collect(); vibrate(8);
    if(t==="morango"){ gameState.run.hp=Math.min(this.classCfg.maxHp,gameState.run.hp+1); this.showMsg("🍓 +1 Vida!",1100); }
    if(t==="banana") { gameState.run.mana=Math.min(this.classCfg.maxMana,gameState.run.mana+35); this.showMsg("🍌 +35 Mana!",1300); }
    if(t==="marmita"){ gameState.run.score+=130; gameState.run.mana=Math.min(this.classCfg.maxMana,gameState.run.mana+12); this.showMsg("🥗 Marmita fit!",1200); }
    if(t==="coco")   { this.speedBoostUntil=this.time.now+5200; gameState.run.score+=60; this.showMsg("🥥 Velocidade tropical!",1200); }
    if(t==="heart")  { gameState.run.hp=Math.min(this.classCfg.maxHp,gameState.run.hp+2); this.showMsg("💖 +2 Vida!",1300); }
    this.updateHUD();
  }

  onRequiredCollect(p,item){
    if(!item.active) return;
    const key=item.getData("key"), label=item.getData("label");
    const rx=item.x,ry=item.y;
    this.collectedRequired.add(key); item.destroy();
    spawnFx(this,rx,ry,"anim_fx_sparkle",1.0,45);
    gameState.run.score+=120; gameState.run.mana=Math.min(this.classCfg.maxMana,gameState.run.mana+12);
    SoundFX.collect(); vibrate(10);
    this.showMsg(`✅ ${label} coletado!`,1000);
    if(this.collectedRequired.size>=this.requiredItems.size){
      if(this.level===1) this.spawnPortal(1160,735);
      if(this.level===3){ this.showMsg("🌟 Marmita lendária criada!",1700); this.time.delayedCall(600,()=>this.spawnPortal(1160,120)); }
    }
    this.updateHUD();
  }

  spawnPortal(x,y){
    if(this.portalSpawned) return; this.portalSpawned=true;
    const portal=this.portals.create(x,y,"portal"); portal.setDepth(15);
    portal.body.setCircle(24,5,10);
    this.tweens.add({targets:portal,angle:360,repeat:-1,duration:1800,ease:"Linear"});
    this.tweens.add({targets:portal,scale:1.18,yoyo:true,repeat:-1,duration:720});
    for(let i=0;i<20;i++) this.sparkle(x,y,0x6be9ff,95);
    SoundFX.portal(); this.showMsg(this.levelData.nextMessage,1800);
  }

  onPortalEnter(p,portal){
    if(!this.portalSpawned||this.transitioning) return;
    this.transitioning=true;
    this.physics.pause();
    this.player.setVelocity(0,0);
    vibrate(20); SoundFX.portal();
    const nextLevel = this.level+1;
    const isLast    = this.level>=4;
    // Fade visual + timer direto: não depende de evento de câmera
    this.cameras.main.fadeOut(480, 5, 3, 11);
    this.time.delayedCall(530, ()=>{
      if(isLast) this.scene.start("FinalScene");
      else       this.scene.start("GameScene",{level:nextLevel});
    });
  }

  showDefeat(){
    this.gameOver=true; setMobileControlsVisible(false);
    this.player.setVelocity(0,0);
    if(this.anims.exists("player_death_down")){
      this.player.play("player_death_down",true);
      this.time.delayedCall(680,()=>{ if(this.physics?.world) this.physics.pause(); });
    } else { this.physics.pause(); }
    this.add.rectangle(0,0,this.scale.width,this.scale.height,0x05030b,0.78).setOrigin(0).setScrollFactor(0).setDepth(2000);
    addPixelText(this,centerX(this),centerY(this)-90,"Fim da missão...",28,"#ff9dcc").setScrollFactor(0).setDepth(2001);
    addPixelText(this,centerX(this),centerY(this)-25,"A saudade bateu, mas nutri de verdade tenta de novo! 💪",17,"#ffffff").setScrollFactor(0).setDepth(2001);
    const b=addMenuButton(this,centerX(this),centerY(this)+65,"🔄 Reiniciar",()=>{ gameState.run=null; this.scene.start("GameScene",{level:1,fresh:true}); },240,58,0xff6fb1).setScrollFactor(0).setDepth(2001);
    b.each?.(c=>c.setScrollFactor&&c.setScrollFactor(0));
  }

  transition(cb){
    const c=this.add.rectangle(0,0,this.scale.width,this.scale.height,0x05030b,0).setOrigin(0).setScrollFactor(0).setDepth(3000);
    this.tweens.add({targets:c,alpha:1,duration:520,onComplete:cb});
  }

  fadeIn(){
    const c=this.add.rectangle(0,0,this.scale.width,this.scale.height,0x05030b,1).setOrigin(0).setScrollFactor(0).setDepth(3000);
    this.tweens.add({targets:c,alpha:0,duration:450,onComplete:()=>c.destroy()});
  }

  dmgNum(x,y,txt){
    const t=this.add.text(x,y,txt,{fontSize:"17px",color:"#fff8fb",stroke:"#27142d",strokeThickness:4,fontStyle:"900"}).setOrigin(0.5).setDepth(50);
    this.tweens.add({targets:t,y:y-40,alpha:0,duration:640,onComplete:()=>t.destroy()});
  }

  sparkle(x,y,color,radius=60){
    const ang=Phaser.Math.FloatBetween(0,Math.PI*2), dist=Phaser.Math.FloatBetween(8,radius);
    const dot=this.add.circle(x,y,Phaser.Math.Between(2,5),color,Phaser.Math.FloatBetween(0.45,0.95)).setDepth(40);
    this.tweens.add({targets:dot,x:x+Math.cos(ang)*dist,y:y+Math.sin(ang)*dist,alpha:0,scale:0.2,duration:Phaser.Math.Between(420,860),ease:"Sine.easeOut",onComplete:()=>dot.destroy()});
  }

  heartExplosion(x,y){
    for(let i=0;i<30;i++){
      const sym=["❤","🐱","✨","💖","🌟"][i%5];
      const h=this.add.text(x,y,sym,{fontSize:`${Phaser.Math.Between(16,30)}px`,color:["#ff6fb1","#fff8fb","#ffb6df"][i%3]}).setOrigin(0.5).setDepth(55);
      const ang=Phaser.Math.FloatBetween(0,Math.PI*2), dist=Phaser.Math.Between(60,200);
      this.tweens.add({targets:h,x:x+Math.cos(ang)*dist,y:y+Math.sin(ang)*dist,alpha:0,rotation:Phaser.Math.FloatBetween(-1.4,1.4),duration:Phaser.Math.Between(900,1500),onComplete:()=>h.destroy()});
    }
  }

  showMsg(text,dur=1300){
    if(this.msgText) this.msgText.destroy();
    this.msgText=this.add.text(centerX(this),this.scale.height-118,text,{fontFamily:"Verdana,system-ui,sans-serif",fontSize:"15px",color:"#ffffff",align:"center",stroke:"#111128",strokeThickness:4,wordWrap:{width:Math.min(this.scale.width-30,600)}}).setOrigin(0.5).setScrollFactor(0).setDepth(1200).setAlpha(0);
    this.tweens.add({targets:this.msgText,alpha:1,y:this.msgText.y-8,duration:120,yoyo:true,hold:dur,onComplete:()=>{ if(this.msgText) this.msgText.destroy(); }});
  }
}

// =========================================================
// CENA FINAL
// =========================================================
class FinalScene extends Phaser.Scene {
  constructor(){super("FinalScene");}

  create(){
    setMobileControlsVisible(true);
    buildAllTextures(this); buildPlayerAnims(this); buildCatAnims(this); buildFxAnims(this);
    this.worldW=820; this.worldH=620;
    this.physics.world.setBounds(0,0,this.worldW,this.worldH);

    const g=this.add.graphics();
    g.fillGradientStyle(0x05050d,0x080817,0x17122a,0x080817,1); g.fillRect(0,0,this.worldW,this.worldH);
    for(let i=0;i<60;i++){ g.fillStyle(0xffffff,Phaser.Math.FloatBetween(0.1,0.7)); g.fillCircle(Phaser.Math.Between(0,this.worldW),Phaser.Math.Between(0,this.worldH),Phaser.Math.Between(1,3)); }

    const ptex=this.textures.exists("fa_idle_down")?"fa_idle_down":"player";
    this.player=this.physics.add.sprite(140,500,ptex).setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(28,34).setOffset(18,26);
    if(this.anims.exists("player_idle_down")) this.player.play("player_idle_down");

    this.chest=this.physics.add.staticSprite(410,285,"chest").setDepth(9);
    this.light=this.add.circle(this.chest.x,this.chest.y,96,0xffe066,0.12).setDepth(1);
    this.tweens.add({targets:this.light,scale:1.4,alpha:0.24,duration:900,yoyo:true,repeat:-1});
    this.tweens.add({targets:this.chest,y:this.chest.y-6,duration:860,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});

    this.cat=spawnCatPet(this,this.player);
    this.facing="down";

    this.cameras.main.setBounds(0,0,this.worldW,this.worldH);
    this.cameras.main.startFollow(this.player,true,0.08,0.08);
    this.cameras.main.setZoom(this.scale.width<700?1.18:1.35);

    this.keys=this.input.keyboard.addKeys({
      up:Phaser.Input.Keyboard.KeyCodes.W,down:Phaser.Input.Keyboard.KeyCodes.S,
      left:Phaser.Input.Keyboard.KeyCodes.A,right:Phaser.Input.Keyboard.KeyCodes.D,
      up2:Phaser.Input.Keyboard.KeyCodes.UP,down2:Phaser.Input.Keyboard.KeyCodes.DOWN,
      left2:Phaser.Input.Keyboard.KeyCodes.LEFT,right2:Phaser.Input.Keyboard.KeyCodes.RIGHT,
      open:Phaser.Input.Keyboard.KeyCodes.E,attack:Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    this.prompt=this.add.text(centerX(this),this.scale.height-118,"",{fontFamily:"Verdana,system-ui,sans-serif",fontSize:"18px",color:"#fff8fb",align:"center",stroke:"#111128",strokeThickness:5}).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.add.text(centerX(this),32,"🎁 Sala do Baú Secreto",{fontSize:"22px",color:"#fff8fb",stroke:"#111128",strokeThickness:5}).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.opened=false; this.fadeIn();
  }

  update(){
    if(this.opened) return;
    let x=0,y=0;
    if(this.keys.left.isDown||this.keys.left2.isDown)  x-=1;
    if(this.keys.right.isDown||this.keys.right2.isDown) x+=1;
    if(this.keys.up.isDown||this.keys.up2.isDown)       y-=1;
    if(this.keys.down.isDown||this.keys.down2.isDown)   y+=1;
    if(Math.abs(inputState.joyX)>0.12||Math.abs(inputState.joyY)>0.12){ x=inputState.joyX; y=inputState.joyY; }
    const len=Math.hypot(x,y), moving=len>0.1;
    if(moving){ x/=len; y/=len; const ang=Math.atan2(y,x)*180/Math.PI; if(ang>-135&&ang<-45) this.facing="up"; else if(ang>=-45&&ang<=45) this.facing="right"; else if(ang>45&&ang<135) this.facing="down"; else this.facing="left"; const wk="player_walk_"+this.facing; if(this.anims.exists(wk)&&this.player.anims.currentAnim?.key!==wk) this.player.play(wk,true); }
    else { const ik="player_idle_"+this.facing; if(this.anims.exists(ik)&&this.player.anims.currentAnim?.key!==ik) this.player.play(ik,true); }
    this.player.setVelocity(x*205,y*205);
    if(moving&&!this.anims.exists("player_walk_left")) this.player.setFlipX(x<-0.1);
    if(this.cat?.active) this.cat.follow(this.player.x,this.player.y);

    const near=Phaser.Math.Distance.Between(this.player.x,this.player.y,this.chest.x,this.chest.y)<82;
    this.prompt.setText(near?"Pressione ABRIR\n(E, Espaço ou botão Atacar)":"Chegue perto do baú brilhante... 🐱");
    if(near&&(consumeInput("attack")||Phaser.Input.Keyboard.JustDown(this.keys.open)||Phaser.Input.Keyboard.JustDown(this.keys.attack))) this.openChest();
  }

  openChest(){
    this.opened=true; setMobileControlsVisible(false);
    localStorage.setItem("missaoFloripaZerou","sim"); vibrate(45); SoundFX.portal();
    this.player.setVelocity(0,0); this.chest.setTint(0xfff4a8);
    this.cameras.main.flash(320,255,230,120);
    this.add.rectangle(0,0,this.scale.width,this.scale.height,0x03020a,0.88).setOrigin(0).setScrollFactor(0).setDepth(2000);
    for(let i=0;i<40;i++){
      const h=this.add.text(Phaser.Math.Between(15,this.scale.width-15),Phaser.Math.Between(-220,-10),["❤","🐱","✨","💖","🌟"][i%5],{fontSize:`${Phaser.Math.Between(18,34)}px`,color:["#ff6fb1","#ffb6df","#fff8fb"][i%3]}).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
      this.tweens.add({targets:h,y:this.scale.height+Phaser.Math.Between(30,230),rotation:Phaser.Math.FloatBetween(-1.2,1.2),alpha:Phaser.Math.FloatBetween(0.45,0.95),duration:Phaser.Math.Between(2600,5200),repeat:-1,delay:Phaser.Math.Between(0,1200)});
    }
    const cW=Math.min(this.scale.width-30,620), cH=Math.min(this.scale.height-76,470);
    this.add.rectangle(centerX(this),centerY(this),cW,cH,0xfff8fb,0.97).setScrollFactor(0).setDepth(2002).setStrokeStyle(4,0xff6fb1,1);
    this.add.text(centerX(this),centerY(this)-cH/2+48,"Cartinha do Baú 💖",{fontFamily:"Verdana,system-ui,sans-serif",fontSize:"24px",color:"#e94992",fontStyle:"900",align:"center"}).setOrigin(0.5).setScrollFactor(0).setDepth(2003);
    this.add.text(centerX(this),centerY(this)-25,TEXTO_CARTA_FINAL,{fontFamily:"Verdana,system-ui,sans-serif",fontSize:this.scale.width<420?"15px":"18px",color:"#25172d",align:"center",lineSpacing:7,wordWrap:{width:cW-44}}).setOrigin(0.5).setScrollFactor(0).setDepth(2003);
    const btn=addMenuButton(this,centerX(this),centerY(this)+cH/2-58,"🎁 ABRIR SURPRESA",()=>{ if(!LINK_DA_SURPRESA||LINK_DA_SURPRESA==="COLOCAR_LINK_AQUI"){alert("Troque o LINK_DA_SURPRESA no topo do game.js 💖");return;} window.open(LINK_DA_SURPRESA,"_blank"); },Math.min(320,cW-52),58,0xff6fb1).setScrollFactor(0).setDepth(2004);
    btn.each?.(c=>c.setScrollFactor&&c.setScrollFactor(0));
  }

  fadeIn(){
    const c=this.add.rectangle(0,0,this.scale.width,this.scale.height,0x05030b,1).setOrigin(0).setScrollFactor(0).setDepth(3000);
    this.tweens.add({targets:c,alpha:0,duration:550,onComplete:()=>c.destroy()});
  }
}

// =========================================================
// PHASER CONFIG
// =========================================================
const phaserConfig={
  type:Phaser.AUTO, parent:"game", backgroundColor:"#151329",
  pixelArt:true, roundPixels:true,
  scale:{ mode:Phaser.Scale.RESIZE, autoCenter:Phaser.Scale.CENTER_BOTH, width:window.innerWidth, height:window.innerHeight },
  physics:{ default:"arcade", arcade:{ gravity:{y:0}, debug:false } },
  scene:[PreloaderScene,MenuScene,HowToScene,ClassSelectScene,GameScene,FinalScene]
};

window.addEventListener("load",()=>new Phaser.Game(phaserConfig));
