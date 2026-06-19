// client/network/SocketClient.js

class SocketClient {
   constructor(options = {}) {
       this.url = options.url || window.location.origin;
       this.socket = null;
       this.isConnected = false;
       this.reconnectAttempts = 0;
       this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
       this.reconnectDelay = options.reconnectDelay || 1000;
       this.eventHandlers = new Map();
       this.isReconnecting = false;
   }
   
   // Подключиться
   connect() {
       if (this.socket && this.socket.connected) {
           console.log('🔄 Socket уже подключен');
           return Promise.resolve(this.socket);
       }
       
       return new Promise((resolve, reject) => {
           try {
               this.socket = io(this.url, {
                   transports: ['websocket', 'polling'],
                   reconnection: false
               });
               
               this.socket.on('connect', () => {
                   console.log('✅ Socket подключен');
                   this.isConnected = true;
                   this.reconnectAttempts = 0;
                   this.isReconnecting = false;
                   this._emitEvent('connect');
                   resolve(this.socket);
               });
               
               this.socket.on('connect_error', (error) => {
                   console.warn('⚠️ Ошибка подключения Socket:', error);
                   this.isConnected = false;
                   this._emitEvent('connect_error', error);
                   
                   // Попытка переподключения
                   if (!this.isReconnecting) {
                       this._attemptReconnect();
                   }
                   reject(error);
               });
               
               this.socket.on('disconnect', (reason) => {
                   console.warn('⚠️ Socket отключен:', reason);
                   this.isConnected = false;
                   this._emitEvent('disconnect', reason);
                   
                   if (reason !== 'io client disconnect') {
                       this._attemptReconnect();
                   }
               });
               
               // Проксируем все события через обработчики
               this.socket.onAny((event, ...args) => {
                   this._emitEvent(event, ...args);
               });
               
           } catch (error) {
               console.error('❌ Ошибка создания Socket:', error);
               reject(error);
           }
       });
   }
   
   // Попытка переподключения
   _attemptReconnect() {
       if (this.isReconnecting) return;
       
       this.isReconnecting = true;
       this.reconnectAttempts++;
       
       if (this.reconnectAttempts > this.maxReconnectAttempts) {
           console.error('❌ Превышено количество попыток переподключения');
           this.isReconnecting = false;
           this._emitEvent('reconnect_failed');
           return;
       }
       
       const delay = this.reconnectDelay * this.reconnectAttempts;
       console.log(`🔄 Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${delay}мс`);
       
       setTimeout(() => {
           this.connect().catch(() => {
               // Ошибка уже обработана в connect
               this.isReconnecting = false;
               this._attemptReconnect();
           });
       }, delay);
   }
   
   // Отключиться
   disconnect() {
       if (this.socket) {
           this.socket.disconnect();
           this.socket = null;
       }
       this.isConnected = false;
       this.isReconnecting = false;
       console.log('🔌 Socket отключен');
   }
   
   // Отправить событие
   emit(event, data) {
       if (!this.socket || !this.isConnected) {
           console.warn(`⚠️ Socket не подключен, событие "${event}" не отправлено`);
           return false;
       }
       
       this.socket.emit(event, data);
       return true;
   }
   
   // Подписаться на событие
   on(event, handler) {
       if (!this.eventHandlers.has(event)) {
           this.eventHandlers.set(event, []);
       }
       this.eventHandlers.get(event).push(handler);
       return this;
   }
   
   // Отписаться от события
   off(event, handler) {
       if (!this.eventHandlers.has(event)) return this;
       
       if (handler) {
           const handlers = this.eventHandlers.get(event);
           const index = handlers.indexOf(handler);
           if (index !== -1) {
               handlers.splice(index, 1);
           }
       } else {
           this.eventHandlers.delete(event);
       }
       return this;
   }
   
   // Отписаться от всех событий
   offAll() {
       this.eventHandlers.clear();
       return this;
   }
   
   // Вызвать обработчики события
   _emitEvent(event, ...args) {
       if (!this.eventHandlers.has(event)) return;
       
       const handlers = this.eventHandlers.get(event);
       for (const handler of handlers) {
           try {
               handler(...args);
           } catch (error) {
               console.error(`❌ Ошибка в обработчике события "${event}":`, error);
           }
       }
   }
   
   // Проверить подключение
   isConnected() {
       return this.isConnected && this.socket && this.socket.connected;
   }
   
   // Получить ID сокета
   getSocketId() {
       return this.socket ? this.socket.id : null;
   }
}

// Экспорт
if (typeof window !== 'undefined') {
   window.SocketClient = SocketClient;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { SocketClient };
}
