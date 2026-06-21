// client/scenes/BootScene.js - ДОПОЛНИТЕЛЬНОЕ ИСПРАВЛЕНИЕ

class BootScene extends Phaser.Scene {
   constructor() {
       super({ key: 'BootScene' });
       
       this.duplicatesRemoved = false;
       this.loadingComplete = false;
       this.gameSceneRegistered = false;
   }

   preload() {
       console.log('🔄 BootScene.preload() - Загрузка ресурсов...');
       
       this.checkAndRemoveDuplicateGameScene();
       
       // Показываем прогресс загрузки
       const progressBar = this.add.graphics();
       const progressBox = this.add.graphics();
       progressBox.fillStyle(0x222222, 0.8);
       progressBox.fillRoundedRect(
           this.cameras.main.width / 2 - 160,
           this.cameras.main.height / 2 - 30,
           320, 50, 10
       );
       
       const width = this.cameras.main.width;
       const height = this.cameras.main.height;
       
       const loadingText = this.add.text(width / 2, height / 2 - 60, 'Загрузка...', {
           fontSize: '24px',
           color: '#ffffff',
           fontStyle: 'bold'
       }).setOrigin(0.5);
       
       this.add.text(width / 2, height / 2 + 60, 'Tank Royale V2.0', {
           fontSize: '16px',
           color: '#88aacc',
           fontStyle: 'italic'
       }).setOrigin(0.5);
       
       this.load.on('progress', (value) => {
           progressBar.clear();
           progressBar.fillStyle(0x4caf50, 1);
           progressBar.fillRoundedRect(
               width / 2 - 150,
               height / 2 - 20,
               300 * value, 30, 8
           );
       });
       
       this.load.on('complete', () => {
           progressBar.destroy();
           progressBox.destroy();
           loadingText.destroy();
           this.loadingComplete = true;
           console.log('✅ Загрузка завершена');
           this.verifyGameScene();
       });
       
       // Имитация загрузки
       let progress = 0;
       const interval = setInterval(() => {
           progress += 0.05;
           if (progress >= 1) {
               progress = 1;
               clearInterval(interval);
               this.load.emit('complete');
               this.load.off('complete');
           }
           this.load.emit('progress', progress);
       }, 50);
   }

   checkAndRemoveDuplicateGameScene() {
       console.log('🔍 Проверка на дублирующиеся классы...');
       
       if (typeof window === 'undefined') return;
       
       const keys = Object.keys(window);
       let gameSceneCount = 0;
       
       for (const key of keys) {
           if (key === 'GameScene' && typeof window[key] === 'function') {
               gameSceneCount++;
           }
       }
       
       if (gameSceneCount > 1) {
           console.warn('⚠️ Обнаружены дублирующиеся определения GameScene!');
           for (const key of keys) {
               if (key === 'GameScene') {
                   delete window[key];
               }
           }
           // Восстанавливаем GameScene из локальной области
           if (typeof GameScene !== 'undefined') {
               window.GameScene = GameScene;
               console.log('✅ GameScene восстановлен из локальной области');
               this.duplicatesRemoved = true;
           }
       } else if (typeof window.GameScene === 'undefined' && typeof GameScene !== 'undefined') {
           window.GameScene = GameScene;
           console.log('✅ GameScene зарегистрирован в window');
       } else {
           console.log('✅ Дубликатов GameScene не найдено');
       }
   }

   verifyGameScene() {
       console.log('🔍 Проверка GameScene...');
       
       if (typeof window === 'undefined') {
           console.warn('⚠️ window не определен');
           return;
       }
       
       const GameSceneClass = window.GameScene;
       if (!GameSceneClass) {
           console.error('❌ GameScene не найден в window!');
           return;
       }
       
       if (typeof GameSceneClass !== 'function') {
           console.error('❌ GameScene не является функцией/классом!');
           return;
       }
       
       try {
           const instance = new GameSceneClass();
           if (typeof instance.create !== 'function') {
               console.warn('⚠️ У GameScene нет метода create');
           } else {
               console.log('✅ GameScene валиден (есть метод create)');
           }
       } catch (error) {
           console.error('❌ Ошибка при создании экземпляра GameScene:', error);
       }
       
       console.log('✅ Проверка GameScene завершена');
   }

   create() {
       console.log('🎮 BootScene.create() - Запуск игры...');
       
       // Проверяем наличие GameScene
       if (typeof window.GameScene === 'undefined') {
           console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: GameScene не найден!');
           this.showErrorAndReload('GameScene не найден. Перезагрузите страницу.');
           return;
       }
       
       // Проверяем регистрацию сцены в Phaser
       try {
           const sceneKeys = this.scene.keys ? Object.keys(this.scene.keys) : [];
           console.log('📋 Зарегистрированные сцены:', sceneKeys);
           
           if (!sceneKeys.includes('GameScene')) {
               console.log('🔧 Регистрируем GameScene...');
               // Проверяем, не зарегистрирована ли уже сцена с таким ключом
               if (!this.scene.get('GameScene')) {
                   this.scene.add('GameScene', window.GameScene, true);
                   this.gameSceneRegistered = true;
                   console.log('✅ GameScene зарегистрирован');
               } else {
                   console.log('✅ GameScene уже зарегистрирован');
                   this.gameSceneRegistered = true;
               }
           } else {
               console.log('✅ GameScene уже зарегистрирован');
               this.gameSceneRegistered = true;
           }
       } catch (error) {
           console.warn('⚠️ Ошибка проверки сцен:', error);
           try {
               if (!this.scene.get('GameScene')) {
                   this.scene.add('GameScene', window.GameScene, true);
                   this.gameSceneRegistered = true;
               }
           } catch (e) {
               console.error('❌ Не удалось зарегистрировать GameScene:', e);
               this.showErrorAndReload('Не удалось зарегистрировать игровую сцену.');
               return;
           }
       }
       
       // Запускаем игровую сцену
       console.log('🚀 Запуск GameScene...');
       try {
           // Проверяем, не запущена ли уже сцена
           if (!this.scene.isActive('GameScene')) {
               this.scene.start('GameScene');
               console.log('✅ GameScene запущена');
           } else {
               console.log('✅ GameScene уже активна');
           }
       } catch (error) {
           console.error('❌ Ошибка запуска GameScene:', error);
           this.showErrorAndReload('Не удалось запустить игру.');
       }
   }

   showErrorAndReload(message) {
       const width = this.cameras.main.width;
       const height = this.cameras.main.height;
       
       const bg = this.add.graphics();
       bg.fillStyle(0x441111, 0.9);
       bg.fillRect(0, 0, width, height);
       
       this.add.text(width / 2, height / 2 - 60, '❌ КРИТИЧЕСКАЯ ОШИБКА', {
           fontSize: '36px',
           color: '#ff4444',
           fontStyle: 'bold',
           stroke: '#000000',
           strokeThickness: 4
       }).setOrigin(0.5);
       
       this.add.text(width / 2, height / 2, message, {
           fontSize: '20px',
           color: '#ff8888'
       }).setOrigin(0.5);
       
       const reloadBtn = this.add.text(width / 2, height / 2 + 60, '🔄 Перезагрузить', {
           fontSize: '24px',
           color: '#4caf50',
           fontStyle: 'bold',
           backgroundColor: '#000000',
           padding: { x: 20, y: 10 }
       }).setOrigin(0.5).setInteractive({ useHandCursor: true });
       
       reloadBtn.on('pointerdown', () => {
           location.reload();
       });
   }

   shutdown() {
       this.load.off('progress');
       this.load.off('complete');
       console.log('🧹 BootScene очищена');
   }
}

// Экспорт
if (typeof window !== 'undefined') {
   window.BootScene = BootScene;
   console.log('✅ BootScene зарегистрирован в window');
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { BootScene };
}
