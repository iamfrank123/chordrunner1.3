/**
 * CombatScene.js — Logica del sistema di combattimento musicale
 *
 * Gestisce:
 *  - Loop d'attacco ogni N secondi (chord generator)
 *  - Timing system: PERFECT / GOOD / LATE / MISS
 *  - Heavy Attack event (slow motion + chord difficile)
 *  - Damage player ↔ monster
 *  - Visual sprite del mostro su Phaser scene
 *  - Transizioni STATE → RUNNING quando mostro muore
 *
 * Uso (da GameScene):
 *   this._combat = new CombatManager(scene, monster, onMonsterDead, onPlayerDamaged);
 *   this._combat.start();
 *   // Nel loop MIDI: this._combat.onChordInput(matchedChords);
 *   this._combat.destroy();
 */

class CombatManager {
  constructor(scene, monster, onMonsterDead, onPlayerDamaged, chordWindowMs, waitMode) {
    this._scene = scene;
    this._monster = monster;
    this._onMonsterDead = onMonsterDead;
    this._onPlayerDamaged = onPlayerDamaged;
    this._chordWindowMs = chordWindowMs || 2000;
    this._waitMode = waitMode || false;

    this._active = false;
    this._attackTimer = null;
    this._currentChord = null;
    this._attackStart = 0;
    this._attackElapsed = 0;
    this._isHeavy = false;
    this._awaitingInput = false;
    this._inputCooldown = false;
    this._chordHistory = [];   // anti-repeat: ultimi 4 accordi usati

    // ── Visual elements creati in Phaser ──
    this._monsterSprite = null;
    this._auraGraphics = null;
    this._hpBarBg = null;
    this._hpBarFill = null;
    this._hpBarLabel = null;
    this._monsterLabel = null;
    this._heavyBanner = null;
    this._auraTimer = 0;

    // Cinematic Target System
    this._targetOuterCircle = null;
    this._targetInnerCircle = null;
    this._targetChordLabel = null;
    this._targetX = 0;
    this._targetY = 0;
  }

  update(time, delta) {
    if (!this._active) return;
    // Il countdown visivo è ora gestito dal timer event (getElapsed) per sincronizzazione perfetta
  }

  /* ─────────────────────────────────────────────────────────────
     START
  ───────────────────────────────────────────────────────────── */
  start() {
    this._active = true;
    this._buildMonsterVisual();
    this._buildHPBar();
    this._animateEntrance(() => {
      // Primo attacco dopo delay iniziale
      this._scheduleAttack(CONFIG.COMBAT_FIRST_ATTACK_DELAY);
    });
  }

  /* ─────────────────────────────────────────────────────────────
     BUILD VISUALS
  ───────────────────────────────────────────────────────────── */
  _buildMonsterVisual() {
    const scene = this._scene;
    const W = scene._W;
    const H = scene._H;
    const def = this._monster.def;

    // Aura grafica (solo large/elite)
    if (def.key === 'large' || def.key === 'elite') {
      this._auraGraphics = scene.add.graphics().setDepth(8);
    }

    // Sprite mostro
    const textureKey = scene.textures.exists(def.textureKey) ? def.textureKey : 'obstacle';
    this._monsterSprite = scene.add.image(W * 0.72, scene._groundY, textureKey)
      .setOrigin(0.5, 1)
      .setScale(def.size)
      .setDepth(9)
      .setAlpha(0);

    // Calcola l'apice effettivo dello sprite
    const spriteTopY = this._monsterSprite.y - this._monsterSprite.displayHeight;

    // Label nome mostro sopra il mostro
    this._monsterLabel = scene.add.text(
      W * 0.72,
      spriteTopY - 15, // 15px sopra l'apice del mostro
      `${def.elementIcon} ${def.label}`,
      {
        fontFamily: 'Outfit, sans-serif',
        fontSize: def.key === 'elite' ? '22px' : '18px',
        fontStyle: 'bold',
        color: def.glowColor,
        stroke: '#000',
        strokeThickness: 5,
        backgroundColor: '#00000088',
        padding: { x: 10, y: 4 },
      }
    ).setOrigin(0.5, 1).setDepth(18).setAlpha(0);
  }

  _buildHPBar() {
    const scene = this._scene;
    const W = scene._W;
    const barW = 250;
    const barH = 48;

    // Metti la Barra HP esattamente 10px sopra AL DI SOPRA della Label del nome
    const labelTopY = this._monsterLabel.y - this._monsterLabel.displayHeight;
    const barY = labelTopY - 10 - barH;
    const barX = W * 0.72 - barW / 2;

    // BG
    this._hpBarBg = scene.add.graphics().setDepth(17);
    this._hpBarBg.fillStyle(0x111111, 0.8);
    this._hpBarBg.fillRoundedRect(barX, barY, barW, barH, 4);
    this._hpBarBg.lineStyle(2, 0xffffff, 0.15);
    this._hpBarBg.strokeRoundedRect(barX, barY, barW, barH, 4);
    this._hpBarBg.setAlpha(0);

    // Fill
    this._hpBarFill = scene.add.graphics().setDepth(18);
    this._hpBarFill.setAlpha(0);

    this._hpBarLabel = scene.add.text(barX + barW / 2, barY + barH / 2, '', {
      fontFamily: 'Outfit, sans-serif', fontSize: '22px',
      color: '#ffffff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(19).setAlpha(0);

    this._barX = barX;
    this._barY = barY;
    this._barW = barW;
    this._barH = barH;

    this._redrawHPBar();
  }

  _redrawHPBar() {
    if (!this._hpBarFill) return;
    const m = this._monster;
    const pct = Math.max(0, m.hp / m.maxHp);
    const fill = this._barW * pct;

    const color = pct > 0.6 ? 0x06d6a0 : (pct > 0.3 ? 0xffd166 : 0xff6b6b);

    this._hpBarFill.clear();
    this._hpBarFill.fillStyle(color, 1);
    if (fill > 0) this._hpBarFill.fillRoundedRect(this._barX, this._barY, fill, this._barH, 4);

    if (this._hpBarLabel) {
      this._hpBarLabel.setText(`${m.hp} / ${m.maxHp}`);
    }
  }

  /* ─────────────────────────────────────────────────────────────
     ENTRANCE ANIMATION
  ───────────────────────────────────────────────────────────── */
  _animateEntrance(onDone) {
    const scene = this._scene;
    const def = this._monster.def;

    if (def.entranceAnim === 'stomp' || def.entranceAnim === 'boss') {
      scene.cameras.main.shake(350, def.key === 'elite' ? 0.025 : 0.015);
    }

    // Fade in sprite + label + bar
    scene.tweens.add({
      targets: [this._monsterSprite, this._monsterLabel, this._hpBarBg, this._hpBarFill, this._hpBarLabel],
      alpha: 1,
      duration: def.entranceAnim === 'boss' ? 1200 : 500,
      ease: 'Power2',
      onComplete: onDone,
    });

    // Elite ha uno slow floatin entrance
    if (def.entranceAnim === 'boss') {
      this._monsterSprite.setScale(def.size * 2);
      scene.tweens.add({
        targets: this._monsterSprite,
        scaleX: def.size,
        scaleY: def.size,
        duration: 1200,
        ease: 'Back.Out',
      });
    }
  }

  /* ─────────────────────────────────────────────────────────────
     ATTACK LOOP
  ───────────────────────────────────────────────────────────── */
  _scheduleAttack(delay) {
    if (!this._active) return;
    const ms = delay || CONFIG.COMBAT_ATTACK_INTERVAL;
    this._attackTimer = this._scene.time.delayedCall(ms, () => {
      if (!this._active) return;
      this._launchAttack();
    });
  }

  _launchAttack() {
    if (!this._active) return;

    // Tira per heavy attack
    this._isHeavy = MonsterSystem.rollHeavyAttack();
    this._monster.isHeavyAttack = this._isHeavy;

    // Scegli accordo evitando ripetizioni
    this._currentChord = this._getNextChord();

    this._awaitingInput = true;
    this._attackStart = this._scene.time.now;
    this._attackElapsed = 0; // reset local accumulator

    // Mostra bersaglio cinematico in fase di combat
    this._createTargetVisual();

    // Heavy: slow motion + banner
    if (this._isHeavy) {
      this._showHeavyBanner();
    } else {
      this._pulseMonster();
    }

    // Countdown visivo sull'ostacolo
    this._startAttackCountdown();
  }

  /* ─────────────────────────────────────────────────────────────
     HEAVY ATTACK VISUAL
  ───────────────────────────────────────────────────────────── */
  _showHeavyBanner() {
    const scene = this._scene;
    const W = scene._W, H = scene._H;

    if (this._heavyBanner) { this._heavyBanner.destroy(); }

    this._heavyBanner = scene.add.text(W / 2, H * 0.28, '⚡ HEAVY ATTACK!', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '38px',
      fontStyle: 'bold',
      color: '#ffd166',
      stroke: '#000',
      strokeThickness: 8,
      shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 8, fill: true },
    }).setOrigin(0.5).setDepth(50).setAlpha(0).setScale(0.6);

    scene.tweens.add({
      targets: this._heavyBanner,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 260,
      ease: 'Back.Out',
      yoyo: false,
      onComplete: () => {
        scene.time.delayedCall(900, () => {
          if (this._heavyBanner) {
            scene.tweens.add({
              targets: this._heavyBanner, alpha: 0, duration: 300,
              onComplete: () => { if (this._heavyBanner) { this._heavyBanner.destroy(); this._heavyBanner = null; } }
            });
          }
        });
      }
    });

    // Slow motion effect via timescale
    scene.time.timeScale = 0.7;
    scene.time.delayedCall(1800, () => { scene.time.timeScale = 1.0; });
  }

  /* ─────────────────────────────────────────────────────────────
     COUNTDOWN VISUALIZZATO SULL'ATTACCO
  ───────────────────────────────────────────────────────────── */
  _startAttackCountdown() {
    const windowMs = this._chordWindowMs;

    this._countdownTimer = this._scene.time.delayedCall(windowMs, () => {
      if (this._awaitingInput) {
        this._onMiss();
      }
    });

    if (this._uiTimer) this._uiTimer.remove();
    this._uiTimer = this._scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!this._awaitingInput || !this._countdownTimer) return;
        const elapsed = this._countdownTimer.getElapsed();
        const pct = 1.0 - (elapsed / windowMs);
        const remainingSec = Math.max(0, (windowMs - elapsed) / 1000).toFixed(1);
        HUD.updateCombatTimer(pct, `${remainingSec}s`);
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────
     CINEMATIC CHORD TARGET
  ───────────────────────────────────────────────────────────── */
  _createTargetVisual() {
    this._destroyTargetVisual();
    const scene = this._scene;
    const playerX = 80;
    const monsterX = scene._W * 0.72;

    // Posizione random tra la linea di azione (PLAY HERE) e il mostro, con altezza superiore
    this._targetX = Phaser.Math.Between(CONFIG.TRIGGER_ZONE_X + 40, monsterX - 160);
    this._targetY = scene._groundY - Phaser.Math.Between(160, 300);

    this._targetInnerCircle = scene.add.graphics().setDepth(45);
    this._targetOuterCircle = scene.add.graphics().setDepth(44);

    this._targetInnerCircle.fillStyle(0x080a12, 0.85);
    this._targetInnerCircle.lineStyle(4, 0xffffff, 0.5);
    this._targetInnerCircle.fillCircle(this._targetX, this._targetY, 60);
    this._targetInnerCircle.strokeCircle(this._targetX, this._targetY, 60);

    this._targetInnerCircle.setScale(0);
    scene.tweens.add({ targets: this._targetInnerCircle, scale: 1, duration: 250, ease: 'Back.Out' });

    const chordLabelText = getChordLabel(this._currentChord);
    this._targetChordLabel = scene.add.text(this._targetX, this._targetY, chordLabelText, {
      fontFamily: 'Outfit, sans-serif', fontSize: this._isHeavy ? '36px' : '28px',
      fontStyle: 'bold', color: this._isHeavy ? '#ffd166' : '#ffffff',
    }).setOrigin(0.5).setDepth(46).setAlpha(0);

    scene.tweens.add({ targets: this._targetChordLabel, alpha: 1, duration: 250 });

    if (this._isHeavy) {
      scene.tweens.add({
        targets: this._targetChordLabel,
        scaleX: 1.15, scaleY: 1.15,
        duration: 350, yoyo: true, repeat: -1
      });
      this._targetInnerCircle.lineStyle(4, 0xffd166, 0.8);
      this._targetInnerCircle.strokeCircle(this._targetX, this._targetY, 60);
    }
  }

  _destroyTargetVisual() {
    if (this._targetOuterCircle) { this._targetOuterCircle.destroy(); this._targetOuterCircle = null; }
    if (this._targetInnerCircle) {
      const c = this._targetInnerCircle;
      this._scene.tweens.add({ targets: c, scale: 0, alpha: 0, duration: 150, onComplete: () => c.destroy() });
      this._targetInnerCircle = null; 
    }
    if (this._targetChordLabel) {
      const l = this._targetChordLabel;
      this._scene.tweens.add({ targets: l, scale: 0, alpha: 0, duration: 150, onComplete: () => l.destroy() });
      this._targetChordLabel = null; 
    }
  }

  /* ─────────────────────────────────────────────────────────────
     ANTI-REPEAT: scegli accordo diverso dagli ultimi 4
  ───────────────────────────────────────────────────────────── */
  _getNextChord() {
    const pool = this._monster.chordPool;

    // Filtra i recenti dalla history
    let available = pool.filter(c => !this._chordHistory.includes(c));
    // Se il pool è troppo piccolo per filtrare, usa tutto pool ma evita almeno l'ultimo
    if (available.length === 0) {
      const lastChord = this._chordHistory[this._chordHistory.length - 1];
      available = pool.filter(c => c !== lastChord);
    }
    if (available.length === 0) available = pool;

    const chord = available[Math.floor(Math.random() * available.length)];

    // Aggiorna history (massimo 4 slot)
    this._chordHistory.push(chord);
    if (this._chordHistory.length > 4) this._chordHistory.shift();

    return chord;
  }

  /* ─────────────────────────────────────────────────────────────
     CHORD INPUT (chiamato dal MIDI handler)
  ───────────────────────────────────────────────────────────── */
  onChordInput(matchedChords, rawNotes, isNoteOn) {
    if (!this._active || !this._awaitingInput || this._inputCooldown) return;
    if (!rawNotes || rawNotes.length === 0) return;

    if (matchedChords.includes(this._currentChord)) {
      this._onHit();
      return;
    }

    if (!isNoteOn) return; // Ignore any processing that would penalize a key release

    // Subset logic per accordi lunghi (maj7, min9)
    const reqNotes = CHORD_DB[this._currentChord] ? CHORD_DB[this._currentChord].notes : null;
    if (reqNotes) {
      const isSubset = rawNotes.every(st => reqNotes.includes(st));
      if (isSubset) {
        // Sto costruendo l'accordo e non ho premuto nulla di errato
        return;
      }
    }

    // Accordo sbagliato → trigger miss as wrong chord
    this._onMiss(true);
  }

  /* ─────────────────────────────────────────────────────────────
     HIT
  ───────────────────────────────────────────────────────────── */
  _onHit() {
    this._awaitingInput = false;
    this._destroyTargetVisual();
    if (this._countdownTimer) this._countdownTimer.remove();
    if (this._uiTimer) this._uiTimer.remove();

    this._scene.sound.play('sfx_atkmonster');

    const elapsed = this._scene.time.now - this._attackStart;
    const pctRemaining = Math.max(0, 1.0 - (elapsed / this._chordWindowMs));
    const quality = this._getTimingQuality(pctRemaining);
    const isWeakness = MonsterSystem.checkWeakness(this._monster, this._currentChord);

    let rawDmg = MonsterSystem.calcDamage(this._monster, pctRemaining);
    if (isWeakness) rawDmg *= CONFIG.WEAKNESS_BONUS_MULT;

    const dmgDealt = MonsterSystem.applyDamage(this._monster, rawDmg);

    // Punteggio
    let scoreGain = CONFIG.SCORE_COMBAT_GOOD;
    if (quality === 'Perfect Hit' || quality === 'Great Hit') scoreGain = CONFIG.SCORE_COMBAT_PERFECT;
    HUD.addScore(scoreGain + (isWeakness ? 50 : 0));
    GameStateManager.recordHit(true);

    // Feedback visivo
    this._hitFeedback(quality, isWeakness, dmgDealt);
    this._redrawHPBar();

    // Reset slow motion
    this._scene.time.timeScale = 1.0;

    // Mostro morto?
    if (this._monster.dead) {
      this._onMonsterKilled();
    } else {
      this._setCooldown(150);
      // Salta al prossimo accordo quasi immediatamente!
      this._scheduleAttack(150);
    }
  }

  /* ─────────────────────────────────────────────────────────────
     MISS / WRONG
  ───────────────────────────────────────────────────────────── */
  _onMiss(isWrongChord = false) {
    this._awaitingInput = false;
    this._destroyTargetVisual();
    if (this._countdownTimer) this._countdownTimer.remove();
    if (this._uiTimer) this._uiTimer.remove();

    GameStateManager.recordHit(false);
    this._scene.time.timeScale = 1.0;

    // Counter attack damage al player
    let applyDamage = true;
    if (isWrongChord && !this._scene._wrongPenalty) {
      applyDamage = false;
    }

    if (applyDamage) {
      const dmg = this._isHeavy ? CONFIG.HEAVY_ATTACK_COUNTER_DMG : CONFIG.MONSTER_ATTACK_DAMAGE;
      if (this._onPlayerDamaged) this._onPlayerDamaged(dmg);
    }

    this._missFeedback(isWrongChord);
    this._setCooldown(400);
    HUD.setCombatChord(null, false);
    // Assicuriamoci che resetta la barra in stato idle
    HUD.updateCombatTimer(0, '');
    this._scheduleAttack();
  }

  /* ─────────────────────────────────────────────────────────────
     TIMING QUALITY — usa la finestra configurabile
  ───────────────────────────────────────────────────────────── */
  _getTimingQuality(pctRemaining) {
    if (pctRemaining >= 0.8) return 'Perfect Hit';
    if (pctRemaining >= 0.6) return 'Great Hit';
    if (pctRemaining >= 0.4) return 'Good Hit';
    if (pctRemaining >= 0.2) return 'Nice Hit';
    return 'Weak Hit';
  }

  /* ─────────────────────────────────────────────────────────────
     MONSTER KILLED
  ───────────────────────────────────────────────────────────── */
  _onMonsterKilled() {
    this._active = false;
    if (this._attackTimer) this._attackTimer.remove();
    if (this._heavyBanner) { this._heavyBanner.destroy(); this._heavyBanner = null; }

    HUD.addScore(CONFIG.SCORE_MONSTER_KILL);
    HUD.setCombatChord(null, false);

    // Morte mostro: scuoti + esplodi
    const scene = this._scene;
    scene.cameras.main.shake(300, 0.018);

    scene.tweens.add({
      targets: this._monsterSprite,
      scaleX: 0,
      scaleY: 2.5,
      alpha: 0,
      duration: 450,
      ease: 'Power3',
    });

    this._spawnDeathParticles();

    // Label "DEFEATED!"
    const lbl = scene.add.text(scene._W * 0.72, scene._groundY - 140,
      '☠️ DEFEATED!', {
      fontFamily: 'Outfit, sans-serif', fontSize: '32px',
      fontStyle: 'bold', color: '#06d6a0',
      stroke: '#000', strokeThickness: 8,
    }
    ).setOrigin(0.5).setDepth(40);

    scene.tweens.add({
      targets: lbl, y: lbl.y - 80, alpha: 0,
      duration: 1400, ease: 'Power2',
      onComplete: () => { lbl.destroy(); if (this._onMonsterDead) this._onMonsterDead(); }
    });
  }

  /* ─────────────────────────────────────────────────────────────
     FEEDBACK VISIVI
  ───────────────────────────────────────────────────────────── */
  _hitFeedback(quality, isWeakness, dmgDealt) {
    const scene = this._scene;
    const mx = scene._W * 0.72;
    const my = scene._groundY - 60;

    let label, color;
    if (quality === 'Perfect Hit' || quality === 'Great Hit') {
      label = `✨ ${quality.toUpperCase()}!`;
      color = isWeakness ? '#ffd166' : '#06d6a0';
      // Glow gold sull'HUD
      HUD.flashCombatResult('perfect');
      scene.cameras.main.flash(120, 6, 214, 160, false);
    } else if (quality === 'Good Hit' || quality === 'Nice Hit') {
      label = `💙 ${quality.toUpperCase()}!`;
      color = isWeakness ? '#ffd166' : '#74b9ff';
      HUD.flashCombatResult('good');
    } else {
      label = `🟡 ${quality.toUpperCase()}`;
      color = '#fdcb6e';
      HUD.flashCombatResult('late');
    }

    // Danno flottante sul mostro
    const dmgLbl = scene.add.text(mx + Phaser.Math.Between(-30, 30), my - 10,
      `-${dmgDealt} HP`, {
      fontFamily: 'Outfit, sans-serif', fontSize: '22px',
      fontStyle: 'bold', color: '#ff6b6b',
      stroke: '#000', strokeThickness: 5,
    }
    ).setOrigin(0.5).setDepth(40);
    scene.tweens.add({
      targets: dmgLbl, y: dmgLbl.y - 55, alpha: 0,
      duration: 900, ease: 'Power2',
      onComplete: () => dmgLbl.destroy(),
    });

    // Label qualità
    const ql = scene.add.text(mx, my - 50, label, {
      fontFamily: 'Outfit, sans-serif', fontSize: '24px',
      fontStyle: 'bold', color,
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(41);
    scene.tweens.add({
      targets: ql, y: ql.y - 60, alpha: 0,
      duration: 1100, ease: 'Power2',
      onComplete: () => ql.destroy(),
    });

    // Shake mostro
    scene.tweens.add({
      targets: this._monsterSprite,
      x: scene._W * 0.72 + 8, duration: 40, yoyo: true, repeat: 4,
      ease: 'Sine',
      onComplete: () => { if (this._monsterSprite) this._monsterSprite.x = scene._W * 0.72; }
    });

    // Particelle Hit
    this._spawnHitParticles(mx, my, color);
  }

  _missFeedback(isWrongChord = false) {
    const scene = this._scene;
    const W = scene._W;

    // Red flash
    scene.cameras.main.flash(200, 180, 0, 0, false);
    HUD.flashCombatResult('miss');

    const msg = isWrongChord ? 'WRONG CHORD!' : '💥 MISSED!';
    const lbl = scene.add.text(W / 2, scene._H * 0.45, msg, {
      fontFamily: 'Outfit, sans-serif', fontSize: '36px',
      fontStyle: 'bold', color: '#ff6b6b',
      stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    scene.tweens.add({
      targets: lbl, alpha: 1, duration: 150,
      yoyo: false,
      onComplete: () => {
        scene.time.delayedCall(600, () => {
          scene.tweens.add({ targets: lbl, alpha: 0, duration: 300, onComplete: () => lbl.destroy() });
        });
      }
    });
  }

  _pulseMonster() {
    if (!this._monsterSprite) return;
    const scene = this._scene;
    const def = this._monster.def;
    const origSx = def.size;
    scene.tweens.add({
      targets: this._monsterSprite,
      scaleX: origSx * 1.12,
      scaleY: origSx * 1.12,
      duration: 160,
      yoyo: true,
      ease: 'Sine',
    });
  }

  _spawnHitParticles(x, y, colorHex) {
    const scene = this._scene;
    const colorInt = Phaser.Display.Color.HexStringToColor(colorHex).color;
    for (let i = 0; i < 8; i++) {
      const p = scene.add.graphics().setDepth(42);
      p.fillStyle(colorInt, 1);
      p.fillCircle(0, 0, Phaser.Math.Between(3, 7));
      p.x = x + Phaser.Math.Between(-20, 20);
      p.y = y;
      scene.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-80, 80),
        y: p.y - Phaser.Math.Between(40, 100),
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: Phaser.Math.Between(500, 900),
        ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
  }

  _spawnDeathParticles() {
    const scene = this._scene;
    const x = scene._W * 0.72;
    const y = scene._groundY - 60;
    const colors = [0xffd166, 0x06d6a0, 0xff6b6b, 0xa29bfe, 0xffffff];
    for (let i = 0; i < 20; i++) {
      const p = scene.add.graphics().setDepth(42);
      p.fillStyle(colors[i % colors.length], 1);
      p.fillCircle(0, 0, Phaser.Math.Between(4, 10));
      p.x = x + Phaser.Math.Between(-40, 40);
      p.y = y + Phaser.Math.Between(-20, 20);
      scene.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-150, 150),
        y: p.y - Phaser.Math.Between(60, 200),
        alpha: 0, scale: 0.1,
        duration: Phaser.Math.Between(600, 1200),
        ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
  }

  /* ─────────────────────────────────────────────────────────────
     UPDATE (chiamato ogni frame quando in COMBAT)
  ───────────────────────────────────────────────────────────── */
  update(time, delta) {
    if (!this._active) return;
    this._auraTimer += delta;

    // Aura pulsante per large/elite
    if (this._auraGraphics && this._monsterSprite) {
      const pulse = 0.35 + 0.25 * Math.sin(this._auraTimer * 0.003);
      const def = this._monster.def;
      this._auraGraphics.clear();
      this._auraGraphics.fillStyle(def.color, pulse * 0.3);
      this._auraGraphics.fillCircle(
        this._monsterSprite.x,
        this._monsterSprite.y - this._monsterSprite.displayHeight * 0.5,
        this._monsterSprite.displayWidth * 0.85
      );
    }

    // UPDATE CINEMATIC TARGET
    if (this._awaitingInput && this._countdownTimer && this._targetOuterCircle) {
      const windowMs = this._chordWindowMs;
      const elapsed = this._countdownTimer.getElapsed();
      const pct = 1.0 - (elapsed / windowMs); // 1.0 -> 0.0
      const p = Math.max(0, Math.min(1, pct));
      
      const isDanger = p <= 0.25;
      const color = p > 0.5 ? 0x06d6a0 : (isDanger ? 0xff6b6b : 0xffd166);

      this._targetOuterCircle.clear();
      this._targetOuterCircle.lineStyle(isDanger ? 8 : 5, color, 0.9);
      
      const targetRadius = 60;
      const maxRadius = 120;
      const radius = targetRadius + ((maxRadius - targetRadius) * p);
      this._targetOuterCircle.strokeCircle(this._targetX, this._targetY, radius);
      
      if (isDanger && this._targetInnerCircle) {
        this._targetInnerCircle.alpha = 0.6 + 0.4 * Math.sin(time * 0.02);
      }
    }
  }

  /* ─────────────────────────────────────────────────────────────
     UTILITY
  ───────────────────────────────────────────────────────────── */
  _setCooldown(ms) {
    this._inputCooldown = true;
    this._scene.time.delayedCall(ms, () => { this._inputCooldown = false; });
  }

  /* ─────────────────────────────────────────────────────────────
     DESTROY
  ───────────────────────────────────────────────────────────── */
  destroy() {
    this._active = false;
    this._destroyTargetVisual();
    if (this._attackTimer) this._attackTimer.remove();
    if (this._countdownTimer) this._countdownTimer.remove();
    if (this._monsterSprite) this._monsterSprite.destroy();
    if (this._auraGraphics) this._auraGraphics.destroy();
    if (this._monsterLabel) this._monsterLabel.destroy();
    if (this._hpBarBg) this._hpBarBg.destroy();
    if (this._hpBarFill) this._hpBarFill.destroy();
    if (this._hpBarLabel) this._hpBarLabel.destroy();
    if (this._heavyBanner) this._heavyBanner.destroy();
    this._scene.time.timeScale = 1.0;
  }
}
