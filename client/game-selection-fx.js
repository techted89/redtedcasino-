class EffectsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EffectsScene' });
    }

    preload() {
        // No assets to preload for a simple particle effect
    }

    create() {
        const particles = this.add.particles('__DEFAULT');

        const emitter = particles.createEmitter({
            x: { min: 0, max: window.innerWidth },
            y: -10,
            lifespan: 4000,
            speedY: { min: 100, max: 300 },
            speedX: { min: -5, max: 5 },
            scale: { start: 0.1, end: 0 },
            quantity: 2,
            blendMode: 'ADD'
        });

        // Ensure the emitter covers the full width on window resize
        window.addEventListener('resize', () => {
            this.scale.resize(window.innerWidth, window.innerHeight);
            emitter.setEmitZone({
                source: new Phaser.Geom.Line(0, -10, window.innerWidth, -10),
                type: 'random',
                quantity: 2
            });
        });
    }
}

const config = {
    type: Phaser.TRANSPARENT,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'phaser-fx-container',
    scene: [EffectsScene]
};

// Make the game instance globally available
window.fxGame = new Phaser.Game(config);

// Add the hover effect methods to the scene prototype
EffectsScene.prototype.addHoverEffect = function(x, y, width, height) {
    // Remove any existing effect first
    this.removeHoverEffect();

    this.hoverEffect = this.add.graphics();
    this.hoverEffect.lineStyle(4, 0xffffff, 0.5); // White, semi-transparent border
    this.hoverEffect.strokeRect(x, y, width, height);

    // Add a shimmer tween
    this.tweens.add({
        targets: this.hoverEffect,
        alpha: { from: 0.5, to: 0.1 },
        duration: 400,
        yoyo: true,
        repeat: -1
    });
};

EffectsScene.prototype.removeHoverEffect = function() {
    if (this.hoverEffect) {
        this.hoverEffect.destroy();
        this.hoverEffect = null;
    }
};