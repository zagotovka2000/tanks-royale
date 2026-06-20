// server/config/serverConfig.js - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ

const path = require('path');

module.exports = {
    PORT: process.env.PORT || 3000,
    HOST: '0.0.0.0',
    
    PATHS: {
        root: path.join(__dirname, '..', '..'),
        public: path.join(__dirname, '..', '..', 'public'),
        client: path.join(__dirname, '..', '..', 'client'),
        assets: path.join(__dirname, '..', '..', 'public', 'assets')
    },
    
    SOCKET: {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true
    },
    
    GAME: {
        mapRadius: 10,
        moveCooldown: 1000,
        shootCooldown: 2500,
        botInterval: 1000,
        maxPlayers: 2,
        maxEnemies: 1
    },
    
    LOGGING: {
        level: process.env.LOG_LEVEL || 'info',
        prettyPrint: true
    }
};
