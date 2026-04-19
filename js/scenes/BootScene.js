/**
 * BootScene.js — Loading + generazione texture procedurali
 *
 * Usa Graphics.generateTexture() — API stabile di Phaser 3.
 * Con RESIZE mode, W/H sono le dimensioni reali della finestra.
 *
 * V2: aggiunto generazione texture mostri (small/medium/large/elite)
 *     e heal orb.
 */

class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    this.load.audio('sfx_jump', 'sounds/jump.mp3');
    this.load.audio('sfx_hit', 'sounds/hit.mp3');
    this.load.audio('sfx_start', 'sounds/start.mp3');
    this.load.audio('sfx_go', 'sounds/go.mp3');
    this.load.audio('sfx_win', 'sounds/win.mp3');
    this.load.audio('sfx_orb', 'sounds/orb.mp3');
    this.load.audio('sfx_atkmonster', 'sounds/atkmonster.mp3');
    this.load.audio('bgm_battle', 'sounds/battle.mp3');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Sfondo loading
    this.cameras.main.setBackgroundColor('#0d0f1a');

    this.add.text(W / 2, H / 2 - 80, 'MIDI Chord Runner', {
      fontFamily: 'Outfit, sans-serif', fontSize: '32px',
      fontStyle: 'bold', color: '#e8eaf6',
    }).setOrigin(0.5);

    const sub = this.add.text(W / 2, H / 2 + 50, 'Loading assets...', {
      fontFamily: 'Outfit, sans-serif', fontSize: '15px', color: '#a29bfe',
    }).setOrigin(0.5);

    // Barra
    const bar = this.add.graphics();
    bar.lineStyle(2, 0xa29bfe, 0.4);
    bar.strokeRoundedRect(W / 2 - 180, H / 2 - 12, 360, 24, 8);

    // Genera tutte le texture
    _generateTextures(this);

    // Completa barra
    bar.fillStyle(0xa29bfe, 1);
    bar.fillRoundedRect(W / 2 - 177, H / 2 - 9, 354, 18, 6);
    sub.setText('Ready to play!');

    // Invece di far partire il gioco subito, aspetta che l'utente scelga il livello e l'input.
    window.startGame = (levelIndex, speedMs, durVal, waitMode, customOptions, survivalOptions, wrongPenalty) => {
      this.scene.start('GameScene', {
        levelIndex: levelIndex || 0,
        speedMs: speedMs || 3000,
        durationSec: durVal || 60,
        waitMode: waitMode || false,
        customOptions: customOptions,
        survivalOptions: survivalOptions,
        wrongPenalty: wrongPenalty !== false,
      });
    };
  }
}

/* ══════════════════════════════════════════════════════════════
   TEXTURE PROCEDURALI
   Tutte le texture usano Graphics.generateTexture() di Phaser 3.
══════════════════════════════════════════════════════════════ */

function _generateTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  /* ── PLAYER ────────────────────────────────────────────────── */
  const _drawPlayer = (frameType) => {
    g.clear();
    // Torso/Leg offset for bobbing
    const bob = (frameType === 'walk1' || frameType === 'walk2') ? 2 : 0;

    // Calcolo posizioni dinamiche per camminata in profilo
    let bArmY = 26 + bob; // Braccio dietro
    let fArmY = 26 + bob; // Braccio davanti
    let bLegX = 6;        // Gamba dietro
    let fLegX = 12;       // Gamba davanti
    let bShoeY = 42;
    let fShoeY = 42;

    if (frameType === 'walk1') {
      bArmY += 3; fArmY -= 3;
      bLegX += 4; fLegX -= 4;
      bShoeY -= 3;
    } else if (frameType === 'walk2') {
      bArmY -= 3; fArmY += 3;
      bLegX -= 4; fLegX += 4;
      fShoeY -= 3;
    }

    // 1. Braccio DIETRO (più scuro per profondità)
    g.fillStyle(0xd9a05a, 1);
    g.fillRect(2, bArmY, 6, 10);
    g.fillStyle(0xdddddd, 1);
    g.fillRect(2, bArmY + 8, 6, 5);

    // 2. Gamba DIETRO (Scarpa scura)
    g.fillStyle(0x521e0b, 1);
    g.fillRect(bLegX, bShoeY, 10, 6);

    // 3. CORPO (Profilo - Salopette blu)
    g.fillStyle(0x1d4ed8, 1);
    g.fillRect(7, 26 + bob, 14, 16);

    // 4. TESTA (Profilo - Pelle)
    g.fillStyle(0xfbbf6a, 1);
    g.fillRect(8, 10 + bob, 16, 16);

    // 5. CAPPELLO (Profilo - Rosso)
    g.fillStyle(0xcc1111, 1);
    g.fillRect(4, 0 + bob, 20, 8);  // Parte alta
    g.fillRect(2, 6 + bob, 24, 4);  // Fascia
    g.fillStyle(0xaa0e0e, 1);
    g.fillRect(15, 7 + bob, 16, 3); // Visiera lunga che punta a destra

    // 6. DETTAGLI VISO (Occhio e Baffi a destra)
    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(19, 13 + bob, 4, 5); // Occhio orientato a destra
    g.fillStyle(0x6b3a1f, 1);
    g.fillRect(22, 19 + bob, 5, 3); // Baffo che punta a destra

    // 7. Braccio DAVANTI (Pelle + Guanto)
    g.fillStyle(0xfbbf6a, 1);
    g.fillRect(11, fArmY, 7, 10);
    g.fillStyle(0xffffff, 1);
    g.fillRect(11, fArmY + 8, 7, 6);

    // 8. Gamba DAVANTI (Scarpa chiara luminosa)
    g.fillStyle(0x7c2d12, 1);
    g.fillRect(fLegX, fShoeY, 12, 7);
  };

  _drawPlayer('idle');
  g.generateTexture('player_idle', 32, 48);
  g.generateTexture('player', 32, 48); // compatibility

  _drawPlayer('walk1');
  g.generateTexture('player_walk1', 32, 48);

  _drawPlayer('walk2');
  g.generateTexture('player_walk2', 32, 48);

  /* ── OSTACOLO (blocco Mario stile "Goomba brick") ─────────── */
  g.clear();
  // Base mattone scuro (4 righe × 14px)
  const BW = 52, BH = 56;
  for (let row = 0; row < 4; row++) {
    const y = row * 14;
    // Colore alternato per file dispari/pari
    g.fillStyle(row % 2 === 0 ? 0xb85c1a : 0xa04f15, 1);
    g.fillRect(0, y, BW, 14);
    // Giunto verticale (offset a scacchiera)
    g.fillStyle(0x7a3810, 1);
    g.fillRect(0, y, BW, 2); // giunto orizzontale
    const offset = row % 2 === 0 ? 0 : 26;
    g.fillRect(offset % BW, y + 2, 2, 12);
    if (offset + 26 < BW) g.fillRect(offset + 26, y + 2, 2, 12);
  }
  // Faccia "nemica" al centro
  g.fillStyle(0xfef3c7, 1); g.fillEllipse(BW / 2, 18, 30, 22);
  g.fillStyle(0x1e1b4b, 1);
  g.fillRect(13, 12, 7, 7); g.fillRect(32, 12, 7, 7); // occhi
  // Sopracciglia arrabbiate
  g.fillStyle(0x1e1b4b, 1);
  g.fillRect(12, 10, 9, 3); g.fillRect(31, 10, 9, 3);
  // Bocca
  g.fillStyle(0xb91c1c, 1); g.fillRect(18, 22, 16, 3);
  // Zanne
  g.fillStyle(0xffffff, 1); g.fillRect(19, 21, 4, 5); g.fillRect(29, 21, 4, 5);
  g.generateTexture('obstacle', BW, BH);

  /* ── GROUND TILE — mattoni Mario ──────────────────────────── */
  // Ogni tile è 32×32, simula il classico blocco Mario Underground/above
  // Schema: due mattoni per riga, 2 righe, con offset
  _makeGroundTile(scene, g);

  /* ── NUVOLA ────────────────────────────────────────────────── */
  g.clear();
  g.fillStyle(0xffffff, 1);
  // Forma nuvola morbida composta da ellissi
  g.fillEllipse(54, 36, 80, 40);
  g.fillEllipse(30, 32, 50, 38);
  g.fillEllipse(78, 32, 50, 38);
  g.fillEllipse(54, 24, 46, 36);
  g.fillEllipse(40, 26, 36, 30);
  g.fillEllipse(68, 26, 36, 30);
  // Ombra lieve
  g.fillStyle(0xdbeafe, 0.6);
  g.fillEllipse(56, 46, 72, 14);
  g.generateTexture('cloud', 112, 58);

  /* ── PARTICELLA ────────────────────────────────────────────── */
  g.clear();
  g.fillStyle(0xffffff, 1); g.fillCircle(6, 6, 6);
  g.generateTexture('particle', 12, 12);

  /* ── STELLA ────────────────────────────────────────────────── */
  g.clear();
  g.fillStyle(0xffd166, 1);
  const starPts = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? 14 : 6;
    starPts.push({ x: 16 + Math.cos(ang) * rad, y: 16 + Math.sin(ang) * rad });
  }
  g.fillPoints(starPts, true);
  g.fillStyle(0xfff3b0, 0.7); g.fillCircle(13, 12, 4); // shine
  g.generateTexture('star', 32, 32);

  // ── Texture COMBAT ──────────────────────────────────────────
  _generateMonsterTextures(scene);

  g.destroy();
}

/* ══════════════════════════════════════════════════════════════
   TEXTURE MOSTRI — generate proceduralmente
══════════════════════════════════════════════════════════════ */
function _generateMonsterTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  /* ── MONSTER SMALL — Gremlin 🔥 ──────────────────────────────── */
  g.clear();
  // Corpo rotondo arancione piccolo
  g.fillStyle(0xff6b35, 1); g.fillEllipse(24, 28, 40, 36);
  // Occhi bianchi grandi
  g.fillStyle(0xffffff, 1); g.fillCircle(16, 22, 7); g.fillCircle(32, 22, 7);
  // Pupille nere
  g.fillStyle(0x111111, 1); g.fillCircle(17, 23, 4); g.fillCircle(33, 23, 4);
  // Linee carica (riflesso)
  g.fillStyle(0xffffff, 0.8); g.fillCircle(15, 21, 2); g.fillCircle(31, 21, 2);
  // Bocca arrabbiata
  g.fillStyle(0x7a1a00, 1); g.fillRect(15, 30, 18, 4);
  g.fillStyle(0xffffff, 1); g.fillRect(16, 29, 4, 4); g.fillRect(28, 29, 4, 4);
  // Corna piccole
  g.fillStyle(0xcc3300, 1); g.fillTriangle(10, 14, 16, 4, 20, 14);
  g.fillTriangle(28, 14, 32, 4, 38, 14);
  // Zampe
  g.fillStyle(0xe05020, 1);
  g.fillRect(4, 40, 10, 12); g.fillRect(34, 40, 10, 12);
  // Piedi
  g.fillStyle(0x7a2D00, 1);
  g.fillEllipse(9, 52, 14, 8); g.fillEllipse(39, 52, 14, 8);
  g.generateTexture('monster_small', 48, 58);

  /* ── MONSTER MEDIUM — Shambler ❄️ ─────────────────────────────── */
  g.clear();
  // Corpo medio azzurro
  g.fillStyle(0x4a90d9, 1); g.fillEllipse(32, 36, 56, 52);
  // Highlight ghiaccio
  g.fillStyle(0xa8d8f0, 0.5); g.fillEllipse(26, 26, 24, 18);
  // Occhi
  g.fillStyle(0xffffff, 1); g.fillCircle(22, 28, 9); g.fillCircle(42, 28, 9);
  g.fillStyle(0x001a3d, 1); g.fillCircle(23, 29, 5); g.fillCircle(43, 29, 5);
  g.fillStyle(0xffffff, 1); g.fillCircle(21, 27, 2); g.fillCircle(41, 27, 2);
  // Bocca
  g.fillStyle(0x002244, 1); g.fillEllipse(32, 42, 22, 10);
  g.fillStyle(0xffffff, 1);
  g.fillRect(20, 40, 5, 6); g.fillRect(28, 40, 5, 6); g.fillRect(36, 40, 5, 6);
  // Cristalli ghiaccio sulla testa
  g.fillStyle(0xa8d8f0, 1);
  g.fillTriangle(18, 16, 22, 2, 26, 16);
  g.fillTriangle(28, 14, 32, 0, 36, 14);
  g.fillTriangle(38, 16, 42, 2, 46, 16);
  // Braccia
  g.fillStyle(0x3a7ab8, 1);
  g.fillRect(2, 30, 12, 18); g.fillRect(50, 30, 12, 18);
  // Zampe
  g.fillStyle(0x2a5a8a, 1);
  g.fillRect(10, 56, 14, 10); g.fillRect(40, 56, 14, 10);
  g.generateTexture('monster_medium', 64, 68);

  /* ── MONSTER LARGE — Brute 💀 ─────────────────────────────────── */
  g.clear();
  // Corpo massiccio viola scuro
  g.fillStyle(0x5a3080, 1); g.fillRect(8, 20, 64, 72);
  g.fillStyle(0x7a40a0, 1); g.fillRect(10, 18, 60, 24); // testa più chiara
  // Highlight
  g.fillStyle(0x9060c0, 0.4); g.fillRect(12, 20, 24, 12);
  // Occhi grandi luminosi
  g.fillStyle(0xff4444, 1); g.fillCircle(26, 30, 10); g.fillCircle(54, 30, 10);
  g.fillStyle(0x880000, 1); g.fillCircle(27, 31, 6); g.fillCircle(55, 31, 6);
  g.fillStyle(0xff8888, 1); g.fillCircle(24, 28, 3); g.fillCircle(52, 28, 3);
  // Sopracciglia pesanti
  g.fillStyle(0x2a1040, 1); g.fillRect(16, 20, 20, 6); g.fillRect(44, 20, 20, 6);
  // Naso piatto
  g.fillStyle(0x3a1a60, 1); g.fillRect(34, 34, 12, 8);
  // Bocca con zanne
  g.fillStyle(0x1a0030, 1); g.fillRect(18, 44, 44, 10);
  g.fillStyle(0xffffff, 1); g.fillRect(20, 44, 8, 10); g.fillRect(52, 44, 8, 10);
  g.fillRect(28, 44, 6, 6); g.fillRect(46, 44, 6, 6);
  // Armatura torace
  g.fillStyle(0x2a1840, 1); g.fillRect(12, 54, 56, 36);
  g.fillStyle(0x4a3060, 0.7); g.fillRect(14, 56, 52, 8);
  // Braccia enormi
  g.fillStyle(0x5a3080, 1);
  g.fillRect(0, 24, 10, 52); g.fillRect(70, 24, 10, 52);
  // Mani chiuse a pugno
  g.fillStyle(0x3a1a60, 1);
  g.fillRect(-2, 68, 14, 14); g.fillRect(68, 68, 14, 14);
  // Gambe
  g.fillStyle(0x2a1040, 1);
  g.fillRect(14, 88, 22, 18); g.fillRect(44, 88, 22, 18);
  g.generateTexture('monster_large', 80, 106);

  /* ── MONSTER ELITE — Overlord 💎 ──────────────────────────────── */
  g.clear();
  // Mantello nero con bordo dorato
  g.fillStyle(0x0d0d1a, 1); g.fillRect(0, 30, 90, 100);
  g.fillStyle(0xffd166, 0.6); g.fillRect(0, 30, 4, 100); g.fillRect(86, 30, 4, 100);
  // Corpo centrale
  g.fillStyle(0x1a0a40, 1); g.fillRect(18, 22, 54, 80);
  // Highlight arcano
  g.fillStyle(0x9060ff, 0.5); g.fillRect(20, 24, 24, 20);
  // Corona dorata
  g.fillStyle(0xffd166, 1);
  g.fillRect(18, 10, 54, 14);
  g.fillRect(28, 0, 10, 14);
  g.fillRect(40, -4, 10, 14);
  g.fillRect(52, 0, 10, 14);
  // Gemme corona
  g.fillStyle(0xff6b9d, 1); g.fillCircle(33, 6, 5);
  g.fillStyle(0x06d6a0, 1); g.fillCircle(45, 2, 5);
  g.fillStyle(0xa29bfe, 1); g.fillCircle(57, 6, 5);
  // Occhi arcani glow
  g.fillStyle(0xffd166, 1); g.fillCircle(32, 38, 12); g.fillCircle(58, 38, 12);
  g.fillStyle(0xff9900, 1); g.fillCircle(32, 38, 8); g.fillCircle(58, 38, 8);
  g.fillStyle(0xffffff, 1); g.fillCircle(29, 36, 4); g.fillCircle(55, 36, 4);
  // Bocca regale
  g.fillStyle(0x0d0d00, 1); g.fillRect(24, 52, 42, 12);
  g.fillStyle(0xffd166, 1);
  g.fillRect(26, 52, 6, 12); g.fillRect(36, 52, 6, 12); g.fillRect(52, 52, 6, 12);
  // Spell orbs ai lati
  g.fillStyle(0xa29bfe, 0.9); g.fillCircle(6, 50, 10);
  g.fillStyle(0x06d6a0, 0.9); g.fillCircle(84, 50, 10);
  g.fillStyle(0xffffff, 0.7); g.fillCircle(4, 48, 4); g.fillCircle(82, 48, 4);
  // Mantello bordo inferiore
  g.fillStyle(0xffd166, 0.4);
  for (let i = 0; i < 9; i++) { g.fillTriangle(i * 10, 130, i * 10 + 5, 120, i * 10 + 10, 130); }
  g.generateTexture('monster_elite', 90, 132);

  /* ── MONSTER IMP — 🦇 Imp (Shadow) ─────────────────────────────── */
  g.clear();
  // Corpo piccolo viola scuro, leggermente a goccia
  g.fillStyle(0x6a0dad, 1); g.fillEllipse(26, 30, 38, 46);
  // Ali membranose
  g.fillStyle(0x4a0080, 0.85);
  g.fillTriangle(0, 22, 26, 32, 12, 50);
  g.fillTriangle(52, 22, 26, 32, 40, 50);
  // Costole ali
  g.fillStyle(0x8b00ff, 0.5);
  g.fillRect(4, 28, 18, 2); g.fillRect(34, 28, 18, 2);
  // Testa con orecchie appuntite
  g.fillStyle(0x7c2ddb, 1); g.fillEllipse(26, 16, 28, 24);
  g.fillStyle(0x6a0dad, 1);
  g.fillTriangle(14, 10, 10, -2, 20, 10);  // orecchio sx
  g.fillTriangle(38, 10, 42, -2, 32, 10);  // orecchio dx
  // Occhi rosso-glow
  g.fillStyle(0xff2d55, 1); g.fillCircle(20, 16, 5); g.fillCircle(32, 16, 5);
  g.fillStyle(0xff7fa3, 1); g.fillCircle(19, 15, 2); g.fillCircle(31, 15, 2);
  // Zannette
  g.fillStyle(0xffffff, 1); g.fillRect(21, 24, 3, 5); g.fillRect(28, 24, 3, 5);
  // Codino
  g.fillStyle(0x4a0080, 1);
  g.fillEllipse(26, 55, 8, 14);
  g.generateTexture('monster_imp', 52, 62);

  /* ── MONSTER WRAITH — 👻 Wraith (Darkness) ──────────────────────── */
  g.clear();
  // Corpo etereo/fluttuante - forma a fantasma
  g.fillStyle(0x5f27cd, 0.85); g.fillEllipse(32, 28, 50, 44);
  // Coda ondulata (basso del fantasma)
  g.fillStyle(0x341f97, 0.9);
  g.fillEllipse(18, 56, 18, 22);
  g.fillEllipse(32, 60, 18, 22);
  g.fillEllipse(46, 56, 18, 22);
  // Overlay glow
  g.fillStyle(0x9b59b6, 0.4); g.fillEllipse(30, 24, 30, 26);
  // Occhi vuoti (buchi neri)
  g.fillStyle(0x0d0d1a, 1); g.fillEllipse(22, 26, 14, 16); g.fillEllipse(42, 26, 14, 16);
  // Pupille glow viola
  g.fillStyle(0xc39bd3, 0.9); g.fillCircle(22, 26, 5); g.fillCircle(42, 26, 5);
  // Bocca urlo (ovale verticale)
  g.fillStyle(0x0d0d1a, 1); g.fillEllipse(32, 40, 12, 14);
  // Mani spettrali ai lati
  g.fillStyle(0x5f27cd, 0.7);
  g.fillEllipse(6, 34, 14, 10); g.fillEllipse(58, 34, 14, 10);
  g.fillStyle(0x341f97, 0.8);
  g.fillCircle(4, 32, 4); g.fillCircle(8, 38, 3); g.fillCircle(12, 34, 3);
  g.fillCircle(56, 32, 4); g.fillCircle(60, 38, 3); g.fillCircle(56, 34, 3);
  g.generateTexture('monster_wraith', 64, 74);

  /* ── MONSTER GOLEM — 🗿 Golem (Earth) ───────────────────────────── */
  g.clear();
  // Corpo massiccio verde scuro, blocchi di pietra
  g.fillStyle(0x2d6a4f, 1); g.fillRect(12, 22, 52, 70);
  // Crepe nelle pietre
  g.fillStyle(0x1b4332, 1);
  g.fillRect(12, 22, 52, 4);   // riga orizzontale testa
  g.fillRect(12, 52, 52, 3);   // riga orizontale centro
  g.fillRect(12, 74, 52, 3);   // riga orizontale bassa
  g.fillRect(38, 22, 3, 30);   // crepa verticale testa
  g.fillRect(24, 52, 3, 22);   // crepa verticale corpo
  g.fillRect(50, 52, 3, 22);   // crepa verticale corpo
  // Testa rocciosa
  g.fillStyle(0x40916c, 1); g.fillRect(14, 4, 48, 20);
  g.fillStyle(0x2d6a4f, 1); g.fillRect(14, 4, 48, 4);
  // Occhi di pietra incandescenti
  g.fillStyle(0x52b788, 1); g.fillRect(20, 9, 12, 9); g.fillRect(44, 9, 12, 9);
  g.fillStyle(0xb7e4c7, 0.9); g.fillRect(21, 10, 6, 5); g.fillRect(45, 10, 6, 5);
  // Bocca denti di pietra
  g.fillStyle(0x1b4332, 1); g.fillRect(24, 19, 28, 5);
  g.fillStyle(0xd8f3dc, 1);
  g.fillRect(25, 19, 5, 5); g.fillRect(32, 19, 5, 5); g.fillRect(39, 19, 5, 5); g.fillRect(46, 19, 5, 5);
  // Braccia blocchi
  g.fillStyle(0x2d6a4f, 1);
  g.fillRect(0, 26, 14, 40); g.fillRect(62, 26, 14, 40);
  g.fillStyle(0x1b4332, 1);
  g.fillRect(0, 26, 14, 3); g.fillRect(62, 26, 14, 3);
  // Pugni
  g.fillStyle(0x40916c, 1);
  g.fillRect(0, 64, 16, 16); g.fillRect(60, 64, 16, 16);
  // Gambe piloni
  g.fillStyle(0x2d6a4f, 1);
  g.fillRect(16, 90, 22, 16); g.fillRect(38, 90, 22, 16);
  g.generateTexture('monster_golem', 76, 108);

  /* ── MONSTER WARLORD — ⚔️ Warlord (Steel) ───────────────────────── */
  g.clear();
  // Elmo metallico
  g.fillStyle(0x636e72, 1); g.fillEllipse(40, 16, 50, 28);
  g.fillStyle(0x2d3436, 1); g.fillRect(16, 10, 48, 10);
  // Visiera dell'elmo
  g.fillStyle(0x2d3436, 1); g.fillRect(26, 16, 28, 8);
  g.fillStyle(0xff2d00, 0.9); g.fillRect(28, 18, 24, 4); // occhi rossi sotto visiera
  // Cimiero penna rossa
  g.fillStyle(0xd63031, 1);
  for (let i = 0; i < 5; i++) { g.fillRect(30 + i * 3, 0, 3, 10 + i * 2); }
  // Armatura torace pesante
  g.fillStyle(0x636e72, 1); g.fillRect(12, 28, 56, 50);
  // Petto placca
  g.fillStyle(0x74b9ff, 0.3); g.fillRect(14, 30, 52, 8);
  // Linee armatura
  g.fillStyle(0x2d3436, 1);
  g.fillRect(12, 28, 56, 3); g.fillRect(12, 50, 56, 3); g.fillRect(12, 68, 56, 3);
  g.fillRect(40, 28, 3, 40);
  // Spallacci
  g.fillStyle(0x4a4f52, 1);
  g.fillEllipse(6, 32, 22, 16); g.fillEllipse(74, 32, 22, 16);
  // Braccia corazzate
  g.fillStyle(0x636e72, 1);
  g.fillRect(0, 38, 14, 30); g.fillRect(66, 38, 14, 30);
  // Scudo sulla sinistra
  g.fillStyle(0x2c3e50, 1); g.fillEllipse(-4, 56, 18, 36);
  g.fillStyle(0xd63031, 0.8); g.fillRect(-10, 50, 4, 12);
  // Spada sulla destra
  g.fillStyle(0xdfe6e9, 1);
  g.fillRect(78, 20, 5, 60); // lama
  g.fillStyle(0xffd166, 1);
  g.fillRect(72, 42, 18, 5); // guardia
  g.fillStyle(0xa29bfe, 1);
  g.fillRect(80, 78, 4, 10); // impugnatura
  // Gambe con schinieri
  g.fillStyle(0x636e72, 1); g.fillRect(16, 78, 24, 24); g.fillRect(40, 78, 24, 24);
  g.fillStyle(0x2d3436, 1); g.fillRect(16, 78, 24, 3); g.fillRect(40, 78, 24, 3);
  g.generateTexture('monster_warlord', 90, 104);

  /* ── MONSTER VOIDWALKER — 🌀 Void Walker ────────────────────────── */
  g.clear();
  // Mantello cosmico (fondo)
  g.fillStyle(0x0a0a1f, 1); g.fillEllipse(44, 60, 80, 100);
  // Stelle/particelle nel mantello
  g.fillStyle(0xffffff, 0.6);
  for (let i = 0; i < 14; i++) {
    const sx = 10 + (i * 23) % 68;
    const sy = 30 + (i * 17) % 70;
    g.fillCircle(sx, sy, 1 + (i % 2));
  }
  // Corpo centrale viola cosmico
  g.fillStyle(0x130f3f, 1); g.fillRect(20, 14, 48, 80);
  // Bordo glow ciano
  g.fillStyle(0x00cec9, 0.6); g.fillRect(18, 12, 52, 4);
  g.fillStyle(0x00cec9, 0.4); g.fillRect(16, 16, 56, 2);
  // Testa sferica con vortice
  g.fillStyle(0x0d0d2e, 1); g.fillCircle(44, 20, 22);
  // Vortice negli occhi
  g.fillStyle(0x00cec9, 0.9); g.fillCircle(36, 20, 10); g.fillCircle(52, 20, 10);
  g.fillStyle(0x0d0d2e, 1); g.fillCircle(36, 20, 6); g.fillCircle(52, 20, 6);
  g.fillStyle(0x00cec9, 1); g.fillCircle(36, 20, 3); g.fillCircle(52, 20, 3);
  g.fillStyle(0xffffff, 1); g.fillCircle(35, 19, 1); g.fillCircle(51, 19, 1);
  // Bocca vortice
  g.fillStyle(0x130f3f, 1); g.fillEllipse(44, 34, 18, 10);
  g.fillStyle(0x00cec9, 0.7); g.fillEllipse(44, 34, 10, 6);
  // Tentacoli cosmici
  g.fillStyle(0x6c5ce7, 0.8);
  g.fillRect(8, 40, 12, 6); g.fillRect(0, 50, 10, 6); g.fillRect(8, 60, 12, 6);
  g.fillRect(68, 40, 12, 6); g.fillRect(78, 50, 10, 6); g.fillRect(68, 60, 12, 6);
  g.fillStyle(0x00cec9, 0.6);
  g.fillCircle(6, 56, 5); g.fillCircle(82, 56, 5);
  g.generateTexture('monster_voidwalker', 88, 120);

  /* ── HEAL ORB ──────────────────────────────────────────────── */
  g.clear();
  // Alone esterno (verde pulsante)
  g.fillStyle(0x06d6a0, 0.25); g.fillCircle(32, 32, 30);
  g.fillStyle(0x06d6a0, 0.4); g.fillCircle(32, 32, 24);
  // Corpo principale  
  g.fillStyle(0x00b894, 1); g.fillCircle(32, 32, 18);
  g.fillStyle(0x06d6a0, 1); g.fillCircle(32, 32, 14);
  // Cuore al centro
  g.fillStyle(0xffffff, 1);
  g.fillRect(29, 26, 6, 12);
  g.fillRect(23, 28, 18, 6);
  // Shine
  g.fillStyle(0xffffff, 0.7); g.fillCircle(26, 26, 5);
  g.fillStyle(0xffffff, 0.4); g.fillCircle(38, 22, 3);
  g.generateTexture('heal_orb', 64, 64);

  g.destroy();
}

/* ── Ground tile separata (schema mattoni Mario) ────────────── */
function _makeGroundTile(scene, g) {
  const T = 32; // tile size
  g.clear();

  // Sfondo base: colore mattone scuro
  g.fillStyle(0xc2612a, 1);
  g.fillRect(0, 0, T, T);

  // Giunti del mortaio (linee scure)
  g.fillStyle(0x8b3e18, 1);
  // Linea orizzontale a metà (divide le due righe di mattoni)
  g.fillRect(0, T / 2 - 1, T, 2);
  // Linea orizzontale in cima
  g.fillRect(0, 0, T, 2);
  // Linea orizzontale in fondo
  g.fillRect(0, T - 2, T, 2);

  // ── Riga ALTA — giunto verticale al centro ──
  g.fillRect(T / 2 - 1, 0, 2, T / 2);

  // ── Riga BASSA — giunto verticale a 1/4 e 3/4 ──
  g.fillRect(T / 4 - 1, T / 2, 2, T / 2);
  g.fillRect((T * 3) / 4 - 1, T / 2, 2, T / 2);

  // Highlight chiaro in alto-sinistra di ogni mattone (effetto 3D)
  g.fillStyle(0xe07840, 0.5);
  // Riga alta – mattone sinistra
  g.fillRect(2, 2, T / 2 - 4, 3);
  g.fillRect(2, 2, 3, T / 2 - 4);
  // Riga alta – mattone destra
  g.fillRect(T / 2 + 2, 2, T / 2 - 4, 3);
  g.fillRect(T / 2 + 2, 2, 3, T / 2 - 4);
  // Riga bassa – mattone sinistra piccola
  g.fillRect(2, T / 2 + 2, T / 4 - 4, 3);
  // Riga bassa – mattone centro
  g.fillRect(T / 4 + 2, T / 2 + 2, T / 2 - 4, 3);
  // Riga bassa – mattone destra piccola
  g.fillRect((T * 3) / 4 + 2, T / 2 + 2, T / 4 - 4, 3);

  g.generateTexture('ground', T, T);
}
