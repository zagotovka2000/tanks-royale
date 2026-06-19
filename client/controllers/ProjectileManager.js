// client/game/ProjectileManager.js - СТАРЫЙ СИНТАКСИС

function ProjectileManager(scene) {
   this.scene = scene;
   this.projectiles = [];
   this.maxProjectiles = 50;
   this.activeProjectiles = [];
}

ProjectileManager.prototype.init = function() {
   console.log('🚀 ProjectileManager инициализирован');
   return this;
};

ProjectileManager.prototype.fire = function(fromX, fromY, toX, toY, config) {
   var self = this;
   config = config || {};
   
   // Создаем снаряд
   var projectile = this.scene.add.circle(fromX, fromY, 8, 0xff6600);
   projectile.setDepth(20);
   projectile.setStrokeStyle(3, 0xffaa00);
   
   // Свечение
   var glow = this.scene.add.circle(fromX, fromY, 20, 0xff8800, 0.3);
   glow.setDepth(19);
   
   var projectileData = {
       projectile: projectile,
       glow: glow,
       active: true,
       startX: fromX,
       startY: fromY,
       endX: toX,
       endY: toY,
       createdAt: Date.now()
   };
   
   this.projectiles.push(projectileData);
   this.activeProjectiles.push(projectileData);
   
   // Ограничиваем количество
   if (this.projectiles.length > this.maxProjectiles) {
       var old = this.projectiles.shift();
       if (old && old.projectile) {
           old.projectile.destroy();
       }
       if (old && old.glow) {
           old.glow.destroy();
       }
   }
   
   // Длительность полета
   var dx = toX - fromX;
   var dy = toY - fromY;
   var distance = Math.sqrt(dx * dx + dy * dy);
   var duration = config.duration || Math.max(300, Math.min(1200, distance * 0.8));
   
   // Анимация полета
   this.scene.tweens.add({
       targets: projectile,
       x: toX,
       y: toY,
       duration: duration,
       ease: 'Power1',
       onUpdate: function() {
           glow.x = projectile.x;
           glow.y = projectile.y;
           
           // След
           if (Math.random() < 0.3) {
               var trail = self.scene.add.circle(
                   projectile.x + (Math.random() - 0.5) * 8,
                   projectile.y + (Math.random() - 0.5) * 8,
                   3 + Math.random() * 4,
                   0xff8800,
                   0.2 + Math.random() * 0.3
               );
               trail.setDepth(18);
               self.scene.tweens.add({
                   targets: trail,
                   alpha: 0,
                   scale: 0.3,
                   duration: 200,
                   onComplete: function() {
                       trail.destroy();
                   }
               });
           }
       },
       onComplete: function() {
           self.destroyProjectile(projectileData);
           if (config.onComplete) {
               config.onComplete(toX, toY);
           }
       }
   });
   
   return projectileData;
};

ProjectileManager.prototype.destroyProjectile = function(projectileData) {
   if (!projectileData) return;
   
   if (projectileData.projectile) {
       projectileData.projectile.destroy();
   }
   if (projectileData.glow) {
       projectileData.glow.destroy();
   }
   projectileData.active = false;
   
   var index = this.activeProjectiles.indexOf(projectileData);
   if (index !== -1) {
       this.activeProjectiles.splice(index, 1);
   }
};

ProjectileManager.prototype.destroyAll = function() {
   for (var i = this.projectiles.length - 1; i >= 0; i--) {
       this.destroyProjectile(this.projectiles[i]);
   }
   this.projectiles = [];
   this.activeProjectiles = [];
};

ProjectileManager.prototype.getActiveCount = function() {
   return this.activeProjectiles.length;
};

ProjectileManager.prototype.update = function() {
   // Очищаем старые снаряды
   var now = Date.now();
   var toRemove = [];
   for (var i = 0; i < this.projectiles.length; i++) {
       var p = this.projectiles[i];
       if (!p.active && (now - p.createdAt > 5000)) {
           toRemove.push(i);
       }
   }
   for (var i = toRemove.length - 1; i >= 0; i--) {
       this.projectiles.splice(toRemove[i], 1);
   }
};

// Экспорт
if (typeof window !== 'undefined') {
   window.ProjectileManager = ProjectileManager;
}
