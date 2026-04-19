/**
 * MonsterSystem.js — Gestione mostri, spawn, HP, weakness
 *
 * Tipi di mostro:
 *   small  → 2–4 HP   | Major triads     | piccolo e veloce
 *   medium → 5–8 HP   | Major + Minor + 7th
 *   large  → 9–15 HP  | 7th chords       | camera shake
 *   elite  → 16+ HP   | Extended chords  | boss aura
 *
 * Weakness:
 *   fire   → type 'maj7' / dominant 7th chords
 *   ice    → type 'minor' / 'min7'
 *   heavy  → type 'dim' / 'halfdim'
 *   arcane → type 'aug' / 'maj9'
 */

/* ── Chord pools per livello mostro ─────────────────────────── */
const MONSTER_CHORD_POOLS = {
  small: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Eb', 'Ab', 'Bb'],
  imp: [
    'C', 'D', 'E', 'F', 'G', 'A', 'B', 'Eb', 'Ab', 'Bb',
    'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm',
  ],
  medium: [
    'C', 'D', 'E', 'F', 'G', 'A', 'B', 'Eb', 'Ab', 'Bb',
    'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm',
    'Cmaj7', 'Gmaj7', 'Fmaj7', 'Dm7', 'Am7',
  ],
  wraith: [
    'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Am', 'Bm',
    'Cdim', 'Ddim', 'Edim', 'Fdim', 'Gdim', 'Adim', 'Bdim',
    'Cm7', 'Dm7', 'Em7', 'Am7',
  ],
  golem: [
    'Csus2', 'Dsus2', 'Esus2', 'Fsus2', 'Gsus2', 'Asus2',
    'Csus4', 'Dsus4', 'Esus4', 'Fsus4', 'Gsus4', 'Asus4',
    'Cmaj7', 'Gmaj7', 'Fmaj7', 'Dm7', 'Am7',
    'Caug', 'Daug', 'Eaug', 'Faug', 'Gaug',
  ],
  large: [
    'Cmaj7', 'C#maj7', 'Dmaj7', 'Ebmaj7', 'Emaj7', 'Fmaj7', 'F#maj7', 'Gmaj7', 'Abmaj7', 'Amaj7', 'Bbmaj7', 'Bmaj7',
    'Cm7', 'Dm7', 'Em7', 'Fm7', 'Gm7', 'Am7', 'Bm7',
    'Cm7b5', 'Dm7b5', 'Em7b5', 'Fm7b5',
  ],
  warlord: [
    'Cmaj7', 'Gmaj7', 'Fmaj7', 'Dm7', 'Am7', 'Em7', 'Bm7',
    'Cm7b5', 'Dm7b5', 'Em7b5', 'Gm7b5',
    'Cdim', 'Ddim', 'Edim', 'Fdim', 'Gdim', 'Adim', 'Bdim',
    'Caug', 'Daug', 'Eaug', 'Gaug', 'Aaug',
  ],
  voidwalker: [
    'Cmaj9', 'C#maj9', 'Dmaj9', 'Emaj9', 'Fmaj9', 'Gmaj9', 'Amaj9',
    'Cm9', 'Dm9', 'Em9', 'Gm9', 'Am9',
    'Cmaj7', 'Gmaj7', 'Fmaj7', 'Dm7', 'Am7',
    'Cdim', 'Ddim', 'Fdim', 'Gdim',
  ],
  elite: [
    'Cmaj9', 'C#maj9', 'Dmaj9', 'Emaj9', 'Fmaj9', 'Gmaj9', 'Abmaj9', 'Amaj9', 'Bbmaj9',
    'Cm9', 'Dm9', 'Em9', 'Gm9', 'Am9',
    'Cdim', 'Ddim', 'Edim', 'Fdim', 'Gdim', 'Adim', 'Bdim',
    'Caug', 'Daug', 'Eaug', 'Faug', 'Gaug', 'Aaug', 'Baug',
  ],
};

/* ── Definizione tipi mostro ─────────────────────────────────── */
const MONSTER_DEFS = {
  small: {
    key: 'small', label: '👾 Gremlin', textureKey: 'monster_small',
    chordPool: MONSTER_CHORD_POOLS.small,
    weakness: ['major'], element: 'fire', elementIcon: '🔥',
    color: 0xff6b35, glowColor: '#ff6b35',
    size: 1.825, attackSpeed: 0.85,
    spawnWeight: CONFIG.MONSTER_WEIGHTS.small,
    entranceAnim: 'slide',
  },
  imp: {
    key: 'imp', label: '🧿 Imp', textureKey: 'monster_imp',
    chordPool: MONSTER_CHORD_POOLS.imp,
    weakness: ['minor', 'major'], element: 'shadow', elementIcon: '🦇',
    color: 0xb84cff, glowColor: '#b84cff',
    size: 1.968, attackSpeed: 0.9,
    spawnWeight: CONFIG.MONSTER_WEIGHTS.imp,
    entranceAnim: 'slide',
  },
  medium: {
    key: 'medium', label: '🧟 Shambler', textureKey: 'monster_medium',
    chordPool: MONSTER_CHORD_POOLS.medium,
    weakness: ['minor', 'min7'], element: 'ice', elementIcon: '❄️',
    color: 0x74b9ff, glowColor: '#74b9ff',
    size: 2.10, attackSpeed: 1.0,
    spawnWeight: CONFIG.MONSTER_WEIGHTS.medium,
    entranceAnim: 'slide',
  },
  wraith: {
    key: 'wraith', label: '👻 Wraith', textureKey: 'monster_wraith',
    chordPool: MONSTER_CHORD_POOLS.wraith,
    weakness: ['dim', 'halfdim'], element: 'darkness', elementIcon: '🌑',
    color: 0x6c5ce7, glowColor: '#6c5ce7',
    size: 1.21, attackSpeed: 1.1,
    spawnWeight: CONFIG.MONSTER_WEIGHTS.wraith,
    entranceAnim: 'slide',
  },
  golem: {
    key: 'golem', label: '🗿 Golem', textureKey: 'monster_golem',
    chordPool: MONSTER_CHORD_POOLS.golem,
    weakness: ['aug', 'sus4'], element: 'earth', elementIcon: '🌍',
    color: 0x55efc4, glowColor: '#55efc4',
    size: 1.375, attackSpeed: 1.15,
    spawnWeight: CONFIG.MONSTER_WEIGHTS.golem,
    entranceAnim: 'stomp',
  },
  large: {
    key: 'large', label: '🐉 Brute', textureKey: 'monster_large',
    chordPool: MONSTER_CHORD_POOLS.large,
    weakness: ['dim', 'halfdim'], element: 'heavy', elementIcon: '💀',
    color: 0xa29bfe, glowColor: '#a29bfe',
    size: 1.54, attackSpeed: 1.2,
    spawnWeight: CONFIG.MONSTER_WEIGHTS.large,
    entranceAnim: 'stomp',
  },
  warlord: {
    key: 'warlord', label: '⚔️ Warlord', textureKey: 'monster_warlord',
    chordPool: MONSTER_CHORD_POOLS.warlord,
    weakness: ['maj7', 'dom7'], element: 'steel', elementIcon: '🛡️',
    color: 0xd63031, glowColor: '#d63031',
    size: 1.705, attackSpeed: 1.3,
    spawnWeight: CONFIG.MONSTER_WEIGHTS.warlord,
    entranceAnim: 'stomp',
  },
  voidwalker: {
    key: 'voidwalker', label: '🌀 Void Walker', textureKey: 'monster_voidwalker',
    chordPool: MONSTER_CHORD_POOLS.voidwalker,
    weakness: ['maj9', 'min9'], element: 'void', elementIcon: '⭕',
    color: 0x00cec9, glowColor: '#00cec9',
    size: 1.87, attackSpeed: 1.35,
    spawnWeight: CONFIG.MONSTER_WEIGHTS.voidwalker,
    entranceAnim: 'boss',
  },
  elite: {
    key: 'elite', label: '💎 Overlord', textureKey: 'monster_elite',
    chordPool: MONSTER_CHORD_POOLS.elite,
    weakness: ['aug', 'maj9'], element: 'arcane', elementIcon: '✨',
    color: 0xffd166, glowColor: '#ffd166',
    size: 1.98, attackSpeed: 1.4,
    spawnWeight: CONFIG.MONSTER_WEIGHTS.elite,
    entranceAnim: 'boss',
  },
};

/* ════════════════════════════════════════════════════════════════
   MonsterSystem — factory e gestione istanze
════════════════════════════════════════════════════════════════ */
const MonsterSystem = (() => {

  /* ── Weighted Random ─────────────────────────────────────────── */
  function _weightedRandom(diffScore) {
    const boost = Math.min(diffScore / 200, 1.0); // 0..1
    const W = CONFIG.MONSTER_WEIGHTS;
    const weights = {
      small: Math.max(8, W.small - boost * 20),
      imp: Math.max(8, W.imp - boost * 8),
      medium: W.medium + boost * 4,
      wraith: W.wraith + boost * 4,
      golem: W.golem + boost * 5,
      large: W.large + boost * 6,
      warlord: W.warlord + boost * 6,
      voidwalker: W.voidwalker + boost * 5,
      elite: W.elite + boost * 4,
    };

    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let rnd = Math.random() * total;
    for (const [key, w] of Object.entries(weights)) {
      rnd -= w;
      if (rnd <= 0) return key;
    }
    return 'small';
  }

  /* ── Crea istanza mostro ─────────────────────────────────────── */
  function spawnMonster(diffScore) {
    const typeKey = _weightedRandom(diffScore);
    const def = MONSTER_DEFS[typeKey];
    const hpRange = CONFIG.MONSTER_HP[typeKey];
    const hp = Phaser.Math.Between(hpRange.min, hpRange.max);

    return {
      def,
      hp,
      maxHp: hp,
      type: typeKey,
      label: def.label,
      chordPool: [...def.chordPool],
      weakness: def.weakness,
      element: def.element,
      elementIcon: def.elementIcon,
      color: def.color,
      glowColor: def.glowColor,
      attackSpeed: def.attackSpeed,
      isHeavyAttack: false,
      dead: false,
    };
  }

  /* ── Calcola danno accordo → mostro ─────────────────────────── */
  function calcDamage(monster, pctRemaining) {
    let baseDmg = 1;

    if (pctRemaining >= 0.8) {
      baseDmg = Math.floor(Math.random() * 3) + 8; // 8 to 10
    } else if (pctRemaining >= 0.6) {
      baseDmg = Math.floor(Math.random() * 3) + 6; // 6 to 8
    } else if (pctRemaining >= 0.4) {
      baseDmg = Math.floor(Math.random() * 3) + 4; // 4 to 6
    } else if (pctRemaining >= 0.2) {
      baseDmg = Math.floor(Math.random() * 3) + 2; // 2 to 4
    } else {
      baseDmg = Math.floor(Math.random() * 2) + 1; // 1 to 2
    }

    // Heavy attack bonus: + 10% to 15% of total monster HP
    if (monster.isHeavyAttack) {
      const pct = 0.10 + Math.random() * 0.05;
      baseDmg += Math.floor(monster.maxHp * pct);
    }

    return baseDmg;
  }

  /* ── Controlla se l'accordo è la weakness ───────────────────── */
  function checkWeakness(monster, chordKey) {
    if (!chordKey || !CHORD_DB[chordKey]) return false;
    const chordType = CHORD_DB[chordKey].type;
    return monster.weakness.includes(chordType);
  }

  /* ── Applica danno al mostro ─────────────────────────────────── */
  function applyDamage(monster, rawDmg) {
    const dmgHP = Math.floor(rawDmg);
    monster.hp = Math.max(0, monster.hp - dmgHP);
    monster.dead = monster.hp <= 0;
    return dmgHP;
  }

  /* ── Scegli accordo d'attacco per questo mostro ─────────────── */
  function getAttackChord(monster) {
    const pool = monster.chordPool;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* ── Check se stasera è heavy attack ────────────────────────── */
  function rollHeavyAttack() {
    return Math.random() < CONFIG.HEAVY_ATTACK_CHANCE;
  }

  return {
    spawnMonster,
    calcDamage,
    checkWeakness,
    applyDamage,
    getAttackChord,
    rollHeavyAttack,
    MONSTER_DEFS,
  };
})();
