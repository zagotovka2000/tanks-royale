class BattleManager {
   constructor() {
       this.projectiles = [];
   }
   
   processShot(attacker, allUnits, targetX, targetY) {
       // Проверяем прямую цель
       let target = allUnits.find(u => 
           u.active && u.team !== attacker.team && u.x === targetX && u.y === targetY
       );
       
       // Если цели нет, проверяем движущиеся цели
       if (!target) {
           for (let unit of allUnits) {
               if (!unit.active || unit.team === attacker.team) continue;
               
               // Проверяем, не двигается ли цель в зону выстрела
               const distanceToTarget = Math.abs(unit.x - targetX) + Math.abs(unit.y - targetY);
               const shotDistance = Math.abs(attacker.x - targetX) + Math.abs(attacker.y - targetY);
               
               if (distanceToTarget === 1 && shotDistance <= 5) {
                   target = unit;
                   break;
               }
           }
       }
       
       if (!target) {
           return { success: false, message: "Промах!" };
       }
       
       const damage = attacker.damage || 35;
       const killed = target.takeDamage(damage);
       
       if (killed) {
           attacker.addKill();
       }
       
       return {
           success: true,
           hit: true,
           killed: killed,
           targetName: target.name,
           targetX: target.x,
           targetY: target.y,
           damage: damage,
           message: killed ? `💀 Уничтожен ${target.name}!` : `💥 Попадание в ${target.name}! -${damage} HP`,
           attackerName: attacker.name
       };
   }
}

module.exports = { BattleManager };
