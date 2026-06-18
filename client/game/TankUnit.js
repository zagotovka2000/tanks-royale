// client/game/TankUnit.js

function TankUnit(id, name, team, q, r, hp, damage, color, type, range) {
   this.id = id;
   this.name = name;
   this.team = team;
   this.q = q;
   this.r = r;
   this.hp = hp;
   this.maxHp = hp;
   this.damage = damage || 30;
   this.color = color || '#4caf50';
   this.type = type || 'medium';
   this.range = range || 5;
   this.active = true;
   this.direction = 'right';
   this.kills = 0;
   this.isPlayer = false;
}

TankUnit.prototype.setDirection = function(direction) {
   this.direction = direction;
};

TankUnit.prototype.moveTo = function(q, r) {
   this.q = q;
   this.r = r;
};

TankUnit.prototype.takeDamage = function(amount) {
   this.hp -= amount;
   if (this.hp <= 0) {
       this.active = false;
       return true;
   }
   return false;
};

TankUnit.prototype.addKill = function() {
   this.kills++;
};

TankUnit.prototype.toJSON = function() {
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
};

// ✅ Универсальный экспорт
if (typeof window !== 'undefined') {
   window.TankUnit = TankUnit;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { TankUnit: TankUnit };
}
