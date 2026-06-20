// client/animations/ShootAnimation.js
// Анимация выстрелов: снаряд, трассер, взрыв

class ShootAnimation {
   constructor(scene, hexGrid) {
       this.scene = scene;
       this.hexGrid = hexGrid;
       this.activeProjectiles = [];
       this.projectilePool = [];
       this.maxPoolSize = 30;
       this.debugMode = false;
       
       // Настройки снарядов
       this.config = {
           projectileColor: 0xff6600,
           trailColor: 0xff8800,
           glowColor: 0xff8800,
           speed: 800, // пикселей в секунду
           explosionParticles: 25,
           trailInterval: 30, // мс между следами
           trailLifetime: 300
       };
   }

   /**
    * Создать выстрел с трассером
    */
   fire(fromQ, fromR, toQ, toR, options = {}) {
       const from = this.hexGrid.hexToPixel(fromQ, fromR);
       const to = this.hexGrid.hexToPixel(toQ, toR);
       
       const config = {
           duration: options.duration || this.calculateDuration(from, to),
           color: options.color || this.config.projectileColor,
           trailColor: options.trailColor || this.config.trailColor,
           onHit: options.onHit || null,
           onMiss: options.onMiss || null,
           damage: options.damage || 0
       };

       return this.fireAtPixel(from.x, from.y, to.x, to.y, config);
   }

   /**
    * Выстрел по пиксельным координатам
    */
   fireAtPixel(fromX, fromY, toX, toY, options = {}) {
       const config = {
           duration: options.duration || this.calculateDuration({x: fromX, y: fromY}, {x: toX, y: toY}),
           color: options.color || this.config.projectileColor,
           trailColor: options.trailColor || this.config.trailColor,
           onHit: options.onHit || null,
           onMiss: options.onMiss || null,
           damage: options.damage || 0
       };

       // Создаем снаряд
       const projectile = this.createProjectile(fromX, fromY, config.color);
       const glow = this.createGlow(fromX, fromY);
       
       const projectileData = {
           projectile,
           glow,
           startX: fromX,
           startY: fromY,
           endX: toX,
           endY: toY,
           createdAt: Date.now(),
           active: true,
           config: config
       };

       this.activeProjectiles.push(projectileData);

       // Запускаем анимацию полета
       this.animateFlight(projectileData);

       return projectileData;
   }

   /**
    * Создать снаряд
    */
   createProjectile(x, y, color) {
       const projectile = this.scene.add.circle(x, y, 6, color);
       projectile.setDepth(20);
       projectile.setStrokeStyle(2, 0xffffff, 0.3);
       
       // Свечение
       const glow = this.scene.add.circle(x, y, 15, color, 0.2);
       glow.setDepth(19);
       
       return projectile;
   }

   /**
    * Создать свечение
    */
   createGlow(x, y) {
       const glow = this.scene.add.circle(x, y, 25, 0xff8800, 0.15);
       glow.setDepth(18);
       return glow;
   }

   /**
    * Анимация полета
    */
   animateFlight(projectileData) {
       const { projectile, glow, startX, startY, endX, endY, config } = projectileData;
       
       // Вычисляем угол полета
       const angle = Math.atan2(endY - startY, endX - startX);
       projectile.rotation = angle;
       
       // Трассер
       let trailTimer = 0;
       const trailInterval = this.config.trailInterval;
       
       // Основной твин
       const tween = this.scene.tweens.add({
           targets: projectile,
           x: endX,
           y: endY,
           duration: config.duration,
           ease: 'Linear',
           onStart: () => {
               if (this.debugMode) console.log('🚀 Выстрел начат');
           },
           onUpdate: () => {
               // Обновляем свечение
               glow.x = projectile.x;
               glow.y = projectile.y;
               
               // Создаем след
               const now = Date.now();
               if (now - trailTimer > trailInterval) {
                   trailTimer = now;
                   this.createTrail(projectile.x, projectile.y, config.trailColor);
               }
               
               // Эффект изменения размера снаряда для реалистичности
               const progress = (Date.now() - tween.data[0].start) / config.duration;
               const scale = 0.8 + Math.sin(progress * 20) * 0.2;
               projectile.scaleX = scale;
               projectile.scaleY = scale;
           },
           onComplete: () => {
               this.onProjectileHit(projectileData);
           }
       });

       projectileData.tween = tween;
       projectileData.startTime = Date.now();
   }

   /**
    * Создать след от снаряда
    */
   createTrail(x, y, color) {
       const trail = this.scene.add.circle(
           x + (Math.random() - 0.5) * 8,
           y + (Math.random() - 0.5) * 8,
           2 + Math.random() * 3,
           color,
           0.3 + Math.random() * 0.3
       );
       trail.setDepth(17);
       
       this.scene.tweens.add({
           targets: trail,
           alpha: 0,
           scale: 2,
           duration: this.config.trailLifetime,
           onComplete: () => {
               trail.destroy();
           }
       });
   }

   /**
    * Обработка попадания
    */
   onProjectileHit(projectileData) {
       const { projectile, glow, endX, endY, config } = projectileData;
       
       // Удаляем снаряд
       projectile.destroy();
       glow.destroy();
       
       // Создаем взрыв
       this.createExplosion(endX, endY, config.damage);
       
       // Вызываем колбэк
       if (config.onHit) {
           config.onHit(endX, endY, projectileData);
       }
       
       // Удаляем из активных
       const index = this.activeProjectiles.indexOf(projectileData);
       if (index !== -1) {
           this.activeProjectiles.splice(index, 1);
       }
   }

   /**
    * Создать взрыв
    */
   createExplosion(x, y, damage = 0) {
       // Основная вспышка
       const flash = this.scene.add.circle(x, y, 30, 0xffffff, 0.8);
       flash.setDepth(14);
       
       this.scene.tweens.add({
           targets: flash,
           scale: 0.1,
           alpha: 0,
           duration: 200,
           onComplete: () => {
               flash.destroy();
           }
       });

       // Частицы взрыва
       const colors = [0xff4400, 0xff6600, 0xff8800, 0xffaa00, 0xffffff];
       const count = this.config.explosionParticles;
       
       for (let i = 0; i < count; i++) {
           const angle = Math.random() * Math.PI * 2;
           const distance = 20 + Math.random() * 60;
           const speed = 200 + Math.random() * 400;
           const size = 2 + Math.random() * 6;
           const color = colors[Math.floor(Math.random() * colors.length)];
           
           const particle = this.scene.add.circle(x, y, size, color);
           particle.setDepth(15);
           
           const targetX = x + Math.cos(angle) * distance;
           const targetY = y + Math.sin(angle) * distance;
           
           this.scene.tweens.add({
               targets: particle,
               x: targetX,
               y: targetY,
               alpha: 0,
               scale: 0.1,
               duration: 300 + Math.random() * 400,
               ease: 'Power2',
               onComplete: () => {
                   particle.destroy();
               }
           });
       }

       // Дым
       this.createSmoke(x, y);
       
       // Ударная волна
       const shockwave = this.scene.add.circle(x, y, 10, 0xffffff, 0.3);
       shockwave.setDepth(13);
       shockwave.setStrokeStyle(3, 0xffffff);
       
       this.scene.tweens.add({
           targets: shockwave,
           scale: 3,
           alpha: 0,
           duration: 400,
           ease: 'Power2',
           onComplete: () => {
               shockwave.destroy();
           }
       });

       if (this.debugMode) console.log(`💥 Взрыв в (${Math.round(x)}, ${Math.round(y)}), урон: ${damage}`);
   }

   /**
    * Создать дым после взрыва
    */
   createSmoke(x, y) {
       const smokeCount = 6;
       for (let i = 0; i < smokeCount; i++) {
           const smoke = this.scene.add.circle(
               x + (Math.random() - 0.5) * 40,
               y + (Math.random() - 0.5) * 40,
               8 + Math.random() * 12,
               0x666666,
               0.3 + Math.random() * 0.3
           );
           smoke.setDepth(12);
           
           this.scene.tweens.add({
               targets: smoke,
               x: smoke.x + (Math.random() - 0.5) * 60,
               y: smoke.y - 30 - Math.random() * 40,
               scale: 3,
               alpha: 0,
               duration: 1500 + Math.random() * 1000,
               ease: 'Power1',
               onComplete: () => {
                   smoke.destroy();
               }
           });
       }
   }

   /**
    * Вычислить длительность полета
    */
   calculateDuration(from, to) {
       const dx = to.x - from.x;
       const dy = to.y - from.y;
       const distance = Math.sqrt(dx * dx + dy * dy);
       return Math.max(200, Math.min(800, distance / this.config.speed * 1000));
   }

   /**
    * Очистить все снаряды
    */
   clearAll() {
       for (const data of this.activeProjectiles) {
           if (data.projectile) data.projectile.destroy();
           if (data.glow) data.glow.destroy();
           if (data.tween) data.tween.stop();
       }
       this.activeProjectiles = [];
       if (this.debugMode) console.log('🧹 Все снаряды очищены');
   }

   /**
    * Включить/выключить отладку
    */
   setDebug(enabled) {
       this.debugMode = enabled;
   }
}

// Экспорт
if (typeof window !== 'undefined') {
   window.ShootAnimation = ShootAnimation;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { ShootAnimation };
}
