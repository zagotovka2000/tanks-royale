// public/js/main.js
let canvas, ctx;
let panX = 0, panY = 0;
let hexSize = 30;
let animationFrame = null;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let lastPanX = 0, lastPanY = 0;

window.ctx = null;
window.hexSize = hexSize;
window.panX = panX;
window.panY = panY;

const HEX_DIRECTIONS = [
    { q: 0, r: -1, name: 'up' },
    { q: 1, r: -1, name: 'up-right' },
    { q: 1, r: 0, name: 'right' },
    { q: 0, r: 1, name: 'down' },
    { q: -1, r: 1, name: 'down-left' },
    { q: -1, r: 0, name: 'left' }
];

window.hexToPixel = function(q, r) {
    const x = hexSize * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
    const y = hexSize * (3/2 * r);
    return { x: x + panX + canvas.width/2, y: y + panY + canvas.height/2 };
};

function pixelToHex(x, y) {
    const adjustedX = (x - canvas.width/2 - panX) / hexSize;
    const adjustedY = (y - canvas.height/2 - panY) / hexSize;
    let q = (Math.sqrt(3)/3 * adjustedX - 1/3 * adjustedY);
    let r = (2/3 * adjustedY);
    let roundQ = Math.round(q);
    let roundR = Math.round(r);
    if (Math.abs(roundQ - q) > 0.5 || Math.abs(roundR - r) > 0.5) return { q: -1, r: -1 };
    return { q: roundQ, r: roundR };
}

function drawHex(q, r, color, isVisible = true) {
    const center = window.hexToPixel(q, r);
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i - Math.PI / 6;
        const x = center.x + hexSize * Math.cos(angle);
        const y = center.y + hexSize * Math.sin(angle);
        points.push({ x, y });
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
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

function drawTank(q, r, color, name, hp, maxHp, isPlayer, direction = 'right') {
   const center = window.hexToPixel(q, r);
   const size = hexSize * 0.7;
   
   ctx.save();
   ctx.translate(center.x, center.y);
   
   // Углы поворота для всех 6 направлений на гексагональной сетке
   // 0° = вправо, угол увеличивается против часовой стрелки
   const rotations = {
       'right': 0,                    // 0° → 
       'up-right': -Math.PI / 6,      // -30° ↗
       'up': -Math.PI / 2,            // -90° ↑
       'up-left': -Math.PI * 5 / 6,   // -150° ↖
       'left': Math.PI,               // 180° ←
       'down-left': Math.PI * 5 / 6,  // 150° ↙
       'down': Math.PI / 2,           // 90° ↓
       'down-right': Math.PI / 6      // 30° ↘
   };
   
   let rotation = rotations[direction];
   if (rotation === undefined) rotation = 0;
   ctx.rotate(rotation);
   
   // Корпус танка
   ctx.fillStyle = color;
   ctx.shadowBlur = isPlayer ? 8 : 2;
   ctx.fillRect(-size/2, -size/2, size, size);
   
   // Гусеницы
   ctx.fillStyle = '#444';
   ctx.fillRect(-size/2 - 3, -size/2, 3, size);
   ctx.fillRect(size/2, -size/2, 3, size);
   
   // Башня
   ctx.fillStyle = isPlayer ? '#ffb300' : '#c62828';
   ctx.beginPath();
   ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
   ctx.fill();
   
   // Дуло (всегда вперёд относительно поворота танка)
   ctx.fillStyle = '#555';
   ctx.fillRect(size/2 - 5, -size*0.08, size*0.4, size*0.16);
   
   ctx.restore();
   
   // HP бар
   const hpPercent = hp / maxHp;
   ctx.fillStyle = '#ff5252';
   ctx.fillRect(center.x - size/2, center.y - size/2 - 8, size, 4);
   ctx.fillStyle = '#4caf50';
   ctx.fillRect(center.x - size/2, center.y - size/2 - 8, size * hpPercent, 4);
   
   // Имя и HP
   ctx.fillStyle = 'white';
   ctx.font = `bold ${Math.max(10, hexSize / 3)}px Arial`;
   ctx.shadowBlur = 0;
   let displayName = name.length > 8 ? name.slice(0, 6) + '..' : name;
   ctx.fillText(displayName, center.x - 18, center.y - size/2 - 12);
   ctx.fillStyle = '#ffeb3b';
   ctx.font = `bold ${Math.max(8, hexSize / 4)}px Arial`;
   ctx.fillText(`${hp}`, center.x - 8, center.y - size/2 - 2);
}

function drawWalls() {
    if (!window.gameState?.walls) return;
    window.gameState.walls.forEach(wall => {
        const center = window.hexToPixel(wall.q, wall.r);
        const size = hexSize * 0.6;
        ctx.fillStyle = wall.type === 'steel' ? '#708090' : '#8B7355';
        ctx.fillRect(center.x - size/2, center.y - size/2, size, size);
        ctx.fillStyle = wall.type === 'steel' ? '#4a5a6a' : '#a0522d';
        ctx.fillRect(center.x - size/3, center.y - size/3, size/3, size/3);
        ctx.fillRect(center.x + size/6, center.y + size/6, size/3, size/3);
    });
}

function drawAdjacentCellsHighlight() {
    if (!window.isMyTankSelected || !window.gameState?.myTank) return;
    
    const player = window.gameState.myTank;
    const neighbors = [
        { q: player.q, r: player.r - 1 },
        { q: player.q + 1, r: player.r - 1 },
        { q: player.q + 1, r: player.r },
        { q: player.q, r: player.r + 1 },
        { q: player.q - 1, r: player.r + 1 },
        { q: player.q - 1, r: player.r }
    ];
    
    neighbors.forEach(neighbor => {
        const cellExists = window.gameState.cells?.some(cell => cell.q === neighbor.q && cell.r === neighbor.r);
        if (!cellExists) return;
        
        const hasWall = window.gameState.walls?.some(w => w.q === neighbor.q && w.r === neighbor.r);
        const isOccupied = [...(window.gameState.enemies || []), ...(window.gameState.allies || [])].some(
            u => u.active !== false && u.q === neighbor.q && u.r === neighbor.r
        );
        
        if (!hasWall && !isOccupied) {
            const center = window.hexToPixel(neighbor.q, neighbor.r);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i - Math.PI / 6;
                const x = center.x + (hexSize + 3) * Math.cos(angle);
                const y = center.y + (hexSize + 3) * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(76, 175, 80, 0.35)';
            ctx.fill();
            ctx.strokeStyle = '#4caf50';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}

window.drawGame = function() {
    if (!window.gameState) {
        if (ctx) {
            ctx.fillStyle = '#1a1a2a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Загрузка...', canvas.width/2, canvas.height/2);
        }
        return;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const cells = window.gameState.cells || [];
    cells.forEach(cell => {
        const isVisible = window.gameState.visibleCells?.some(vc => vc.q === cell.q && vc.r === cell.r);
        let color = isVisible ? '#2d6a4f' : '#2a3a2a';
        if (isVisible && window.gameState.bases?.some(b => b.q === cell.q && b.r === cell.r)) color = '#DAA520';
        drawHex(cell.q, cell.r, color, isVisible);
    });
    
    drawWalls();
    drawAdjacentCellsHighlight();
    
    if (window.gameState.smokeEffects) {
        window.gameState.smokeEffects.forEach(smoke => {
            const center = window.hexToPixel(smoke.q, smoke.r);
            ctx.fillStyle = 'rgba(80, 80, 80, 0.7)';
            ctx.beginPath();
            ctx.arc(center.x, center.y, hexSize * 0.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    window.gameState.allies?.forEach(ally => drawTank(ally.q, ally.r, ally.color, ally.name, ally.hp, ally.maxHp, false, ally.direction));
    window.gameState.enemies?.forEach(enemy => drawTank(enemy.q, enemy.r, enemy.color, enemy.name, enemy.hp, enemy.maxHp, false, enemy.direction));
    
    if (window.gameState.myTank) {
        drawTank(window.gameState.myTank.q, window.gameState.myTank.r, window.gameState.myTank.color, 'Я', 
                 window.gameState.myTank.hp, window.gameState.myTank.maxHp, true, window.gameState.myTank.direction);
        
        if (window.isMyTankSelected) {
            const center = window.hexToPixel(window.gameState.myTank.q, window.gameState.myTank.r);
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
    }
    
    if (window.selectedTarget) {
        const center = window.hexToPixel(window.selectedTarget.q, window.selectedTarget.r);
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
    
    window.drawProjectiles();
    window.drawParticles();
};

function onCanvasClick(e) {
   if (isDragging) return;
   
   const rect = canvas.getBoundingClientRect();
   const scaleX = canvas.width / rect.width;
   const scaleY = canvas.height / rect.height;
   const canvasX = (e.clientX - rect.left) * scaleX;
   const canvasY = (e.clientY - rect.top) * scaleY;
   const hex = pixelToHex(canvasX, canvasY);
   
   if (!window.gameState) return;
   const cellExists = window.gameState.cells?.some(cell => cell.q === hex.q && cell.r === hex.r);
   if (!cellExists) return;
   
   const player = window.gameState.myTank;
   const isMyTank = (player.q === hex.q && player.r === hex.r);
   const adjacent = HEX_DIRECTIONS.some(dir => player.q + dir.q === hex.q && player.r + dir.r === hex.r);
   const hasWall = window.gameState.walls?.some(w => w.q === hex.q && w.r === hex.r);
   
   if (isMyTank) {
       window.isMyTankSelected = !window.isMyTankSelected;
       window.selectedTarget = null;
       if (window.isMyTankSelected) {
           window.showMessage(`✅ Танк выбран. Нажмите на ЗЕЛЁНУЮ клетку для движения`);
           document.getElementById('modeStatus').textContent = '🚶 ДВИЖЕНИЕ';
           document.getElementById('modeStatus').style.color = '#4caf50';
       } else {
           window.showMessage(`🔘 Режим: СТРЕЛЬБА`);
           document.getElementById('modeStatus').textContent = '🔫 СТРЕЛЬБА';
           document.getElementById('modeStatus').style.color = '#e94560';
       }
       window.drawGame();
       return;
   }
   
   if (window.isMyTankSelected && adjacent && !hasWall) {
       const dq = hex.q - player.q;
       const dr = hex.r - player.r;
       let dir = 'right';
       
       if (dq === 0 && dr === -1) dir = 'up';
       else if (dq === 1 && dr === -1) dir = 'up-right';
       else if (dq === 1 && dr === 0) dir = 'right';
       else if (dq === 0 && dr === 1) dir = 'down';
       else if (dq === -1 && dr === 1) dir = 'down-left';
       else if (dq === -1 && dr === 0) dir = 'left';
       else if (dq === -1 && dr === -1) dir = 'up-left';
       else if (dq === 1 && dr === 1) dir = 'down-right';
       
       if (window.gameState.myTank) {
           window.gameState.myTank.direction = dir;
       }
       
       window.move(dir);
       window.isMyTankSelected = false;
       document.getElementById('modeStatus').textContent = '🔫 СТРЕЛЬБА';
       document.getElementById('modeStatus').style.color = '#e94560';
       return;
   }
   
   if (window.isMyTankSelected && hasWall) {
       window.showMessage(`🧱 Там стена! Нельзя пройти`);
       return;
   }
   
   if (!window.isMyTankSelected) {
       window.selectTarget(hex.q, hex.r);
   } else {
       window.showMessage(`⚠️ Нажмите на ЗЕЛЁНУЮ подсвеченную клетку для движения`);
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
       window.panX = panX;
       window.panY = panY;
       window.drawGame();
   });
   
   window.addEventListener('mouseup', () => {
       isDragging = false;
       canvas.style.cursor = 'grab';
   });
   
   canvas.addEventListener('wheel', (e) => {
       e.preventDefault();
       hexSize = Math.min(60, Math.max(20, hexSize + (e.deltaY > 0 ? -2 : 2)));
       window.hexSize = hexSize;
       window.drawGame();
   });
   
   // ИСПРАВЛЕННАЯ СТРОКА:
   canvas.addEventListener('click', onCanvasClick);
   canvas.style.cursor = 'grab';
}

function initButtons() {
    document.querySelectorAll('.hex-controls button[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => window.move(btn.getAttribute('data-dir')));
    });
    
    document.getElementById('shootBtn')?.addEventListener('click', () => window.shoot());
    document.getElementById('resetBtn')?.addEventListener('click', () => window.resetGame());
    document.getElementById('newGameBtn')?.addEventListener('click', () => window.resetGame());
    
    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
        hexSize = Math.min(60, hexSize + 2);
        window.hexSize = hexSize;
        window.drawGame();
    });
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
        hexSize = Math.max(20, hexSize - 2);
        window.hexSize = hexSize;
        window.drawGame();
    });
    document.getElementById('resetZoomBtn')?.addEventListener('click', () => {
        hexSize = 30;
        window.hexSize = hexSize;
        window.drawGame();
    });
}

function resizeCanvas() {
    const container = canvas.parentElement;
    if (!container) return;
    const size = Math.min(container.clientWidth, window.innerHeight * 0.7);
    canvas.width = size;
    canvas.height = size;
    hexSize = Math.min(canvas.width / 10, 35);
    window.hexSize = hexSize;
}

function forceRedraw() {
    setTimeout(() => {
        resizeCanvas();
        if (window.gameState) {
            window.drawGame();
        } else {
            if (ctx) {
                ctx.fillStyle = '#1a1a2a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Подключение...', canvas.width/2, canvas.height/2);
            }
        }
    }, 50);
}

function animate() {
    if (window.gameState) {
        window.updateProjectiles();
        window.updateParticles();
        window.drawGame();
    }
    animationFrame = requestAnimationFrame(animate);
}

async function init() {
    console.log('Initializing game...');
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 600;
    
    window.ctx = ctx;
    window.canvas = canvas;
    
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Загрузка...', canvas.width/2, canvas.height/2);
    
    await window.soundManager.init();
    
    window.socketClient = new window.SocketClient(
        (state) => {
            window.gameState = state;
            window.updateStats();
            window.updateCooldown(state.lastActionTime);
            resizeCanvas();
            window.drawGame();
        },
        (result) => {
            window.handleShootResult(result);
        },
        (msg) => window.showMessage(msg),
        (data) => {
            document.getElementById('gameScreen').style.display = 'none';
            document.getElementById('gameOverScreen').style.display = 'flex';
            document.getElementById('winnerText').innerHTML = `${data.winner}<br>🏅 Убийств: ${data.kills || 0}`;
        }
    );
    
    const userId = 'player_' + Math.random().toString(36).substr(2, 6);
    const userName = 'Командир';
    
    window.socketClient.connect(userId, userName);
    
    resizeCanvas();
    initEvents();
    initButtons();
    animate();
    forceRedraw();
    
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    
    setTimeout(() => {
        resizeCanvas();
        if (window.gameState) window.drawGame();
    }, 100);
    
    window.showMessage('✅ Добро пожаловать! Кликните на СВОЙ ТАНК для движения');
    
    window.addEventListener('resize', () => {
        resizeCanvas();
        window.drawGame();
    });
}

window.init = init;
init();
