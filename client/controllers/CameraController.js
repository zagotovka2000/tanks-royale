// client/controllers/CameraController.js

const ClientConfig = require('../config/clientConfig.js');

class CameraController {
    constructor(scene) {
        this.scene = scene;
        this.camera = scene.cameras.main;
        this.zoom = ClientConfig.CAMERA.defaultZoom;
        this.minZoom = ClientConfig.CAMERA.minZoom;
        this.maxZoom = ClientConfig.CAMERA.maxZoom;
        this.zoomStep = ClientConfig.CAMERA.zoomStep;
        
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.cameraStartX = 0;
        this.cameraStartY = 0;
        
        this._setupControls();
    }
    
    // Настройка управления камерой
    _setupControls() {
        const self = this;
        
        // Колесико мыши - зум
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            const zoomFactor = deltaY > 0 ? -this.zoomStep : this.zoomStep;
            this.setZoom(this.zoom + zoomFactor);
        });
        
        // Перетаскивание
        this.scene.input.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown()) {
                this.isDragging = true;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.cameraStartX = this.camera.scrollX;
                this.cameraStartY = this.camera.scrollY;
            }
        });
        
        this.scene.input.on('pointermove', (pointer) => {
            if (this.isDragging && pointer.leftButtonDown()) {
                const dx = pointer.x - this.dragStartX;
                const dy = pointer.y - this.dragStartY;
                
                this.camera.scrollX = this.cameraStartX - dx / this.zoom;
                this.camera.scrollY = this.cameraStartY - dy / this.zoom;
            }
        });
        
        this.scene.input.on('pointerup', () => {
            this.isDragging = false;
        });
        
        // Клавиши для управления камерой
        this.scene.input.keyboard?.on('keydown', (event) => {
            switch (event.key) {
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
            }
        });
    }
    
    // Установить зум
    setZoom(value) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, value));
        this.camera.setZoom(this.zoom);
        this._updateUI();
    }
    
    // Увеличить
    zoomIn() {
        this.setZoom(this.zoom + this.zoomStep);
    }
    
    // Уменьшить
    zoomOut() {
        this.setZoom(this.zoom - this.zoomStep);
    }
    
    // Сбросить камеру
    reset() {
        this.setZoom(1);
        this.camera.scrollX = 0;
        this.camera.scrollY = 0;
    }
    
    // Центрировать на позиции
    centerOn(q, r, hexGrid) {
        if (!hexGrid) return;
        
        const pos = hexGrid.hexToPixel(q, r);
        this.camera.scrollX = pos.x - this.camera.width / 2 / this.zoom;
        this.camera.scrollY = pos.y - this.camera.height / 2 / this.zoom;
    }
    
    // Обновить UI
    _updateUI() {
        // Обновляем отображение зума
        const zoomText = document.getElementById('zoomValue');
        if (zoomText) {
            zoomText.textContent = (this.zoom * 100).toFixed(0) + '%';
        }
    }
    
    // Получить текущий зум
    getZoom() {
        return this.zoom;
    }
    
    // Проверить, перетаскивается ли камера
    isDragging() {
        return this.isDragging;
    }
    
    // Уничтожить
    destroy() {
        this.scene.input.off('wheel');
        this.scene.input.off('pointerdown');
        this.scene.input.off('pointermove');
        this.scene.input.off('pointerup');
        this.scene.input.keyboard?.off('keydown');
        this.scene = null;
        this.camera = null;
    }
}

// Экспорт
if (typeof window !== 'undefined') {
    window.CameraController = CameraController;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CameraController };
}
