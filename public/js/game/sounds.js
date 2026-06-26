class SoundManager {
   constructor() {
       this.sounds = {};
       this.initialized = false;
       this.enabled = true;
       this.volume = 0.5;
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
           const loadPromises = [];
           
           for (const [name, url] of Object.entries(soundFiles)) {
               loadPromises.push(
                   this.loadSound(name, url).then(() => {
                       loadedCount++;
                       console.log(`✅ Загружен звук: ${name}`);
                   }).catch(() => {
                       console.warn(`⚠️ Не удалось загрузить ${name}`);
                   })
               );
           }
           
           await Promise.allSettled(loadPromises);
           
           if (loadedCount > 0) {
               this.initialized = true;
               console.log(`🔊 Звуки готовы (${loadedCount}/3)`);
           } else {
               console.warn('⚠️ Звуки не загружены, работаем без звука');
               this.enabled = false;
           }
       } catch (e) {
           console.error('Ошибка инициализации звуков:', e);
           this.enabled = false;
       }
   }
   
   loadSound(name, url) {
       return new Promise((resolve, reject) => {
           const audio = new Audio();
           audio.volume = this.volume;
           audio.preload = 'auto';
           
           const timeout = setTimeout(() => {
               reject(new Error(`Timeout loading ${name}`));
           }, 5000);
           
           audio.addEventListener('canplaythrough', () => {
               clearTimeout(timeout);
               this.sounds[name] = audio;
               resolve(audio);
           }, { once: true });
           
           audio.addEventListener('error', (e) => {
               clearTimeout(timeout);
               reject(e);
           }, { once: true });
           
           audio.src = url;
           audio.load();
       });
   }
   
   play(soundName) {
       if (!this.initialized || !this.enabled) return;
       
       const sound = this.sounds[soundName];
       if (!sound) return;
       
       try {
           sound.currentTime = 0;
           const playPromise = sound.play();
           if (playPromise) {
               playPromise.catch(() => {
                   // Игнорируем ошибки автовоспроизведения
               });
           }
       } catch (e) {
           // Игнорируем
       }
   }
   
   setVolume(volume) {
       this.volume = Math.max(0, Math.min(1, volume));
       Object.values(this.sounds).forEach(sound => {
           sound.volume = this.volume;
       });
   }
   
   enable() {
       this.enabled = true;
   }
   
   disable() {
       this.enabled = false;
   }
}

window.soundManager = new SoundManager();
