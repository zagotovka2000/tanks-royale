// client/models/TankUnit.js

class TankUnit {
   constructor(id, name, team, q, r, hp, damage, color, type, range) {
       this.id = id;
       this.name = name;
       this.team = team;
       this.q = q;
       this.r = r;
       this.hp = hp || 100;
       this.maxHp = hp || 100;
       this.damage = damage || 30;
       this.color = color || '#4caf50';
       this.type = type || 'medium';
       this.range = range || 5;
       this.active = true;
       this.direction = 'right';
       this.kills = 0;
       this.isPlayer = false;
       this._lastQ = q;
       this._lastR = r;
   }
   
   setDirection(direction) {
       this.direction = direction;
   }
   
   moveTo(q, r) {
       this._lastQ = this.q;
       this._lastR = this.r;
       this.q = q;
       this.r = r;
   }
   
   setLastPosition(q, r) {
       this._lastQ = q;
       this._lastR = r;
   }
   
   getLastPosition() {
       return { q: this._lastQ, r: this._lastR };
   }
   
   takeDamage(amount) {
       this.hp -= amount;
       if (this.hp <= 0) {
           this.active = false;
           return true;
       }
       return false;
   }
   
   addKill() {
       this.kills++;
   }
   
   toJSON() {
       return {
           id: this.id,
           name: this.name,
           q: this.q,
           r: this.r,
           hp: this.hp,
           maxHp: this.maxHp,
           kills: this.kills,
           direction: this.direction,
           color: this.color,
           type: this.type,
           team: this.team,
           range: this.range,
           active: this.active
       };
   }
}

// ✅ ЭКСПОРТ ДЛЯ БРАУЗЕРА
if (typeof window !== 'undefined') {
   window.TankUnit = TankUnit;
}

// ✅ ЭКСПОРТ ДЛЯ NODE.JS
if (typeof module !== 'undefined' && module.exports) {
   module.exports = { TankUnit };
}
