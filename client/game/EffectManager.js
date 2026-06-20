// client/game/EffectManager.js - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ (КАК КЛАСС)

class EffectManager {
   constructor() {
       this.smokeEffects = [];
   }

   createExplosion(x, y, options) {
       options = options || {};
       var particleCount = options.particleCount || 20;
       var colors = options.colors || [0xff6600, 0xff8800, 0xffaa00];
       var duration = options.duration || 300;
       
       console.log('💥 Взрыв по координатам:', x, y);
       
       // Используем глобальную ссылку на сцену
       var scene = window.__currentScene || null;
       if (!scene) {
           console.warn('⚠️ Нет сцены для эффектов');
           return;
       }
       
       for (var i = 0; i < particleCount; i++) {
           var angle = Math.random() * Math.PI * 2;
           var dist = 15 + Math.random() * 45;
           var color = colors[Math.floor(Math.random() * colors.length)];
           var particle = scene.add.circle(x, y, 2 + Math.random() * 6, color);
           particle.setDepth(15);
           
           (function(particle) {
               scene.tweens.add({
                   targets: particle,
                   x: x + Math.cos(angle) * dist,
                   y: y + Math.sin(angle) * dist,
                   alpha: 0,
                   scale: 0.1,
                   duration: duration + Math.random() * 300,
                   ease: 'Power2',
                   onComplete: function() {
                       particle.destroy();
                   }
               });
           })(particle);
       }
       
       var flash = scene.add.circle(x, y, 30, 0xffffff, 0.7);
       flash.setDepth(14);
       scene.tweens.add({
           targets: flash,
           scale: 0.1,
           alpha: 0,
           duration: 150,
           onComplete: function() {
               flash.destroy();
           }
       });
   }

   createExplosionOnHex(q, r, options) {
       var scene = window.__currentScene || null;
       if (!scene || !scene.hexGrid) {
           console.warn('⚠️ Нет сцены или hexGrid для эффектов');
           return;
       }
       var pos = scene.hexGrid.hexToPixel(q, r);
       this.createExplosion(pos.x, pos.y, options);
   }

   createSmoke(q, r, options) {
       options = options || {};
       var count = options.count || 8;
       var duration = options.duration || 2000;
       
       var scene = window.__currentScene || null;
       if (!scene || !scene.hexGrid) {
           console.warn('⚠️ Нет сцены или hexGrid для эффектов');
           return;
       }
       
       var pos = scene.hexGrid.hexToPixel(q, r);
       
       for (var i = 0; i < count; i++) {
           var smoke = scene.add.circle(
               pos.x + (Math.random() - 0.5) * 30,
               pos.y + (Math.random() - 0.5) * 30,
               5 + Math.random() * 12,
               0x888888,
               0.3 + Math.random() * 0.3
           );
           smoke.setDepth(12);
           
           (function(smoke) {
               scene.tweens.add({
                   targets: smoke,
                   scale: 4,
                   alpha: 0,
                   y: smoke.y - 40 - Math.random() * 40,
                   duration: duration + Math.random() * 1000,
                   ease: 'Power1',
                   onComplete: function() {
                       smoke.destroy();
                   }
               });
           })(smoke);
       }
   }

   createTrail(x, y, options) {
       options = options || {};
       var color = options.color || 0xff8800;
       var alpha = options.alpha || 0.2;
       var size = options.size || 4;
       
       var scene = window.__currentScene || null;
       if (!scene) {
           console.warn('⚠️ Нет сцены для эффектов');
           return;
       }
       
       var trail = scene.add.circle(
           x + (Math.random() - 0.5) * 8,
           y + (Math.random() - 0.5) * 8,
           size + Math.random() * 4,
           color,
           alpha + Math.random() * 0.3
       );
       trail.setDepth(18);
       
       scene.tweens.add({
           targets: trail,
           alpha: 0,
           scale: 0.3,
           duration: 200,
           onComplete: function() {
               trail.destroy();
           }
       });
   }

   addSmokeEffect(q, r, tankName) {
       this.smokeEffects.push({
           q: q,
           r: r,
           time: Date.now(),
           name: tankName
       });

       var self = this;
       setTimeout(function() {
           var index = self.smokeEffects.findIndex(function(s) {
               return s.q === q && s.r === r;
           });
           if (index !== -1) {
               self.smokeEffects.splice(index, 1);
           }
       }, 10000);
   }

   getSmokeEffects() {
       return this.smokeEffects;
   }

   hasSmokeAt(q, r) {
       return this.smokeEffects.some(function(s) {
           return s.q === q && s.r === r;
       });
   }

   clear() {
       this.smokeEffects = [];
   }

   destroy() {
       this.smokeEffects = [];
   }
}

// Экспорт
if (typeof window !== 'undefined') {
   window.EffectManager = EffectManager;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { EffectManager: EffectManager };
}
