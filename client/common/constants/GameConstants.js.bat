// common/constants/GameConstants.js

const GameConstants = {
   // Размеры и карта
   MAP_RADIUS: 10,
   HEX_SIZE: 45,
   GRID_OFFSET: 0,
   
   // Кулдауны (в миллисекундах)
   COOLDOWNS: {
       MOVE: 1000,      // 1 секунда
       SHOOT: 2500,     // 2.5 секунды
       BOT_ACTION: 1000 // 1 секунда
   },
   
   // Характеристики танков
   TANK_STATS: {
       MEDIUM: {
           hp: 100,
           damage: 30,
           range: 5,
           size: 30,
           speed: 1
       },
       HEAVY: {
           hp: 150,
           damage: 25,
           range: 4,
           size: 34,
           speed: 0.7
       },
       LIGHT: {
           hp: 70,
           damage: 20,
           range: 6,
           size: 26,
           speed: 1.3
       }
   },
   
   // Цвета
   COLORS: {
       PLAYER: '#ffd93d',
       ENEMY: '#e94560',
       NEUTRAL: '#88ccff',
       TERRAIN: {
           PLAINS: 0x4a8c3f,
           BASE: 0xc9a03d,
           FOREST: 0x2d5a27,
           WATER: 0x2a6f8f
       },
       HIGHLIGHT: {
           MOVE: 0x44ff44,
           MOVE_CENTER: 0xffdd44,
           TARGET: 0xffeb3b,
           SHOOT: 0xff4444
       }
   },
   
   // Эффекты
   EFFECTS: {
       SHOT_DURATION: 250,
       EXPLOSION_DURATION: 400,
       SMOKE_DURATION: 2000,
       PARTICLE_COUNT: 15
   },
   
   // Камера
   CAMERA: {
       MIN_ZOOM: 0.5,
       MAX_ZOOM: 2.0,
       DEFAULT_ZOOM: 1.0,
       ZOOM_STEP: 0.1
   },
   
   // Сеть
   NETWORK: {
       RECONNECT_DELAY: 1000,
       MAX_RECONNECT_ATTEMPTS: 5,
       TIMEOUT: 3000,
       UPDATE_INTERVAL: 100
   },
   
   // Анимации
   ANIMATIONS: {
       MOVE_DURATION: 2000,
       SHOOT_FLASH: 150,
       BOUNCE_AMPLITUDE: 4,
       HEIGHT_AMPLITUDE: 3
   }
};

// Экспорт для Node.js и браузера
if (typeof module !== 'undefined' && module.exports) {
   module.exports = GameConstants;
}

if (typeof window !== 'undefined') {
   window.GameConstants = GameConstants;
}
