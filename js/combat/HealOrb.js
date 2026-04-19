/**
 * HealOrb.js — Sistema Heal Orb
 *
 * Spawna un'orb luminosa con una nota casuale (C4–C5).
 * Il player deve riprodurre quella nota sul MIDI.
 * Octave ignorata nel matching.
 * Successo → player.hp = maxHp   (full heal)
 * Fail     → no reward, no penalità
 */

const HealOrbSystem = (() => {

  /* ── Note pool (C4–C5): semitoni 0..11 con nomi ─────────────── */
  const NOTE_POOL = [
    { semitone: 0,  name: 'C'  },
    { semitone: 2,  name: 'D'  },
    { semitone: 4,  name: 'E'  },
    { semitone: 5,  name: 'F'  },
    { semitone: 7,  name: 'G'  },
    { semitone: 9,  name: 'A'  },
    { semitone: 11, name: 'B'  },
    { semitone: 1,  name: 'C#' },
    { semitone: 3,  name: 'Eb' },
    { semitone: 6,  name: 'F#' },
    { semitone: 8,  name: 'Ab' },
    { semitone: 10, name: 'Bb' },
  ];

  let _active   = false;
  let _note     = null;   // { semitone, name }
  let _onSuccess = null;
  let _onExpire  = null;
  let _timeoutId = null;
  const ORB_DURATION = 7000; // ms per raccogliere l'orb

  /* ── Crea un nuovo orb ──────────────────────────────────────── */
  function createOrb() {
    _note = NOTE_POOL[Math.floor(Math.random() * NOTE_POOL.length)];
    _active = true;
    return { ..._note };
  }

  /* ── Imposta callbacks ──────────────────────────────────────── */
  function setCallbacks(onSuccess, onExpire) {
    _onSuccess = onSuccess;
    _onExpire  = onExpire;
  }

  /* ── Avvia il timer scadenza orb ────────────────────────────── */
  function startTimer() {
    clearTimeout(_timeoutId);
    _timeoutId = setTimeout(() => {
      if (_active) {
        _active = false;
        if (_onExpire) _onExpire();
      }
    }, ORB_DURATION);
  }

  /* ── Verifica una nota suonata (semitone) ───────────────────── */
  function checkNote(semitone) {
    if (!_active || !_note) return false;
    // Octave ignorata: confronta solo semitone mod 12
    const played = ((semitone % 12) + 12) % 12;
    if (played === _note.semitone) {
      _active = false;
      clearTimeout(_timeoutId);
      if (_onSuccess) _onSuccess();
      return true;
    }
    return false;
  }

  /* ── Controlla se l'orb è attiva ─────────────────────────────── */
  function isActive()  { return _active; }
  function getNote()   { return _note;   }

  /* ── Reset ──────────────────────────────────────────────────── */
  function reset() {
    _active = false;
    _note   = null;
    clearTimeout(_timeoutId);
    _onSuccess = null;
    _onExpire  = null;
  }

  return {
    createOrb,
    setCallbacks,
    startTimer,
    checkNote,
    isActive,
    getNote,
    reset,
    ORB_DURATION,
  };
})();
