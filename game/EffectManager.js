class EffectManager {
   constructor() {
       this.smokeEffects = [];
   }
   
   addSmoke(q, r, tankName) {
       this.smokeEffects.push({
           q: q,
           r: r,
           time: Date.now(),
           name: tankName
       });
       
       setTimeout(() => {
           const index = this.smokeEffects.findIndex(s => s.q === q && s.r === r);
           if (index !== -1) this.smokeEffects.splice(index, 1);
       }, 10000);
   }
   
   getSmokeEffects() {
       return this.smokeEffects;
   }
   
   hasSmokeAt(q, r) {
       return this.smokeEffects.some(s => s.q === q && s.r === r);
   }
}

module.exports = { EffectManager };
