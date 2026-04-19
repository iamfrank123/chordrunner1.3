/**
 * UIScene.js — Scena UI sovrapposta al canvas (Phaser overlay)
 *
 * Gestisce elementi grafici dentro Phaser che devono stare
 * sempre sopra al gameplay: trigger zone indicator, flash effetti.
 * Gira in parallelo con GameScene.
 */

class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    /* ── Label zona ── */
    this.add.text(CONFIG.TRIGGER_ZONE_X, Math.max(H * 0.1, 70), '🎵 PLAY HERE', {
      fontFamily: 'Outfit, sans-serif',
      fontSize:   '14px',
      fontStyle:  'bold',
      color:      '#ffffff88',
      align:      'center',
    }).setOrigin(0.5, 0);
  }
}
