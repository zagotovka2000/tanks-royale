let socket = null;
let gameState = null;
let selectedTarget = null;
let canvas, ctx;
let animationId = null;

const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
}

let userId = 'player_' + Math.random().toString(36).substr(2, 6);
let userName = 'Игрок';

if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    userId = tg.initDataUnsafe.user.id.toString();
    userName = tg.initDataUnsafe.user.first_name || 'Игрок';
}

function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    const container = canvas.parentElement;
    const size = Math.min(container.clientWidth, window.innerHeight * 0.6);
    canvas.width = size;
    canvas.height = size;
}

function drawTank(x, y, type, direction, hp, maxHp, name) {
    const cellSize = canvas.width / 15;
    const cx = y * cellSize + cellSize/2;
    const cy = x * cellSize + cellSize/2;
    const size = cellSize * 0.7;
    
    // Цвет танка
    if (type === 'player') {
        ctx.fillStyle = '#4caf50';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#4caf50';
    } else if (type === 'ally') {
        ctx.fillStyle = '#2196f3';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#2196f3';
    } else {
        ctx.fillStyle = '#e94560';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#e94560';
    }
    
    // Корпус
    ctx.fillRect(cx - size/2, cy - size/2, size, size);
    
    // Башня
    ctx.fillStyle = type === 'player' ? '#2e7d32' : (type === 'ally' ? '#1565c0' : '#c62828');
    ctx.fillRect(cx - size/3, cy - size/3, size/1.5, size/1.5);
    
    // Дуло в зависимости от направления
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    
    let gunX = cx, gunY = cy;
    switch(direction) {
        case 'up': gunY = cy - size/2; break;
        case 'down': gunY = cy + size/2; break;
        case 'left': gunX = cx - size/2; break;
        case 'right': gunX = cx + size/2; break;
    }
    
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(gunX, gunY);
    ctx.stroke();
    
    // Полоска HP
    const hpPercent = hp / maxHp;
    ctx.fillStyle = '#ff5252';
    ctx.fillRect(cx - size/2, cy - size/2 - 8, size, 4);
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(cx - size/2, cy - size/2 - 8, size * hpPercent, 4);
    
    // Имя
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Arial';
    ctx.shadowBlur = 0;
    ctx.fillText(name, cx - 15, cy - size/2 - 10);
}

function drawGrid() {
    const cellSize = canvas.width / 15;
    
    for (let i = 0; i <= 15; i++) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, canvas.height);
        ctx.stroke();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvas.width, i * cellSize);
        ctx.stroke();
    }
}

function drawBackground() {
    const cellSize = canvas.width / 15;
    
    for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
            if ((i + j) % 2 === 0) {
                ctx.fillStyle = '#2a5a3a';
            } else {
                ctx.fillStyle = '#1e4a2a';
            }
            ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
        }
    }
}

function drawSelectedTarget() {
    if (!selectedTarget) return;
    
    const cellSize = canvas.width / 15;
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 0;
    ctx.strokeRect(selectedTarget.y * cellSize, selectedTarget.x * cellSize, cellSize, cellSize);
}

function drawGame() {
    if (!gameState) return;
    
    drawBackground();
    drawGrid();
    
    // Рисуем союзников
    if (gameState.allies) {
        gameState.allies.forEach(ally => {
            drawTank(ally.x, ally.y, 'ally', ally.direction, ally.hp, ally.maxHp, ally.name);
        });
    }
    
    // Рисуем врагов
    if (gameState.enemies) {
        gameState.enemies.forEach(enemy => {
            drawTank(enemy.x, enemy.y, 'enemy', enemy.direction, enemy.hp, enemy.maxHp, enemy.name);
        });
    }
    
    // Рисуем игрока
    if (gameState.myTank) {
        drawTank(gameState.myTank.x, gameState.myTank.y, 'player', 
                 gameState.myTank.direction, gameState.myTank.hp, gameState.myTank.maxHp, 'Я');
    }
    
    drawSelectedTarget();
    
    // Обновляем статистику
    document.getElementById('hpValue').textContent = `${gameState.myTank?.hp || 0}/${gameState.myTank?.maxHp || 100}`;
    document.getElementById('killsValue').textContent = gameState.myTank?.kills || 0;
    document.getElementById('enemiesValue').textContent = gameState.enemies?.length || 0;
}

function handleCanvasClick(e) {
    if (!gameState || gameState.gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches) {
        clientX = e.touches[0].clientX - rect.left;
        clientY = e.touches[0].clientY - rect.top;
    } else {
        clientX = e.clientX - rect.left;
        clientY = e.clientY - rect.top;
    }
    
    const canvasX = clientX * scaleX;
    const canvasY = clientY * scaleY;
    const cellSize = canvas.width / 15;
    
    const gridX = Math.floor(canvasY / cellSize);
    const gridY = Math.floor(canvasX / cellSize);
    
    // Проверяем, есть ли враг в этой клетке
    const enemy = gameState.enemies?.find(e => e.x === gridX && e.y === gridY);
    if (enemy) {
        selectedTarget = { x: gridX, y: gridY, unit: enemy };
        addMessage(`🎯 Цель: ${enemy.name} (HP: ${enemy.hp})`);
        drawGame();
    }
}

function addMessage(text) {
    const messagesDiv = document.getElementById('messages');
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = text;
    messagesDiv.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

function move(direction) {
    if (!gameState || gameState.gameOver) return;
    socket.emit('action', { type: 'move', direction });
    addMessage(`🚶 ${direction}`);
}

function shoot() {
    if (!selectedTarget) {
        addMessage('⚠️ Нажмите на врага на карте для выбора цели');
        return;
    }
    
    if (!gameState || gameState.gameOver) return;
    
    socket.emit('action', { 
        type: 'shoot', 
        targetX: selectedTarget.x, 
        targetY: selectedTarget.y 
    });
    
    addMessage(`🔫 Выстрел по ${selectedTarget.unit.name}`);
    selectedTarget = null;
}

function connect() {
    socket = io();
    
    socket.on('connect', () => {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'flex';
        socket.emit('joinGame', { userId, userName });
    });
    
    socket.on('joined', () => {
        addMessage('✅ Подключено! Уничтожьте всех врагов!');
    });
    
    socket.on('gameState', (state) => {
        gameState = state;
        drawGame();
        
        if (state.gameOver) {
            document.getElementById('gameScreen').style.display = 'none';
            document.getElementById('gameOverScreen').style.display = 'flex';
            document.getElementById('winnerText').innerHTML = `🏆 ${state.winner} 🏆<br>Убийств: ${state.myTank?.kills || 0}`;
        }
    });
    
    socket.on('shootResult', (result) => {
        if (result.killed) {
            addMessage(`💀 Уничтожен ${result.targetName}!`);
        } else if (result.hit) {
            addMessage(`🎯 Попадание в ${result.targetName}! Урон: ${result.damage}`);
        }
    });
    
    socket.on('shootEffect', (data) => {
        // Визуальный эффект выстрела
        const cellSize = canvas.width / 15;
        const fromX = data.from.y * cellSize + cellSize/2;
        const fromY = data.from.x * cellSize + cellSize/2;
        const toX = data.to.y * cellSize + cellSize/2;
        const toY = data.to.x * cellSize + cellSize/2;
        
        // Анимация выстрела
        let progress = 0;
        const animate = () => {
            progress += 0.1;
            if (progress >= 1) {
                drawGame();
                return;
            }
            
            drawGame();
            const currentX = fromX + (toX - fromX) * progress;
            const currentY = fromY + (toY - fromY) * progress;
            
            ctx.beginPath();
            ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffeb3b';
            ctx.fill();
            
            requestAnimationFrame(animate);
        };
        animate();
    });
    
    socket.on('error', (data) => {
        addMessage('❌ ' + data.message);
    });
    
    socket.on('disconnect', () => {
        addMessage('⚠️ Потеря соединения');
    });
}

function newGame() {
    location.reload();
}

// Инициализация
window.onload = () => {
    initCanvas();
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleCanvasClick(e);
    });
    connect();
};

window.move = move;
window.shoot = shoot;
window.newGame = newGame;
