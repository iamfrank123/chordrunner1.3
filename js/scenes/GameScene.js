/**
 * GameScene.js — Scena principale del gameplay
 *
 * V3 — Survival Mode + field-clear before monster + full stats
 *
 * Modalità:
 *   LEVELS / CUSTOM → runner normale, nessun mostro
 *   SURVIVAL        → runner + mostri + heal orb + stats finali
 *
 * Survival state machine:
 *   RUNNING    → corre, ostacoli arrivano
 *   COMBAT     → campo libero, mostro in campo
 *   HEAL_EVENT → orb curativa in attesa
 *
 * Monster entry: _monsterPending = true → stop spawn nuovi ostacoli
 *   → aspetta che lo schermo sia vuoto → _triggerCombat()
 */

class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  /* ─────────────────────────────────────────
     INIT
  ───────────────────────────────────────── */
  init(data) {
    this._levelIndex = data.levelIndex ?? 0;
    this._speedMs = data.speedMs ?? 3000;
    this._durationSec = data.durationSec ?? 60;
    this._waitMode = data.waitMode ?? false;
    this._customOptions = data.customOptions ?? null;
    this._survivalOpts = data.survivalOptions ?? null;
    this._isSurvival = !!this._survivalOpts;
    this._wrongPenalty = data.wrongPenalty ?? true;

    this._timeLeft = this._isSurvival && !this._survivalOpts?.unlimited
      ? this._survivalOpts.duration
      : this._durationSec;

    this._gameActive = false;
    this._countingDown = true;
    this._activeObstacle = null;
    this._requiredChord = null;

    // Monster / orb
    this._combatManager = null;
    this._healOrbSprite = null;
    this._healOrbLabel = null;
    this._monsterPending = false;    // campo sta per essere liberato
    this._monsterChordWindowMs = this._survivalOpts?.chordWindowMs ?? 2000;

    // Survival stats
    this._stats = { correctChords: 0, wrongChords: 0, monstersKilled: 0, timeSurvived: 0 };

    // Reset state machine
    GameStateManager.reset();

    // Chord pool
    if (this._levelIndex === 'custom' && this._customOptions) {
      const typeLabels = {
        'major': '', 'minor': 'm', 'aug': 'aug', 'dim': 'dim',
        'sus2': 'sus2', 'sus4': 'sus4', 'maj7': 'maj7', 'min7': 'm7',
        'halfdim': 'm7b5', 'maj9': 'maj9', 'min9': 'm9',
        'dom7': '7', 'dom9': '9'
      };
      const naturalRoots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      const allRoots = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
      const poolRoots = this._customOptions.rootType === 'natural' ? naturalRoots : allRoots;
      let customChords = [];
      this._customOptions.types.forEach(t => {
        poolRoots.forEach(r => { if (typeLabels[t] !== undefined) customChords.push(r + typeLabels[t]); });
      });
      if (customChords.length === 0) customChords = ['C'];
      this._levelData = { id: 'custom', name: 'Customised Chords', chords: customChords };
      this._chordPool = [...customChords];
      HUD.setCustomPreview(`Types: ${this._customOptions.types.join(', ')} | Roots: ${this._customOptions.rootType}`);
    } else if (this._isSurvival && (this._levelIndex === 'survival_hard' || this._levelIndex === 'survival_harder' || this._levelIndex === 8)) {
      const naturalRoots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      const allRoots = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
      const rootsToUse = this._survivalOpts?.roots === 'all' ? allRoots : naturalRoots;

      let types = [];
      let nameStr = '';
      if (this._levelIndex === 'survival_hard') {
        types = ['', 'm', 'maj7', 'm7', '7']; // maj, min, 7ths (maj7, m7, dom7)
        nameStr = 'Hard Survival';
      } else if (this._levelIndex === 'survival_harder') {
        types = ['', 'm', 'maj7', 'm7', '7', 'aug', 'dim'];
        nameStr = 'Harder Survival';
      } else { // Extreme (8)
        types = ['', 'm', 'maj9', 'm9', '9', 'sus2', 'sus4', 'maj7', 'm7', '7', 'aug', 'dim', 'm7b5'];
        nameStr = 'Extreme Survival';
      }

      let survivalChords = [];
      types.forEach(t => {
        rootsToUse.forEach(r => survivalChords.push(r + t));
      });

      this._levelData = { id: this._levelIndex, name: nameStr, chords: survivalChords };
      this._chordPool = [...survivalChords];
      HUD.setCustomPreview('');
    } else {
      this._levelData = LEVELS[this._levelIndex] || LEVELS[0];
      HUD.setCustomPreview('');
      this._chordPool = [...this._levelData.chords];
    }

    if (this._isSurvival) {
      const unlim = this._survivalOpts.unlimited;
      HUD.setCustomPreview(`⚔️ SURVIVAL${unlim ? ' — ♾️ Unlimited' : ''} | ⚡ ${this._monsterChordWindowMs / 1000}s window`);
    }

    const speedSel = document.getElementById('speed-select');
    this._speedLabel = speedSel && speedSel.selectedIndex >= 0
      ? speedSel.options[speedSel.selectedIndex].text : 'Fast (3s)';
  }

  /* ─────────────────────────────────────────
     CREATE
  ───────────────────────────────────────── */
  create() {
    const W = this.scale.width, H = this.scale.height;
    this._W = W; this._H = H;

    HUD.reset();
    HUD.setLevel(this._levelData);
    HUD.setSpeedName(this._speedLabel);
    HUD.setTimer(this._timeLeft);
    HUD.setPlayerHP(CONFIG.PLAYER_MAX_HP, CONFIG.PLAYER_MAX_HP);

    if (this._isSurvival) {
      const unlim = this._survivalOpts.unlimited;
      HUD.initSurvivalTimer(unlim);
    }

    this._createSky(W, H);
    this._clouds = this._createClouds(W, H);
    this._createGround(W, H);
    this._createPlayer(W, H);

    this._obstacles = this.physics.add.group();
    this.physics.add.overlap(this._player, this._obstacles, this._onPlayerBodyOverlap, null, this);

    this._chordLabel = this.add.text(0, 0, '', {
      fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#0a0a1a', strokeThickness: 5, padding: { x: 10, y: 5 },
    }).setOrigin(0.5, 1).setDepth(15).setVisible(false);

    this._triggerLine = this.add.graphics().setDepth(6);
    this._drawTriggerLine();

    MidiManager.onChordChange = (chords, rawNotes, isNoteOn) => this._onInput(chords, rawNotes, isNoteOn);
    MidiManager.onNoteChange = (sem) => this._onRawNote(sem);
    MidiManager.updateVirtualChords(this._chordPool);

    // Overlay buttons
    document.getElementById('btn-restart').onclick = () => this._restartGame();
    document.getElementById('btn-nextlevel').onclick = () => this._nextLevel();
    document.getElementById('btn-repeat-level-win').onclick = () => this._restartGame();
    document.getElementById('btn-main-menu-fail').onclick = () => this._returnToMainMenu();
    document.getElementById('btn-main-menu-win').onclick = () => this._returnToMainMenu();
    const btnSurvRestart = document.getElementById('btn-surv-restart');
    const btnSurvMenu = document.getElementById('btn-surv-menu');
    if (btnSurvRestart) btnSurvRestart.onclick = () => this._restartGame();
    if (btnSurvMenu) btnSurvMenu.onclick = () => this._returnToMainMenu();
    const btnHomeHud = document.getElementById('btn-home-hud');
    if (btnHomeHud) btnHomeHud.onclick = () => this._returnToMainMenu();

    // Click sul canvas Phaser
    this.input.on('pointerdown', () => {
      if (!this._gameActive || this._inputCooldown) return;

      if (MidiManager.isVirtual) {
        // Modalità tastiera virtuale: CLICK = SALTO
        if (GameStateManager.is(GAME_STATE.RUNNING)) {
          this._doJump();
          // Marca l'ostacolo come "sopravvissuto" fisicamente (no hp loss)
          if (this._activeObstacle) {
            this._activeObstacle._virtualSurvived = true;
          }
        }
      } else {
        // Debug click (MIDI): simula accordo corretto
        if (GameStateManager.is(GAME_STATE.RUNNING) && this._activeObstacle) {
          this._onInput([this._requiredChord]);
        }
      }
    });

    // Modalità tastiera virtuale: SPAZIO = SALTO (alternativa tastiera)
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (!this._gameActive || !MidiManager.isVirtual) return;
      if (GameStateManager.is(GAME_STATE.RUNNING)) this._doJump();
    });

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    this._startCountdown();
  }

  /* ─────────────────────────────────────────
     UPDATE
  ───────────────────────────────────────── */
  update(time, delta) {
    if (this._player && this._player.body) this._updatePlayerAnim();

    if (this._clouds) {
      this._clouds.forEach(c => {
        c.x -= c.speed * (delta / 1000);
        if (c.x < -c.width) c.x = this._W + c.width;
      });
    }

    if (!this._gameActive) return;

    // Heal orb pulsante
    if (this._healOrbSprite?.active) {
      this._healOrbSprite.setScale(1 + 0.08 * Math.sin(time * 0.005));
    }

    const state = GameStateManager.getCurrent();

    if (state === GAME_STATE.RUNNING) {
      this._updateObstacles();
      this._updateTimingZone();

      // ── Movi il terreno alla stessa velocità degli ostacoli
      let groundSpeed = CONFIG.BASE_OBSTACLE_SPEED;
      // Se c'è un ostacolo fermo (per WaitMode), ferma anche il terreno
      const hasStoppedObstacles = this._obstacles.getChildren().some(o => o.active && o.body && Math.round(Math.abs(o.body.velocity.x)) === 0);
      if (hasStoppedObstacles) {
        groundSpeed = 0;
      }

      if (this._groundSprite) {
        this._groundSprite.tilePositionX += groundSpeed * (delta / 1000);
      }

      // Monster pending: aspetta campo vuoto
      if (this._monsterPending) {
        const active = this._obstacles.getChildren().filter(o => o.active && o.x > -80);
        if (active.length === 0) {
          this._monsterPending = false;
          this._triggerCombat();
        }
      }
    } else if (state === GAME_STATE.COMBAT) {
      if (this._combatManager) this._combatManager.update(time, delta);
    }
  }

  /* ─────────────────────────────────────────
     INPUT ROUTING
  ───────────────────────────────────────── */
  _onInput(matchedChords, rawNotes, isNoteOn) {
    const state = GameStateManager.getCurrent();
    if (state === GAME_STATE.RUNNING) this._onChordDetected(matchedChords, rawNotes, isNoteOn);
    else if (state === GAME_STATE.COMBAT) { if (this._combatManager) this._combatManager.onChordInput(matchedChords, rawNotes, isNoteOn); }
  }

  _onRawNote(semitones) {
    if (!HealOrbSystem.isActive()) return;
    for (const st of semitones) { if (HealOrbSystem.checkNote(st)) break; }
  }

  /* ─────────────────────────────────────────
     SFONDO / NUVOLE / TERRENO / PLAYER
  ───────────────────────────────────────── */
  _createSky(W, H) {
    this._W = W; this._H = H;
    this._skyGraphics = this.add.graphics().setDepth(0);
    this._skyGraphics.fillGradientStyle(0x131b3a, 0x131b3a, 0x3aa8e8, 0x3aa8e8, 1);
    this._skyGraphics.fillRect(0, 0, W, H);

    this._sun = this.add.graphics().setDepth(1);
    this._sun.fillStyle(0xffd166, 1);
    this._sun.fillCircle(W - 100, 80, 40);

    // Due Graphics per cross-fade senza banding — uno attivo, uno idle
    this._atmosGfxA = this.add.graphics().setDepth(2).setAlpha(0);
    this._atmosGfxB = this.add.graphics().setDepth(2).setAlpha(0);
    this._atmosActive = this._atmosGfxA;
    this._atmosIdle = this._atmosGfxB;
  }

  _createClouds(W, H) {
    const clouds = [];
    for (let i = 0; i < 6; i++) {
      const c = this.add.image(Phaser.Math.Between(50, W), Phaser.Math.Between(18, Math.floor(H * 0.38)), 'cloud');
      c.setAlpha(Phaser.Math.FloatBetween(0.5, 0.9)).setScale(Phaser.Math.FloatBetween(0.5, 1.3)).setDepth(3);
      c._origAlpha = c.alpha;
      c.speed = Phaser.Math.FloatBetween(15, 45);
      clouds.push(c);
    }
    this._cloudObjects = clouds;
    return clouds;
  }

  /* ── ATMOSFERA DINAMICA ──────────────────────────────────────── */
  _ATMOS_MAP = {
    small: { topColor: 0x4a0600, bottomColor: 0xcc3300, alpha: 0.55 },
    imp: { topColor: 0x0d0020, bottomColor: 0x5a0ea8, alpha: 0.55 },
    medium: { topColor: 0x001533, bottomColor: 0x1a6ba8, alpha: 0.50 },
    wraith: { topColor: 0x020008, bottomColor: 0x140525, alpha: 0.72 },
    golem: { topColor: 0x061000, bottomColor: 0x1e3d00, alpha: 0.55 },
    large: { topColor: 0x060010, bottomColor: 0x28084a, alpha: 0.65 },
    warlord: { topColor: 0x280000, bottomColor: 0x7a0000, alpha: 0.60 },
    voidwalker: { topColor: 0x000005, bottomColor: 0x00080f, alpha: 0.82 },
    elite: { topColor: 0x060000, bottomColor: 0x1a0600, alpha: 0.72 },
  };

  _transitionAtmosphere(monsterKey, durationMs = 1800) {
    const cfg = this._ATMOS_MAP[monsterKey];
    if (!cfg) return;

    const { topColor, bottomColor, alpha } = cfg;
    const W = this._W, H = this._H;

    // Disegna il nuovo gradiente fluido sull'overlay idle
    const next = this._atmosIdle;
    next.clear();
    next.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1);
    next.fillRect(0, 0, W, H);

    // Kill tween correnti per evitare conflitti
    const cur = this._atmosActive;
    this.tweens.killTweensOf(cur);
    this.tweens.killTweensOf(next);

    // Cross-fade: corrente → 0, nuovo → target alpha
    this.tweens.add({ targets: cur, alpha: 0, duration: durationMs, ease: 'Sine.easeInOut' });
    this.tweens.add({
      targets: next, alpha: alpha, duration: durationMs, ease: 'Sine.easeInOut',
      onComplete: () => {
        // Swappa riferimenti
        this._atmosActive = next;
        this._atmosIdle = cur;
      }
    });

    // Sole e nuvole si attenuano
    if (this._sun) {
      this.tweens.killTweensOf(this._sun);
      this.tweens.add({ targets: this._sun, alpha: 0.30, duration: durationMs, ease: 'Sine.easeInOut' });
    }
    if (this._cloudObjects) {
      this._cloudObjects.forEach(c => {
        this.tweens.killTweensOf(c);
        this.tweens.add({ targets: c, alpha: 0.15, duration: durationMs, ease: 'Sine.easeInOut' });
      });
    }
  }

  _resetAtmosphere(durationMs = 1800) {
    const cur = this._atmosActive;
    this.tweens.killTweensOf(cur);
    this.tweens.add({ targets: cur, alpha: 0, duration: durationMs, ease: 'Sine.easeInOut' });

    if (this._sun) {
      this.tweens.killTweensOf(this._sun);
      this.tweens.add({ targets: this._sun, alpha: 1, duration: durationMs, ease: 'Sine.easeInOut' });
    }
    if (this._cloudObjects) {
      this._cloudObjects.forEach(c => {
        this.tweens.killTweensOf(c);
        this.tweens.add({ targets: c, alpha: c._origAlpha ?? 0.7, duration: durationMs, ease: 'Sine.easeInOut' });
      });
    }
  }

  _createGround(W, H) {
    const T = 32;
    this._groundY = H - (T * 1.5) - 40;
    const groundH = H - this._groundY;

    // Use a TileSprite for infinite scrolling background
    this._groundSprite = this.add.tileSprite(0, this._groundY, W, groundH, 'ground')
      .setOrigin(0, 0)
      .setDepth(5);

    this._groundBody = this.physics.add.staticGroup();
    const gb = this._groundBody.create(W / 2, this._groundY + 24, null);
    gb.setVisible(false); gb.displayWidth = W; gb.displayHeight = 48; gb.refreshBody();
  }

  _createPlayer(W, H) {
    this._player = this.physics.add.sprite(200, this._groundY - 2, 'player');
    this._player.setOrigin(0.5, 1).setDepth(9).setScale(2.38); // +20% base size
    this._player.setCollideWorldBounds(true);
    this._player.body.setGravityY(CONFIG.GRAVITY);
    this.physics.add.collider(this._player, this._groundBody);

    // Animazione camminata
    this.anims.create({
      key: 'walk',
      frames: [
        { key: 'player_walk1' },
        { key: 'player_idle' },
        { key: 'player_walk2' },
        { key: 'player_idle' }
      ],
      frameRate: 10,
      repeat: -1
    });
  }

  _updatePlayerAnim() {
    if (!this._player || !this._player.body) return;

    // In aria: inclina e ferma animazione
    if (!this._player.body.blocked.down) {
      if (this._player.anims.isPlaying) this._player.anims.stop();
      this._player.setTexture('player_idle');
      this._player.angle = -14;
    } else {
      // A terra: cammina se il gioco è attivo e siamo in RUNNING, altrimenti idle
      this._player.angle = 0;
      const isRunning = GameStateManager.is(GAME_STATE.RUNNING);
      if (this._gameActive && !this._countingDown && isRunning) {
        if (!this._player.anims.isPlaying || this._player.anims.currentAnim.key !== 'walk') {
          this._player.play('walk');
        }
      } else {
        if (this._player.anims.isPlaying) this._player.anims.stop();
        this._player.setTexture('player_idle');
      }
    }
  }

  _doJump() {
    if (this._player.body.blocked.down || this._player.y >= this._groundY - 2) {
      this.sound.play('sfx_jump');
      this._player.body.setVelocityY(CONFIG.JUMP_FORCE);
      // Scala relativa al nuovo base scale (1.38)
      this.tweens.add({ targets: this._player, scaleY: 1.38 * 0.65, scaleX: 1.38 * 1.15, duration: 90, yoyo: true });
    }
  }

  /* ─────────────────────────────────────────
     TRIGGER LINE
  ───────────────────────────────────────── */
  _drawTriggerLine() {
    const g = this._triggerLine, x = CONFIG.TRIGGER_ZONE_X, H = this._groundY;
    g.clear();
    g.lineStyle(2, 0xffffff, 0.15); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.strokePath();
    g.fillStyle(0xffffff, 0.05); g.fillRect(x - 30, H - 4, 60, 4);
  }

  /* ─────────────────────────────────────────
     COUNTDOWN
  ───────────────────────────────────────── */
  _startCountdown() {
    const W = this._W, H = this._H;
    const counts = ['3', '2', '1', 'GO!'];
    let i = 0;
    const showNext = () => {
      if (i >= counts.length) {
        this._countingDown = false;
        this._gameActive = true;
        this._startTimer();
        this._scheduleNextObstacle();
        if (this._isSurvival) {
          this._scheduleMonsterSpawn();
          this._scheduleHealOrbSpawn();
        }
        return;
      }
      if (i < 3) this.sound.play('sfx_start');
      else this.sound.play('sfx_go');
      const label = this.add.text(W / 2, H / 2, counts[i], {
        fontFamily: 'Outfit, sans-serif', fontSize: i < 3 ? '96px' : '72px', fontStyle: 'bold',
        color: i < 3 ? '#ffd166' : '#06d6a0', stroke: '#0a0a1a', strokeThickness: 12,
        shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 10, fill: true },
      }).setOrigin(0.5).setDepth(50).setAlpha(0).setScale(1.4);
      this.tweens.add({
        targets: label, alpha: 1, scale: 1, duration: 200, ease: 'Back.Out',
        onComplete: () => {
          this.time.delayedCall(650, () => {
            this.tweens.add({
              targets: label, alpha: 0, scale: 0.7, duration: 200,
              onComplete: () => { label.destroy(); i++; showNext(); },
            });
          });
        },
      });
    };
    this.time.delayedCall(300, showNext);
  }

  /* ─────────────────────────────────────────
     TIMER
  ───────────────────────────────────────── */
  _startTimer() {
    this._timerEvent = this.time.addEvent({
      delay: 1000, loop: true, callback: this._tickTimer, callbackScope: this,
    });
  }

  _tickTimer() {
    if (!this._gameActive) return;
    GameStateManager.addSurvivedTime(1);
    this._stats.timeSurvived++;

    if (this._isSurvival && this._survivalOpts.unlimited) {
      // Conta SU
      HUD.tickSurvivalUp(this._stats.timeSurvived);
    } else {
      this._timeLeft = Math.max(0, this._timeLeft - 1);
      HUD.setTimer(this._timeLeft);
      if (this._timeLeft <= 0) {
        if (this._isSurvival) this._triggerSurvivalComplete('⏱️ Time is up!');
        else this._triggerLevelComplete();
      }
    }
  }

  /* ─────────────────────────────────────────
     OSTACOLI
  ───────────────────────────────────────── */
  _scheduleNextObstacle() {
    this._obstacleTimer = this.time.delayedCall(this._speedMs, () => {
      if (!this._gameActive) return;
      // Non spawnare se il mostro sta per arrivare o siamo in combat
      if (!this._monsterPending && GameStateManager.is(GAME_STATE.RUNNING)) {
        this._spawnObstacle();
      }
      // Riprogramma sempre (il mostro potrebbe finire)
      if (GameStateManager.is(GAME_STATE.RUNNING) && !this._monsterPending) {
        this._scheduleNextObstacle();
      } else {
        // Salva il timer per riprenderlo
        this._obstacleTimerPaused = true;
      }
    });
  }

  _resumeObstacleSpawner() {
    this._obstacleTimerPaused = false;
    this._scheduleNextObstacle();
  }

  _spawnObstacle() {
    let chord = randomChord(this._chordPool);
    if (!this._chordHistory) this._chordHistory = [];
    if (this._chordHistory.length >= 2 && this._chordHistory[0] === chord && this._chordHistory[1] === chord) {
      let att = 0;
      while (chord === this._chordHistory[0] && att++ < 10) chord = randomChord(this._chordPool);
    }
    this._chordHistory = [chord, ...(this._chordHistory || [])].slice(0, 2);

    const obs = this._obstacles.create(this._W + 50, this._groundY, 'obstacle');
    obs.setOrigin(0.5, 1).setDepth(7).setScale(1.8); // +20% base size
    obs.body.setAllowGravity(false);
    obs.body.setVelocityX(-CONFIG.BASE_OBSTACLE_SPEED);
    obs.chordKey = chord; obs.state = 'incoming'; obs.timingStart = 0; obs.wasJumped = false;

    const lbl = this.add.text(obs.x, obs.y - obs.displayHeight - 24, getChordLabel(chord), {
      fontFamily: 'Outfit, sans-serif', fontSize: '42px', fontStyle: 'bold',
      color: '#ffffff', stroke: '#0a0a1a', strokeThickness: 6,
      backgroundColor: '#1a1a3ecc', padding: { x: 12, y: 6 },
    }).setOrigin(0.5, 1).setDepth(16);
    obs._label = lbl;
  }

  _updateObstacles() {
    const trigX = CONFIG.TRIGGER_ZONE_X;
    this._obstacles.getChildren().forEach(obs => {
      if (!obs.active) return;
      if (obs._label?.active) { obs._label.x = obs.x; obs._label.y = obs.y - obs.displayHeight - 14; }

      if (obs.state === 'incoming' && obs.x <= trigX + 60) {
        obs.state = 'active'; obs.timingStart = this.time.now;
        this._activeObstacle = obs; this._requiredChord = obs.chordKey;
        HUD.setRequiredChord(obs.chordKey);
        obs.setTint(0xffd166);
        if (obs._label) obs._label.setColor('#ffd166');
      }

      if (obs.state === 'active') {
        const elapsed = this.time.now - obs.timingStart;
        if (this._waitMode && !obs.wasJumped) {
          if (obs.x <= trigX) {
            obs.x = trigX;
            this._obstacles.getChildren().forEach(o => { if (o.active && o.body) o.body.setVelocityX(0); });
            if (this._obstacleTimer) this._obstacleTimer.paused = true;
            if (this._timerEvent) this._timerEvent.paused = true;
            obs.timingStart = this.time.now;
          }
        } else {
          if (elapsed > CONFIG.TIMING_WINDOW_MS && !obs.wasJumped) this._onObstacleMissed(obs);
        }
      }

      if (obs.x < -80) {
        if (obs._label) obs._label.destroy();
        obs.destroy();
        if (this._activeObstacle === obs) {
          this._activeObstacle = null; this._requiredChord = null; HUD.setRequiredChord(null);
        }
      }
    });
  }

  _updateTimingZone() {
    if (!this._activeObstacle?.active) return;
    const ratio = Math.min((this.time.now - this._activeObstacle.timingStart) / CONFIG.TIMING_WINDOW_MS, 1);
    const g_ = Math.round(Phaser.Math.Linear(0xd1, 0x20, ratio));
    this._activeObstacle.setTint(Phaser.Display.Color.GetColor(0xff, g_, 0));
  }

  /* ─────────────────────────────────────────
     INPUT RUNNER
  ───────────────────────────────────────── */
  _onChordDetected(matchedChords, rawNotes, isNoteOn) {
    if (!this._gameActive || this._inputCooldown || !rawNotes?.length) return;
    if (!this._activeObstacle?.active) return;
    if (matchedChords.includes(this._requiredChord)) {
      this._onCorrectChord();
      return;
    }

    if (!isNoteOn) return; // Non penalizzare mai i rilasci dei tasti

    // Se l'utente sta suonando un accordo a 4-5 note (es. Cmaj9), 
    // valuta se quelli premuti finora sono sotto-note valide prima di dire "WRONG"
    const reqNotes = CHORD_DB[this._requiredChord] ? CHORD_DB[this._requiredChord].notes : null;
    if (reqNotes) {
      const isSubset = rawNotes.every(st => reqNotes.includes(st));
      if (isSubset) {
        // L'utente ha in mano note parziali che formano il chord giusto, non penalizzare ancora
        return;
      }
    }

    this._onWrongChord();
  }

  _onCorrectChord() {
    const obs = this._activeObstacle;
    // In virtual mode: _virtualSurvived è già true, ma il chord corretto dà punti
    if (!obs || (obs.wasJumped && !obs._virtualSurvived)) return;
    obs.wasJumped = true; obs._virtualSurvived = false; obs.state = 'jumped';
    obs.setTint(0x06d6a0);
    if (obs._label) obs._label.setColor('#06d6a0');

    const elapsed = this.time.now - obs.timingStart;
    const isPerfect = Math.abs(elapsed - CONFIG.TIMING_WINDOW_MS / 2) < CONFIG.TIMING_WINDOW_MS * 0.15;

    this._doJump();
    const gain = CONFIG.SCORE_CORRECT + (isPerfect ? CONFIG.SCORE_BONUS_TIMING : 0);
    HUD.addScore(gain);
    HUD.flashCorrect();
    GameStateManager.recordHit(true);
    this._stats.correctChords++;

    this._showFloatingLabel(isPerfect ? 'PERFECT! ✨' : 'GOOD! ✓', obs.x, obs.y - obs.displayHeight - 20, isPerfect ? '#06d6a0' : '#ffd166');
    this._spawnParticles(obs.x, obs.y - obs.displayHeight / 2);

    if (this._waitMode) {
      if (this._obstacleTimer) this._obstacleTimer.paused = false;
      if (this._timerEvent) this._timerEvent.paused = false;
      this._obstacles.getChildren().forEach(o => { if (o.active && o.body) o.body.setVelocityX(-CONFIG.BASE_OBSTACLE_SPEED); });
    }
    this._setCooldown(300);
    this._clearActiveObstacle(250);
  }

  _onWrongChord() {
    if (this._inputCooldown) return;
    HUD.flashWrong();
    GameStateManager.recordHit(false);
    this._stats.wrongChords++;
    this._showFloatingLabel('WRONG! ✗', this._W / 2, this._H / 2 - 50, '#ff6b6b');

    if (this._wrongPenalty) {
      this._flashPlayerDamage();
      this.sound.play('sfx_hit');
    }

    this._setCooldown(600);
  }

  _onObstacleMissed(obs) {
    if (obs.state === 'missed') return;
    obs.state = 'missed'; obs.clearTint(); obs.setAlpha(0.4);
    if (obs._label) obs._label.setAlpha(0.3);
    this._showFloatingLabel('MISS! ✗', this._W / 2, 70, '#ff9500');
    this._activeObstacle = null; this._requiredChord = null; HUD.setRequiredChord(null);
    GameStateManager.recordHit(false);
    this._stats.wrongChords++;
    // In virtual mode, se il player ha saltato fisicamente, non togliere vita
    if (obs._virtualSurvived) {
      this._showFloatingLabel('Jumped! No chord 🎵', this._W / 2, 50, '#fdcb6e');
      return;
    }
    this._flashPlayerDamage();
    this._loseRunnerLife();
  }

  _onPlayerBodyOverlap(player, obs) {
    if (obs.state === 'missed' || obs.wasJumped || obs._virtualSurvived) return;
    if (player.y < obs.y - obs.displayHeight) return;
    obs.wasJumped = true; obs.state = 'hit';
    this.cameras.main.shake(220, 0.014);
    this._loseRunnerLife();
  }

  _loseRunnerLife() {
    if (!this._gameActive) return;
    this.sound.play('sfx_hit');
    const rem = HUD.loseLife();
    this.cameras.main.shake(180, 0.009);
    if (rem <= 0) {
      if (this._isSurvival) this._triggerSurvivalGameOver();
      else this._triggerGameOver();
    }
  }

  /* ═════════════════════════════════════════════════════════════
     ⚔️  SURVIVAL — MONSTER SPAWN (field-clear mechanic)
  ═══════════════════════════════════════════════════════════════ */

  _scheduleMonsterSpawn() {
    const delay = CONFIG.MONSTER_SPAWN_INTERVAL + Phaser.Math.Between(-2000, 2000);
    this._monsterSpawnTimer = this.time.delayedCall(delay, () => {
      if (!this._gameActive || !this._isSurvival) return;
      if (!GameStateManager.is(GAME_STATE.RUNNING) || this._monsterPending) {
        this._scheduleMonsterSpawn(); // riprova dopo
        return;
      }

      if (Math.random() < CONFIG.MONSTER_SPAWN_CHANCE) {
        // Il mostro è in arrivo, smettiamo di far spawnare nuovi ostacoli,
        // ma lasciamo che il giocatore finisca quelli attuali già nello schermo
        this._monsterPending = true;
        HUD.showEventBanner('⚔️ Incoming threat...', '#ffd166', 3500);

        if (HealOrbSystem.isActive()) {
          HealOrbSystem.reset();
          this._destroyHealOrb();
          HUD.hideHealOrb();
          this._scheduleHealOrbSpawn();
        }

        // Ora semplicemente aspettiamo che `update()` rilevi che non ci sono più ostacoli nello schermo
        // Non rischedulare: lo faremo in _onMonsterDefeated
      } else {
        this._scheduleMonsterSpawn();
      }
    });
  }

  _triggerCombat() {
    if (!this._gameActive || !GameStateManager.is(GAME_STATE.RUNNING)) return;
    GameStateManager.transition(GAME_STATE.COMBAT);

    // Campo già vuoto a questo punto
    this._freezeObstacles();
    HUD.setRequiredChord(null);

    const monster = MonsterSystem.spawnMonster(GameStateManager.getDiffScore());
    const bannerMsg = monster.def.key === 'elite'
      ? `👑 BOSS! ${monster.def.elementIcon} ${monster.def.label}!`
      : `⚔️ ${monster.def.elementIcon} ${monster.def.label} appears!`;
    HUD.showEventBanner(bannerMsg, monster.def.glowColor, 2500);

    this._combatManager = new CombatManager(
      this, monster,
      () => this._onMonsterDefeated(),
      (dmg) => this._onCombatPlayerDamaged(dmg),
      this._monsterChordWindowMs,
      this._waitMode
    );
    this._combatManager.start();
    this._transitionAtmosphere(monster.def.key);

    // Riproduci la musica del combattimento in loop
    this._battleMusic = this.sound.add('bgm_battle', { loop: true, volume: 0.6 });
    this._battleMusic.play();
  }

  _onMonsterDefeated() {
    if (this._combatManager) { this._combatManager.destroy(); this._combatManager = null; }
    this._stats.monstersKilled++;

    if (this._battleMusic) {
      this._battleMusic.stop();
      this._battleMusic.destroy();
      this._battleMusic = null;
    }

    HUD.showEventBanner('🏆 Monster defeated! Keep running!', '#06d6a0', 2000);
    GameStateManager.transition(GAME_STATE.RUNNING);
    this._unfreezeObstacles();
    this._resetAtmosphere();

    // Riprendi spawn ostacoli e programma prossimo mostro
    this._resumeObstacleSpawner();
    this._scheduleMonsterSpawn();
  }

  _onCombatPlayerDamaged(amount) {
    if (!this._gameActive) return;
    this.sound.play('sfx_hit');
    this.cameras.main.shake(200, 0.012);
    this._stats.wrongChords++;     // segna come accordo sbagliato in combat
    const rem = HUD.loseLife();
    if (rem <= 0) {
      if (this._isSurvival) this._triggerSurvivalGameOver();
      else this._triggerGameOver();
    }
  }

  /* ═════════════════════════════════════════════════════════════
     💖  HEAL ORB
  ═══════════════════════════════════════════════════════════════ */

  _scheduleHealOrbSpawn() {
    this._healOrbSpawnTimer = this.time.delayedCall(CONFIG.HEAL_ORB_SPAWN_INTERVAL, () => {
      if (!this._gameActive || !this._isSurvival) return;
      if (GameStateManager.is(GAME_STATE.RUNNING) && !HealOrbSystem.isActive() && !this._monsterPending) {
        if (Math.random() < CONFIG.HEAL_ORB_SPAWN_CHANCE) {
          this._spawnHealOrb();
          return;
        }
      }
      this._scheduleHealOrbSpawn();
    });
  }

  _spawnHealOrb() {
    const orbData = HealOrbSystem.createOrb();

    const orbX = this._W * 0.5, orbY = this._groundY - 130;
    this._healOrbSprite = this.add.image(orbX, orbY, 'heal_orb').setDepth(20).setScale(0).setAlpha(0);
    this.tweens.add({ targets: this._healOrbSprite, scale: 1, alpha: 1, duration: 600, ease: 'Back.Out' });

    this._healOrbLabel = this.add.text(orbX, orbY - 55, `♪ Play: ${orbData.name}`, {
      fontFamily: 'Outfit, sans-serif', fontSize: '28px', fontStyle: 'bold',
      color: '#06d6a0', stroke: '#000', strokeThickness: 6,
      backgroundColor: '#00000088', padding: { x: 12, y: 6 },
    }).setOrigin(0.5, 1).setDepth(21).setAlpha(0);
    this.tweens.add({ targets: this._healOrbLabel, alpha: 1, duration: 400 });

    HUD.showEventBanner(`💖 HEAL ORB! Play: ${orbData.name}`, '#06d6a0', HealOrbSystem.ORB_DURATION);
    HUD.showHealOrb(orbData.name);

    HealOrbSystem.setCallbacks(() => this._onHealOrbSuccess(), () => this._onHealOrbExpire());
    HealOrbSystem.startTimer();

    this._orbPulseTimer = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => { if (this._healOrbSprite?.active) this.tweens.add({ targets: this._healOrbSprite, scaleX: 1.15, scaleY: 1.15, duration: 250, yoyo: true }); }
    });
  }

  _onHealOrbSuccess() {
    this.sound.play('sfx_orb');
    HUD.healPlayerHP(); HUD.addScore(CONFIG.SCORE_HEAL_ORB);
    this._stats.correctChords++;
    HUD.hideHealOrb(); HUD.hideEventBanner();
    this._destroyHealOrb();
    this.cameras.main.flash(300, 6, 214, 160, false);
    this._showFloatingLabel('💖 FULL HEAL!', this._W / 2, this._H * 0.35, '#06d6a0');
    this._spawnHealParticles();
    this._scheduleHealOrbSpawn();
  }

  _onHealOrbExpire() {
    HUD.hideHealOrb(); HUD.hideEventBanner();
    this._destroyHealOrb();
    this._showFloatingLabel('Orb expired...', this._W / 2, this._H * 0.4, '#fdcb6e');
    this._scheduleHealOrbSpawn();
  }

  _destroyHealOrb() {
    if (this._orbPulseTimer) { this._orbPulseTimer.remove(); this._orbPulseTimer = null; }
    if (this._healOrbSprite) {
      this.tweens.add({
        targets: this._healOrbSprite, scale: 0, alpha: 0, duration: 300,
        onComplete: () => { this._healOrbSprite?.destroy(); this._healOrbSprite = null; }
      });
    }
    if (this._healOrbLabel) {
      this.tweens.add({
        targets: this._healOrbLabel, alpha: 0, duration: 300,
        onComplete: () => { this._healOrbLabel?.destroy(); this._healOrbLabel = null; }
      });
    }
  }

  _spawnHealParticles() {
    const x = this._W / 2, y = this._groundY - 100;
    const cols = [0x06d6a0, 0x00b894, 0xffd166, 0xffffff, 0xa29bfe];
    for (let i = 0; i < 16; i++) {
      const p = this.add.graphics().setDepth(30);
      p.fillStyle(cols[i % cols.length], 1); p.fillCircle(0, 0, Phaser.Math.Between(3, 8));
      p.x = x + Phaser.Math.Between(-30, 30); p.y = y;
      this.tweens.add({
        targets: p, x: p.x + Phaser.Math.Between(-120, 120),
        y: p.y - Phaser.Math.Between(60, 160), alpha: 0, scale: 0.1,
        duration: Phaser.Math.Between(700, 1300), ease: 'Power2', onComplete: () => p.destroy()
      });
    }
  }

  /* ─────────────────────────────────────────
     FREEZE / UNFREEZE obstacles
  ───────────────────────────────────────── */
  _freezeObstacles() {
    this._obstacles.getChildren().forEach(o => { if (o.active && o.body) o.body.setVelocityX(0); });
    this._activeObstacle = null; this._requiredChord = null; HUD.setRequiredChord(null);
  }

  _unfreezeObstacles() {
    this._obstacles.getChildren().forEach(o => { if (o.active && o.body) o.body.setVelocityX(-CONFIG.BASE_OBSTACLE_SPEED); });
  }

  /* ═════════════════════════════════════════════════════════════
     FINE GIOCO
  ═══════════════════════════════════════════════════════════════ */
  _triggerGameOver() {
    if (!this._gameActive) return;
    this._gameActive = false;
    this._cleanupCombat();
    this.cameras.main.flash(400, 200, 0, 0);
    this.time.delayedCall(600, () => HUD.showGameOver(HUD.score));
  }

  _triggerLevelComplete() {
    if (!this._gameActive) return;
    this._gameActive = false;
    this.sound.play('sfx_win');
    this._cleanupCombat();
    this.cameras.main.flash(350, 6, 214, 160);
    this.time.delayedCall(500, () => HUD.showLevelComplete(HUD.score));
  }

  /* ── SURVIVAL end screens ─────────────────────────────────── */
  _triggerSurvivalComplete(reason) {
    if (!this._gameActive) return;
    this._gameActive = false;
    this.sound.play('sfx_win');
    this._cleanupCombat();
    this.cameras.main.flash(350, 6, 214, 160);
    this.time.delayedCall(600, () => HUD.showSurvivalComplete(this._stats, '⏱️ Time survived!'));
  }

  _triggerSurvivalGameOver() {
    if (!this._gameActive) return;
    this._gameActive = false;
    this._cleanupCombat();
    this.cameras.main.flash(400, 200, 0, 0);
    this.time.delayedCall(600, () => HUD.showSurvivalComplete(this._stats, '💀 You died!'));
  }

  _cleanupCombat() {
    if (this._timerEvent) this._timerEvent.remove();
    if (this._combatManager) { this._combatManager.destroy(); this._combatManager = null; }
    if (this._battleMusic) {
      this._battleMusic.stop();
      this._battleMusic.destroy();
      this._battleMusic = null;
    }
    HealOrbSystem.reset();
    HUD.hideHealOrb(); HUD.hideCombatChord();
  }

  /* ─────────────────────────────────────────
     NAVIGATION
  ───────────────────────────────────────── */
  _restartGame() {
    HUD.hideGameOver(); HUD.hideLevelComplete(); HUD.hideSurvivalComplete();
    this._obstacles.getChildren().forEach(o => { if (o._label) o._label.destroy(); });
    this.scene.restart({
      levelIndex: this._levelIndex, speedMs: this._speedMs,
      durationSec: this._durationSec, waitMode: this._waitMode,
      customOptions: this._customOptions, survivalOptions: this._survivalOpts,
    });
  }

  _nextLevel() {
    HUD.hideGameOver(); HUD.hideLevelComplete();
    const next = (this._levelIndex + 1) % LEVELS.length;
    this._obstacles.getChildren().forEach(o => { if (o._label) o._label.destroy(); });
    this.scene.restart({
      levelIndex: next, speedMs: this._speedMs,
      durationSec: this._durationSec, waitMode: this._waitMode,
      customOptions: this._customOptions,
    });
  }

  _returnToMainMenu() {
    HUD.hideGameOver(); HUD.hideLevelComplete(); HUD.hideSurvivalComplete();
    this._gameActive = false;
    if (this._timerEvent) this._timerEvent.remove();
    if (this._combatManager) { this._combatManager.destroy(); this._combatManager = null; }
    if (this._battleMusic) {
      this._battleMusic.stop();
      this._battleMusic.destroy();
      this._battleMusic = null;
    }
    HealOrbSystem.reset();
    this.scene.stop('GameScene');
    document.getElementById('midi-overlay').classList.remove('hidden');
  }

  /* ─────────────────────────────────────────
     VFX
  ───────────────────────────────────────── */
  _spawnParticles(x, y) {
    const pal = [0x06d6a0, 0xffd166, 0xa29bfe, 0xffffff, 0xff6b9d];
    for (let i = 0; i < 8; i++) {
      const p = this.add.graphics().setDepth(25);
      p.fillStyle(pal[i % pal.length], 1); p.fillCircle(0, 0, Phaser.Math.Between(3, 7));
      p.x = x + Phaser.Math.Between(-15, 15); p.y = y;
      this.tweens.add({
        targets: p, x: x + Phaser.Math.Between(-100, 100), y: y - Phaser.Math.Between(50, 130),
        alpha: 0, scaleX: 0.1, scaleY: 0.1, duration: Phaser.Math.Between(550, 950),
        ease: 'Power2', onComplete: () => p.destroy()
      });
    }
    const star = this.add.image(x, y, 'star').setDepth(25).setScale(0.9);
    this.tweens.add({ targets: star, y: y - 70, alpha: 0, scale: 1.6, duration: 750, ease: 'Power2', onComplete: () => star.destroy() });
  }

  _showFloatingLabel(text, x, y, color) {
    const lbl = this.add.text(x, y, text, {
      fontFamily: 'Outfit, sans-serif', fontSize: '28px', fontStyle: 'bold', color,
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(35);
    this.tweens.add({ targets: lbl, y: y - 55, alpha: 0, duration: 950, ease: 'Power2', onComplete: () => lbl.destroy() });
  }

  _flashPlayerDamage() {
    this.tweens.add({ targets: this._player, alpha: 0.25, duration: 70, yoyo: true, repeat: 4 });
  }

  _setCooldown(ms) {
    this._inputCooldown = true;
    this.time.delayedCall(ms, () => { this._inputCooldown = false; });
  }

  _clearActiveObstacle(delayMs = 0) {
    this.time.delayedCall(delayMs, () => {
      this._activeObstacle = null; this._requiredChord = null; HUD.setRequiredChord(null);
    });
  }
}
