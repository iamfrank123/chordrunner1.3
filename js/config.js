/**
 * config.js — Configurazione globale del gioco
 * Tutti i parametri modificabili si trovano qui.
 */

const CONFIG = {
  /* ── Canvas ─────────────────────────────── */
  WIDTH:  900,
  HEIGHT: 400,

  /* ── Physics ────────────────────────────── */
  GRAVITY:      1800,   // px/s²
  JUMP_FORCE:  -950,    // px/s (negativo = su) - aumentato per un salto più alto
  PLAYER_SPEED: 0,      // il player è fermo, sono gli ostacoli che si muovono

  /* ── Obstacles ──────────────────────────── */
  BASE_OBSTACLE_SPEED:  260,  // px/s
  SPEED_INCREMENT:       30,  // px/s per livello
  BASE_SPAWN_INTERVAL: 2400,  // ms
  MIN_SPAWN_INTERVAL:   900,  // ms minimo
  SPAWN_DECREMENT:       200, // ms per livello

  /* ── Timing window ──────────────────────── */
  TIMING_WINDOW_MS: 1200,   // finestra per suonare l'accordo (ms) - ingrandita per più margine
  TRIGGER_ZONE_X:   360,    // spostato ulteriormente a destra come richiesto per avere fisicamente più distanza d'anticipo

  /* ── Lives & Score ──────────────────────── */
  INITIAL_LIVES:  5,
  SCORE_CORRECT:  100,
  SCORE_BONUS_TIMING: 50,  // bonus se timing perfetto
  SCORE_WRONG:   -20,

  /* ── Level duration ─────────────────────── */
  LEVEL_DURATION_SEC: 60,

  /* ── Colors (Phaser) ────────────────────── */
  SKY_TOP:    0x1a1a3e,
  SKY_BOTTOM: 0x0d6efd,
  GROUND_TOP: 0x4caf50,
  GROUND_MID: 0x388e3c,
  GROUND_BOT: 0x2e7d32,
  BRICK_COLOR: 0xb04c2b,
  BRICK_DARK:  0x8b3520,

  /* ── Misc ───────────────────────────────── */
  DEBUG: false,

  /* ══════════════════════════════════════════════════════════════
     ⚔️  COMBAT SYSTEM
  ══════════════════════════════════════════════════════════════ */

  /* ── Player HP ──────────────────────────────────────────────── */
  PLAYER_MAX_HP:        5,

  /* ── Monster Spawn ──────────────────────────────────────────── */
  MONSTER_SPAWN_CHANCE:    0.28,
  MONSTER_SPAWN_INTERVAL:  8000,
  HEAL_ORB_SPAWN_CHANCE:   0.40,
  HEAL_ORB_SPAWN_INTERVAL: 8000,

  /* ── Combat Timing ──────────────────────────────────────────── */
  COMBAT_ATTACK_INTERVAL:      2800,
  COMBAT_FIRST_ATTACK_DELAY:   1200,
  TIMING_PERFECT_MS:            120,
  TIMING_GOOD_MS:               300,
  TIMING_LATE_MS:               550,

  /* ── Damage ──────────────────────────────────────────────────── */
  COMBAT_DMG_PERFECT:      1.00,
  COMBAT_DMG_GOOD:         0.70,
  COMBAT_DMG_LATE:         0.30,
  MONSTER_ATTACK_DAMAGE:   1,
  WEAKNESS_BONUS_MULT:     1.5,

  /* ── Heavy Attack ───────────────────────────────────────────── */
  HEAVY_ATTACK_CHANCE:      0.18,
  HEAVY_ATTACK_DMG_MULT:    2.5,
  HEAVY_ATTACK_COUNTER_DMG: 2,

  /* ── Score Combat ───────────────────────────────────────────── */
  SCORE_MONSTER_KILL:   300,
  SCORE_COMBAT_PERFECT: 150,
  SCORE_COMBAT_GOOD:    80,
  SCORE_HEAL_ORB:       50,

  /* ── Monster HP ─────────────────────────────────────────────── */
  MONSTER_HP: {
    small:      { min: 30,  max: 50  },
    imp:        { min: 40,  max: 60  },
    medium:     { min: 60,  max: 90  },
    wraith:     { min: 75,  max: 100 },
    golem:      { min: 95,  max: 130 },
    large:      { min: 100, max: 150 },
    warlord:    { min: 130, max: 165 },
    voidwalker: { min: 150, max: 200 },
    elite:      { min: 160, max: 250 },
  },

  /* ── Monster Spawn Weights ───────────────────────────────────── */
  MONSTER_WEIGHTS: {
    small:      40,
    imp:        25,
    medium:     22,
    wraith:     18,
    golem:      15,
    large:      12,
    warlord:    8,
    voidwalker: 5,
    elite:      3,
  },
};



/**
 * Definizione livelli: ogni livello ha un nome, un set di accordi
 * disponibili e moltiplicatori di difficoltà.
 */
const LEVELS = [
  {
    id: 1,
    name: 'Major Chords',
    chordTypes: ['major'],
    chords: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'], // Tutti gli accordi maggiori inclusi alterazioni
    speedMult: 1.0,
    spawnMult: 1.0,
  },
  {
    id: 2,
    name: 'Minor Chords',
    chordTypes: ['minor'],
    chords: ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm'],
    speedMult: 1.15,
    spawnMult: 1.2,
  },
  {
    id: 3,
    name: 'Major & Minor Mix',
    chordTypes: ['major', 'minor'],
    chords: [
      'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
      'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm'
    ],
    speedMult: 1.2,
    spawnMult: 1.3,
  },
  {
    id: 4,
    name: 'Augmented Chords',
    chordTypes: ['aug'],
    chords: ['Caug', 'C#aug', 'Daug', 'Ebaug', 'Eaug', 'Faug', 'F#aug', 'Gaug', 'Abaug', 'Aaug', 'Bbaug', 'Baug'],
    speedMult: 1.3,
    spawnMult: 1.4,
  },
  {
    id: 5,
    name: 'Diminished Chords',
    chordTypes: ['dim'],
    chords: ['Cdim', 'C#dim', 'Ddim', 'Ebdim', 'Edim', 'Fdim', 'F#dim', 'Gdim', 'Abdim', 'Adim', 'Bbdim', 'Bdim'],
    speedMult: 1.35,
    spawnMult: 1.45,
  },
  {
    id: 6,
    name: 'Suspended (sus2/sus4)',
    chordTypes: ['sus2', 'sus4'],
    chords: [
      'Csus2', 'C#sus2', 'Dsus2', 'Ebsus2', 'Esus2', 'Fsus2', 'F#sus2', 'Gsus2', 'Absus2', 'Asus2', 'Bbsus2', 'Bsus2',
      'Csus4', 'C#sus4', 'Dsus4', 'Ebsus4', 'Esus4', 'Fsus4', 'F#sus4', 'Gsus4', 'Absus4', 'Asus4', 'Bbsus4', 'Bsus4'
    ],
    speedMult: 1.35,
    spawnMult: 1.45,
  },
  {
    id: 7,
    name: 'Seventh Chords',
    chordTypes: ['maj7', 'min7', 'halfdim'],
    chords: [
      'Cmaj7', 'C#maj7', 'Dmaj7', 'Ebmaj7', 'Emaj7', 'Fmaj7', 'F#maj7', 'Gmaj7', 'Abmaj7', 'Amaj7', 'Bbmaj7', 'Bmaj7',
      'Cm7', 'C#m7', 'Dm7', 'Ebm7', 'Em7', 'Fm7', 'F#m7', 'Gm7', 'Abm7', 'Am7', 'Bbm7', 'Bm7',
      'Cm7b5', 'C#m7b5', 'Dm7b5', 'Ebm7b5', 'Em7b5', 'Fm7b5', 'F#m7b5', 'Gm7b5', 'Abm7b5', 'Am7b5', 'Bbm7b5', 'Bm7b5'
    ],
    speedMult: 1.4,
    spawnMult: 1.5,
  },
  {
    id: 8,
    name: 'Ninth Chords',
    chordTypes: ['maj9', 'min9'],
    chords: [
      'Cmaj9', 'C#maj9', 'Dmaj9', 'Ebmaj9', 'Emaj9', 'Fmaj9', 'F#maj9', 'Gmaj9', 'Abmaj9', 'Amaj9', 'Bbmaj9', 'Bmaj9',
      'Cm9', 'C#m9', 'Dm9', 'Ebm9', 'Em9', 'Fm9', 'F#m9', 'Gm9', 'Abm9', 'Am9', 'Bbm9', 'Bm9'
    ],
    speedMult: 1.4,
    spawnMult: 1.5,
  },
  {
    id: 9,
    name: 'Ultimate Mix (All)',
    chordTypes: ['major', 'minor', 'aug', 'dim', 'sus2', 'sus4', 'maj7', 'min7', 'halfdim', 'maj9', 'min9'],
    chords: [
      /* Maj */ 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
      /* Min */ 'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm',
      /* Aug */ 'Caug', 'C#aug', 'Daug', 'Ebaug', 'Eaug', 'Faug', 'F#aug', 'Gaug', 'Abaug', 'Aaug', 'Bbaug', 'Baug',
      /* Dim */ 'Cdim', 'C#dim', 'Ddim', 'Ebdim', 'Edim', 'Fdim', 'F#dim', 'Gdim', 'Abdim', 'Adim', 'Bbdim', 'Bdim',
      /* Sus */ 'Csus2', 'C#sus2', 'Dsus2', 'Ebsus2', 'Esus2', 'Fsus2', 'F#sus2', 'Gsus2', 'Absus2', 'Asus2', 'Bbsus2', 'Bsus2',
                'Csus4', 'C#sus4', 'Dsus4', 'Ebsus4', 'Esus4', 'Fsus4', 'F#sus4', 'Gsus4', 'Absus4', 'Asus4', 'Bbsus4', 'Bsus4',
      /* 7th */ 'Cmaj7', 'C#maj7', 'Dmaj7', 'Ebmaj7', 'Emaj7', 'Fmaj7', 'F#maj7', 'Gmaj7', 'Abmaj7', 'Amaj7', 'Bbmaj7', 'Bmaj7',
                'Cm7', 'C#m7', 'Dm7', 'Ebm7', 'Em7', 'Fm7', 'F#m7', 'Gm7', 'Abm7', 'Am7', 'Bbm7', 'Bm7',
                'Cm7b5', 'C#m7b5', 'Dm7b5', 'Ebm7b5', 'Em7b5', 'Fm7b5', 'F#m7b5', 'Gm7b5', 'Abm7b5', 'Am7b5', 'Bbm7b5', 'Bm7b5',
      /* 9th */ 'Cmaj9', 'C#maj9', 'Dmaj9', 'Ebmaj9', 'Emaj9', 'Fmaj9', 'F#maj9', 'Gmaj9', 'Abmaj9', 'Amaj9', 'Bbmaj9', 'Bmaj9',
                'Cm9', 'C#m9', 'Dm9', 'Ebm9', 'Em9', 'Fm9', 'F#m9', 'Gm9', 'Abm9', 'Am9', 'Bbm9', 'Bm9'
    ],
    speedMult: 1.5,
    spawnMult: 1.6,
  }
];
