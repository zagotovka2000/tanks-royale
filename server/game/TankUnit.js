class TankUnit {
    constructor(id, name, team, q, r, hp, damage, color, type, image = null, hiddenInFog = false, range = 4) {
        this.id = id;
        this.realName = name;
        this.name = name;
        this.team = team;
        this.q = q;
        this.r = r;
        this.hp = hp;
        this.maxHp = hp;
        this.damage = damage;
        this.color = color;
        this.type = type || 'medium';
        this.image = image;
        this.active = true;
        this.direction = 'right';
        this.kills = 0;
        this.isPlayer = false;
        this.hiddenInFog = hiddenInFog;
        this.range = range;
        this.lastMoveTime = 0;
        this.lastShootTime = 0;
        this.moveCooldown = 5000; // 5 seconds
        this.shootCooldown = 5000; // 5 seconds
    }
    
    setDirection(direction) {
        this.direction = direction;
    }
    
    moveTo(q, r) {
        this.q = q;
        this.r = r;
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
            range: this.range
        };
    }
 }
 
 module.exports = { TankUnit };