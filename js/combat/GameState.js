/**
 * GameState.js — State Machine del MIDI Combat System
 *
 * Stati possibili:
 *   RUNNING    → Runner normale, ostacoli attivi
 *   COMBAT     → Mostro presente, runner freezato
 *   HEAL_EVENT → Orb apparso, in attesa di nota MIDI
 *
 * Uso:
 *   GameStateManager.transition(GAME_STATE.COMBAT);
 *   GameStateManager.is(GAME_STATE.RUNNING);
 */

const GAME_STATE = Object.freeze({
  RUNNING:    'RUNNING',
  COMBAT:     'COMBAT',
  HEAL_EVENT: 'HEAL_EVENT',
});

const GameStateManager = (() => {
  let _current       = GAME_STATE.RUNNING;
  let _previous      = null;
  let _listeners     = {};         // { 'COMBAT': [fn, ...], ... }
  let _diffScore     = 0;          // performance + tempo sopravvissuto
  let _correctHits   = 0;
  let _totalHits     = 0;
  let _timeSurvived  = 0;          // secondi

  /* ── Transizione stato ─────────────────────────────────────── */
  function transition(newState) {
    if (!GAME_STATE[newState]) {
      console.warn(`[GameState] Stato sconosciuto: ${newState}`);
      return;
    }
    if (_current === newState) return;

    _previous = _current;
    _current  = newState;

    console.log(`[GameState] ${_previous} → ${_current}`);

    // Notifica listener
    const fns = _listeners[newState] || [];
    fns.forEach(fn => {
      try { fn(_previous); } catch(e) { console.error('[GameState] listener error', e); }
    });
  }

  /* ── Listener ──────────────────────────────────────────────── */
  function on(state, fn) {
    if (!_listeners[state]) _listeners[state] = [];
    _listeners[state].push(fn);
  }

  function off(state, fn) {
    if (!_listeners[state]) return;
    _listeners[state] = _listeners[state].filter(f => f !== fn);
  }

  /* ── Difficulty Score ──────────────────────────────────────── */
  function recordHit(correct) {
    _totalHits++;
    if (correct) _correctHits++;
    _updateDiffScore();
  }

  function addSurvivedTime(seconds) {
    _timeSurvived += seconds;
    _updateDiffScore();
  }

  function _updateDiffScore() {
    const accuracy = _totalHits > 0 ? _correctHits / _totalHits : 0.5;
    _diffScore = Math.round(accuracy * 100 + _timeSurvived * 0.5);
  }

  /* ── Getters ───────────────────────────────────────────────── */
  function is(state)         { return _current === state; }
  function getCurrent()      { return _current; }
  function getPrevious()     { return _previous; }
  function getDiffScore()    { return _diffScore; }
  function getAccuracy()     { return _totalHits > 0 ? _correctHits / _totalHits : 0.5; }

  /* ── Reset ─────────────────────────────────────────────────── */
  function reset() {
    _current      = GAME_STATE.RUNNING;
    _previous     = null;
    _diffScore    = 0;
    _correctHits  = 0;
    _totalHits    = 0;
    _timeSurvived = 0;
    _listeners    = {};
  }

  return {
    transition,
    on, off,
    recordHit,
    addSurvivedTime,
    is, getCurrent, getPrevious,
    getDiffScore, getAccuracy,
    reset,
  };
})();
