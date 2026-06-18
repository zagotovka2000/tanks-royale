// client/game/EffectManager.js

function EffectManager() {
   this.smokeEffects = [];
}

EffectManager.prototype.addSmoke = function(q, r, tankName) {
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

// ✅ Универсальный экспорт
if (typeof window !== 'undefined') {
   window.EffectManager = EffectManager;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { EffectManager: EffectManager };
}
