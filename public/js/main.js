// public/js/main.js
let socket = null;
let gameState = null;
let selectedTarget = null;
let isMyTankSelected = false;
let animationFrame = null;
let canvas, ctx;
let particles = [];
let smokeParticles = [];

// Панорамирование
let panX = 0, panY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let lastPanX = 0, lastPanY = 0;

let userId = 'player_' + Math.random().toString(36).substr(2, 6);
let userName = 'Командир';

// Размер гекса
let hexSize = 30;

// 6 направлений для гексагональной сетки
const HEX_DIRECTIONS = [
    { q: 0, r: -1, name: 'up' },
    { q: 1, r: -1, name: 'up-right' },
    { q: 1, r: 0, name: 'right' },
    { q: 0, r: 1, name: 'down' },
    { q: -1, r: 1, name: 'down-left' },
    { q: -1, r: 0, name: 'left' }
];

// Движение в 6 направлениях
function move(direction) {
    if (!gameState || !gameState.myTank) {
        showMessage('❌ Игра не загружена');
        return;
    }
    
    if (gameState.gameOver) {
        showMessage('❌ Игра окончена');
        return;
    }
    
    const myTank = gameState.myTank;
    let targetQ = myTank.q;
    let targetR = myTank.r;
    
    switch(direction) {
        case 'up': targetR--; break;
        case 'up-right': targetQ++; targetR--; break;
        case 'right': targetQ++; break;
        case 'down-right': targetQ++; targetR++; break;
        case 'down': targetR++; break;
        case 'down-left': targetQ--; targetR++; break;
        case 'left': targetQ--; break;
        default: return;
    }
    
    // Проверка существования клетки для новой карты
    let isValid = false;
    if (gameState.cells) {
        isValid = gameState.cells.some(cell => cell.q === targetQ && cell.r === targetR);
    } else if (gameState.size) {
        isValid = targetQ >= 0 && targetQ < gameState.size && 
                  targetR >= 0 && targetR < gameState.size;
    }
    
    if (!isValid) {
        showMessage(`❌ Нельзя туда двигаться`);
        return;
    }
    
    // Проверка на стену
    const hasWall = gameState.walls?.some(w => w.q === targetQ && w.r === targetR);
    if (hasWall) {
        showMessage(`🧱 Там стена! Нельзя пройти`);
        return;
    }
    
    // Проверка на занятость
    const isOccupied = [...(gameState.enemies || []), ...(gameState.allies || [])].some(
        u => u.active !== false && u.q === targetQ && u.r === targetR
    );
    if (isOccupied) {
        showMessage(`⚠️ Клетка занята другим танком`);
        return;
    }
    
    socket.emit('move', { q: targetQ, r: targetR });
    showMessage(`🚶 Движение на (${targetQ},${targetR})`);
}

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    initEvents();
    initButtons();
    connect();
    startAnimation();
    
    window.addEventListener('resize', () => {
        resizeCanvas();
        drawGame();
    });
}

function initButtons() {
    // Кнопки движения
    document.querySelectorAll('.hex-controls button[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => move(btn.getAttribute('data-dir')));
    });
    
    // Кнопка выстрела
    document.getElementById('shootBtn')?.addEventListener('click', shoot);
    
    // Кнопка сброса
    document.getElementById('resetBtn')?.addEventListener('click', resetGame);
    document.getElementById('newGameBtn')?.addEventListener('click', resetGame);
    
    // Кнопки зума
    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
        hexSize = Math.min(60, hexSize + 2);
        drawGame();
    });
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
        hexSize = Math.max(20, hexSize - 2);
        drawGame();
    });
    document.getElementById('resetZoomBtn')?.addEventListener('click', () => {
        hexSize = 30;
        panX = 0;
        panY = 0;
        drawGame();
    });
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const size = Math.min(container.clientWidth, window.innerHeight * 0.7);
    canvas.width = size;
    canvas.height = size;
    hexSize = Math.min(canvas.width / 12, 35);
}

function hexToPixel(q, r) {
    const x = hexSize * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
    const y = hexSize * (3/2 * r);
    return { 
        x: x + panX + canvas.width/2, 
        y: y + panY + canvas.height/2 
    };
}

function pixelToHex(x, y) {
    const adjustedX = (x - canvas.width/2 - panX) / hexSize;
    const adjustedY = (y - canvas.height/2 - panY) / hexSize;
    
    let q = (Math.sqrt(3)/3 * adjustedX - 1/3 * adjustedY);
    let r = (2/3 * adjustedY);
    
    let roundQ = Math.round(q);
    let roundR = Math.round(r);
    
    if (Math.abs(roundQ - q) > 0.5 || Math.abs(roundR - r) > 0.5) {
        return { q: -1, r: -1 };
    }
    
    return { q: roundQ, r: roundR };
}

function drawHex(q, r, color, isVisible = true) {
    const center = hexToPixel(q, r);
    const points = [];
    
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i - Math.PI / 6;
        const x = center.x + hexSize * Math.cos(angle);
        const y = center.y + hexSize * Math.sin(angle);
        points.push({ x, y });
    }
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    if (!isVisible) {
        ctx.fillStyle = 'rgba(30, 40, 50, 0.7)';
        ctx.fill();
    }
}

function initEvents() {
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        lastPanX = panX;
        lastPanY = panY;
        canvas.style.cursor = 'grabbing';
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        panX = lastPanX + dx;
        panY = lastPanY + dy;
        drawGame();
    });
    
    window.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    });
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        hexSize = Math.min(60, Math.max(20, hexSize + (e.deltaY > 0 ? -2 : 2)));
        drawGame();
    });
    
    canvas.addEventListener('click', onCanvasClick);
    canvas.style.cursor = 'grab';
}

function isAdjacentHex(q1, r1, q2, r2) {
    return HEX_DIRECTIONS.some(dir => 
        q1 + dir.q === q2 && r1 + dir.r === r2
    );
}

function onCanvasClick(e) {
    if (isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    const hex = pixelToHex(canvasX, canvasY);
    
    if (!gameState) return;
    
    // Проверка для новой карты (с cells)
    let isValid = false;
    if (gameState.cells) {
        isValid = gameState.cells.some(cell => cell.q === hex.q && cell.r === hex.r);
    } else if (gameState.size) {
        isValid = hex.q >= 0 && hex.q < gameState.size && hex.r >= 0 && hex.r < gameState.size;
    }
    
    if (!isValid) return;
    
    const player = gameState.myTank;
    const isMyTank = (player.q === hex.q && player.r === hex.r);
    const adjacent = isAdjacentHex(player.q, player.r, hex.q, hex.r);
    
    const hasWall = gameState.walls?.some(w => w.q === hex.q && w.r === hex.r);
    
    if (isMyTank) {
        isMyTankSelected = !isMyTankSelected;
        selectedTarget = null;
        if (isMyTankSelected) {
            showMessage(`✅ Танк выбран. Нажмите на СОСЕДНЮЮ клетку для движения`);
            document.getElementById('modeStatus').textContent = '🚶 ДВИЖЕНИЕ';
            document.getElementById('modeStatus').style.color = '#4caf50';
        } else {
            showMessage(`🔘 Режим: СТРЕЛЬБА`);
            document.getElementById('modeStatus').textContent = '🔫 СТРЕЛЬБА';
            document.getElementById('modeStatus').style.color = '#e94560';
        }
        drawGame();
        return;
    }
    
    if (isMyTankSelected && adjacent && !hasWall) {
        moveTo(hex.q, hex.r);
        isMyTankSelected = false;
        document.getElementById('modeStatus').textContent = '🔫 СТРЕЛЬБА';
        document.getElementById('modeStatus').style.color = '#e94560';
        return;
    }
    
    if (isMyTankSelected && hasWall) {
        showMessage(`🧱 Там стена! Нельзя пройти`);
        return;
    }
    
    if (!isMyTankSelected) {
        selectTarget(hex.q, hex.r);
    } else {
        showMessage(`⚠️ Нажмите на СОСЕДНЮЮ (подсвеченную) клетку для движения`);
    }
}

function selectTarget(q, r) {
    selectedTarget = { q, r };
    showMessage(`🎯 Цель: (${q},${r})`);
    document.getElementById('targetStatus').textContent = `(${q},${r})`;
    drawGame();
}

function moveTo(q, r) {
    if (!gameState || gameState.gameOver) return;
    socket.emit('move', { q, r });
}

function shoot() {
    if (!selectedTarget) {
        showMessage('⚠️ Сначала выберите цель (нажмите на клетку)');
        return;
    }
    if (!gameState || gameState.gameOver) return;
    
    socket.emit('shoot', { q: selectedTarget.q, r: selectedTarget.r });
    showMessage(`🔫 Выстрел по (${selectedTarget.q},${selectedTarget.r})`);
    selectedTarget = null;
    document.getElementById('targetStatus').textContent = 'нет';
}

function connect() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'flex';
        socket.emit('joinGame', { userId, userName });
        showMessage('✅ Добро пожаловать! Кликните на СВОЙ ТАНК для движения');
    });
    
    socket.on('gameState', (state) => {
        gameState = state;
        updateStats();
        updateCooldown(state.lastActionTime);
        drawGame();
    });
    
    socket.on('shootResult', (result) => {
        showMessage(result.message);
        if (result.hit && result.targetX !== undefined) {
            addExplosionEffect(result.targetX, result.targetY || result.targetR);
        } else if (!result.hit && result.success) {
            addMissEffect(result.targetQ, result.targetR);
        }
        if (result.wallDestroyed) {
            addWallBreakEffect(result.targetQ, result.targetR);
        }
        drawGame();
    });
    
    socket.on('actionAccepted', (data) => {
        if (data.type === 'move') {
            showMessage(`✅ Перемещение выполнено`);
        } else if (data.type === 'shoot') {
            showMessage(`✅ Выстрел выполнен`);
        }
        drawGame();
    });
    
    socket.on('gameEnded', (data) => {
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'flex';
        document.getElementById('winnerText').innerHTML = `${data.winner}<br>🏅 Убийств: ${data.kills || 0}`;
    });
    
    socket.on('error', (data) => {
        showMessage('❌ ' + data.message);
    });
}

function updateStats() {
    if (!gameState) return;
    document.getElementById('hpValue').textContent = `${gameState.myTank.hp}/${gameState.myTank.maxHp}`;
    document.getElementById('killsValue').textContent = gameState.myTank.kills || 0;
    document.getElementById('enemiesValue').textContent = gameState.enemies?.length || 0;
}

function updateCooldown(lastActionTime) {
    const COOLDOWN_TIME = 2000;
    
    function update() {
        const now = Date.now();
        const elapsed = now - lastActionTime;
        
        if (elapsed < COOLDOWN_TIME) {
            const remaining = COOLDOWN_TIME - elapsed;
            const percent = (remaining / COOLDOWN_TIME) * 100;
            const seconds = Math.ceil(remaining / 1000);
            const fill = document.getElementById('cooldownFill');
            const text = document.getElementById('cooldownText');
            if (fill) fill.style.width = `${percent}%`;
            if (text) text.textContent = `${seconds}с`;
            setTimeout(update, 100);
        } else {
            const fill = document.getElementById('cooldownFill');
            const text = document.getElementById('cooldownText');
            if (fill) fill.style.width = `0%`;
            if (text) text.textContent = `готов`;
        }
    }
    update();
}

function startAnimation() {
    function animate() {
        if (gameState) {
            drawGame();
            updateParticles();
            drawParticles();
        }
        animationFrame = requestAnimationFrame(animate);
    }
    animate();
}

function drawGame() {
    if (!gameState) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Получаем все клетки из gameState (новая карта)
    let cells = gameState.cells || [];
    
    // Для старой квадратной карты
    if (!cells.length && gameState.size) {
        for (let q = 0; q < gameState.size; q++) {
            for (let r = 0; r < gameState.size; r++) {
                cells.push({ q, r });
            }
        }
    }
    
    // Рисуем все гексы
    cells.forEach(cell => {
        const q = cell.q;
        const r = cell.r;
        const isVisible = gameState.visibleCells?.some(vc => vc.q === q && vc.r === r);
        let color;
        
        if (isVisible) {
            const isBase = gameState.bases?.some(b => b.q === q && b.r === r);
            if (isBase) {
                color = '#DAA520';
            } else if (cell.terrain === 'swamp') {
                color = '#5a4a3a';
            } else if (cell.terrain === 'forest') {
                color = '#2d5a2d';
            } else {
                color = (q + r) % 2 === 0 ? '#2d6a4f' : '#1b5e3f';
            }
        } else {
            color = '#2a3a2a';
        }
        
        drawHex(q, r, color, isVisible);
    });
    
    drawWalls();
    
    if (gameState.smokeEffects) {
        gameState.smokeEffects.forEach(smoke => {
            const center = hexToPixel(smoke.q, smoke.r);
            ctx.fillStyle = 'rgba(80, 80, 80, 0.7)';
            ctx.beginPath();
            ctx.arc(center.x, center.y, hexSize * 0.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    if (gameState.allies) {
        gameState.allies.forEach(ally => drawTank(ally.q, ally.r, ally.color, ally.name, ally.hp, ally.maxHp, false, ally.direction));
    }
    
    if (gameState.enemies) {
        gameState.enemies.forEach(enemy => drawTank(enemy.q, enemy.r, enemy.color, enemy.name, enemy.hp, enemy.maxHp, false, enemy.direction));
    }
    
    if (gameState.myTank) {
        drawTank(gameState.myTank.q, gameState.myTank.r, gameState.myTank.color, 'Я', gameState.myTank.hp, gameState.myTank.maxHp, true, gameState.myTank.direction);
        
        if (isMyTankSelected) {
            const center = hexToPixel(gameState.myTank.q, gameState.myTank.r);
            ctx.strokeStyle = '#4caf50';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i - Math.PI / 6;
                const x = center.x + (hexSize + 3) * Math.cos(angle);
                const y = center.y + (hexSize + 3) * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        if (isMyTankSelected) {
            HEX_DIRECTIONS.forEach(dir => {
                const q = gameState.myTank.q + dir.q;
                const r = gameState.myTank.r + dir.r;
                let isValid = false;
                if (gameState.cells) {
                    isValid = gameState.cells.some(cell => cell.q === q && cell.r === r);
                } else if (gameState.size) {
                    isValid = q >= 0 && q < gameState.size && r >= 0 && r < gameState.size;
                }
                
                if (isValid) {
                    const hasWall = gameState.walls?.some(w => w.q === q && w.r === r);
                    if (!hasWall) {
                        const center = hexToPixel(q, r);
                        ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
                        ctx.beginPath();
                        for (let i = 0; i < 6; i++) {
                            const angle = Math.PI / 3 * i - Math.PI / 6;
                            const x = center.x + hexSize * Math.cos(angle);
                            const y = center.y + hexSize * Math.sin(angle);
                            if (i === 0) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                        }
                        ctx.fill();
                        ctx.strokeStyle = '#4caf50';
                        ctx.stroke();
                    }
                }
            });
        }
    }
    
    if (selectedTarget) {
        const center = hexToPixel(selectedTarget.q, selectedTarget.r);
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i - Math.PI / 6;
            const x = center.x + (hexSize + 5) * Math.cos(angle);
            const y = center.y + (hexSize + 5) * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }
}

function drawWalls() {
    if (!gameState || !gameState.walls) return;
    
    gameState.walls.forEach(wall => {
        const center = hexToPixel(wall.q, wall.r);
        const size = hexSize * 0.6;
        
        ctx.fillStyle = wall.type === 'steel' ? '#708090' : '#8B7355';
        ctx.fillRect(center.x - size/2, center.y - size/2, size, size);
        
        ctx.fillStyle = wall.type === 'steel' ? '#4a5a6a' : '#a0522d';
        ctx.fillRect(center.x - size/3, center.y - size/3, size/3, size/3);
        ctx.fillRect(center.x + size/6, center.y + size/6, size/3, size/3);
        
        if (wall.type === 'steel' && wall.hp > 1) {
            ctx.fillStyle = '#ff5252';
            ctx.fillRect(center.x - size/2, center.y - size/2 - 5, size, 3);
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(center.x - size/2, center.y - size/2 - 5, size * (wall.hp / 3), 3);
        }
    });
}

function drawTank(q, r, color, name, hp, maxHp, isPlayer, direction = 'right') {
    const center = hexToPixel(q, r);
    const size = hexSize * 0.7;
    
    ctx.save();
    ctx.translate(center.x, center.y);
    
    const rotations = {
        'up': -Math.PI/2,
        'up-right': -Math.PI/6,
        'right': 0,
        'down-right': Math.PI/6,
        'down': Math.PI/2,
        'down-left': Math.PI*5/6,
        'left': Math.PI
    };
    ctx.rotate(rotations[direction] || 0);
    
    ctx.fillStyle = color;
    ctx.shadowBlur = isPlayer ? 8 : 2;
    ctx.fillRect(-size/2, -size/2, size, size);
    
    ctx.fillStyle = '#444';
    ctx.fillRect(-size/2 - 3, -size/2, 3, size);
    ctx.fillRect(size/2, -size/2, 3, size);
    
    ctx.fillStyle = isPlayer ? '#ffb300' : '#c62828';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#555';
    ctx.fillRect(size/2 - 5, -size*0.08, size*0.4, size*0.16);
    
    ctx.restore();
    
    const hpPercent = hp / maxHp;
    ctx.fillStyle = '#ff5252';
    ctx.fillRect(center.x - size/2, center.y - size/2 - 8, size, 4);
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(center.x - size/2, center.y - size/2 - 8, size * hpPercent, 4);
    
    ctx.fillStyle = 'white';
    ctx.font = `bold ${Math.max(10, hexSize / 3)}px Arial`;
    ctx.shadowBlur = 0;
    let displayName = name === '???' ? '???' : (name.length > 8 ? name.slice(0, 6) + '..' : name);
    ctx.fillText(displayName, center.x - 18, center.y - size/2 - 12);
    ctx.fillStyle = '#ffeb3b';
    ctx.font = `bold ${Math.max(8, hexSize / 4)}px Arial`;
    ctx.fillText(`${hp}`, center.x - 8, center.y - size/2 - 2);
}

function addExplosionEffect(q, r) {
    const center = hexToPixel(q, r);
    for (let i = 0; i < 25; i++) {
        particles.push({
            x: center.x, y: center.y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 8 - 3,
            life: 1,
            size: Math.random() * 6 + 2,
            color: `hsl(${Math.random() * 60 + 20}, 100%, 55%)`
        });
    }
    
    for (let i = 0; i < 10; i++) {
        smokeParticles.push({
            x: center.x, y: center.y,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2 - 1,
            life: 1,
            size: Math.random() * 8 + 4,
            color: `rgba(80, 80, 80, ${Math.random() * 0.5 + 0.3})`
        });
    }
}

function addMissEffect(q, r) {
    const center = hexToPixel(q, r);
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: center.x, y: center.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 0.6,
            size: Math.random() * 4 + 1,
            color: `rgba(200, 200, 100, 0.8)`
        });
    }
}

function addWallBreakEffect(q, r) {
    const center = hexToPixel(q, r);
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: center.x, y: center.y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8 - 2,
            life: 0.8,
            size: Math.random() * 5 + 2,
            color: `hsl(${Math.random() * 40 + 20}, 80%, 50%)`
        });
    }
}

function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        return p.life > 0;
    });
    smokeParticles = smokeParticles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.008;
        return p.life > 0;
    });
}

function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    });
    smokeParticles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function showMessage(text) {
    const container = document.getElementById('messages');
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = text;
    container.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

function resetGame() {
    socket.emit('reset');
    selectedTarget = null;
    isMyTankSelected = false;
    particles = [];
    smokeParticles = [];
    panX = 0;
    panY = 0;
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    showMessage('🔄 Новая битва!');
    drawGame();
}

// Запуск
init();
