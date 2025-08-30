class MainScene extends Phaser.Scene {
  constructor(){ super('main'); }

  preload() {
    const g = this.add.graphics();
    g.fillStyle(0x63b3ff, 1).fillRect(0, 0, 16, 16);
    g.generateTexture('player', 16, 16); g.clear();

    g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 12);
    g.generateTexture('bullet', 4, 12); g.clear();

    g.fillStyle(0xff5860, 1).fillRect(0, 0, 20, 20);
    g.generateTexture('enemy', 20, 20); g.destroy();
  }

  create() {
    this.dead = false;
    this.physics.world.resume();
    this.cameras.main.setBackgroundColor('#0b0f1a');

    // Player
    this.player = this.physics.add.image(this.scale.width/2, this.scale.height - 80, 'player');
    this.player.setCollideWorldBounds(true);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');

    // Avoid stacking listeners on scene restart
    this.input.keyboard.removeAllListeners('keydown-SPACE');
    this.input.keyboard.on('keydown-SPACE', () => this.tryFire());

    // Groups
    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 120
    });
    this.enemies = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 120
    });

    // Enemy spawner
    this.time.addEvent({ delay: 700, loop: true, callback: () => this.spawnEnemy() });

    // Collisions
    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.hitEnemy(b, e));
    this.physics.add.overlap(this.player, this.enemies, () => this.gameOver());

    // UI
    this.score = 0;
    this.ui = this.add.text(12, 12, 'Score: 0', { fontFamily:'monospace', fontSize:18, color:'#d7e2ff' }).setScrollFactor(0);

    // Touch
    this.input.on('pointerdown', () => this.tryFire());
    this.input.on('pointermove', (p) => { if (p.isDown) this.player.x = Phaser.Math.Clamp(p.x, 8, this.scale.width-8); });

    // Resize safety
    this.scale.on('resize', this.onResize, this);

    // Fire cadence
    this.lastFired = 0;
    this.fireDelay = 120; // ms
  }

  onResize(gameSize) {
    const { width, height } = gameSize;
    this.player.x = Phaser.Math.Clamp(this.player.x, 8, width - 8);
    this.player.y = Phaser.Math.Clamp(this.player.y, 8, height - 8);
  }

  spawnEnemy() {
    if (this.dead) return;
    const x = Phaser.Math.Between(20, this.scale.width - 20);
    let e = this.enemies.get(x, -20, 'enemy');
    if (!e) return;
    if (!e.body) this.physics.world.enable(e);     // ensure body exists

    e.setActive(true).setVisible(true);
    e.body.enable = true;                          // force-enable in case it was disabled
    e.body.reset(x, -20);
    e.setVelocity(0, Phaser.Math.Between(90, 170));
    e.setCircle(10).body.setOffset(0,0);
  }

  tryFire() {
    const now = this.time.now;
    if (this.dead || now - this.lastFired < this.fireDelay) return;

    const x = this.player.x;
    const y = this.player.y - 20;

    let b = this.bullets.get(x, y, 'bullet');     // request at position
    if (!b) return;
    if (!b.body) this.physics.world.enable(b);    // ensure physics body exists

    // Re-activate fully when reusing from pool
    b.setActive(true).setVisible(true);
    b.body.enable = true;                         // <- crucial when coming from disableBody(true, true)
    b.body.reset(x, y);                           // resets pos AND ensures body is ready
    b.body.setAllowGravity(false);
    b.setVelocity(0, -550);

    this.lastFired = now;
  }

  hitEnemy(bullet, enemy) {
    bullet.disableBody(true, true);
    enemy.disableBody(true, true);
    this.score += 10;
    this.ui.setText(`Score: ${this.score}`);
    this.cameras.main.flash(80, 255, 255, 255);
  }

  gameOver() {
    if (this.dead) return;
    this.dead = true;
    this.physics.pause();
    this.add.text(this.scale.width/2, this.scale.height/2, 'GAME OVER\nPress R to Restart', {
      fontFamily:'monospace', fontSize:28, color:'#ff8fa3', align:'center'
    }).setOrigin(0.5);
    this.input.keyboard.once('keydown-R', () => this.scene.restart());
  }

  update() {
    if (this.dead) return;

    // Movement
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;

    const speed = 520;
    this.player.setVelocity(dx * speed, dy * speed);

    // Clamp Y
    const pad = 12;
    this.player.y = Phaser.Math.Clamp(this.player.y, pad, this.scale.height - pad);

    // Hold-to-fire
    if (this.cursors.space.isDown || this.keys.SPACE.isDown) this.tryFire();

    // Cleanup off-screen
    this.bullets.children.iterate(b => { if (b && b.active && b.y < -16) b.disableBody(true, true); });
    this.enemies.children.iterate(e => { if (e && e.active && e.y > this.scale.height + 24) e.disableBody(true, true); });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0f1a',
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: '100%', height: '100%' },
  scene: [MainScene]
});