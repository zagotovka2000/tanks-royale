// client/animations/AnimationHelper.js
// Вспомогательные функции для анимаций

const AnimationHelper = {
   /**
    * Получить угол для направления
    */
   getAngleFromDirection(direction) {
       const map = {
           'right': 0,
           'up-right': -Math.PI / 3,
           'up-left': -Math.PI * 2 / 3,
           'left': Math.PI,
           'down-left': Math.PI * 2 / 3,
           'down-right': Math.PI / 3
       };
       return map[direction] || 0;
   },

   /**
    * Получить направление из угла
    */
   getDirectionFromAngle(angle) {
       const directions = [
           { name: 'right', angle: 0 },
           { name: 'up-right', angle: -Math.PI / 3 },
           { name: 'up-left', angle: -Math.PI * 2 / 3 },
           { name: 'left', angle: Math.PI },
           { name: 'down-left', angle: Math.PI * 2 / 3 },
           { name: 'down-right', angle: Math.PI / 3 }
       ];
       
       // Нормализуем угол
       let normalized = angle % (Math.PI * 2);
       if (normalized < 0) normalized += Math.PI * 2;
       
       let closest = directions[0];
       let minDiff = Infinity;
       
       for (const dir of directions) {
           let dirAngle = dir.angle;
           if (dirAngle < 0) dirAngle += Math.PI * 2;
           let diff = Math.abs(normalized - dirAngle);
           if (diff > Math.PI) diff = Math.PI * 2 - diff;
           if (diff < minDiff) {
               minDiff = diff;
               closest = dir;
           }
       }
       
       return closest.name;
   },

   /**
    * Создать эффект пульсации
    */
   createPulse(scene, target, duration = 500, scale = 1.2, color = null, alpha = 0.5) {
       const graphic = scene.add.graphics();
       graphic.fillStyle(color || 0xffffff, alpha);
       graphic.fillCircle(0, 0, 20);
       graphic.setPosition(target.x, target.y);
       graphic.setDepth(50);
       
       scene.tweens.add({
           targets: graphic,
           scaleX: scale,
           scaleY: scale,
           alpha: 0,
           duration: duration,
           ease: 'Power2',
           onComplete: () => {
               graphic.destroy();
           }
       });
       
       return graphic;
   },

   /**
    * Создать текст с анимацией появления
    */
   createFloatingText(scene, x, y, text, color = '#ffd93d', duration = 1500) {
       const label = scene.add.text(x, y, text, {
           fontSize: '28px',
           color: color,
           fontStyle: 'bold',
           stroke: '#000000',
           strokeThickness: 4
       });
       label.setOrigin(0.5);
       label.setDepth(100);
       
       scene.tweens.add({
           targets: label,
           y: y - 80,
           alpha: 0,
           duration: duration,
           ease: 'Power2',
           onComplete: () => {
               label.destroy();
           }
       });
       
       return label;
   },

   /**
    * Создать эффект свечения
    */
   createGlowEffect(scene, x, y, color = 0x44ff44, size = 30, duration = 1000) {
       const glow = scene.add.circle(x, y, size, color, 0.2);
       glow.setDepth(5);
       
       scene.tweens.add({
           targets: glow,
           scale: 1.5,
           alpha: 0,
           duration: duration,
           ease: 'Power2',
           onComplete: () => {
               glow.destroy();
           }
       });
       
       return glow;
   },

   /**
    * Анимировать появление объекта
    */
   appear(scene, target, duration = 500, delay = 0) {
       target.alpha = 0;
       target.scaleX = 0.5;
       target.scaleY = 0.5;
       
       scene.tweens.add({
           targets: target,
           alpha: 1,
           scaleX: 1,
           scaleY: 1,
           duration: duration,
           delay: delay,
           ease: 'Back.Out'
       });
   },

   /**
    * Анимировать исчезновение объекта
    */
   disappear(scene, target, duration = 500, onComplete = null) {
       scene.tweens.add({
           targets: target,
           alpha: 0,
           scaleX: 0.5,
           scaleY: 0.5,
           duration: duration,
           ease: 'Power2',
           onComplete: () => {
               if (onComplete) onComplete();
           }
       });
   },

   /**
    * Создать эффект "дрожания"
    */
   shake(scene, target, intensity = 5, duration = 300) {
       const originalX = target.x;
       const originalY = target.y;
       
       scene.tweens.add({
           targets: target,
           x: originalX + (Math.random() - 0.5) * intensity * 2,
           y: originalY + (Math.random() - 0.5) * intensity * 2,
           duration: 50,
           repeat: duration / 50 - 1,
           yoyo: true,
           onComplete: () => {
               target.x = originalX;
               target.y = originalY;
           }
       });
   },

   /**
    * Создать эффект полета по дуге
    */
   arcFlight(scene, target, fromX, fromY, toX, toY, height = 100, duration = 800) {
       target.x = fromX;
       target.y = fromY;
       
       const startTime = Date.now();
       const totalDuration = duration;
       
       scene.tweens.add({
           targets: target,
           x: toX,
           duration: duration,
           ease: 'Linear',
           onUpdate: () => {
               const progress = (Date.now() - startTime) / totalDuration;
               const arcY = Math.sin(progress * Math.PI) * height;
               const baseY = fromY + (toY - fromY) * progress;
               target.y = baseY - arcY;
           }
       });
   }
};

// Экспорт
if (typeof window !== 'undefined') {
   window.AnimationHelper = AnimationHelper;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { AnimationHelper };
}
