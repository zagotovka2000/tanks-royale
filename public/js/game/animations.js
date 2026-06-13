// public/js/game/animations.js
window.particles = [];
window.smokeParticles = [];
window.projectiles = [];
window.aiShotsQueue = [];

const PROJECTILE_SPEED = 0.025;

window.addProjectileAnimation = function(fromQ, fromR, toQ, toR, onComplete) {
    const from = window.hexToPixel(fromQ, fromR);
    const to = window.hexToPixel(toQ, toR);
    
    window.projectiles.push({
        fromX: from.x, fromY: from.y,
        toX: to.x, toY: to.y,
        progress: 0,
        speed: PROJECTILE_SPEED,
        onComplete: onComplete
    });
};

window.addProjectileAnimationFromServer = function(fromQ, fromR, toQ, toR, onComplete) {
    const from = window.hexToPixel(fromQ, fromR);
    const to = window.hexToPixel(toQ, toR);
    
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
    if (!window.ctx) return;
    
    window.projectiles.forEach(proj => {
        const t = proj.progress;
        const easeInOut = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const x = proj.fromX + (proj.toX - proj.fromX) * easeInOut;
        const y = proj.fromY + (proj.toY - proj.fromY) * easeInOut;
        
        window.ctx.beginPath();
        window.ctx.arc(x, y, window.hexSize * 0.15, 0, Math.PI * 2);
        window.ctx.fillStyle = '#ffeb3b';
        window.ctx.fill();
        window.ctx.beginPath();
        window.ctx.arc(x, y, window.hexSize * 0.08, 0, Math.PI * 2);
        window.ctx.fillStyle = '#ff9800';
        window.ctx.fill();
    });
    
    window.aiShotsQueue.forEach(proj => {
        const t = proj.progress;
        const easeInOut = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const x = proj.fromX + (proj.toX - proj.fromX) * easeInOut;
        const y = proj.fromY + (proj.toY - proj.fromY) * easeInOut;
        
        window.ctx.beginPath();
        window.ctx.arc(x, y, window.hexSize * 0.15, 0, Math.PI * 2);
        window.ctx.fillStyle = '#ff4444';
        window.ctx.fill();
        window.ctx.beginPath();
        window.ctx.arc(x, y, window.hexSize * 0.08, 0, Math.PI * 2);
        window.ctx.fillStyle = '#cc0000';
        window.ctx.fill();
    });
};

window.addExplosionEffect = function(q, r) {
    if (!window.ctx || !window.hexToPixel) return;
    const center = window.hexToPixel(q, r);
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
    if (!window.ctx || !window.hexToPixel) return;
    const center = window.hexToPixel(q, r);
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
    if (!window.ctx || !window.hexToPixel) return;
    const center = window.hexToPixel(q, r);
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
    if (!window.ctx) return;
    window.particles.forEach(p => {
        window.ctx.fillStyle = p.color;
        window.ctx.globalAlpha = p.life;
        window.ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    });
    window.smokeParticles.forEach(p => {
        window.ctx.fillStyle = p.color;
        window.ctx.globalAlpha = p.life;
        window.ctx.beginPath();
        window.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        window.ctx.fill();
    });
    window.ctx.globalAlpha = 1;
};

window.clearAnimations = function() {
    window.particles = [];
    window.smokeParticles = [];
    window.projectiles = [];
    window.aiShotsQueue = [];
};
