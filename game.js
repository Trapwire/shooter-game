// Connect to server
const socket = io();

let myPlayerNumber = null;
let gameStarted = false;

socket.on('connect', () => {
    console.log('Connected! ID:', socket.id);
    document.getElementById('debug').textContent = 'Waiting for opponent...';
    socket.emit('joinRoom');
});

socket.on('playerNumber', (num) => {
    myPlayerNumber = num;
    console.log('You are Player', num);
});

socket.on('startGame', () => {
    gameStarted = true;
    document.getElementById('debug').textContent = 'Fight!';
    console.log('Game started!');
});

socket.on('opponentUpdate', (data) => {
    if (gameStarted) {
        enemy.x = data.x;
        enemy.y = data.y;
        enemy.angle = data.angle;
        enemy.health = data.health;
        enemy.currentWeapon = data.weapon;
    }
});

socket.on('opponentBullet', (data) => {
    if (gameStarted) {
        bullets.push({
            x: data.x,
            y: data.y,
            speedX: data.speedX,
            speedY: data.speedY,
            size: data.size,
            damage: data.damage,
            color: data.color,
            owner: 'enemy'
        });
    }
});

socket.on('opponentLeft', () => {
    document.getElementById('debug').textContent = 'Opponent left!';
    gameStarted = false;
});

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1000;
canvas.height = 700;

// Walls (obstacles for cover)
const walls = [
    { x: 250, y: 150, width: 80, height: 200 },
    { x: 670, y: 150, width: 80, height: 200 },
    { x: 250, y: 350, width: 80, height: 200 },
    { x: 670, y: 350, width: 80, height: 200 },
    { x: 450, y: 250, width: 100, height: 200 }
];

// Weapon definitions
const weapons = {
    pistol: {
        name: 'Pistol',
        damage: 15,
        fireRate: 300,
        bulletSpeed: 12,
        bulletSize: 4,
        color: '#ffff00'
    },
    rifle: {
        name: 'Rifle',
        damage: 10,
        fireRate: 120,
        bulletSpeed: 15,
        bulletSize: 3,
        color: '#ff9900'
    },
    sniper: {
        name: 'Sniper',
        damage: 70,
        fireRate: 1200,
        bulletSpeed: 25,
        bulletSize: 5,
        color: '#00ffff'
    }
};

// Player (You)
const player = {
    x: 100,
    y: 300,
    width: 35,
    height: 35,
    speed: 4,
    color: '#3498db',
    secondaryColor: '#2980b9',
    angle: 0,
    health: 100,
    maxHealth: 100,
    currentWeapon: 'pistol',
    lastShot: 0
};

// Enemy (Opponent)
const enemy = {
    x: 850,
    y: 300,
    width: 35,
    height: 35,
    speed: 4,
    color: '#e74c3c',
    secondaryColor: '#c0392b',
    angle: 0,
    health: 100,
    maxHealth: 100,
    currentWeapon: 'pistol',
    lastShot: 0
};

// Mouse position
const mouse = { x: 0, y: 0 };

// Bullets array
const bullets = [];

// Keyboard state
const keys = {};

// Key events
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key === '1') player.currentWeapon = 'pistol';
    if (e.key === '2') player.currentWeapon = 'rifle';
    if (e.key === '3') player.currentWeapon = 'sniper';
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mouse events
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
    if (gameStarted) {
        shootBullet();
    }
});

// Check collision with walls
function checkWallCollision(x, y, width, height) {
    for (let wall of walls) {
        if (x < wall.x + wall.width &&
            x + width > wall.x &&
            y < wall.y + wall.height &&
            y + height > wall.y) {
            return true;
        }
    }
    return false;
}

// Check if bullet hits wall
function bulletHitsWall(bullet) {
    for (let wall of walls) {
        if (bullet.x > wall.x && bullet.x < wall.x + wall.width &&
            bullet.y > wall.y && bullet.y < wall.y + wall.height) {
            return true;
        }
    }
    return false;
}

// Shoot bullet
function shootBullet() {
    const now = Date.now();
    const weapon = weapons[player.currentWeapon];
    
    if (now - player.lastShot < weapon.fireRate) return;
    
    player.lastShot = now;
    
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    
    const bullet = {
        x: centerX,
        y: centerY,
        speedX: Math.cos(player.angle) * weapon.bulletSpeed,
        speedY: Math.sin(player.angle) * weapon.bulletSpeed,
        size: weapon.bulletSize,
        damage: weapon.damage,
        color: weapon.color,
        owner: 'player'
    };
    
    bullets.push(bullet);
    
    socket.emit('bulletFired', {
        x: bullet.x,
        y: bullet.y,
        speedX: bullet.speedX,
        speedY: bullet.speedY,
        size: bullet.size,
        damage: bullet.damage,
        color: bullet.color
    });
}

// Update player
function updatePlayer() {
    if (!gameStarted) return;
    
    let newX = player.x;
    let newY = player.y;
    
    if (keys['w']) newY -= player.speed;
    if (keys['s']) newY += player.speed;
    if (keys['a']) newX -= player.speed;
    if (keys['d']) newX += player.speed;

    // Check boundaries
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX + player.width > canvas.width) newX = canvas.width - player.width;
    if (newY + player.height > canvas.height) newY = canvas.height - player.height;

    // Check wall collision
    if (!checkWallCollision(newX, newY, player.width, player.height)) {
        player.x = newX;
        player.y = newY;
    }

    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    player.angle = Math.atan2(mouse.y - centerY, mouse.x - centerX);
    
    socket.emit('playerUpdate', {
        x: player.x,
        y: player.y,
        angle: player.angle,
        health: player.health,
        weapon: player.currentWeapon
    });
}

// Update bullets
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;

        // Check wall collision
        if (bulletHitsWall(bullet)) {
            bullets.splice(i, 1);
            continue;
        }

        // Check collision with player
        if (bullet.owner === 'enemy') {
            if (bullet.x > player.x && bullet.x < player.x + player.width &&
                bullet.y > player.y && bullet.y < player.y + player.height) {
                player.health -= bullet.damage;
                if (player.health < 0) player.health = 0;
                bullets.splice(i, 1);
                continue;
            }
        }

        // Check collision with enemy
        if (bullet.owner === 'player') {
            if (bullet.x > enemy.x && bullet.x < enemy.x + enemy.width &&
                bullet.y > enemy.y && bullet.y < enemy.y + enemy.height) {
                enemy.health -= bullet.damage;
                if (enemy.health < 0) enemy.health = 0;
                bullets.splice(i, 1);
                continue;
            }
        }

        if (bullet.x < 0 || bullet.x > canvas.width ||
            bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(i, 1);
        }
    }
}

// Draw floor/background
function drawBackground() {
    // Grid pattern
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Draw walls
function drawWalls() {
    walls.forEach(wall => {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(wall.x + 3, wall.y + 3, wall.width, wall.height);
        
        // Wall
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        
        // Highlight
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(wall.x, wall.y, wall.width, 5);
        ctx.fillRect(wall.x, wall.y, 5, wall.height);
        
        // Border
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    });
}

// Draw character (Valorant style)
function drawCharacter(char) {
    const centerX = char.x + char.width / 2;
    const centerY = char.y + char.height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(char.angle);
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(2, char.height / 2 + 2, char.width / 2, char.height / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.rotate(-char.angle);
    
    // Body (torso)
    ctx.fillStyle = char.color;
    ctx.fillRect(-char.width / 2, -char.height / 2, char.width, char.height * 0.6);
    
    // Legs
    ctx.fillStyle = char.secondaryColor;
    ctx.fillRect(-char.width / 2, char.height * 0.1, char.width * 0.4, char.height * 0.4);
    ctx.fillRect(char.width * 0.1, char.height * 0.1, char.width * 0.4, char.height * 0.4);
    
    // Head
    ctx.fillStyle = '#f4d03f';
    ctx.beginPath();
    ctx.arc(0, -char.height / 2 - 5, char.width / 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Visor/Eyes
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(-char.width / 4, -char.height / 2 - 7, char.width / 2, 4);
    
    ctx.rotate(char.angle);
    
    // Weapon
    const weapon = weapons[char.currentWeapon];
    let weaponLength = 25;
    let weaponWidth = 6;
    
    if (char.currentWeapon === 'sniper') {
        weaponLength = 35;
        weaponWidth = 5;
    } else if (char.currentWeapon === 'rifle') {
        weaponLength = 28;
        weaponWidth = 5;
    }
    
    // Weapon body
    ctx.fillStyle = '#34495e';
    ctx.fillRect(char.width / 2 - 5, -weaponWidth / 2, weaponLength, weaponWidth);
    
    // Weapon detail
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(char.width / 2 - 5, -weaponWidth / 2, 5, weaponWidth);
    
    ctx.restore();

    // Health bar
    const barWidth = char.width + 10;
    const barHeight = 6;
    const healthPercent = char.health / char.maxHealth;

    // Health bar background
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(char.x - 5, char.y - 15, barWidth, barHeight);
    
    // Health bar fill
    if (healthPercent > 0.5) {
        ctx.fillStyle = '#2ecc71';
    } else if (healthPercent > 0.25) {
        ctx.fillStyle = '#f39c12';
    } else {
        ctx.fillStyle = '#e74c3c';
    }
    ctx.fillRect(char.x - 5, char.y - 15, barWidth * healthPercent, barHeight);
    
    // Health bar border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(char.x - 5, char.y - 15, barWidth, barHeight);
}

// Draw bullets
function drawBullets() {
    bullets.forEach(bullet => {
        // Bullet glow
        const gradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, bullet.size * 2);
        gradient.addColorStop(0, bullet.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Bullet core
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Bullet highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(bullet.x - 1, bullet.y - 1, bullet.size / 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw UI
function drawUI() {
    if (!gameStarted) return;
    
    // Weapon panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 100, 250, 90);
    
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(weapons[player.currentWeapon].name, 20, canvas.height - 70);
    
    ctx.font = '14px Arial';
    ctx.fillText(`Damage: ${weapons[player.currentWeapon].damage}`, 20, canvas.height - 45);
    ctx.fillText(`Health: ${player.health}`, 20, canvas.height - 25);
    
    // Weapon keys
    ctx.font = '12px Arial';
    ctx.fillStyle = '#95a5a6';
    ctx.fillText('[1] Pistol  [2] Rifle  [3] Sniper', 20, canvas.height - 8);
    
    // Crosshair
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mouse.x - 10, mouse.y);
    ctx.lineTo(mouse.x + 10, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 10);
    ctx.lineTo(mouse.x, mouse.y + 10);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 15, 0, Math.PI * 2);
    ctx.stroke();
}

// Draw game over
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    
    if (player.health <= 0) {
        ctx.fillStyle = '#e74c3c';
        ctx.fillText('DEFEATED', canvas.width / 2, canvas.height / 2);
    } else {
        ctx.fillStyle = '#2ecc71';
        ctx.fillText('VICTORY', canvas.width / 2, canvas.height / 2);
    }
    
    ctx.font = '24px Arial';
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText('Press F5 to play again', canvas.width / 2, canvas.height / 2 + 60);
}

// Main game loop
function gameLoop() {
    drawBackground();

    if (!gameStarted) {
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for opponent...', canvas.width / 2, canvas.height / 2);
        ctx.font = '18px Arial';
        ctx.fillText('Open another browser window to test', canvas.width / 2, canvas.height / 2 + 40);
        requestAnimationFrame(gameLoop);
        return;
    }

    if (player.health <= 0 || enemy.health <= 0) {
        drawGameOver();
        return;
    }

    updatePlayer();
    updateBullets();

    drawWalls();
    drawCharacter(player);
    drawCharacter(enemy);
    drawBullets();
    drawUI();

    requestAnimationFrame(gameLoop);
}

gameLoop();