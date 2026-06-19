// client/game/EffectManager.js

function EffectManager(scene, hexGrid) {
   this.scene = scene;
   this.hexGrid = hexGrid;
   this.smokeEffects = [];
}

// ✅ ВИЗУАЛЬНЫЕ ЭФФЕКТЫ (из предыдущей версии)
EffectManager.prototype.createExplosion = function(x, y, options) {
   options = options || {};
   var particleCount = options.particleCount || 20;
   var colors = options.colors || [0xff6600, 0xff8800, 0xffaa00];
   var duration = options.duration || 300;
   
   console.log('💥 Взрыв по координатам:', x, y);
   
   for (var i = 0; i < particleCount; i++) {
       var angle = Math.random() * Math.PI * 2;
       var dist = 15 + Math.random() * 45;
       var color = colors[Math.floor(Math.random() * colors.length)];
       var particle = this.scene.add.circle(x, y, 2 + Math.random() * 6, color);
       particle.setDepth(15);
       
       (function(particle) {
           this.scene.tweens.add({
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
       }).call(this, particle);
   }
   
   var flash = this.scene.add.circle(x, y, 30, 0xffffff, 0.7);
   flash.setDepth(14);
   this.scene.tweens.add({
       targets: flash,
       scale: 0.1,
       alpha: 0,
       duration: 150,
       onComplete: function() {
           flash.destroy();
       }
   });
};

EffectManager.prototype.createExplosionOnHex = function(q, r, options) {
   var pos = this.hexGrid.hexToPixel(q, r);
   this.createExplosion(pos.x, pos.y, options);
};

EffectManager.prototype.createSmoke = function(q, r, options) {
   options = options || {};
   var count = options.count || 8;
   var duration = options.duration || 2000;
   var pos = this.hexGrid.hexToPixel(q, r);
   
   for (var i = 0; i < count; i++) {
       var smoke = this.scene.add.circle(
           pos.x + (Math.random() - 0.5) * 30,
           pos.y + (Math.random() - 0.5) * 30,
           5 + Math.random() * 12,
           0x888888,
           0.3 + Math.random() * 0.3
       );
       smoke.setDepth(12);
       
       (function(smoke) {
           this.scene.tweens.add({
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
       }).call(this, smoke);
   }
};

EffectManager.prototype.createTrail = function(x, y, options) {
   options = options || {};
   var color = options.color || 0xff8800;
   var alpha = options.alpha || 0.2;
   var size = options.size || 4;
   
   var trail = this.scene.add.circle(
       x + (Math.random() - 0.5) * 8,
       y + (Math.random() - 0.5) * 8,
       size + Math.random() * 4,
       color,
       alpha + Math.random() * 0.3
   );
   trail.setDepth(18);
   
   this.scene.tweens.add({
       targets: trail,
       alpha: 0,
       scale: 0.3,
       duration: 200,
       onComplete: function() {
           trail.destroy();
       }
   });
};

// ✅ ЛОГИКА ДЫМА (из вашей версии)
EffectManager.prototype.addSmokeEffect = function(q, r, tankName) {
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
};

EffectManager.prototype.getSmokeEffects = function() {
   return this.smokeEffects;
};

EffectManager.prototype.hasSmokeAt = function(q, r) {
   return this.smokeEffects.some(function(s) {
       return s.q === q && s.r === r;
   });
};

EffectManager.prototype.clear = function() {
   this.smokeEffects = [];
};

// ✅ Универсальный экспорт
if (typeof window !== 'undefined') {
   window.EffectManager = EffectManager;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { EffectManager: EffectManager };
}
