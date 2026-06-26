const { TankUnit } = require('./TankUnit');

// Используем утилиты для работы с гексами
const HexUtils = require('../../public/js/utils/HexUtils.js');
// 6 направлений для гексагональной сетки
const DIRECTIONS = [
    { q: 1, r: 0, s: -1, name: 'right' },
    { q: 1, r: -1, s: 0, name: 'up-right' },
    { q: 0, r: -1, s: 1, name: 'up' },
    { q: -1, r: 0, s: 1, name: 'left' },
    { q: -1, r: 1, s: 0, name: 'down-left' },
    { q: 0, r: 1, s: -1, name: 'down' }
];

class TankGame {
    constructor() {
        this.radius = 7;
        this.gameOver = false;
        this.winner = null;
        this.lastActionTime = new Map();
        
        this.cells = new Map();
        this.walls = new Map();
        this.players = [];
        this.enemies = [];
        this.allies = [];
        
        this.generateMap();
        this.initializeUnits();
        this.initializeWalls();
        this.initializeBases();
    }
    
    generateMap() {
        for (let q = -this.radius; q <= this.radius; q++) {
            for (let r = -this.radius; r <= this.radius; r++) {
                const s = -q - r;
                if (Math.abs(q) <= this.radius && 
                    Math.abs(r) <= this.radius && 
                    Math.abs(s) <= this.radius) {
                    
                    const key = `${q},${r}`;
                    this.cells.set(key, {
                        q, r, s,
                        terrain: this.getTerrainType(q, r, s),
                        owner: null,
                        hasBase: false,
                        baseOwner: null,
                        captureProgress: 0
                    });
                }
            }
        }
        console.log(`Карта создана: ${this.cells.size} гексов`);
    }
    
    getTerrainType(q, r, s) {
        const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
        
        if (dist <= 2) return 'arena';
        if (dist === 3 && (Math.abs(q) === 3 || Math.abs(r) === 3 || Math.abs(s) === 3)) return 'swamp';
        if (dist === 4) return 'forest';
        if (dist === this.radius) return 'mountain';
        return 'plains';
    }
    
    isValidCell(q, r) {
        const s = -q - r;
        const key = `${q},${r}`;
        return this.cells.has(key) && this.cells.get(key).terrain !== 'mountain';
    }
    
    initializeBases() {
        const bases = [
            { q: -this.radius, r: 0, owner: 'enemy' },
            { q: this.radius, r: 0, owner: 'ally' },
            { q: 0, r: -this.radius, owner: 'player' },
            { q: 0, r: this.radius, owner: 'neutral' }
        ];
        
        for (const base of bases) {
            const key = `${base.q},${base.r}`;
            if (this.cells.has(key)) {
                const cell = this.cells.get(key);
                cell.hasBase = true;
                cell.baseOwner = base.owner;
                cell.terrain = 'base';
            }
        }
    }
    
    initializeWalls() {
        const baseWalls = [
            { q: 0, r: -this.radius + 1, type: 'steel', hp: 3 },
            { q: 1, r: -this.radius, type: 'steel', hp: 3 },
            { q: -1, r: -this.radius, type: 'steel', hp: 3 },
            { q: -this.radius + 1, r: 0, type: 'brick', hp: 1 },
            { q: -this.radius, r: 1, type: 'brick', hp: 1 },
            { q: -this.radius, r: -1, type: 'brick', hp: 1 }
        ];
        
        for (const wall of baseWalls) {
            const key = `${wall.q},${wall.r}`;
            if (this.cells.has(key)) {
                this.walls.set(key, { hp: wall.hp, type: wall.type });
            }
        }
    }
    
    initializeUnits() {
        const enemyPositions = [
            { q: -this.radius + 2, r: 1, name: 'Враг', color: '#e94560', type: 'heavy' },
            { q: -this.radius + 3, r: 2, name: 'Враг 2', color: '#ff6b6b', type: 'light' },
            { q: -this.radius + 1, r: -1, name: 'Враг 3', color: '#c0392b', type: 'medium' }
        ];
        
        this.enemies = enemyPositions.map((pos, i) => 
            new TankUnit(
                `enemy${i}`, 
                pos.name, 
                'enemy', 
                pos.q, 
                pos.r, 
                pos.type === 'heavy' ? 150 : pos.type === 'light' ? 70 : 100,
                pos.type === 'heavy' ? 45 : pos.type === 'light' ? 25 : 35,
                pos.color, 
                pos.type, 
                null, 
                false, 
                pos.type === 'heavy' ? 4 : pos.type === 'light' ? 6 : 5
            )
        );
        
        this.allies = [];
        
        console.log(`Создано ${this.enemies.length} врагов`);
    }
    
    addPlayer(telegramId, name) {
        if (this.players.length > 0) {
            return { success: false, reason: "Игра уже началась" };
        }
        
        const startPos = { q: 1, r: -this.radius + 2 };
        
        const player = new TankUnit(telegramId, name, 'ally', startPos.q, startPos.r, 120, 40, '#ffd93d', 'player', null, false, 5);
        player.isPlayer = true;
        this.players.push(player);
        
        console.log(`Игрок добавлен на позицию (${player.q}, ${player.r})`);
        return { success: true };
    }
    
    getAllUnits() {
        return [...this.players, ...this.allies, ...this.enemies];
    }
    
    getFirstPlayer() {
        return this.players[0];
    }
    
    hasPlayers() {
        return this.players.length > 0;
    }
    
    isGameOver() {
        return this.gameOver;
    }
    
    getWinner() {
        return this.winner;
    }
    
    getRemainingCooldown(unitId) {
        const now = Date.now();
        const lastAction = this.lastActionTime.get(unitId) || 0;
        return Math.max(0, 2000 - (now - lastAction));
    }
    
    getNeighbors(q, r) {
        const neighbors = [];
        for (let dir of DIRECTIONS) {
            const nq = q + dir.q;
            const nr = r + dir.r;
            if (this.isValidCell(nq, nr)) {
                neighbors.push({ q: nq, r: nr });
            }
        }
        return neighbors;
    }
    
    // Используем HexUtils вместо дублирования
    areHexAdjacent(q1, r1, q2, r2) {
        return HexUtils.areAdjacent(q1, r1, q2, r2);
    }
    
    hexDistance(q1, r1, q2, r2) {
        return HexUtils.distance(q1, r1, q2, r2);
    }
    
    getHexDirection(fromQ, fromR, toQ, toR) {
        return HexUtils.getDirection(fromQ, fromR, toQ, toR);
    }
    
    getHexLine(q1, r1, q2, r2) {
        const points = [];
        const distance = this.hexDistance(q1, r1, q2, r2);
        
        if (distance === 0) return points;
        
        for (let i = 0; i <= distance; i++) {
            const t = i / distance;
            const q = Math.round(q1 + (q2 - q1) * t);
            const r = Math.round(r1 + (r2 - r1) * t);
            
            if (this.isValidCell(q, r)) {
                points.push({ q, r });
            }
        }
        
        return points;
    }
    
    hasLineOfSight(q1, r1, q2, r2) {
        const points = this.getHexLine(q1, r1, q2, r2);
        
        for (const point of points) {
            if (point.q === q1 && point.r === r1) continue;
            if (point.q === q2 && point.r === r2) continue;
            
            if (this.isWall(point.q, point.r)) return false;
            
            const cell = this.cells.get(`${point.q},${point.r}`);
            if (cell && cell.terrain === 'forest') {
                return Math.random() > 0.3;
            }
        }
        
        return true;
    }
    
    isWall(q, r) {
        return this.walls.has(`${q},${r}`);
    }
    
    damageWall(q, r) {
        const wallKey = `${q},${r}`;
        if (!this.walls.has(wallKey)) return false;
        
        const wall = this.walls.get(wallKey);
        wall.hp--;
        
        if (wall.hp <= 0) {
            this.walls.delete(wallKey);
            return true;
        }
        
        return false;
    }
    
    moveToCell(unitId, targetQ, targetR) {
        const unit = this.getAllUnits().find(u => u.id === unitId);
        if (!unit || !unit.active) return false;
        
        const now = Date.now();
        const moveCooldown = Math.max(0, unit.moveCooldown - (now - unit.lastMoveTime));
        if (moveCooldown > 0) return false;
        
        const isAdjacent = this.areHexAdjacent(unit.q, unit.r, targetQ, targetR);
        if (!isAdjacent) return false;
        
        const isOccupied = this.getAllUnits().some(u => 
            u.active && u !== unit && u.q === targetQ && u.r === targetR
        );
        if (isOccupied) return false;
        
        if (this.isWall(targetQ, targetR)) return false;
        
        const targetCell = this.cells.get(`${targetQ},${targetR}`);
        let moveDelay = 0;
        if (targetCell && targetCell.terrain === 'swamp') {
            moveDelay = 500;
        }
        
        const direction = this.getHexDirection(unit.q, unit.r, targetQ, targetR);
        unit.setDirection(direction);
        unit.moveTo(targetQ, targetR);
        
        unit.lastMoveTime = Date.now() + moveDelay;
        
        this.checkBaseCapture(unit, targetQ, targetR);
        
        return true;
    }
    
    checkBaseCapture(unit, q, r) {
        const cell = this.cells.get(`${q},${r}`);
        if (cell && cell.hasBase && cell.baseOwner !== unit.team) {
            if (!cell.captureProgress) cell.captureProgress = 0;
            cell.captureProgress += 50;
            
            if (cell.captureProgress >= 100) {
                cell.baseOwner = unit.team;
                cell.captureProgress = 0;
                console.log(`База захвачена командой ${unit.team}!`);
            }
        }
    }
    
    shootAtCell(attackerId, targetQ, targetR) {
        console.log(`shootAtCell called: attacker ${attackerId} -> (${targetQ}, ${targetR})`);
        
        const attacker = this.getAllUnits().find(u => u.id === attackerId);
        if (!attacker || !attacker.active) {
            console.log('Attacker not found or inactive');
            return { success: false, message: "Неактивен" };
        }
        
        const now = Date.now();
        const shootCooldown = Math.max(0, attacker.shootCooldown - (now - attacker.lastShootTime));
        if (shootCooldown > 0) {
            console.log('Shoot Cooldown:', shootCooldown);
            return { success: false, message: `Перезарядка стрельбы: ${Math.ceil(shootCooldown/1000)}с` };
        }
        
        const distance = this.hexDistance(attacker.q, attacker.r, targetQ, targetR);
        if (distance > (attacker.range || 5)) {
            console.log('Distance too far:', distance);
            return { success: false, message: `Слишком далеко (${distance})` };
        }
        
        if (!this.hasLineOfSight(attacker.q, attacker.r, targetQ, targetR)) {
            console.log('No line of sight');
            return { success: false, message: "На пути стена или лес" };
        }
        
        attacker.lastShootTime = Date.now();
        
        // Ищем живого врага на клетке
        let target = this.getAllUnits().find(u => 
            u.active && u.team !== attacker.team && u.q === targetQ && u.r === targetR
        );
        
        const targetCell = this.cells.get(`${targetQ},${targetR}`);
        let damage = attacker.damage;
        let hitChance = 1.0;
        
        // Лес укрывает
        if (targetCell && targetCell.terrain === 'forest') {
            hitChance = 0.7;
            if (Math.random() > hitChance) {
                console.log('Missed due to forest');
                return {
                    success: true,
                    hit: false,
                    killed: false,
                    message: `🌳 Лес укрыл цель! Промах!`,
                    targetQ: targetQ,
                    targetR: targetR,
                    fromQ: attacker.q,
                    fromR: attacker.r,
                    attackerId: attacker.id
                };
            }
        }
        
        // Стрельба по стене (если нет живого врага)
        if (!target) {
            const wallDestroyed = this.damageWall(targetQ, targetR);
            console.log('Shot at wall, destroyed:', wallDestroyed);
            return {
                success: true,
                hit: false,
                wallDestroyed: wallDestroyed,
                message: wallDestroyed ? "🧱 Стена разрушена!" : "💨 Промах!",
                targetQ: targetQ,
                targetR: targetR,
                fromQ: attacker.q,
                fromR: attacker.r,
                attackerId: attacker.id
            };
        }
        
        // Попадание по врагу
        console.log(`Hit ${target.name} for ${damage} damage`);
        target.hp -= damage;
        
        if (target.hp <= 0) {
            target.active = false;
            attacker.kills++;
            console.log(`${target.name} destroyed!`);
            return {
                success: true,
                hit: true,
                killed: true,
                message: `💀 ${target.name} уничтожен!`,
                targetX: target.q,
                targetY: target.r,
                fromQ: attacker.q,
                fromR: attacker.r,
                attackerId: attacker.id
            };
        }
        
        return {
            success: true,
            hit: true,
            killed: false,
            message: `💥 Попадание в ${target.name}! -${damage} HP`,
            targetX: target.q,
            targetY: target.r,
            fromQ: attacker.q,
            fromR: attacker.r,
            attackerId: attacker.id
        };
    }
    
    botAction() {
        const player = this.getFirstPlayer();
        if (!player || !player.active) return [];
        
        const results = [];
        
        for (let enemy of this.enemies) {
            if (!enemy.active) continue;
            
            const cooldown = this.getRemainingCooldown(enemy.id);
            if (cooldown > 0) continue;
            
            const distance = this.hexDistance(enemy.q, enemy.r, player.q, player.r);
            
            if (distance <= 5 && Math.random() < 0.45) {
                const fromQ = enemy.q;
                const fromR = enemy.r;
                const result = this.shootAtCell(enemy.id, player.q, player.r);
                
                if (result) {
                    result.fromQ = fromQ;
                    result.fromR = fromR;
                    result.attackerId = enemy.id;
                    results.push(result);
                }
            } else if (Math.random() < 0.35) {
                const neighbors = this.getNeighbors(enemy.q, enemy.r);
                const validNeighbors = neighbors.filter(n => {
                    const occupied = this.getAllUnits().some(u => u.active && u.q === n.q && u.r === n.r);
                    const hasWall = this.isWall(n.q, n.r);
                    return !occupied && !hasWall;
                });
                
                if (validNeighbors.length > 0) {
                    const randomNeighbor = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
                    this.moveToCell(enemy.id, randomNeighbor.q, randomNeighbor.r);
                }
            }
        }
        
        return results;
    }
    
    getStateForPlayer(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return null;
        
        const visibleEnemies = this.enemies
            .filter(e => e.active)
            .map(e => e.toJSON());
        
        const visibleAllies = this.allies
            .filter(a => a.active)
            .map(a => a.toJSON());
        
        const visibleCells = [];
        const visibleWalls = [];
        const visibleBases = [];
        
        for (let [key, cell] of this.cells) {
            visibleCells.push({ q: cell.q, r: cell.r, terrain: cell.terrain });
            
            if (this.isWall(cell.q, cell.r)) {
                const wall = this.walls.get(key);
                visibleWalls.push({ q: cell.q, r: cell.r, hp: wall.hp, type: wall.type });
            }
            
            if (cell.hasBase) {
                visibleBases.push({ q: cell.q, r: cell.r, owner: cell.baseOwner, progress: cell.captureProgress || 0 });
            }
        }
        
        return {
            radius: this.radius,
            myTank: player.toJSON(),
            enemies: visibleEnemies,
            allies: visibleAllies,
            walls: visibleWalls,
            bases: visibleBases,
            cells: visibleCells,
            smokeEffects: [],
            visibleCells: visibleCells,
            lastActionTime: this.lastActionTime.get(player.id) || 0,
            gameOver: this.gameOver,
            winner: this.winner
        };
    }
    
    checkWinner() {
        let playerBaseCaptured = true;
        let enemyBaseCaptured = true;
        
        for (let [key, cell] of this.cells) {
            if (cell.hasBase) {
                if (cell.baseOwner === 'player') playerBaseCaptured = false;
                if (cell.baseOwner === 'enemy') enemyBaseCaptured = false;
            }
        }
        
        if (enemyBaseCaptured) {
            this.gameOver = true;
            this.winner = "ПОБЕДА! Все базы захвачены!";
            return true;
        }
        
        if (playerBaseCaptured) {
            this.gameOver = true;
            this.winner = "ПОРАЖЕНИЕ! Ваша база захвачена!";
            return true;
        }
        
        const aliveEnemies = this.enemies.filter(e => e.active);
        const aliveAllies = this.allies.filter(a => a.active);
        const alivePlayer = this.players.filter(p => p.active);
        
        if (aliveEnemies.length === 0 && (aliveAllies.length > 0 || alivePlayer.length > 0)) {
            this.gameOver = true;
            this.winner = "ПОБЕДА! Враги уничтожены!";
            return true;
        }
        
        if ((aliveAllies.length === 0 && alivePlayer.length === 0) && aliveEnemies.length > 0) {
            this.gameOver = true;
            this.winner = "ПОРАЖЕНИЕ! Все танки уничтожены!";
            return true;
        }
        
        return false;
    }
}

module.exports = { TankGame };
