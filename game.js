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
        
        // Load explosion effect
        this.load.spritesheet('explosion', 'assets/explosion.png', { 
            frameWidth: 64, 
            frameHeight: 64 
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

        // Next Stone Preview
        this.nextStoneText = this.add.text(400, 30, 'Next Stone:', { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
        
        // Create explosion animation
        this.anims.create({
            key: 'explode',
            frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 15 }),
            frameRate: 20,
            hideOnComplete: true
        });

        // Drop a stone on click/tap
        this.input.on('pointerdown', (pointer) => {
            // Only drop if clicking in the game area (not on buttons)
            if (pointer.y > this.deathLineY) {
                this.dropStone(pointer.x);
            }
        });

        // Collision detection for merging
        this.physics.add.collider(this.stones, this.stones, this.checkMerge, null, this);
        
        // Prepare next stone
        this.prepareNextStone();
    }
    
    prepareNextStone() {
        // Prepare the next stone color
        const colors = ['Pink', 'Black', 'Blue', 'Dark_red', 'Green', 'Red', 'Violet', 'White', 'Yellow', 'Yellow-green'];
        this.nextStoneColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Show preview
        if (this.nextStonePreview) {
            this.nextStonePreview.destroy();
        }
        this.nextStonePreview = this.add.image(460, 30, `${this.nextStoneColor}_crystal4`).setScale(0.5);
    }

    dropStone(x = 400) {
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

        // Drop a stone with the previewed color
        const color = this.nextStoneColor;
        const stone = this.stones.create(x, 0, `${color}_crystal4`);
        stone.setBounce(0.3); // Less bounce for better control
        stone.setCollideWorldBounds(true);
        stone.setFriction(0.8, 0); // Add friction to reduce sliding
        stone.size = 4; // Initial size
        stone.color = color; // Track color for merging logic
        
        // Prepare the next stone
        this.prepareNextStone();
    }

    checkMerge(stone1, stone2) {
        // Only merge if colors match
        if (stone1.color === stone2.color && stone1.size === stone2.size) {
            // Calculate position for the new stone
            const x = (stone1.x + stone2.x) / 2;
            const y = (stone1.y + stone2.y) / 2;
            
            // For smaller stones, we get more points
            const scoreIncrease = 10 * (5 - stone1.size);
            this.score += scoreIncrease;
            
            // Create score popup
            const scorePopup = this.add.text(x, y - 20, `+${scoreIncrease}`, { 
                fontSize: '20px', 
                color: '#ffff00',
                stroke: '#000000',
                strokeThickness: 3 
            }).setOrigin(0.5);
            
            // Animate the score popup
            this.tweens.add({
                targets: scorePopup,
                y: y - 70,
                alpha: 0,
                duration: 1000,
                onComplete: () => scorePopup.destroy()
            });

            // What happens after merging depends on the size
            if (stone1.size > 1) {
                // Level up to a smaller stone (4->3->2->1)
                const newSize = stone1.size - 1;
                
                // Destroy the merging stones
                stone1.destroy();
                stone2.destroy();
                
                // Create the new smaller stone (higher level)
                const newStone = this.stones.create(x, y, `${stone1.color}_crystal${newSize}`);
                newStone.setBounce(0.3);
                newStone.setCollideWorldBounds(true);
                newStone.size = newSize;
                newStone.color = stone1.color; // Keep the same color
                
                // Momentum transfer (average of the two merging stones)
                const velocityX = (stone1.body.velocity.x + stone2.body.velocity.x) / 2;
                const velocityY = (stone1.body.velocity.y + stone2.body.velocity.y) / 2;
                newStone.setVelocity(velocityX, velocityY);
            } else {
                // Size 1 stones explode when merged
                const explosionBonus = 100; // Extra points for completing a merge chain
                this.score += explosionBonus;
                
                // Create explosion effect
                const explosion = this.add.sprite(x, y, 'explosion').play('explode');
                
                // Create explosion bonus text
                const bonusText = this.add.text(x, y - 40, `+${explosionBonus}`, { 
                    fontSize: '24px', 
                    color: '#ff0000',
                    stroke: '#ffffff',
                    strokeThickness: 4
                }).setOrigin(0.5);
                
                // Animate the bonus text
                this.tweens.add({
                    targets: bonusText,
                    y: y - 100,
                    alpha: 0,
                    duration: 1200,
                    onComplete: () => bonusText.destroy()
                });
                
                // Destroy the stones
                stone1.destroy();
                stone2.destroy();
            }
            
            // Update score
            this.scoreText.setText(`Score: ${this.score}`);
        }
    }
    
    update() {
        // Apply some damping to horizontal movement
        this.stones.getChildren().forEach(stone => {
            stone.body.velocity.x *= 0.99;
        });
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
            gravity: { y: 200 }, // Lower gravity for better control
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