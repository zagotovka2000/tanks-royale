// public/js/game/sounds.js
class SoundManager {
   constructor() {
       this.sounds = {};
       this.initialized = false;
   }
   
   async init() {
       console.log('🔊 Инициализация звуков...');
       
       try {
           const soundFiles = {
               shoot: '/sounds/shoot.mp3',
               explosion: '/sounds/explosion.mp3',
               miss: '/sounds/miss.mp3'
           };
           
           let loadedCount = 0;
           
           for (const [name, url] of Object.entries(soundFiles)) {
               try {
                   await this.loadSound(name, url);
                   loadedCount++;
                   console.log(`✅ Загружен звук: ${name} (${url})`);
               } catch (e) {
                   console.warn(`⚠️ Не загружен ${name}, пробуем .wav`);
                   const wavUrl = url.replace('.mp3', '.wav');
                   try {
                       await this.loadSound(name, wavUrl);
                       loadedCount++;
                       console.log(`✅ Загружен звук: ${name} (${wavUrl})`);
                   } catch (e2) {
                       console.warn(`❌ Не удалось загрузить ${name}`);
                   }
               }
           }
           
           if (loadedCount > 0) {
               this.initialized = true;
               console.log(`🔊 Звуки готовы (${loadedCount}/3)`);
           } else {
               console.warn('⚠️ Звуки не загружены, работаем без звука');
           }
       } catch (e) {
           console.error('Ошибка инициализации звуков:', e);
       }
   }
   
   loadSound(name, url) {
       return new Promise((resolve, reject) => {
           const audio = new Audio();
           audio.volume = 0.5;
           audio.preload = 'auto';
           
           audio.addEventListener('canplaythrough', () => {
               this.sounds[name] = audio;
               resolve(audio);
           });
           
           audio.addEventListener('error', (e) => {
               reject(e);
           });
           
           audio.src = url;
       });
   }
   
   play(soundName) {
       if (!this.initialized) return;
       const sound = this.sounds[soundName];
       if (!sound) return;
       sound.currentTime = 0;
       sound.play().catch(() => {});
   }
}

window.soundManager = new SoundManager();
