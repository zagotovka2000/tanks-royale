// client/config/clientConfig.js

const ClientConfig = {
   // Настройки Phaser
   PHASER: {
       type: Phaser.AUTO,
       backgroundColor: '#1a2a3a',
       scale: {
           mode: Phaser.Scale.RESIZE,
           autoCenter: Phaser.Scale.CENTER_BOTH
       },
       render: {
           pixelArt: false,
           antialias: true
       }
   },
   
   // Настройки сети
   NETWORK: {
       reconnectDelay: 1000,
       maxReconnectAttempts: 5,
       stateUpdateInterval: 100
   },
   
   // Настройки камеры
   CAMERA: {
       defaultZoom: 1.0,
       minZoom: 0.5,
       maxZoom: 2.0,
       zoomStep: 0.1,
       showButtons: true  // Показывать кнопки зума
   },
   
   // Настройки сетки
   GRID: {
       hexSize: 45,
       defaultColor: 0x4a8c3f,
       baseColor: 0xc9a03d
   },
   
   // Настройки танков
   TANK: {
       moveDuration: 2000,
       shootDuration: 300
   },
   
   // Настройки эффектов
   EFFECTS: {
       explosionParticles: 20,
       smokeDuration: 2000,
       trailDuration: 200
   },
   
   // Временные задержки (мс)
   DELAYS: {
       clickThrottle: 150,
       actionLock: 500,
       messageDisplay: 2500,
       animationTimeout: 3000
   },
   
   // Отладка
   DEBUG: {
       enabled: false,
       showFPS: false,
       showPositions: false
   }
};

// ✅ Единый экспорт
if (typeof window !== 'undefined') {
   window.ClientConfig = ClientConfig;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = ClientConfig;
}
