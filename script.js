const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreLabel = document.getElementById('score');
const messageLabel = document.getElementById('message');

const width = canvas.width;
const height = canvas.height;

const keys = { left: false, right: false, up: false };
let gameStarted = false;
let gameOver = false;
let score = 0;
let win = false;

const player = {
  x: 120,
  y: 450,
  w: 48,
  h: 42,
  vx: 0,
  vy: 0,
  speed: 4.5,
  jump: -13,
  grounded: false,
};

const gravity = 0.7;
const friction = 0.85;

const platforms = [
  { x: 0, y: 560, w: 900, h: 40, type: 'static' },
  { x: 160, y: 470, w: 120, h: 18, type: 'static' },
  { x: 340, y: 390, w: 140, h: 18, type: 'moving', dir: 1, range: 90, originX: 340 },
  { x: 620, y: 330, w: 160, h: 18, type: 'static' },
  { x: 100, y: 240, w: 140, h: 18, type: 'moving', dir: 1, range: 110, originX: 100 },
  { x: 440, y: 180, w: 120, h: 18, type: 'static' },
  { x: 650, y: 100, w: 180, h: 18, type: 'static' },
];

const snakes = [
  { x: 50, y: 520, w: 80, h: 20, baseY: 520, speed: 1.5, phase: 0, dir: 1, range: 220 },
  { x: 500, y: 500, w: 90, h: 20, baseY: 500, speed: 2.3, phase: 120, dir: 1, range: 260 },
];

const rabbits = [
  { x: 250, y: 520, w: 50, h: 28, vx: 2.2, onGround: true, jumpTimer: 0 },
  { x: 720, y: 520, w: 50, h: 28, vx: -2.0, onGround: true, jumpTimer: 90 },
];

const saws = [
  { x: 180, y: 340, w: 36, h: 36, vx: 3.5, vy: 0, axis: 'x' },
  { x: 520, y: 210, w: 36, h: 36, vx: 0, vy: 3.2, axis: 'y' },
];

const boss = {
  x: 720,
  y: 64,
  w: 140,
  h: 100,
  vx: 2.1,
  health: 5,
  active: false,
  attackTimer: 180,
  attacks: [],
};

function resetGame() {
  player.x = 120;
  player.y = 450;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  score = 0;
  gameStarted = false;
  gameOver = false;
  win = false;
  boss.health = 5;
  boss.active = false;
  boss.attacks = [];
  messageLabel.textContent = 'Pressione Espaço para começar';
}

function startGame() {
  if (!gameStarted) {
    gameStarted = true;
    messageLabel.textContent = 'Boa sorte! Chegue ao lobo boss.';
  }
}

function update() {
  if (!gameStarted || gameOver || win) return;

  if (keys.left) player.vx = Math.max(player.vx - 0.35, -player.speed);
  if (keys.right) player.vx = Math.min(player.vx + 0.35, player.speed);
  if (!keys.left && !keys.right) player.vx *= friction;

  player.vy += gravity;
  player.x += player.vx;
  player.y += player.vy;

  if (player.x < 0) player.x = 0;
  if (player.x + player.w > width) player.x = width - player.w;
  if (player.y > height) loseGame();

  player.grounded = false;
  platforms.forEach(platform => {
    if (platform.type === 'moving') {
      platform.x = platform.originX + Math.sin(Date.now() * 0.001 * platform.dir) * platform.range;
    }
    if (
      player.x + player.w > platform.x &&
      player.x < platform.x + platform.w &&
      player.y + player.h > platform.y &&
      player.y + player.h < platform.y + platform.h + 14 &&
      player.vy >= 0
    ) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.grounded = true;
      if (keys.up) jump();
    }
  });

  if (player.grounded) score += 0.05;
  scoreLabel.textContent = `Pontos: ${Math.floor(score)}`;

  snakes.forEach(snake => {
    snake.x += snake.speed * snake.dir;
    if (snake.x < 0 || snake.x + snake.w > width) snake.dir *= -1;
    snake.y = snake.baseY + Math.sin((Date.now() / 400) + snake.phase) * 22;
    if (collide(player, snake)) loseGame();
  });

  rabbits.forEach(rabbit => {
    rabbit.x += rabbit.vx;
    if (rabbit.x < 0 || rabbit.x + rabbit.w > width) rabbit.vx *= -1;
    if (rabbit.onGround) rabbit.jumpTimer -= 1;
    if (rabbit.jumpTimer <= 0) {
      rabbit.onGround = false;
      rabbit.vy = -10;
      rabbit.jumpTimer = 130 + Math.random() * 80;
    }
    if (!rabbit.onGround) {
      rabbit.vy = (rabbit.vy || 0) + gravity;
      rabbit.y += rabbit.vy;
      if (rabbit.y + rabbit.h >= 560) {
        rabbit.y = 560 - rabbit.h;
        rabbit.onGround = true;
        rabbit.vy = 0;
      }
    }
    if (collide(player, rabbit)) loseGame();
  });

  saws.forEach(saw => {
    saw.x += saw.vx;
    saw.y += saw.vy;
    if (saw.axis === 'x') {
      if (saw.x < 0 || saw.x + saw.w > width) saw.vx *= -1;
    } else {
      if (saw.y < 0 || saw.y + saw.h > height) saw.vy *= -1;
    }
    if (collide(player, saw)) loseGame();
  });

  if (score >= 120 && !boss.active) {
    boss.active = true;
    messageLabel.textContent = 'Boss ativado! Derrote o lobo!';
  }

  if (boss.active) {
    boss.x += boss.vx;
    if (boss.x < 540 || boss.x + boss.w > width) boss.vx *= -1;
    boss.attackTimer -= 1;
    if (boss.attackTimer <= 0) {
      boss.attackTimer = 100;
      boss.attacks.push({ x: boss.x + boss.w / 2 - 12, y: boss.y + boss.h, w: 24, h: 24, vy: 4 });
    }
    boss.attacks.forEach(attack => {
      attack.y += attack.vy;
      if (collide(player, attack)) loseGame();
    });
    boss.attacks = boss.attacks.filter(attack => attack.y < height + 30);
    if (player.x + player.w > boss.x && player.x < boss.x + boss.w && player.y + player.h > boss.y && player.y < boss.y + boss.h && keys.up) {
      boss.health -= 1;
      player.vy = player.jump * 0.75;
      if (boss.health <= 0) winGame();
    }
  }
}

function collide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function jump() {
  if (player.grounded) {
    player.vy = player.jump;
    player.grounded = false;
  }
}

function loseGame() {
  gameOver = true;
  messageLabel.textContent = 'Game Over! Atualize a página para tentar de novo.';
}

function winGame() {
  win = true;
  messageLabel.textContent = 'Você venceu! O lobo foi derrotado!';
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#6dc16f';
  ctx.fillRect(0, height - 40, width, 40);

  platforms.forEach(platform => {
    ctx.fillStyle = platform.type === 'static' ? '#7b4d1f' : '#e4b04b';
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
  });

  ctx.fillStyle = '#ffcc33';
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(player.x + 8, player.y + 10, 8, 8);
  ctx.fillRect(player.x + 32, player.y + 10, 8, 8);

  snakes.forEach(snake => {
    ctx.fillStyle = '#2d6a2d';
    ctx.fillRect(snake.x, snake.y, snake.w, snake.h);
    ctx.fillStyle = '#a22d2d';
    ctx.fillRect(snake.x + 8, snake.y - 8, 12, 8);
    ctx.fillRect(snake.x + snake.w - 20, snake.y - 8, 12, 8);
  });

  rabbits.forEach(rabbit => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(rabbit.x, rabbit.y, rabbit.w, rabbit.h);
    ctx.fillStyle = '#000';
    ctx.fillRect(rabbit.x + 10, rabbit.y + 10, 8, 8);
  });

  saws.forEach(saw => {
    ctx.save();
    ctx.translate(saw.x + saw.w / 2, saw.y + saw.h / 2);
    ctx.rotate(Date.now() / 200);
    ctx.fillStyle = '#bbbbbb';
    ctx.beginPath();
    ctx.arc(0, 0, saw.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i += 1) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(saw.w / 2, 0);
      ctx.stroke();
    }
    ctx.restore();
  });

  if (boss.active) {
    ctx.fillStyle = '#4b4b4b';
    ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(boss.x + 20, boss.y + 16, 100, 18);
    ctx.fillStyle = '#222';
    ctx.fillRect(boss.x + 28, boss.y + 22, 20, 8);
    ctx.fillRect(boss.x + 92, boss.y + 22, 20, 8);
    ctx.fillStyle = '#ff4d4d';
    for (let i = 0; i < boss.health; i += 1) {
      ctx.fillRect(boss.x + 12 + i * 22, boss.y - 14, 16, 10);
    }
    boss.attacks.forEach(attack => {
      ctx.fillStyle = '#922';
      ctx.fillRect(attack.x, attack.y, attack.w, attack.h);
    });
  }

  if (!gameStarted) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, width, height);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', e => {
  if (e.code === 'ArrowLeft') keys.left = true;
  if (e.code === 'ArrowRight') keys.right = true;
  if (e.code === 'Space') {
    keys.up = true;
    if (!gameStarted) startGame();
    if (player.grounded) jump();
    e.preventDefault();
  }
});

window.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft') keys.left = false;
  if (e.code === 'ArrowRight') keys.right = false;
  if (e.code === 'Space') keys.up = false;
});

resetGame();
loop();
