/**
 * hud.js — Gestione HUD HTML esterno al canvas Phaser
 *
 * V2: aggiunto Combat System HUD
 *  - HP player (cuori)
 *  - Monster HP bar
 *  - Combat chord display
 *  - Event banners (heavy attack, heal orb)
 *  - flashCombatResult (perfect/good/late/miss)
 */

const HUD = (() => {
  /* ── DOM refs ─────────────────────────────────────────────── */
  const livesEl    = document.getElementById('lives-count');
  const scoreEl    = document.getElementById('score-count');
  const timerEl    = document.getElementById('timer-count');
  const levelEl    = document.getElementById('level-name');
  const speedEl    = document.getElementById('speed-name');
  const chordEl    = document.getElementById('chord-name');
  const hudEl      = document.getElementById('hud');
  const previewEl  = document.getElementById('hud-preview');

  // Combat DOM refs
  const playerHPEl      = document.getElementById('hud-player-hp');
  const combatChordEl   = document.getElementById('hud-combat-chord');
  const combatPanelEl   = document.getElementById('hud-combat-panel');
  const eventBannerEl   = document.getElementById('hud-event-banner');
  const healOrbPanelEl  = document.getElementById('hud-heal-orb-panel');
  const healOrbNoteEl   = document.getElementById('hud-heal-orb-note');

  /* ── State ────────────────────────────────────────────────── */
  let _score       = 0;
  let _lives       = CONFIG.INITIAL_LIVES;
  let _timer       = CONFIG.LEVEL_DURATION_SEC;
  let _level       = 1;
  let _playerHP    = CONFIG.PLAYER_MAX_HP;
  let _playerMaxHP = CONFIG.PLAYER_MAX_HP;
  let _bannerTimeout = null;

  /* ════════════════════════════════════════════════════════════
     RUNNER HUD (esistente)
  ════════════════════════════════════════════════════════════ */

  function reset() {
    _score     = 0;
    _lives     = CONFIG.INITIAL_LIVES;
    _timer     = CONFIG.LEVEL_DURATION_SEC;
    _playerHP  = CONFIG.PLAYER_MAX_HP;
    _playerMaxHP = CONFIG.PLAYER_MAX_HP;
    _render();
    _renderPlayerHP();
    hideCombatChord();
    hideEventBanner();
    hideHealOrb();
  }

  function setScore(v) {
    _score = Math.max(0, v);
    if (scoreEl) scoreEl.textContent = _score;
  }

  function addScore(delta) {
    setScore(_score + delta);
  }

  function setLives(v) {
    _lives = Math.max(0, v);
    if (livesEl) livesEl.textContent = _lives;
  }

  function loseLife() {
    setLives(_lives - 1);
    _flashDamage();
    return _lives;
  }

  function setTimer(sec) {
    _timer = Math.max(0, sec);
    if (timerEl) timerEl.textContent = _timer;
    const unitEl = document.getElementById('timer-unit');
    if (unitEl) unitEl.textContent = 's';
    if (timerEl) timerEl.style.color = _timer <= 10 ? '#ff6b6b' : '#06d6a0';
  }

  function initSurvivalTimer(unlimited) {
    const unitEl = document.getElementById('timer-unit');
    if (unlimited) {
      if (timerEl) { timerEl.textContent = '0:00'; timerEl.style.color = '#a29bfe'; }
      if (unitEl)  unitEl.textContent = '';
    } else {
      if (unitEl) unitEl.textContent = 's';
    }
  }

  function tickSurvivalUp(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    if (timerEl) { timerEl.textContent = `${m}:${s}`; timerEl.style.color = '#a29bfe'; }
    const unitEl = document.getElementById('timer-unit');
    if (unitEl) unitEl.textContent = '';
  }

  function setLevel(levelData) {
    _level = levelData.id;
    if (levelEl) levelEl.textContent = `Level ${levelData.id}: ${levelData.name}`;
  }

  function setSpeedName(name) {
    if (speedEl) speedEl.textContent = name;
  }

  function setCustomPreview(text) {
    if (!previewEl) return;
    if (text) {
      previewEl.textContent = text;
      previewEl.classList.remove('hidden');
    } else {
      previewEl.classList.add('hidden');
    }
  }

  function setRequiredChord(chordKey) {
    if (!chordEl) return;
    if (!chordKey) {
      chordEl.textContent = '—';
      chordEl.className = 'chord-name dim';
    } else {
      chordEl.textContent = getChordLabel(chordKey);
      chordEl.className = 'chord-name';
    }
  }

  function flashCorrect() {
    if (!chordEl) return;
    chordEl.className = 'chord-name glow';
    setTimeout(() => { if(chordEl) chordEl.className = 'chord-name'; }, 600);
  }

  function flashWrong() {
    if (!chordEl) return;
    chordEl.className = 'chord-name wrong';
    setTimeout(() => { if(chordEl) chordEl.className = 'chord-name'; }, 500);
  }

  function _flashDamage() {
    if (!hudEl) return;
    hudEl.classList.add('damage');
    setTimeout(() => { if(hudEl) hudEl.classList.remove('damage'); }, 400);
  }

  function _render() {
    if (livesEl) livesEl.textContent = _lives;
    if (scoreEl) scoreEl.textContent = _score;
    if (timerEl) timerEl.textContent = _timer;
  }

  function showGameOver(score) {
    const el = document.getElementById('final-score-text');
    if (el) el.textContent = `Final Score: ${score}`;
    const ov = document.getElementById('gameover-overlay');
    if (ov) ov.classList.remove('hidden');
  }

  function hideGameOver() {
    const ov = document.getElementById('gameover-overlay');
    if (ov) ov.classList.add('hidden');
  }

  function showLevelComplete(score) {
    const el = document.getElementById('level-score-text');
    if (el) el.textContent = `Score: ${score}`;
    const ov = document.getElementById('levelcomplete-overlay');
    if (ov) ov.classList.remove('hidden');
  }

  function hideLevelComplete() {
    const ov = document.getElementById('levelcomplete-overlay');
    if (ov) ov.classList.add('hidden');
  }

  /* ── Survival overlay ──────────────────────────────────────────── */
  function showSurvivalComplete(stats, reason) {
    const ov = document.getElementById('survival-overlay');
    if (!ov) return;

    // Titolo
    const titleEl = document.getElementById('surv-title');
    if (titleEl) titleEl.textContent = reason || '⚔️ Survived!';

    // Tempo sopravvissuto formattato M:SS
    const m = Math.floor(stats.timeSurvived / 60);
    const s = (stats.timeSurvived % 60).toString().padStart(2, '0');
    const timeEl = document.getElementById('surv-time');
    if (timeEl) timeEl.textContent = `${m}:${s}`;

    // Statistiche
    const correctly = document.getElementById('surv-correct');
    const wrongly   = document.getElementById('surv-wrong');
    const monsters  = document.getElementById('surv-monsters');
    const acc       = document.getElementById('surv-accuracy');
    const scoreEl   = document.getElementById('surv-score');

    if (correctly) correctly.textContent = stats.correctChords;
    if (wrongly)   wrongly.textContent   = stats.wrongChords;
    if (monsters)  monsters.textContent  = stats.monstersKilled;

    const totalChords = stats.correctChords + stats.wrongChords;
    const accuracy    = totalChords > 0 ? Math.round(stats.correctChords / totalChords * 100) : 0;
    if (acc)      acc.textContent      = `${accuracy}%`;
    if (scoreEl)  scoreEl.textContent  = `Score: ${_score}`;

    ov.classList.remove('hidden');
  }

  function hideSurvivalComplete() {
    const ov = document.getElementById('survival-overlay');
    if (ov) ov.classList.add('hidden');
  }

  /* ════════════════════════════════════════════════════════════
     ⚔️ COMBAT HUD (Event Banner, Healing)
  ════════════════════════════════════════════════════════════ */

  /* ── Player HP ─────────────────────────────────────────────── */
  function setPlayerHP(current, max) {
    _playerHP    = Math.max(0, current);
    _playerMaxHP = max || _playerMaxHP;
    _renderPlayerHP();
  }

  function damagePlayerHP(amount) {
    setPlayerHP(_playerHP - amount, _playerMaxHP);
    _flashCombatDamage();
    return _playerHP;
  }

  function healPlayerHP() {
    setPlayerHP(_playerMaxHP, _playerMaxHP);
    setLives(CONFIG.INITIAL_LIVES);
    _flashHeal();
  }

  function _renderPlayerHP() {
    if (!playerHPEl) return;
    let hearts = '';
    for (let i = 0; i < _playerMaxHP; i++) {
      hearts += i < _playerHP ? '❤️' : '🖤';
    }
    playerHPEl.textContent = hearts;
  }

  function _flashCombatDamage() {
    if (!hudEl) return;
    hudEl.classList.add('combat-damage');
    setTimeout(() => { if (hudEl) hudEl.classList.remove('combat-damage'); }, 500);
  }

  function _flashHeal() {
    if (!hudEl) return;
    hudEl.classList.add('heal-flash');
    setTimeout(() => { if (hudEl) hudEl.classList.remove('heal-flash'); }, 700);
  }

  /* ── Combat Chord ──────────────────────────────────────────── */
  const attackTimerFillEl = document.getElementById('hud-combat-timer-fill');
  const attackTimerTextEl = document.getElementById('hud-combat-timer-text');

  function updateCombatTimer(pct, textStr) {
    // Migrato nel canvas (Cinematic Target)
  }

  function setCombatChord(chordKey, isHeavy) {
    // Migrato nel canvas (Cinematic Target)
    if (combatPanelEl) combatPanelEl.classList.add('hidden');
  }

  function hideCombatChord() {
    if (combatPanelEl) combatPanelEl.classList.add('hidden');
  }

  /* ── Combat Result Flash ───────────────────────────────────── */
  function flashCombatResult(quality) {
    if (!combatChordEl) return;
    const classes = {
      perfect: 'combat-chord flash-perfect',
      good:    'combat-chord flash-good',
      late:    'combat-chord flash-late',
      miss:    'combat-chord flash-miss',
    };
    combatChordEl.className = classes[quality] || 'combat-chord';
    setTimeout(() => {
      if (combatChordEl) combatChordEl.className = 'combat-chord';
    }, 600);
  }

  /* ── Event Banner ──────────────────────────────────────────── */
  function showEventBanner(text, color, duration) {
    if (!eventBannerEl) return;
    clearTimeout(_bannerTimeout);
    eventBannerEl.textContent = text;
    eventBannerEl.style.color = color || '#ffd166';
    eventBannerEl.classList.remove('hidden', 'banner-exit');
    eventBannerEl.classList.add('banner-enter');

    _bannerTimeout = setTimeout(() => {
      hideEventBanner();
    }, duration || 2000);
  }

  function hideEventBanner() {
    if (!eventBannerEl) return;
    eventBannerEl.classList.remove('banner-enter');
    eventBannerEl.classList.add('banner-exit');
    setTimeout(() => {
      if (eventBannerEl) {
        eventBannerEl.classList.add('hidden');
        eventBannerEl.classList.remove('banner-exit');
      }
    }, 350);
  }

  /* ── Heal Orb ──────────────────────────────────────────────── */
  function showHealOrb(noteName) {
    if (!healOrbPanelEl) return;
    healOrbPanelEl.classList.remove('hidden', 'orb-hidden');
    healOrbPanelEl.classList.add('orb-show');
    if (healOrbNoteEl) healOrbNoteEl.textContent = noteName;
  }

  function hideHealOrb() {
    if (!healOrbPanelEl) return;
    healOrbPanelEl.classList.remove('orb-show');
    healOrbPanelEl.classList.add('orb-hidden');
    setTimeout(() => {
      if (healOrbPanelEl) healOrbPanelEl.classList.add('hidden');
    }, 400);
  }

  return {
    /* Runner */
    reset, setScore, addScore,
    setLives, loseLife, setTimer,
    initSurvivalTimer, tickSurvivalUp,
    setLevel, setSpeedName, setCustomPreview,
    setRequiredChord, flashCorrect, flashWrong,
    showGameOver, hideGameOver,
    showLevelComplete, hideLevelComplete,
    showSurvivalComplete, hideSurvivalComplete,
    get score()  { return _score; },
    get lives()  { return _lives; },
    get timer()  { return _timer; },

    /* Combat */
    setPlayerHP, damagePlayerHP, healPlayerHP,
    setCombatChord, hideCombatChord, flashCombatResult, updateCombatTimer,
    showEventBanner, hideEventBanner,
    showHealOrb, hideHealOrb,
    get playerHP()    { return _playerHP;    },
    get playerMaxHP() { return _playerMaxHP; },
  };
})();
