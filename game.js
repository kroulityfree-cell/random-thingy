const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreVal = document.getElementById('score-val');
const hpVal = document.getElementById('hp-val');
const maxHpVal = document.getElementById('max-hp-val');
const activeBuffs = document.getElementById('active-buffs');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScore = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game State Variables
let gameActive = false;
let score = 0;
let keys = {};
let screenShake = 0;

// Dynamic Sizing
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game Entities Arrays
let player;
let bullets = [];
let asteroids = [];
let powerups = [];
let particles = [];
let stars = [];

// Input Management
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- Entity Classes ---

class StarField {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2;
        this.speed = Math.random() * 0.5 + 0.1;
    }
    update() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.y = 0;
            this.x = Math.random() * canvas.width;
        }
    }
    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height * 0.8;
        this.radius = 20;
        this.speed = 6;
        this.hp = 100;
        this.maxHp = 100;
        this.lastShot = 0;
        this.shotDelay = 200; // ms
        
        // Buff timers and tracking
        this.shieldActive = false;
        this.multishotLevel = 1; // 1 = normal, 2 = twin, 3 = triple, 4+ = wider spreads
        this.multishotTimer = 0;
    }

    update(currentTime) {
        // Movement Physics
        if (keys['ArrowUp'] || keys['KeyW']) this.y -= this.speed;
        if (keys['ArrowDown'] || keys['KeyS']) this.y += this.speed;
        if (keys['ArrowLeft'] || keys['KeyA']) this.x -= this.speed;
        if (keys['ArrowRight'] || keys['KeyD']) this.x += this.speed;

        // Keep inside boundaries
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        // Track and process timed upgrades
        if (this.multishotTimer > 0) {
            this.multishotTimer -= 16.67; // approx ms per frame at 60fps
            if (this.multishotTimer <= 0) {
                this.multishotLevel = 1;
            }
        }

        // Weapon fire engine
        if (keys['Space'] && currentTime - this.lastShot > this.shotDelay) {
            this.fireWeapon();
            this.lastShot = currentTime;
        }
    }

    fireWeapon() {
        const baseSpeed = -10;
        if (this.multishotLevel === 1) {
            bullets.push(new Bullet(this.x, this.y - this.radius, 0, baseSpeed));
        } else if (this.multishotLevel === 2) {
            bullets.push(new Bullet(this.x - 10, this.y, 0, baseSpeed));
            bullets.push(new Bullet(this.x + 10, this.y, 0, baseSpeed));
        } else if (this.multishotLevel === 3) {
            bullets.push(new Bullet(this.x, this.y - this.radius, 0, baseSpeed));
            bullets.push(new Bullet(this.x - 15, this.y, -2, baseSpeed));
            bullets.push(new Bullet(this.x + 15, this.y, 2, baseSpeed));
        } else {
            // Extreme fire mode for gathering multiple upgrades
            bullets.push(new Bullet(this.x, this.y - this.radius, 0, baseSpeed));
            bullets.push(new Bullet(this.x - 15, this.y, -2, baseSpeed));
            bullets.push(new Bullet(this.x + 15, this.y, 2, baseSpeed));
            bullets.push(new Bullet(this.x - 30, this.y, -4, baseSpeed));
            bullets.push(new Bullet(this.x + 30, this.y, 4, baseSpeed));
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Engines Glow
        const engineGlow = Math.random() * 15 + 10;
        let gradient = ctx.createRadialGradient(0, this.radius, 2, 0, this.radius + engineGlow, engineGlow);
        gradient.addColorStop(0, '#ff4500');
        gradient.addColorStop(1, 'rgba(255,69,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, this.radius, engineGlow, 0, Math.PI * 2);
        ctx.fill();

        // Ship Body Art
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00d4ff';
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, this.radius);
        ctx.lineTo(this.radius / 3, this.radius / 2);
        ctx.lineTo(-this.radius / 3, this.radius / 2);
        ctx.lineTo(-this.radius, this.radius);
        ctx.closePath();
        ctx.fill();

        // Inner Hull detailing
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -this.radius + 8);
        ctx.lineTo(this.radius / 2, this.radius - 4);
        ctx.lineTo(-this.radius / 2, this.radius - 4);
        ctx.closePath();
        ctx.fill();

        // Shield Graphic Overlay
        if (this.shieldActive) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#00ffc8';
            ctx.strokeStyle = '#00ffc8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 255, 200, 0.05)';
            ctx.fill();
        }

        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 3;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
    draw() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffff00';
        ctx.fillStyle = '#ffff88';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Asteroid {
    constructor(x, y, generation = 3) {
        this.x = x;
        this.y = y;
        this.generation = generation; // 3 = Big, 2 = Medium, 1 = Small
        this.radius = generation * 18;
        this.speed = (4 - generation) * 1.5 + Math.random();
        this.angle = Math.random() * Math.PI * 2;
        this.vx = Math.sin(this.angle) * this.speed;
        this.vy = Math.cos(this.angle) * (this.speed * 0.5) + 1.5; // Tends to track downwards
        this.hp = generation * 2;
        
        // Procedural rock jagged geometry
        this.vertices = Math.floor(Math.random() * 5) + 8;
        this.offsetOffsets = [];
        for (let i = 0; i < this.vertices; i++) {
            this.offsetOffsets.push(Math.random() * 0.4 + 0.8);
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#555566';
        ctx.fillStyle = '#2c2c35';
        ctx.strokeStyle = '#686875';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        for (let i = 0; i < this.vertices; i++) {
            let angle = (i / this.vertices) * Math.PI * 2;
            let r = this.radius * this.offsetOffsets[i];
            let x = Math.cos(angle) * r;
            let y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'health' | 'multishot' | 'shield'
        this.radius = 15;
        this.vy = 2;
        this.pulseAngle = 0;
    }

    update() {
        this.y += this.vy;
        this.pulseAngle += 0.05;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        let color = '#fff';
        let label = 'P';
        if (this.type === 'health') { color = '#ff3366'; label = '♥'; }
        if (this.type === 'multishot') { color = '#ff9900'; label = 'W'; }
        if (this.type === 'shield') { color = '#00ffc8'; label = '⛉'; }

        // Pulsing glow ring
        ctx.shadowBlur = 10 + Math.sin(this.pulseAngle) * 5;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Core icon
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 0);

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = Math.random() * 3 + 1;
        const speed = Math.random() * 4 + 1;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.015;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
// --- Game Engine Logic Functions ---

function spawnExplosion(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function handleEntitySpawns() {
    // Asteroid Spawner
    if (Math.random() < 0.025) {
        const x = Math.random() * canvas.width;
        const gen = Math.floor(Math.random() * 3) + 1; // 1 to 3
        asteroids.push(new Asteroid(x, -50, gen));
    }

    // Powerup Spawner
    if (Math.random() < 0.003) {
        const x = Math.random() * (canvas.width - 40) + 20;
        const types = ['health', 'multishot', 'shield'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        powerups.push(new PowerUp(x, -30, randomType));
    }
}

function checkCollision(obj1, obj2) {
    const dist = Math.hypot(obj1.x - obj2.x, obj1.y - obj2.y);
    return dist < obj1.radius + obj2.radius;
}

function processCollisions() {
    // 1. Bullets hitting Asteroids
    for (let b = bullets.length - 1; b >= 0; b--) {
        for (let a = asteroids.length - 1; a >= 0; a--) {
            if (checkCollision(bullets[b], asteroids[a])) {
                asteroids[a].hp--;
                spawnExplosion(bullets[b].x, bullets[b].y, '#ffff00', 3);
                bullets.splice(b, 1);

                if (asteroids[a].hp <= 0) {
                    score += asteroids[a].generation * 10;
                    spawnExplosion(asteroids[a].x, asteroids[a].y, '#888899', asteroids[a].generation * 8);
                    
                    // Split feature logic
                    if (asteroids[a].generation > 1) {
                        const nextGen = asteroids[a].generation - 1;
                        asteroids.push(new Asteroid(asteroids[a].x - 15, asteroids[a].y, nextGen));
                        asteroids.push(new Asteroid(asteroids[a].x + 15, asteroids[a].y, nextGen));
                    }
                    asteroids.splice(a, 1);
                }
                break;
            }
        }
    }

    // 2. Asteroids hitting Player Ship
    for (let a = asteroids.length - 1; a >= 0; a--) {
        if (checkCollision(player, asteroids[a])) {
            spawnExplosion(asteroids[a].x, asteroids[a].y, '#ff4500', asteroids[a].generation * 10);
            screenShake = 15;

            if (player.shieldActive) {
                player.shieldActive = false; // Blocks hit entirely
            } else {
                player.hp -= asteroids[a].generation * 15;
            }

            asteroids.splice(a, 1);
            if (player.hp <= 0) endGame();
        }
    }

    // 3. Player collecting PowerUps
    for (let p = powerups.length - 1; p >= 0; p--) {
        if (checkCollision(player, powerups[p])) {
            const type = powerups[p].type;
            spawnExplosion(powerups[p].x, powerups[p].y, '#ffffff', 20);
            
            if (type === 'health') {
                if (player.hp >= player.maxHp) {
                    player.maxHp += 20; // Increase max pool size
                }
                player.hp = Math.min(player.maxHp, player.hp + 30);
            } 
            else if (type === 'multishot') {
                player.multishotLevel++;
                player.multishotTimer = 30000; // Reset / Set to 30 Seconds
            } 
            else if (type === 'shield') {
                player.shieldActive = true;
            }

            powerups.splice(p, 1);
        }
    }
}

function updateUI() {
    scoreVal.textContent = score;
    hpVal.textContent = Math.max(0, player.hp);
    maxHpVal.textContent = player.maxHp;

    // Render clean text UI metrics for ongoing upgrade timers
    let buffHTML = '';
    if (player.shieldActive) {
        buffHTML += `<div class="buff-indicator shield-buff">🛡️ SHIELD: ONLINE</div>`;
    }
    if (player.multishotTimer > 0) {
        const remainingSecs = Math.ceil(player.multishotTimer / 1000);
        buffHTML += `<div class="buff-indicator">⚔️ MULTI-SHOT Lvl ${player.multishotLevel}: ${remainingSecs}s</div>`;
    }
    activeBuffs.innerHTML = buffHTML;
}

function cleanupEntities() {
    bullets = bullets.filter(b => b.y > -10 && b.x > -10 && b.x < canvas.width + 10);
    asteroids = asteroids.filter(a => a.y < canvas.height + 50);
    powerups = powerups.filter(p => p.y < canvas.height + 50);
    particles = particles.filter(p => p.alpha > 0);
}

// --- Main Game Loop Runner ---

function gameLoop(currentTime) {
    if (!gameActive) return;

    // Canvas Frame Refresh & Screenshake Translations
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (screenShake > 0) {
        const dx = (Math.random() - 0.5) * screenShake;
        const dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
        screenShake *= 0.9; // Decay value
        if (screenShake < 0.5) screenShake = 0;
    }

    // Background Processing
    stars.forEach(star => { star.update(); star.draw(); });

    // Entities Logic Processors
    handleEntitySpawns();
    player.update(currentTime);
    
    bullets.forEach(b => { b.update(); b.draw(); });
    asteroids.forEach(a => { a.update(); a.draw(); });
    powerups.forEach(p => { p.update(); p.draw(); });
    particles.forEach(p => { p.update(); p.draw(); });
    
    processCollisions();
    cleanupEntities();
    
    player.draw();
    ctx.restore(); // Clear screen translation matrix offsets

    updateUI();
    requestAnimationFrame(gameLoop);
}

// --- State Flow Operations ---

function initGame() {
    score = 0;
    bullets = [];
    asteroids = [];
    powerups = [];
    particles = [];
    stars = [];
    
    for (let i = 0; i < 80; i++) {
        stars.push(new StarField());
    }

    player = new Player();
    gameActive = true;
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameActive = false;
    finalScore.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// Click Triggers
startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);
