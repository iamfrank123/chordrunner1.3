/**
 * chords.js — Database accordi e logica di riconoscimento
 *
 * Ogni accordo è definito come array di semitoni (0–11) indipendenti
 * dall'ottava. L'ordine non conta.
 *
 * Convenzioni semitoni:
 *  C=0, C#/Db=1, D=2, D#/Eb=3, E=4, F=5, F#/Gb=6,
 *  G=7, G#/Ab=8, A=9, A#/Bb=10, B=11
 */

const CHORD_DB = {
  'C': { notes: [0, 4, 7], label: 'C', type: 'major' },
  'Cm': { notes: [0, 3, 7], label: 'Cm', type: 'minor' },
  'Caug': { notes: [0, 4, 8], label: 'Caug', type: 'aug' },
  'Cdim': { notes: [0, 3, 6], label: 'Cdim', type: 'dim' },
  'C#': { notes: [1, 5, 8], label: 'C#', type: 'major' },
  'C#m': { notes: [1, 4, 8], label: 'C#m', type: 'minor' },
  'C#aug': { notes: [1, 5, 9], label: 'C#aug', type: 'aug' },
  'C#dim': { notes: [1, 4, 7], label: 'C#dim', type: 'dim' },
  'D': { notes: [2, 6, 9], label: 'D', type: 'major' },
  'Dm': { notes: [2, 5, 9], label: 'Dm', type: 'minor' },
  'Daug': { notes: [2, 6, 10], label: 'Daug', type: 'aug' },
  'Ddim': { notes: [2, 5, 8], label: 'Ddim', type: 'dim' },
  'Eb': { notes: [3, 7, 10], label: 'Eb', type: 'major' },
  'Ebm': { notes: [3, 6, 10], label: 'Ebm', type: 'minor' },
  'Ebaug': { notes: [3, 7, 11], label: 'Ebaug', type: 'aug' },
  'Ebdim': { notes: [3, 6, 9], label: 'Ebdim', type: 'dim' },
  'E': { notes: [4, 8, 11], label: 'E', type: 'major' },
  'Em': { notes: [4, 7, 11], label: 'Em', type: 'minor' },
  'Eaug': { notes: [4, 8, 0], label: 'Eaug', type: 'aug' },
  'Edim': { notes: [4, 7, 10], label: 'Edim', type: 'dim' },
  'F': { notes: [5, 9, 0], label: 'F', type: 'major' },
  'Fm': { notes: [5, 8, 0], label: 'Fm', type: 'minor' },
  'Faug': { notes: [5, 9, 1], label: 'Faug', type: 'aug' },
  'Fdim': { notes: [5, 8, 11], label: 'Fdim', type: 'dim' },
  'F#': { notes: [6, 10, 1], label: 'F#', type: 'major' },
  'F#m': { notes: [6, 9, 1], label: 'F#m', type: 'minor' },
  'F#aug': { notes: [6, 10, 2], label: 'F#aug', type: 'aug' },
  'F#dim': { notes: [6, 9, 0], label: 'F#dim', type: 'dim' },
  'G': { notes: [7, 11, 2], label: 'G', type: 'major' },
  'Gm': { notes: [7, 10, 2], label: 'Gm', type: 'minor' },
  'Gaug': { notes: [7, 11, 3], label: 'Gaug', type: 'aug' },
  'Gdim': { notes: [7, 10, 1], label: 'Gdim', type: 'dim' },
  'Ab': { notes: [8, 0, 3], label: 'Ab', type: 'major' },
  'Abm': { notes: [8, 11, 3], label: 'Abm', type: 'minor' },
  'Abaug': { notes: [8, 0, 4], label: 'Abaug', type: 'aug' },
  'Abdim': { notes: [8, 11, 2], label: 'Abdim', type: 'dim' },
  'A': { notes: [9, 1, 4], label: 'A', type: 'major' },
  'Am': { notes: [9, 0, 4], label: 'Am', type: 'minor' },
  'Aaug': { notes: [9, 1, 5], label: 'Aaug', type: 'aug' },
  'Adim': { notes: [9, 0, 3], label: 'Adim', type: 'dim' },
  'Bb': { notes: [10, 2, 5], label: 'Bb', type: 'major' },
  'Bbm': { notes: [10, 1, 5], label: 'Bbm', type: 'minor' },
  'Bbaug': { notes: [10, 2, 6], label: 'Bbaug', type: 'aug' },
  'Bbdim': { notes: [10, 1, 4], label: 'Bbdim', type: 'dim' },
  'B': { notes: [11, 3, 6], label: 'B', type: 'major' },
  'Bm': { notes: [11, 2, 6], label: 'Bm', type: 'minor' },
  'Baug': { notes: [11, 3, 7], label: 'Baug', type: 'aug' },
  'Bdim': { notes: [11, 2, 5], label: 'Bdim', type: 'dim' },
  'C7': { notes: [0, 4, 7, 10], label: 'C7', type: 'dom7' },
  'C#7': { notes: [1, 5, 8, 11], label: 'C#7', type: 'dom7' },
  'D7': { notes: [2, 6, 9, 0], label: 'D7', type: 'dom7' },
  'Eb7': { notes: [3, 7, 10, 1], label: 'Eb7', type: 'dom7' },
  'E7': { notes: [4, 8, 11, 2], label: 'E7', type: 'dom7' },
  'F7': { notes: [5, 9, 0, 3], label: 'F7', type: 'dom7' },
  'F#7': { notes: [6, 10, 1, 4], label: 'F#7', type: 'dom7' },
  'G7': { notes: [7, 11, 2, 5], label: 'G7', type: 'dom7' },
  'Ab7': { notes: [8, 0, 3, 6], label: 'Ab7', type: 'dom7' },
  'A7': { notes: [9, 1, 4, 7], label: 'A7', type: 'dom7' },
  'Bb7': { notes: [10, 2, 5, 8], label: 'Bb7', type: 'dom7' },
  'B7': { notes: [11, 3, 6, 9], label: 'B7', type: 'dom7' },
  'C9': { notes: [0, 4, 7, 10, 2], label: 'C9', type: 'dom9' },
  'C#9': { notes: [1, 5, 8, 11, 3], label: 'C#9', type: 'dom9' },
  'D9': { notes: [2, 6, 9, 0, 4], label: 'D9', type: 'dom9' },
  'Eb9': { notes: [3, 7, 10, 1, 5], label: 'Eb9', type: 'dom9' },
  'E9': { notes: [4, 8, 11, 2, 6], label: 'E9', type: 'dom9' },
  'F9': { notes: [5, 9, 0, 3, 7], label: 'F9', type: 'dom9' },
  'F#9': { notes: [6, 10, 1, 4, 8], label: 'F#9', type: 'dom9' },
  'G9': { notes: [7, 11, 2, 5, 9], label: 'G9', type: 'dom9' },
  'Ab9': { notes: [8, 0, 3, 6, 10], label: 'Ab9', type: 'dom9' },
  'A9': { notes: [9, 1, 4, 7, 11], label: 'A9', type: 'dom9' },
  'Bb9': { notes: [10, 2, 5, 8, 0], label: 'Bb9', type: 'dom9' },
  'B9': { notes: [11, 3, 6, 9, 1], label: 'B9', type: 'dom9' },
  'Csus2': { notes: [0, 2, 7], label: 'Csus2', type: 'sus2' },
  'Csus4': { notes: [0, 5, 7], label: 'Csus4', type: 'sus4' },
  'Cmaj7': { notes: [0, 4, 7, 11], label: 'Cmaj7', type: 'maj7' },
  'Cm7': { notes: [0, 3, 7, 10], label: 'Cm7', type: 'min7' },
  'Cmaj9': { notes: [0, 4, 7, 11, 2], label: 'Cmaj9', type: 'maj9' },
  'Cm9': { notes: [0, 3, 7, 10, 2], label: 'Cm9', type: 'min9' },
  'Cm7b5': { notes: [0, 3, 6, 10], label: 'Cm7b5', type: 'halfdim' },
  'C#sus2': { notes: [1, 3, 8], label: 'C#sus2', type: 'sus2' },
  'C#sus4': { notes: [1, 6, 8], label: 'C#sus4', type: 'sus4' },
  'C#maj7': { notes: [1, 5, 8, 0], label: 'C#maj7', type: 'maj7' },
  'C#m7': { notes: [1, 4, 8, 11], label: 'C#m7', type: 'min7' },
  'C#maj9': { notes: [1, 5, 8, 0, 3], label: 'C#maj9', type: 'maj9' },
  'C#m9': { notes: [1, 4, 8, 11, 3], label: 'C#m9', type: 'min9' },
  'C#m7b5': { notes: [1, 4, 7, 11], label: 'C#m7b5', type: 'halfdim' },
  'Dsus2': { notes: [2, 4, 9], label: 'Dsus2', type: 'sus2' },
  'Dsus4': { notes: [2, 7, 9], label: 'Dsus4', type: 'sus4' },
  'Dmaj7': { notes: [2, 6, 9, 1], label: 'Dmaj7', type: 'maj7' },
  'Dm7': { notes: [2, 5, 9, 0], label: 'Dm7', type: 'min7' },
  'Dmaj9': { notes: [2, 6, 9, 1, 4], label: 'Dmaj9', type: 'maj9' },
  'Dm9': { notes: [2, 5, 9, 0, 4], label: 'Dm9', type: 'min9' },
  'Dm7b5': { notes: [2, 5, 8, 0], label: 'Dm7b5', type: 'halfdim' },
  'Ebsus2': { notes: [3, 5, 10], label: 'Ebsus2', type: 'sus2' },
  'Ebsus4': { notes: [3, 8, 10], label: 'Ebsus4', type: 'sus4' },
  'Ebmaj7': { notes: [3, 7, 10, 2], label: 'Ebmaj7', type: 'maj7' },
  'Ebm7': { notes: [3, 6, 10, 1], label: 'Ebm7', type: 'min7' },
  'Ebmaj9': { notes: [3, 7, 10, 2, 5], label: 'Ebmaj9', type: 'maj9' },
  'Ebm9': { notes: [3, 6, 10, 1, 5], label: 'Ebm9', type: 'min9' },
  'Ebm7b5': { notes: [3, 6, 9, 1], label: 'Ebm7b5', type: 'halfdim' },
  'Esus2': { notes: [4, 6, 11], label: 'Esus2', type: 'sus2' },
  'Esus4': { notes: [4, 9, 11], label: 'Esus4', type: 'sus4' },
  'Emaj7': { notes: [4, 8, 11, 3], label: 'Emaj7', type: 'maj7' },
  'Em7': { notes: [4, 7, 11, 2], label: 'Em7', type: 'min7' },
  'Emaj9': { notes: [4, 8, 11, 3, 6], label: 'Emaj9', type: 'maj9' },
  'Em9': { notes: [4, 7, 11, 2, 6], label: 'Em9', type: 'min9' },
  'Em7b5': { notes: [4, 7, 10, 2], label: 'Em7b5', type: 'halfdim' },
  'Fsus2': { notes: [5, 7, 0], label: 'Fsus2', type: 'sus2' },
  'Fsus4': { notes: [5, 10, 0], label: 'Fsus4', type: 'sus4' },
  'Fmaj7': { notes: [5, 9, 0, 4], label: 'Fmaj7', type: 'maj7' },
  'Fm7': { notes: [5, 8, 0, 3], label: 'Fm7', type: 'min7' },
  'Fmaj9': { notes: [5, 9, 0, 4, 7], label: 'Fmaj9', type: 'maj9' },
  'Fm9': { notes: [5, 8, 0, 3, 7], label: 'Fm9', type: 'min9' },
  'Fm7b5': { notes: [5, 8, 11, 3], label: 'Fm7b5', type: 'halfdim' },
  'F#sus2': { notes: [6, 8, 1], label: 'F#sus2', type: 'sus2' },
  'F#sus4': { notes: [6, 11, 1], label: 'F#sus4', type: 'sus4' },
  'F#maj7': { notes: [6, 10, 1, 5], label: 'F#maj7', type: 'maj7' },
  'F#m7': { notes: [6, 9, 1, 4], label: 'F#m7', type: 'min7' },
  'F#maj9': { notes: [6, 10, 1, 5, 8], label: 'F#maj9', type: 'maj9' },
  'F#m9': { notes: [6, 9, 1, 4, 8], label: 'F#m9', type: 'min9' },
  'F#m7b5': { notes: [6, 9, 0, 4], label: 'F#m7b5', type: 'halfdim' },
  'Gsus2': { notes: [7, 9, 2], label: 'Gsus2', type: 'sus2' },
  'Gsus4': { notes: [7, 0, 2], label: 'Gsus4', type: 'sus4' },
  'Gmaj7': { notes: [7, 11, 2, 6], label: 'Gmaj7', type: 'maj7' },
  'Gm7': { notes: [7, 10, 2, 5], label: 'Gm7', type: 'min7' },
  'Gmaj9': { notes: [7, 11, 2, 6, 9], label: 'Gmaj9', type: 'maj9' },
  'Gm9': { notes: [7, 10, 2, 5, 9], label: 'Gm9', type: 'min9' },
  'Gm7b5': { notes: [7, 10, 1, 5], label: 'Gm7b5', type: 'halfdim' },
  'Absus2': { notes: [8, 10, 3], label: 'Absus2', type: 'sus2' },
  'Absus4': { notes: [8, 1, 3], label: 'Absus4', type: 'sus4' },
  'Abmaj7': { notes: [8, 0, 3, 7], label: 'Abmaj7', type: 'maj7' },
  'Abm7': { notes: [8, 11, 3, 6], label: 'Abm7', type: 'min7' },
  'Abmaj9': { notes: [8, 0, 3, 7, 10], label: 'Abmaj9', type: 'maj9' },
  'Abm9': { notes: [8, 11, 3, 6, 10], label: 'Abm9', type: 'min9' },
  'Abm7b5': { notes: [8, 11, 2, 6], label: 'Abm7b5', type: 'halfdim' },
  'Asus2': { notes: [9, 11, 4], label: 'Asus2', type: 'sus2' },
  'Asus4': { notes: [9, 2, 4], label: 'Asus4', type: 'sus4' },
  'Amaj7': { notes: [9, 1, 4, 8], label: 'Amaj7', type: 'maj7' },
  'Am7': { notes: [9, 0, 4, 7], label: 'Am7', type: 'min7' },
  'Amaj9': { notes: [9, 1, 4, 8, 11], label: 'Amaj9', type: 'maj9' },
  'Am9': { notes: [9, 0, 4, 7, 11], label: 'Am9', type: 'min9' },
  'Am7b5': { notes: [9, 0, 3, 7], label: 'Am7b5', type: 'halfdim' },
  'Bbsus2': { notes: [10, 0, 5], label: 'Bbsus2', type: 'sus2' },
  'Bbsus4': { notes: [10, 3, 5], label: 'Bbsus4', type: 'sus4' },
  'Bbmaj7': { notes: [10, 2, 5, 9], label: 'Bbmaj7', type: 'maj7' },
  'Bbm7': { notes: [10, 1, 5, 8], label: 'Bbm7', type: 'min7' },
  'Bbmaj9': { notes: [10, 2, 5, 9, 0], label: 'Bbmaj9', type: 'maj9' },
  'Bbm9': { notes: [10, 1, 5, 8, 0], label: 'Bbm9', type: 'min9' },
  'Bbm7b5': { notes: [10, 1, 4, 8], label: 'Bbm7b5', type: 'halfdim' },
  'Bsus2': { notes: [11, 1, 6], label: 'Bsus2', type: 'sus2' },
  'Bsus4': { notes: [11, 4, 6], label: 'Bsus4', type: 'sus4' },
  'Bmaj7': { notes: [11, 3, 6, 10], label: 'Bmaj7', type: 'maj7' },
  'Bm7': { notes: [11, 2, 6, 9], label: 'Bm7', type: 'min7' },
  'Bmaj9': { notes: [11, 3, 6, 10, 1], label: 'Bmaj9', type: 'maj9' },
  'Bm9': { notes: [11, 2, 6, 9, 1], label: 'Bm9', type: 'min9' },
  'Bm7b5': { notes: [11, 2, 5, 9], label: 'Bm7b5', type: 'halfdim' }
};

/**
 * Converte un numero MIDI (0–127) in un semitono (0–11),
 * ignorando l'ottava.
 * @param {number} midiNote
 * @returns {number} 0–11
 */
function midiToSemitone(midiNote) {
  return midiNote % 12;
}

/**
 * Dato un array di semitoni attivi (da MIDI o virtual keyboard),
 * restituisce un array di chiavi di tutti gli accordi riconosciuti (per gestire enarmonici).
 * @param {Set<number>} activeSemitones
 * @returns {string[]} Un array di chiavi corrispondenti, o vuoto
 */
function recognizeChords(activeSemitones) {
  const played = Array.from(activeSemitones).sort((a, b) => a - b);
  if (played.length < 2) return [];

  // 1. Exact match (massima priorità)
  let exactMatches = [];
  for (const [key, chord] of Object.entries(CHORD_DB)) {
    const required = [...chord.notes].sort((a, b) => a - b);
    if (arraysEqual(played, required)) {
      exactMatches.push(key);
    }
  }
  if (exactMatches.length > 0) return exactMatches;

  // 2. Superset match: il player ha premuto tutte le note del chord + eventuali extra
  //    (played è un superset del chord)
  let subsetMatches = [];
  if (played.length > 3) {
    for (const [key, chord] of Object.entries(CHORD_DB)) {
      const match = chord.notes.every(n => activeSemitones.has(n));
      if (match) subsetMatches.push(key);
    }
  }
  if (subsetMatches.length > 0) return subsetMatches;

  // 3. Partial 9th chord match: il player ha suonato 4 delle 5 note di un accordo di nona
  //    (voicing jazz commonissimo: si omette il 5° grado)
  //    Condizione: TUTTE le note suonate devono essere dentro il chord (nessuna nota estranea)
  //    e devono essere almeno 4.
  if (played.length >= 4) {
    let partialNinthMatches = [];
    for (const [key, chord] of Object.entries(CHORD_DB)) {
      if (chord.notes.length === 5) { // solo 9th chords
        const allPlayedInChord = played.every(n => chord.notes.includes(n));
        if (allPlayedInChord) {
          partialNinthMatches.push(key);
        }
      }
    }
    if (partialNinthMatches.length > 0) return partialNinthMatches;
  }

  return [];
}

/**
 * Confronta se due array ordinati sono uguali.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {boolean}
 */
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/**
 * Dato un nome accordo (es: "C"), restituisce le note come semitoni.
 * @param {string} chordName
 * @returns {number[]|null}
 */
function getChordNotes(chordName) {
  return CHORD_DB[chordName] ? [...CHORD_DB[chordName].notes] : null;
}

/**
 * Restituisce una label leggibile per un accordo.
 * @param {string} chordName
 * @returns {string}
 */
function getChordLabel(chordName) {
  return CHORD_DB[chordName] ? CHORD_DB[chordName].label : chordName;
}

/**
 * Recupera tutte le chiavi degli accordi di determinati tipi
 * (es: ['major', 'minor']) esplorando CHORD_DB.
 */
function getChordsByTypes(types) {
  return Object.keys(CHORD_DB).filter(key => types.includes(CHORD_DB[key].type));
}

/**
 * Sceglie un accordo casuale da un array di chiavi.
 * @param {string[]} chordKeys
 * @returns {string}
 */
function randomChord(chordKeys) {
  return chordKeys[Math.floor(Math.random() * chordKeys.length)];
}
