// MenuScene: Displays the title, start button, and high score
class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        // Title
        this.add.text(400, 200, 'Stone Merge', { fontSize: '48px', color: '#fff' }).setOrigin(0.5);

        // Start Button
        const startButton = this.add.text(400, 300, 'Start Game', { fontSize: '32px', color: '#fff' })
            .setOrigin(0.5)
            .setInteractive();
        startButton.on('pointerdown', () => this.scene.start('GameScene'));

        // High Score
        const highScore = localStorage.getItem('highScore') || 0;
        this.add.text(400, 400, `High Score: ${highScore}`, { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
    }
}

// GameScene: Handles the main gameplay with stone dropping and merging
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // Load all stone (crystal) assets from the /assets folder
        const colors = [
            'Pink', 'Black', 'Blue', 'Dark_red', 'Green',
            'Red', 'Violet', 'White', 'Yellow', 'Yellow-green'
        ];
        colors.forEach(color => {
            for (let size = 1; size <= 4; size++) {
                const assetKey = `${color}_crystal${size}`;
                const fileName = color === 'Dark_red' ? `assets/Dark_red_crystal${size}.png` : `assets/${color}_crystal${size}.png`;
                this.load.image(assetKey, fileName);
            }
        });
    }

    create() {
        this.score = 0;
        this.stones = this.physics.add.group(); // Group to manage stones
        this.deathLineY = 50; // Y-coordinate of the death line

        // Set world bounds (800x600 game area)
        this.physics.world.setBounds(0, 0, 800, 600);
        this.physics.world.setBoundsCollision(true, true, false, true);

        // Death Line (red line at y = 50)
        this.add.line(400, this.deathLineY, 0, 0, 800, 0, 0xff0000).setOrigin(0);

        // Score Text
        this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '24px', color: '#fff' });

        // End Game Button
        const endButton = this.add.text(700, 10, 'End Game', { fontSize: '24px', color: '#fff' }).setInteractive();
        endButton.on('pointerdown', () => {
            const highScore = localStorage.getItem('highScore') || 0;
            if (this.score > highScore) localStorage.setItem('highScore', this.score);
            this.scene.start('MenuScene');
        });

        // Drop a stone on click/tap
        this.input.on('pointerdown', () => this.dropStone());

        // Collision detection for merging
        this.physics.add.collider(this.stones, this.stones, this.checkMerge, null, this);
    }

    dropStone() {
        // Check for game over (any stone above death line)
        let gameOver = false;
        this.stones.getChildren().forEach(stone => {
            if (stone.y < this.deathLineY) gameOver = true;
        });

        if (gameOver) {
            this.add.text(400, 300, 'Game Over', { fontSize: '48px', color: '#fff' }).setOrigin(0.5);
            const highScore = localStorage.getItem('highScore') || 0;
            if (this.score > highScore) localStorage.setItem('highScore', this.score);
            this.time.delayedCall(2000, () => this.scene.start('MenuScene'));
            return;
        }

        // Drop a random size 4 stone
        const colors = ['Pink', 'Black', 'Blue', 'Dark_red', 'Green', 'Red', 'Violet', 'White', 'Yellow', 'Yellow-green'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const stone = this.stones.create(400, 0, `${color}_crystal4`);
        stone.setBounce(0.5); // Bounce when hitting other stones or bounds
        stone.setCollideWorldBounds(true);
        stone.size = 4; // Initial size
        stone.color = color; // Track color for asset loading
    }

    checkMerge(stone1, stone2) {
        // Merge if sizes match (color ignored)
        if (stone1.size === stone2.size) {
            const newSize = stone1.size - 1;
            if (newSize < 1) return; // No merging for size 1

            // Calculate position and velocity for the new stone
            const x = (stone1.x + stone2.x) / 2;
            const y = (stone1.y + stone2.y) / 2;
            const velocityX = (stone1.body.velocity.x + stone2.body.velocity.x) / 2;
            const velocityY = (stone1.body.velocity.y + stone2.body.velocity.y) / 2;

            // Destroy the merging stones
            stone1.destroy();
            stone2.destroy();

            // Randomly select a color for the new stone (for variety)
            const colors = ['Pink', 'Black', 'Blue', 'Dark_red', 'Green', 'Red', 'Violet', 'White', 'Yellow', 'Yellow-green'];
            const newColor = colors[Math.floor(Math.random() * colors.length)];
            const newStone = this.stones.create(x, y, `${newColor}_crystal${newSize}`);
            newStone.setBounce(0.5);
            newStone.setCollideWorldBounds(true);
            newStone.size = newSize;
            newStone.color = newColor;
            newStone.setVelocity(velocityX, velocityY);

            // Update score (smaller sizes = more points)
            this.score += 10 * (5 - newSize);
            this.scoreText.setText(`Score: ${this.score}`);
        }
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    scene: [MenuScene, GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 }, // Stones fall naturally
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Initialize the game
const game = new Phaser.Game(config);