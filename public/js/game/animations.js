// public/js/game/animations.js
window.particles = [];
window.smokeParticles = [];
window.projectiles = [];
window.aiShotsQueue = [];

const PROJECTILE_SPEED = 0.025;

// Функция для получения 2D координат из гексагональных (для спрайтовых эффектов)
window.hexToPixel2D = function(q, r) {
    const hexSize = window.hexSize || 30;
    const x = hexSize * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
    const y = hexSize * (3/2 * r);
    // Центрируем относительно canvas (если он еще существует)
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        return { x: x + canvas.width/2, y: y + canvas.height/2 };
    }
    return { x: x, y: y };
};

// Для совместимости со старым кодом
window.hexToPixel = window.hexToPixel2D;

window.addProjectileAnimation = function(fromQ, fromR, toQ, toR, onComplete) {
    const from = window.hexToPixel2D(fromQ, fromR);
    const to = window.hexToPixel2D(toQ, toR);
    
    window.projectiles.push({
        fromX: from.x, fromY: from.y,
        toX: to.x, toY: to.y,
        progress: 0,
        speed: PROJECTILE_SPEED,
        onComplete: onComplete
    });
};

window.addProjectileAnimationFromServer = function(fromQ, fromR, toQ, toR, onComplete) {
    const from = window.hexToPixel2D(fromQ, fromR);
    const to = window.hexToPixel2D(toQ, toR);
    
    window.aiShotsQueue.push({
        fromX: from.x, fromY: from.y,
        toX: to.x, toY: to.y,
        progress: 0,
        speed: PROJECTILE_SPEED,
        onComplete: onComplete
    });
};

window.updateProjectiles = function() {
    let needRedraw = false;
    
    window.projectiles = window.projectiles.filter(proj => {
        proj.progress += proj.speed;
        needRedraw = true;
        if (proj.progress >= 1) {
            if (proj.onComplete) proj.onComplete();
            return false;
        }
        return true;
    });
    
    window.aiShotsQueue = window.aiShotsQueue.filter(proj => {
        proj.progress += proj.speed;
        needRedraw = true;
        if (proj.progress >= 1) {
            if (proj.onComplete) proj.onComplete();
            return false;
        }
        return true;
    });
    
    if (needRedraw && window.drawGame) window.drawGame();
};

window.drawProjectiles = function() {
    // Если есть Canvas, рисуем эффекты поверх 3D
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    
    window.projectiles.forEach(proj => {
        const t = proj.progress;
        const easeInOut = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const x = proj.fromX + (proj.toX - proj.fromX) * easeInOut;
        const y = proj.fromY + (proj.toY - proj.fromY) * easeInOut;
        
        ctx.beginPath();
        ctx.arc(x, y, window.hexSize * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = '#ffeb3b';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, window.hexSize * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = '#ff9800';
        ctx.fill();
    });
    
    window.aiShotsQueue.forEach(proj => {
        const t = proj.progress;
        const easeInOut = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const x = proj.fromX + (proj.toX - proj.fromX) * easeInOut;
        const y = proj.fromY + (proj.toY - proj.fromY) * easeInOut;
        
        ctx.beginPath();
        ctx.arc(x, y, window.hexSize * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4444';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, window.hexSize * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = '#cc0000';
        ctx.fill();
    });
};

window.addExplosionEffect = function(q, r) {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx || !window.hexToPixel2D) return;
    
    const center = window.hexToPixel2D(q, r);
    if (window.soundManager) window.soundManager.play('explosion');
    
    for (let i = 0; i < 25; i++) {
        window.particles.push({
            x: center.x, y: center.y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 8 - 3,
            life: 1,
            size: Math.random() * 6 + 2,
            color: `hsl(${Math.random() * 60 + 20}, 100%, 55%)`
        });
    }
    
    for (let i = 0; i < 10; i++) {
        window.smokeParticles.push({
            x: center.x, y: center.y,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2 - 1,
            life: 1,
            size: Math.random() * 8 + 4,
            color: `rgba(80, 80, 80, ${Math.random() * 0.5 + 0.3})`
        });
    }
};

window.addMissEffect = function(q, r) {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx || !window.hexToPixel2D) return;
    
    const center = window.hexToPixel2D(q, r);
    if (window.soundManager) window.soundManager.play('miss');
    
    for (let i = 0; i < 10; i++) {
        window.particles.push({
            x: center.x, y: center.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 0.6,
            size: Math.random() * 4 + 1,
            color: `rgba(200, 200, 100, 0.8)`
        });
    }
};

window.addWallBreakEffect = function(q, r) {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx || !window.hexToPixel2D) return;
    
    const center = window.hexToPixel2D(q, r);
    if (window.soundManager) window.soundManager.play('miss');
    
    for (let i = 0; i < 15; i++) {
        window.particles.push({
            x: center.x, y: center.y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8 - 2,
            life: 0.8,
            size: Math.random() * 5 + 2,
            color: `hsl(${Math.random() * 40 + 20}, 80%, 50%)`
        });
    }
};

window.updateParticles = function() {
    window.particles = window.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        return p.life > 0;
    });
    window.smokeParticles = window.smokeParticles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.008;
        return p.life > 0;
    });
};

window.drawParticles = function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    if (!ctx) return;
    
    window.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    });
    window.smokeParticles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
};

window.clearAnimations = function() {
    window.particles = [];
    window.smokeParticles = [];
    window.projectiles = [];
    window.aiShotsQueue = [];
};
