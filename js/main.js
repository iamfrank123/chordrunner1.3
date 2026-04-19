/**
 * main.js — Entry point
 * Canvas in modalità RESIZE: si adatta alla finestra intera.
 */

const phaserConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#131b3a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug:   CONFIG.DEBUG,
    },
  },
  scene: [BootScene, GameScene, UIScene],
  scale: {
    mode:       Phaser.Scale.RESIZE,        // si adatta alla finestra
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent:     'game-container',
  },
  render: {
    antialias:   true,
    pixelArt:    false,
    roundPixels: false,
  },
};

window.addEventListener('DOMContentLoaded', () => {
  new Phaser.Game(phaserConfig);
  MidiManager.init(null);
});
