// client/controllers/CameraController.js
// Обновленный контроллер камеры

class CameraController {
   constructor(scene) {
       this.scene = scene;
       this.camera = scene.cameras.main;
       this.zoom = 1;
       this.minZoom = 0.5;
       this.maxZoom = 2.0;
       this.zoomStep = 0.1;
       this.isDragging = false;
       this.dragStartX = 0;
       this.dragStartY = 0;
       this.cameraStartX = 0;
       this.cameraStartY = 0;
       this.zoomContainer = null;
       
       // Эффекты
       this.shakeIntensity = 0;
       this.shakeDuration = 0;
       this.shakeTimer = 0;
       this.originalX = 0;
       this.originalY = 0;
       
       // Сглаживание
       this.smoothScrollX = 0;
       this.smoothScrollY = 0;
       this.isSmoothScrolling = false;
       this.smoothTargetX = 0;
       this.smoothTargetY = 0;
       this.smoothSpeed = 0.08;
   }

   init() {
       console.log('📷 CameraController инициализирован');
       
       // Колесико мыши - зум
       this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
           const zoomFactor = 0.1;
           if (deltaY > 0) {
               this.setZoom(this.zoom - zoomFactor);
           } else {
               this.setZoom(this.zoom + zoomFactor);
           }
       });
       
       // Перетаскивание
       this.scene.input.on('pointerdown', (pointer) => {
           if (pointer.leftButtonDown()) {
               this.isDragging = true;
               this.dragStartX = pointer.x;
               this.dragStartY = pointer.y;
               this.cameraStartX = this.camera.scrollX;
               this.cameraStartY = this.camera.scrollY;
               // Останавливаем плавный скролл при ручном перетаскивании
               this.isSmoothScrolling = false;
           }
       });
       
       this.scene.input.on('pointermove', (pointer) => {
           if (this.isDragging && pointer.leftButtonDown()) {
               const dx = pointer.x - this.dragStartX;
               const dy = pointer.y - this.dragStartY;
               this.camera.scrollX = this.cameraStartX - dx / this.zoom;
               this.camera.scrollY = this.cameraStartY - dy / this.zoom;
               this.smoothScrollX = this.camera.scrollX;
               this.smoothScrollY = this.camera.scrollY;
           }
       });
       
       this.scene.input.on('pointerup', () => {
           this.isDragging = false;
       });
       
       // Клавиши
       if (this.scene.input.keyboard) {
           this.scene.input.keyboard.on('keydown', (event) => {
               switch(event.key) {
                   case '+':
                   case '=':
                       this.zoomIn();
                       break;
                   case '-':
                   case '_':
                       this.zoomOut();
                       break;
                   case 'r':
                   case 'R':
                       this.reset();
                       break;
                   case 'f':
                   case 'F':
                       this.focusOnCenter();
                       break;
               }
           });
       }
       
       // Кнопки зума в UI
       this.addZoomButtons();
       
       return this;
   }

   setZoom(value) {
       this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, value));
       this.camera.setZoom(this.zoom);
       this.updateUI();
   }

   zoomIn() {
       this.setZoom(this.zoom + this.zoomStep);
   }

   zoomOut() {
       this.setZoom(this.zoom - this.zoomStep);
   }

   reset() {
       this.setZoom(1);
       this.camera.scrollX = 0;
       this.camera.scrollY = 0;
       this.smoothScrollX = 0;
       this.smoothScrollY = 0;
       this.isSmoothScrolling = false;
       console.log('📷 Камера сброшена');
   }

   /**
    * Сфокусироваться на центре
    */
   focusOnCenter() {
       this.panTo(0, 0, 800);
   }

   /**
    * Эффект дрожания камеры
    */
   shake(intensity = 5, duration = 300) {
       this.shakeIntensity = intensity;
       this.shakeDuration = duration;
       this.shakeTimer = 0;
       this.originalX = this.camera.scrollX;
       this.originalY = this.camera.scrollY;
   }

   /**
    * Плавный переход к цели
    */
   panTo(x, y, duration = 1000) {
       this.isSmoothScrolling = false;
       this.scene.tweens.add({
           targets: this.camera,
           scrollX: x,
           scrollY: y,
           duration: duration,
           ease: 'Quadratic.InOut',
           onUpdate: () => {
               this.smoothScrollX = this.camera.scrollX;
               this.smoothScrollY = this.camera.scrollY;
           }
       });
   }

   /**
    * Плавный переход к цели (версия с зацикливанием)
    */
   smoothPanTo(x, y, duration = 1500) {
       this.isSmoothScrolling = true;
       this.smoothTargetX = x;
       this.smoothTargetY = y;
       
       // Запоминаем начальные позиции для плавного перехода
       if (!this.smoothStartX) {
           this.smoothStartX = this.camera.scrollX;
           this.smoothStartY = this.camera.scrollY;
       }
       this.smoothStartX = this.camera.scrollX;
       this.smoothStartY = this.camera.scrollY;
       this.smoothProgress = 0;
       this.smoothDuration = duration;
   }

   /**
    * Сфокусироваться на танке
    */
   focusOnTank(q, r, hexGrid) {
       const pos = hexGrid.hexToPixel(q, r);
       this.panTo(
           pos.x - this.camera.width / 2,
           pos.y - this.camera.height / 2,
           800
       );
   }

   /**
    * Эффект "взрыва" камеры
    */
   explosionShake(intensity = 10, duration = 500) {
       this.shake(intensity, duration);
   }

   /**
    * Обновление камеры (вызывается каждый кадр)
    */
   update(time, delta) {
       // Обработка дрожания
       if (this.shakeDuration > 0) {
           this.shakeTimer += delta;
           const progress = this.shakeTimer / this.shakeDuration;
           
           if (progress < 1) {
               const intensity = this.shakeIntensity * (1 - progress);
               const offsetX = (Math.random() - 0.5) * intensity * 2;
               const offsetY = (Math.random() - 0.5) * intensity * 2;
               this.camera.scrollX = this.originalX + offsetX;
               this.camera.scrollY = this.originalY + offsetY;
           } else {
               this.camera.scrollX = this.originalX;
               this.camera.scrollY = this.originalY;
               this.shakeDuration = 0;
               this.shakeIntensity = 0;
           }
       }
       
       // Плавный скролл
       if (this.isSmoothScrolling) {
           this.smoothProgress += delta / this.smoothDuration;
           if (this.smoothProgress >= 1) {
               this.smoothProgress = 1;
               this.isSmoothScrolling = false;
           }
           
           // Интерполяция
           const t = this.easeInOutQuad(this.smoothProgress);
           const currentX = this.smoothStartX + (this.smoothTargetX - this.smoothStartX) * t;
           const currentY = this.smoothStartY + (this.smoothTargetY - this.smoothStartY) * t;
           
           this.camera.scrollX = currentX;
           this.camera.scrollY = currentY;
           this.smoothScrollX = currentX;
           this.smoothScrollY = currentY;
       }
   }

   /**
    * Функция плавности
    */
   easeInOutQuad(t) {
       return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
   }

   updateUI() {
       const zoomText = document.getElementById('zoomValue');
       if (zoomText) {
           zoomText.textContent = `${(this.zoom * 100).toFixed(0)}%`;
       }
   }

   addZoomButtons() {
       const self = this;
       
       const zoomContainer = document.createElement('div');
       zoomContainer.id = 'zoom-controls';
       zoomContainer.style.cssText = 
           'position: fixed; bottom: 100px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 1000;';
       document.body.appendChild(zoomContainer);
       
       // Кнопка зума +
       const zoomInBtn = document.createElement('button');
       zoomInBtn.textContent = '+';
       zoomInBtn.style.cssText = 
           'width: 50px; height: 50px; border-radius: 25px; border: none; background: rgba(0,0,0,0.7); color: white; font-size: 28px; cursor: pointer; backdrop-filter: blur(5px); transition: transform 0.1s; user-select: none;';
       zoomInBtn.onmouseover = () => { zoomInBtn.style.transform = 'scale(1.1)'; };
       zoomInBtn.onmouseout = () => { zoomInBtn.style.transform = 'scale(1)'; };
       zoomInBtn.onmousedown = () => { zoomInBtn.style.transform = 'scale(0.9)'; };
       zoomInBtn.onmouseup = () => { zoomInBtn.style.transform = 'scale(1)'; };
       zoomInBtn.onclick = () => { self.zoomIn(); };
       zoomContainer.appendChild(zoomInBtn);
       
       // Индикатор зума
       const zoomIndicator = document.createElement('div');
       zoomIndicator.id = 'zoomValue';
       zoomIndicator.textContent = '100%';
       zoomIndicator.style.cssText = 
           'text-align: center; color: white; font-size: 12px; font-family: Arial, sans-serif; text-shadow: 0 0 10px rgba(0,0,0,0.8); padding: 2px 0;';
       zoomContainer.appendChild(zoomIndicator);
       
       // Кнопка зума -
       const zoomOutBtn = document.createElement('button');
       zoomOutBtn.textContent = '−';
       zoomOutBtn.style.cssText = 
           'width: 50px; height: 50px; border-radius: 25px; border: none; background: rgba(0,0,0,0.7); color: white; font-size: 28px; cursor: pointer; backdrop-filter: blur(5px); transition: transform 0.1s; user-select: none;';
       zoomOutBtn.onmouseover = () => { zoomOutBtn.style.transform = 'scale(1.1)'; };
       zoomOutBtn.onmouseout = () => { zoomOutBtn.style.transform = 'scale(1)'; };
       zoomOutBtn.onmousedown = () => { zoomOutBtn.style.transform = 'scale(0.9)'; };
       zoomOutBtn.onmouseup = () => { zoomOutBtn.style.transform = 'scale(1)'; };
       zoomOutBtn.onclick = () => { self.zoomOut(); };
       zoomContainer.appendChild(zoomOutBtn);
       
       // Кнопка сброса
       const resetBtn = document.createElement('button');
       resetBtn.textContent = '⟲';
       resetBtn.style.cssText = 
           'width: 50px; height: 50px; border-radius: 25px; border: none; background: rgba(0,0,0,0.7); color: #ff9800; font-size: 24px; cursor: pointer; backdrop-filter: blur(5px); margin-top: 5px; transition: transform 0.1s; user-select: none;';
       resetBtn.onmouseover = () => { resetBtn.style.transform = 'scale(1.1)'; };
       resetBtn.onmouseout = () => { resetBtn.style.transform = 'scale(1)'; };
       resetBtn.onmousedown = () => { resetBtn.style.transform = 'scale(0.9)'; };
       resetBtn.onmouseup = () => { resetBtn.style.transform = 'scale(1)'; };
       resetBtn.onclick = () => { self.reset(); };
       zoomContainer.appendChild(resetBtn);
       
       // Кнопка фокуса
       const focusBtn = document.createElement('button');
       focusBtn.textContent = '⊙';
       focusBtn.style.cssText = 
           'width: 50px; height: 50px; border-radius: 25px; border: none; background: rgba(0,0,0,0.7); color: #4caf50; font-size: 24px; cursor: pointer; backdrop-filter: blur(5px); margin-top: 5px; transition: transform 0.1s; user-select: none;';
       focusBtn.onmouseover = () => { focusBtn.style.transform = 'scale(1.1)'; };
       focusBtn.onmouseout = () => { focusBtn.style.transform = 'scale(1)'; };
       focusBtn.onmousedown = () => { focusBtn.style.transform = 'scale(0.9)'; };
       focusBtn.onmouseup = () => { focusBtn.style.transform = 'scale(1)'; };
       focusBtn.onclick = () => { self.focusOnCenter(); };
       focusBtn.title = 'Сфокусироваться на центре';
       zoomContainer.appendChild(focusBtn);
       
       this.zoomContainer = zoomContainer;
       
       console.log('✅ Кнопки управления камерой добавлены');
   }

   /**
    * Установить границы камеры
    */
   setBounds(x, y, width, height) {
       this.camera.setBounds(x, y, width, height);
   }

   /**
    * Сбросить границы камеры
    */
   resetBounds() {
       this.camera.setBounds(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);
   }

   /**
    * Получить мировые координаты по позиции экрана
    */
   getWorldPosition(screenX, screenY) {
       return {
           x: this.camera.scrollX + screenX / this.zoom,
           y: this.camera.scrollY + screenY / this.zoom
       };
   }

   /**
    * Проверить, видима ли точка
    */
   isVisible(worldX, worldY, margin = 50) {
       const halfWidth = this.camera.width / 2 / this.zoom;
       const halfHeight = this.camera.height / 2 / this.zoom;
       const centerX = this.camera.scrollX + this.camera.width / 2 / this.zoom;
       const centerY = this.camera.scrollY + this.camera.height / 2 / this.zoom;
       
       return Math.abs(worldX - centerX) < halfWidth + margin &&
              Math.abs(worldY - centerY) < halfHeight + margin;
   }

   /**
    * Уничтожение контроллера
    */
   destroy() {
       // Удаляем обработчики ввода
       this.scene.input.off('wheel');
       this.scene.input.off('pointerdown');
       this.scene.input.off('pointermove');
       this.scene.input.off('pointerup');
       if (this.scene.input.keyboard) {
           this.scene.input.keyboard.off('keydown');
       }
       
       // Удаляем UI
       if (this.zoomContainer) {
           this.zoomContainer.remove();
           this.zoomContainer = null;
       }
       
       // Очищаем ссылки
       this.scene = null;
       this.camera = null;
       
       console.log('🧹 CameraController очищен');
   }
}

// Экспорт
if (typeof window !== 'undefined') {
   window.CameraController = CameraController;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { CameraController };
}
