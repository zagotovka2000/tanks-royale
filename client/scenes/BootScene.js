// client/scenes/BootScene.js - ЗАГРУЗОЧНАЯ СЦЕНА (ИСПРАВЛЕННАЯ)

class BootScene extends Phaser.Scene {
   constructor() {
       super({ key: 'BootScene' });
       
       // Флаг для отслеживания состояния
       this.duplicatesRemoved = false;
       this.loadingComplete = false;
   }

   preload() {
       console.log('🔄 BootScene.preload() - Загрузка ресурсов...');
       
       // Проверяем и удаляем дублирующийся GameScene
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
       
       // Текст загрузки
       const loadingText = this.add.text(width / 2, height / 2 - 60, 'Загрузка...', {
           fontSize: '24px',
           color: '#ffffff',
           fontStyle: 'bold'
       }).setOrigin(0.5);
       
       // Версия
       this.add.text(width / 2, height / 2 + 60, 'Tank Royale V2.0', {
           fontSize: '16px',
           color: '#88aacc',
           fontStyle: 'italic'
       }).setOrigin(0.5);
       
       // Прогресс загрузки
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
           
           // Проверяем корректность GameScene
           this.verifyGameScene();
       });
       
       // ✅ ИСПРАВЛЕННАЯ ЗАГРУЗКА - используем setTimeout для имитации
       let progress = 0;
       const interval = setInterval(() => {
           progress += 0.05;
           if (progress >= 1) {
               progress = 1;
               clearInterval(interval);
               // Эмитируем событие завершения
               this.load.emit('complete');
               // Удаляем обработчик, чтобы не было дублирования
               this.load.off('complete');
           }
           this.load.emit('progress', progress);
       }, 50);
       
       // ✅ ЗАГРУЖАЕМ ЗВУКИ (если есть) - безопасно
       try {
           // Проверяем, есть ли звуки для загрузки
           // Если нет - пропускаем
           console.log('🔇 Звуки не загружены (продолжаем без звука)');
       } catch (e) {
           console.log('🔇 Звуки не загружены (продолжаем без звука)');
       }
   }

   /**
    * Проверка и удаление дублирующегося GameScene
    */
   checkAndRemoveDuplicateGameScene() {
       console.log('🔍 Проверка на дублирующиеся классы...');
       
       if (typeof window === 'undefined') return;
       
       // Проверяем, есть ли дубликат GameScene в window
       const keys = Object.keys(window);
       let duplicateCount = 0;
       let gameSceneRef = null;
       
       for (const key of keys) {
           if (key === 'GameScene' && typeof window[key] === 'function') {
               duplicateCount++;
               if (duplicateCount === 1) {
                   gameSceneRef = window[key];
               }
               if (duplicateCount > 1) {
                   console.warn(`⚠️ Найден дубликат GameScene (${duplicateCount})`);
               }
           }
       }
       
       // Если есть дубликаты, оставляем только последний
       if (duplicateCount > 1) {
           console.warn('⚠️ Обнаружены дублирующиеся определения GameScene!');
           console.warn('🔧 Удаляем дубликаты...');
           
           // Удаляем все определения GameScene
           for (const key of keys) {
               if (key === 'GameScene') {
                   delete window[key];
               }
           }
           
           // Восстанавливаем последнее определение
           if (gameSceneRef) {
               window.GameScene = gameSceneRef;
               console.log('✅ Дубликаты GameScene удалены');
               this.duplicatesRemoved = true;
           } else {
               console.error('❌ Не удалось восстановить GameScene');
           }
       } else {
           console.log('✅ Дубликатов GameScene не найдено');
       }
       
       // Если GameScene не зарегистрирован, пробуем найти его в локальной области
       if (typeof window.GameScene === 'undefined' && typeof GameScene !== 'undefined') {
           console.log('🔧 Регистрируем GameScene из локальной области');
           window.GameScene = GameScene;
           this.duplicatesRemoved = true;
       }
   }

   /**
    * Проверка корректности GameScene
    */
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
       
       // Проверяем, что GameScene является классом
       if (typeof GameSceneClass !== 'function') {
           console.error('❌ GameScene не является функцией/классом!');
           return;
       }
       
       // Проверяем, что у GameScene есть метод create
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
               console.warn('⚠️ GameScene не зарегистрирован в Phaser!');
               console.log('🔧 Регистрируем GameScene...');
               this.scene.add('GameScene', window.GameScene, true);
           } else {
               console.log('✅ GameScene зарегистрирован');
           }
       } catch (error) {
           console.warn('⚠️ Ошибка проверки сцен:', error);
           // Пробуем добавить сцену принудительно
           try {
               this.scene.add('GameScene', window.GameScene, true);
           } catch (e) {
               console.error('❌ Не удалось зарегистрировать GameScene:', e);
           }
       }
       
       // Переходим в игровую сцену
       console.log('🚀 Запуск GameScene...');
       try {
           this.scene.start('GameScene');
           console.log('✅ GameScene запущена');
       } catch (error) {
           console.error('❌ Ошибка запуска GameScene:', error);
           // Если не удалось запустить - создаем вручную
           try {
               this.scene.add('GameScene', window.GameScene);
               this.scene.start('GameScene');
           } catch (e) {
               console.error('❌ Критическая ошибка запуска:', e);
               this.showErrorAndReload('Не удалось запустить игру. Перезагрузите страницу.');
           }
       }
   }

   /**
    * Показать ошибку и предложить перезагрузку
    */
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

   /**
    * Обновление (вызывается каждый кадр)
    */
   update(time, delta) {
       // Дополнительная логика при необходимости
   }

   /**
    * Очистка сцены
    */
   shutdown() {
       // Очищаем события загрузки
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
