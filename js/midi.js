/**
 * midi.js — Gestione Web MIDI API + Virtual Keyboard fallback
 *
 * Espone un oggetto globale `MidiManager` con:
 *   - init()                  → mostra overlay selezione input
 *   - useVirtual()            → attiva tastiera virtuale
 *   - onChordChange = fn      → setter callback(chordKey|null)
 *   - activeSemitones         → getter: Set<number> note attive
 *   - updateVirtualChords([]) → aggiorna bottoni tastiera virtuale
 */

const MidiManager = (() => {
  /* ── Stato interno ─────────────────────────────────────────── */
  let _activeMidi      = new Set();   // MIDI note numbers (0–127)
  let _activeSemitones = new Set();   // note mod 12 (0–11)
  let _useVirtual      = false;
  let _midiAccess      = null;
  let _onChordChangeCb = null;
  let _onNoteChangeCb  = null;        // callback note singole (heal orb)

  /* ── Riferimenti DOM ────────────────────────────────────────── */
  const overlay       = document.getElementById('midi-overlay');
  const btnMidi       = document.getElementById('btn-midi');
  const btnVirtual    = document.getElementById('btn-virtual');
  const statusEl      = document.getElementById('midi-status');
  const vkSection     = document.getElementById('virtual-keyboard');
  const vkButtons     = document.getElementById('vk-buttons');
  const notesPlayedEl = document.getElementById('notes-played');

  /* ═══════════════════════════════════════════════════════════
     API PUBBLICA
  ═══════════════════════════════════════════════════════════ */

  function init(onChordChange) {
    _onChordChangeCb = onChordChange || null;
    _showOverlay();
  }

  function useVirtual() {
    _useVirtual = true;
    _buildVirtualKeyboard();
    vkSection.classList.remove('hidden');
    overlay.classList.add('hidden');
  }

  function updateVirtualChords(chordKeys) {
    if (_useVirtual) _renderVkButtons(chordKeys);
  }

  /* ═══════════════════════════════════════════════════════════
     OVERLAY SELEZIONE INPUT
  ═══════════════════════════════════════════════════════════ */

  function _showOverlay() {
    overlay.classList.remove('hidden');

    // Popola menu livelli
    const levelSelect = document.getElementById('level-select');
    if (levelSelect) {
      levelSelect.innerHTML = '';
      LEVELS.forEach(lvl => {
        const opt = document.createElement('option');
        opt.value = lvl.id - 1; // index base 0
        opt.textContent = `Level ${lvl.id}: ${lvl.name}`;
        levelSelect.appendChild(opt);
      });
    }

    const radios = document.querySelectorAll('input[name="game_mode"]');
    const levelsPanel = document.getElementById('levels-panel');
    const customPanel = document.getElementById('custom-chords-panel');

    radios.forEach(r => {
      r.addEventListener('change', (e) => {
        const val = e.target.value;
        customPanel.classList.toggle('hidden', val !== 'custom');
        levelsPanel.classList.toggle('hidden', val !== 'levels');
        const survPanel = document.getElementById('survival-panel');
        if (survPanel) survPanel.classList.toggle('hidden', val !== 'survival');
        const speedRow = document.querySelector('#midi-overlay .speed-dur-row');
        if (speedRow) speedRow.style.display = val === 'survival' ? 'none' : '';
      });
    });

    // Mode-col container click → golden "active-mode" highlight
    const modeCols = document.querySelectorAll('.mode-col');
    const _updateActiveMode = () => {
      const checkedVal = document.querySelector('input[name="game_mode"]:checked')?.value;
      modeCols.forEach(col => {
        const radio = col.querySelector('input[name="game_mode"]');
        col.classList.toggle('active-mode', radio?.value === checkedVal);
      });
    };
    _updateActiveMode(); // set initial state
    radios.forEach(r => r.addEventListener('change', _updateActiveMode));
    modeCols.forEach(col => {
      col.addEventListener('click', () => {
        const radio = col.querySelector('input[name="game_mode"]');
        if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
      });
    });

    const speedSelect = document.getElementById('speed-select');
    const speedCustomVal = document.getElementById('speed-custom-val');
    if (speedSelect && speedCustomVal) {
      speedSelect.addEventListener('change', (e) => {
        speedCustomVal.style.display = e.target.value === 'custom' ? 'block' : 'none';
      });
    }

    const monsterWindowSelect = document.getElementById('monster-chord-window');
    const monsterWindowCustom = document.getElementById('monster-window-custom');
    if (monsterWindowSelect && monsterWindowCustom) {
      monsterWindowSelect.addEventListener('change', (e) => {
        monsterWindowCustom.style.display = e.target.value === 'custom' ? 'block' : 'none';
      });
    }

    // Survival: timed vs unlimited toggle
    const survTypeRadios = document.querySelectorAll('input[name="survival_type"]');
    const survTimerRow = document.getElementById('survival-timer-row');
    survTypeRadios.forEach(r => {
      r.addEventListener('change', () => {
        const isUnlimited = document.querySelector('input[name="survival_type"]:checked').value === 'unlimited';
        if (survTimerRow) survTimerRow.style.display = isUnlimited ? 'none' : '';
      });
    });

    btnMidi.addEventListener('click', async () => {
      try {
        btnMidi.disabled = true;
        btnMidi.textContent = '⏳ Connecting...';
        await _initMidi();
        overlay.classList.add('hidden');
        const { speedVal, durVal, waitMode, lvlIdx, customOptions, survivalOptions, wrongPenalty } = _readMenuOptions();
        if (window.startGame) window.startGame(lvlIdx, speedVal, durVal, waitMode, customOptions, survivalOptions, wrongPenalty);
      } catch (err) {
        statusEl.textContent = '❌ MIDI Error. Check permissions or connect device.';
        btnMidi.disabled = false;
        btnMidi.textContent = '🎹 Use MIDI Keyboard';
        console.error(err);
      }
    });

    btnVirtual.addEventListener('click', () => {
      useVirtual();
      const { speedVal, durVal, waitMode, lvlIdx, customOptions, survivalOptions, wrongPenalty } = _readMenuOptions();
      if (window.startGame) window.startGame(lvlIdx, speedVal, durVal, waitMode, customOptions, survivalOptions, wrongPenalty);
    });
  }

  /* ── Helper: legge tutte le opzioni dal menu ─────────────── */
  function _readMenuOptions() {
    const levelSelect = document.getElementById('level-select');
    const mode = document.querySelector('input[name="game_mode"]:checked')?.value || 'levels';

    const speedSelectVal = document.getElementById('speed-select')?.value;
    let speedVal = 5000;
    if (speedSelectVal === 'custom') {
      speedVal = parseInt(document.getElementById('speed-custom-val')?.value || 7) * 1000;
    } else {
      speedVal = parseInt(speedSelectVal || 5000);
    }
    
    const durVal   = parseInt(document.getElementById('duration-select')?.value || 60);
    const waitMode = document.getElementById('wait-mode-toggle')?.checked || false;

    let lvlIdx          = 0;
    let customOptions   = null;
    let survivalOptions = null;

    if (mode === 'custom') {
      lvlIdx     = 'custom';
      const types    = Array.from(document.querySelectorAll('.custom-type-cb:checked')).map(cb => cb.value);
      const rootType = document.querySelector('input[name="custom_roots"]:checked')?.value || 'natural';
      customOptions  = { types, rootType };

    } else if (mode === 'survival') {
      const wrongPenalty = document.getElementById('wrong-penalty-toggle')?.checked !== false;

      const levelDropdownVal = document.getElementById('survival-chord-level')?.value;
      let chordLevelIdx;
      if (levelDropdownVal === 'survival_hard')   chordLevelIdx = 'survival_hard';
      else if (levelDropdownVal === 'survival_harder') chordLevelIdx = 'survival_harder';
      else chordLevelIdx = parseInt(levelDropdownVal ?? 2);
      
      const survType      = document.querySelector('input[name="survival_type"]:checked')?.value || 'timed';
      const survDuration  = parseInt(document.getElementById('survival-duration')?.value || 120);
      const survRoots     = document.querySelector('input[name="survival_roots"]:checked')?.value || 'natural';

      const mwSelect = document.getElementById('monster-chord-window')?.value;
      let chordWindowMs = 8000;
      if (mwSelect === 'custom') {
        chordWindowMs = parseInt(document.getElementById('monster-window-custom')?.value || 7) * 1000;
      } else {
        chordWindowMs = parseInt(mwSelect || 8000);
      }

      survivalOptions = {
        unlimited:    survType === 'unlimited',
        duration:     survDuration,
        chordWindowMs,
        chordLevelIdx,
        roots: survRoots,
      };
      lvlIdx = chordLevelIdx;

    } else {
      lvlIdx = parseInt(levelSelect?.value || 0);
    }

    const wrongPenalty = document.getElementById('wrong-penalty-toggle')?.checked !== false;
    return { speedVal, durVal, waitMode, lvlIdx, customOptions, survivalOptions, wrongPenalty };
  }

  /* ═══════════════════════════════════════════════════════════
     WEB MIDI API
  ═══════════════════════════════════════════════════════════ */

  async function _initMidi() {
    if (!navigator.requestMIDIAccess) {
      throw new Error('Web MIDI API not supported in this browser.');
    }
    _midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    _midiAccess.addEventListener('statechange', _onMidiStateChange);
    _connectAllInputs();
  }

  function _connectAllInputs() {
    if (!_midiAccess) return;
    for (const input of _midiAccess.inputs.values()) {
      input.onmidimessage = _onMidiMessage;
    }
  }

  function _onMidiStateChange(e) {
    if (e.port.type === 'input' && e.port.state === 'connected') {
      e.port.onmidimessage = _onMidiMessage;
    }
  }

  function _onMidiMessage(event) {
    const [status, note, velocity] = event.data;
    const command = status & 0xf0;

    let isNoteOn = false;

    if (command === 0x90 && velocity > 0) {
      // Note ON
      _activeMidi.add(note);
      _activeSemitones.add(midiToSemitone(note));
      isNoteOn = true;
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      // Note OFF
      _activeMidi.delete(note);
      // Ricalcola semitoni (evita duplicati di ottave diverse)
      _activeSemitones.clear();
      for (const n of _activeMidi) _activeSemitones.add(midiToSemitone(n));
      isNoteOn = false;
    } else {
      return;
    }

    _onSemitonesChanged(isNoteOn);
  }

  /* ═══════════════════════════════════════════════════════════
     VIRTUAL KEYBOARD
  ═══════════════════════════════════════════════════════════ */

  function _buildVirtualKeyboard() {
    vkButtons.innerHTML = '';
    // Default: accordi del primo livello
    _renderVkButtons(LEVELS[0].chords);
  }

  function _renderVkButtons(chordKeys) {
    vkButtons.innerHTML = '';
    chordKeys.forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'vk-btn';
      btn.id        = `vk-${key}`;
      btn.textContent = getChordLabel(key);

      const activate = (e) => {
        e.preventDefault();
        _activateSemitonesFromChord(key);
        btn.classList.add('active');
      };
      const deactivate = (e) => {
        e.preventDefault();
        _clearSemitones();
        btn.classList.remove('active');
      };

      btn.addEventListener('mousedown',  activate);
      btn.addEventListener('touchstart', activate,   { passive: false });
      btn.addEventListener('mouseup',    deactivate);
      btn.addEventListener('mouseleave', deactivate);
      btn.addEventListener('touchend',   deactivate, { passive: false });

      vkButtons.appendChild(btn);
    });
  }

  function _activateSemitonesFromChord(chordKey) {
    const notes = getChordNotes(chordKey);
    if (!notes) return;
    _activeSemitones = new Set(notes);
    _activeMidi.clear();
    _onSemitonesChanged(true);
  }

  function _clearSemitones() {
    _activeSemitones = new Set();
    _activeMidi.clear();
    _onSemitonesChanged(false);
  }

  /* ═══════════════════════════════════════════════════════════
     CHORD DETECTION & CALLBACK
  ═══════════════════════════════════════════════════════════ */

  function _onSemitonesChanged(isNoteOn = true) {
    const matchedChords = recognizeChords(_activeSemitones);
    const primaryChord = matchedChords.length > 0 ? matchedChords[0] : null;

    // Aggiorna "notes played" nel pannello HTML
    if (notesPlayedEl) {
      if (_activeSemitones.size === 0) {
        notesPlayedEl.textContent = '—';
        notesPlayedEl.className   = 'chord-name dim';
      } else {
        notesPlayedEl.textContent = primaryChord ? getChordLabel(primaryChord) : '?';
        notesPlayedEl.className   = primaryChord ? 'chord-name' : 'chord-name dim';
      }
    }

    if (_onChordChangeCb) _onChordChangeCb(matchedChords, Array.from(_activeSemitones), isNoteOn);
    // Notifica raw semitones (per heal orb)
    if (_onNoteChangeCb && _activeSemitones.size > 0) {
      _onNoteChangeCb(Array.from(_activeSemitones));
    }
  }

  /* ═══════════════════════════════════════════════════════════
     EXPORT (object con getter/setter corretti)
  ═══════════════════════════════════════════════════════════ */

  return {
    init,
    useVirtual,
    updateVirtualChords,

    /** Getter: Set<number> dei semitoni correntemente attivi */
    get activeSemitones() {
      return new Set(_activeSemitones);
    },

    /** Getter: true if using virtual keyboard */
    get isVirtual() {
      return _useVirtual;
    },

    /** Setter: imposta la callback chiamata ad ogni cambio accordo */
    set onChordChange(cb) {
      _onChordChangeCb = cb;
    },

    /** Setter: callback note grezze (semitones[]) per heal orb */
    set onNoteChange(cb) {
      _onNoteChangeCb = cb;
    },
  };

})();
