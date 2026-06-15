class ThreeDRenderer {
   constructor(containerId) {
       this.container = document.getElementById(containerId);
       this.scene = null;
       this.camera = null;
       this.renderer = null;
       this.hexMeshes = new Map();
       this.tankMeshes = new Map();
       this.isInitialized = false;
       this.hexSize = 0.7;
       this.currentHighlight = null;
       this.lastRenderTime = 0;
       this.renderThrottle = 33; // ~30 FPS для обновлений
       
       this.terrainColors = {
           plains: 0x4a8c3f,
           forest: 0x2d5a27,
           mountain: 0x8a7a6a,
           swamp: 0x5a6e3a,
           base: 0xc9a03d,
           arena: 0x6b4c3b,
           edge: 0x3a5a3a
       };
   }
   
   init() {
       if (!this.container) {
           console.error('Container not found!');
           return false;
       }
       
       // Получаем реальные размеры
       const parent = this.container.parentElement;
       const width = parent ? parent.clientWidth : 800;
       const height = parent ? parent.clientHeight : 500;
       
       console.log('ThreeDRenderer initializing with size:', width, 'x', height);
       
       // Устанавливаем размеры контейнера
       this.container.style.width = '100%';
       this.container.style.height = '100%';
       
       // Сцена
       this.scene = new THREE.Scene();
       this.scene.background = new THREE.Color(0x1a2a3a);
       this.scene.fog = new THREE.FogExp2(0x1a2a3a, 0.008); // Туман для оптимизации
       
       // Камера
       this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
       this.camera.position.set(12, 14, 12);
       this.camera.lookAt(0, 0, 0);
       
       // Рендерер с оптимизациями
       this.renderer = new THREE.WebGLRenderer({ 
           antialias: true, 
           powerPreference: "high-performance" 
       });
       this.renderer.setSize(width, height);
       this.renderer.setPixelRatio(window.devicePixelRatio);
       this.renderer.shadowMap.enabled = true;
       this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
       this.container.appendChild(this.renderer.domElement);
       
       // Освещение
       const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
       this.scene.add(ambientLight);
       
       const dirLight = new THREE.DirectionalLight(0xffffff, 1);
       dirLight.position.set(10, 20, 5);
       dirLight.castShadow = true;
       dirLight.receiveShadow = true;
       dirLight.shadow.mapSize.width = 1024;
       dirLight.shadow.mapSize.height = 1024;
       this.scene.add(dirLight);
       
       const fillLight = new THREE.PointLight(0x4466cc, 0.3);
       fillLight.position.set(0, 10, 0);
       this.scene.add(fillLight);
       
       const backLight = new THREE.PointLight(0xffaa66, 0.2);
       backLight.position.set(-5, 5, -8);
       this.scene.add(backLight);
       
       // Сетка для ориентира
       const gridHelper = new THREE.GridHelper(25, 20, 0x88aaff, 0x335588);
       gridHelper.position.y = -0.5;
       this.scene.add(gridHelper);
       
       this.isInitialized = true;
       
       // Запуск анимации
       this.animate();
       
       // Обработка изменения размера окна
       window.addEventListener('resize', () => this.onWindowResize());
       
       console.log('ThreeDRenderer initialized successfully');
       return true;
   }
   
   onWindowResize() {
       if (!this.container || !this.camera || !this.renderer) return;
       
       const width = this.container.clientWidth;
       const height = this.container.clientHeight;
       
       this.camera.aspect = width / height;
       this.camera.updateProjectionMatrix();
       this.renderer.setSize(width, height);
   }
   
   hexTo3DPosition(q, r) {
       return HexUtils.to3DPosition(q, r, this.hexSize);
   }
   
   createHexagon(q, r, color) {
       const center = this.hexTo3DPosition(q, r);
       const geometry = new THREE.CylinderGeometry(this.hexSize, this.hexSize, 0.25, 6);
       const material = new THREE.MeshStandardMaterial({
           color: color,
           roughness: 0.5,
           metalness: 0.1,
           flatShading: false
       });
       
       const mesh = new THREE.Mesh(geometry, material);
       mesh.position.set(center.x, -0.12, center.z);
       mesh.castShadow = true;
       mesh.receiveShadow = true;
       mesh.userData = { q, r };
       
       return mesh;
   }
   
   drawMap(gameState) {
       // Проверки безопасности
       if (!this.isInitialized) {
           console.warn('drawMap: Renderer not initialized');
           return false;
       }
       
       if (!gameState) {
           console.warn('drawMap: No gameState provided');
           return false;
       }
       
       if (!gameState.cells || !Array.isArray(gameState.cells)) {
           console.warn('drawMap: Invalid gameState.cells', gameState.cells);
           return false;
       }
       
       console.log(`Drawing map with ${gameState.cells.length} cells`);
       
       // Удаляем старые меши
       this.hexMeshes.forEach(mesh => {
           if (mesh && this.scene) {
               this.scene.remove(mesh);
           }
       });
       this.hexMeshes.clear();
       
       // Создаем новые меши
       let createdCount = 0;
       gameState.cells.forEach(cell => {
           if (!cell || typeof cell.q === 'undefined' || typeof cell.r === 'undefined') {
               return;
           }
           
           let color = this.terrainColors.plains;
           if (cell.terrain === 'forest') color = this.terrainColors.forest;
           else if (cell.terrain === 'mountain') color = this.terrainColors.mountain;
           else if (cell.terrain === 'swamp') color = this.terrainColors.swamp;
           else if (cell.terrain === 'base') color = this.terrainColors.base;
           else if (cell.terrain === 'arena') color = this.terrainColors.arena;
           else if (cell.terrain === 'edge') color = this.terrainColors.edge;
           
           const hexMesh = this.createHexagon(cell.q, cell.r, color);
           this.scene.add(hexMesh);
           this.hexMeshes.set(`${cell.q},${cell.r}`, hexMesh);
           createdCount++;
       });
       
       console.log(`Drew ${createdCount} hexes`);
       return true;
   }
   
   createTankModel(color) {
       const group = new THREE.Group();
       
       // Тело танка
       const bodyGeo = new THREE.BoxGeometry(0.6, 0.2, 0.7);
       const bodyMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.6, roughness: 0.3 });
       const body = new THREE.Mesh(bodyGeo, bodyMat);
       body.position.y = 0;
       body.castShadow = true;
       body.receiveShadow = true;
       group.add(body);
       
       // Башня
       const turretGeo = new THREE.CylinderGeometry(0.45, 0.5, 0.18, 8);
       const turretMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.7, roughness: 0.2 });
       const turret = new THREE.Mesh(turretGeo, turretMat);
       turret.position.y = 0.18;
       turret.castShadow = true;
       group.add(turret);
       
       // Ствол
       const barrelGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.55, 6);
       const barrelMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 });
       const barrel = new THREE.Mesh(barrelGeo, barrelMat);
       barrel.rotation.x = Math.PI / 2;
       barrel.position.set(0.4, 0.2, 0);
       barrel.castShadow = true;
       group.add(barrel);
       
       // Гусеницы (детали)
       const trackGeo = new THREE.BoxGeometry(0.7, 0.1, 0.2);
       const trackMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.3 });
       const leftTrack = new THREE.Mesh(trackGeo, trackMat);
       leftTrack.position.set(-0.35, 0, 0.25);
       leftTrack.castShadow = true;
       group.add(leftTrack);
       
       const rightTrack = new THREE.Mesh(trackGeo, trackMat);
       rightTrack.position.set(0.35, 0, 0.25);
       rightTrack.castShadow = true;
       group.add(rightTrack);
       
       return group;
   }
   
   updateTanks(gameState) {
       if (!this.isInitialized) {
           console.warn('updateTanks: Renderer not initialized');
           return false;
       }
       
       if (!gameState) {
           console.warn('updateTanks: No gameState provided');
           return false;
       }
       
       // Throttle обновлений
       const now = Date.now();
       if (now - this.lastRenderTime < this.renderThrottle) {
           return false;
       }
       this.lastRenderTime = now;
       
       // Удаляем старые танки
       this.tankMeshes.forEach((mesh, id) => {
           if (mesh && this.scene) {
               this.scene.remove(mesh);
               // Очищаем ресурсы
               if (mesh.geometry) mesh.geometry.dispose();
               if (mesh.material) mesh.material.dispose();
           }
       });
       this.tankMeshes.clear();
       
       // Добавляем новые танки
       let addedCount = 0;
       
       const addTank = (unit, isPlayer) => {
           if (!unit || !unit.active) return;
           
           let color = 0xe94560; // Враги по умолчанию
           if (isPlayer) color = 0x4caf50;
           else if (unit.team === 'ally') color = 0x2196f3;
           else if (unit.team === 'enemy') color = 0xe94560;
           
           const tank = this.createTankModel(color);
           const pos = this.hexTo3DPosition(unit.q, unit.r);
           tank.position.set(pos.x, 0.08, pos.z);
           
           // Поворот танка в зависимости от направления
           let rotation = 0;
           switch(unit.direction) {
               case 'right': rotation = 0; break;
               case 'up-right': rotation = -Math.PI / 6; break;
               case 'up': rotation = -Math.PI / 2; break;
               case 'up-left': rotation = -Math.PI * 2/3; break;
               case 'left': rotation = Math.PI; break;
               case 'down-left': rotation = Math.PI * 2/3; break;
               case 'down': rotation = Math.PI / 2; break;
               case 'down-right': rotation = Math.PI / 6; break;
               default: rotation = 0;
           }
           tank.rotation.y = rotation;
           
           this.scene.add(tank);
           this.tankMeshes.set(unit.id, tank);
           addedCount++;
       };
       
       if (gameState.myTank) addTank(gameState.myTank, true);
       if (gameState.allies) gameState.allies.forEach(a => addTank(a, false));
       if (gameState.enemies) gameState.enemies.forEach(e => addTank(e, false));
       
       if (addedCount > 0) {
           console.log(`Updated ${addedCount} tanks`);
       }
       
       return true;
   }
   
   updateChangedTanks(gameState) {
       // Дифференциальное обновление - только изменившиеся танки
       if (!this.isInitialized || !gameState) return;
       
       const updateUnit = (unit, isPlayer) => {
           if (!unit) return;
           
           const existingMesh = this.tankMeshes.get(unit.id);
           if (existingMesh) {
               // Обновляем позицию существующего танка
               const pos = this.hexTo3DPosition(unit.q, unit.r);
               existingMesh.position.set(pos.x, 0.08, pos.z);
               
               // Обновляем поворот
               let rotation = 0;
               switch(unit.direction) {
                   case 'right': rotation = 0; break;
                   case 'up': rotation = -Math.PI / 2; break;
                   case 'left': rotation = Math.PI; break;
                   case 'down': rotation = Math.PI / 2; break;
                   case 'up-right': rotation = -Math.PI / 6; break;
                   case 'down-right': rotation = Math.PI / 6; break;
                   case 'up-left': rotation = -Math.PI * 2/3; break;
                   case 'down-left': rotation = Math.PI * 2/3; break;
               }
               existingMesh.rotation.y = rotation;
           } else {
               // Создаем новый танк
               let color = 0xe94560;
               if (isPlayer) color = 0x4caf50;
               else if (unit.team === 'ally') color = 0x2196f3;
               
               const tank = this.createTankModel(color);
               const pos = this.hexTo3DPosition(unit.q, unit.r);
               tank.position.set(pos.x, 0.08, pos.z);
               this.scene.add(tank);
               this.tankMeshes.set(unit.id, tank);
           }
       };
       
       if (gameState.myTank) updateUnit(gameState.myTank, true);
       if (gameState.allies) gameState.allies.forEach(a => updateUnit(a, false));
       if (gameState.enemies) gameState.enemies.forEach(e => updateUnit(e, false));
   }
   
   highlightHex(q, r, color) {
       if (this.currentHighlight) {
           this.scene.remove(this.currentHighlight);
           if (this.currentHighlight.geometry) {
               this.currentHighlight.geometry.dispose();
           }
       }
       
       const center = this.hexTo3DPosition(q, r);
       const geometry = new THREE.CylinderGeometry(this.hexSize + 0.08, this.hexSize + 0.08, 0.3, 6);
       const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
       const highlight = new THREE.Mesh(geometry, material);
       highlight.position.set(center.x, -0.1, center.z);
       this.scene.add(highlight);
       this.currentHighlight = highlight;
       
       setTimeout(() => {
           if (this.currentHighlight === highlight) {
               this.scene.remove(highlight);
               if (highlight.geometry) highlight.geometry.dispose();
               this.currentHighlight = null;
           }
       }, 2000);
   }
   
   addShotAnimation(fromQ, fromR, toQ, toR, onComplete) {
       const from = this.hexTo3DPosition(fromQ, fromR);
       const to = this.hexTo3DPosition(toQ, toR);
       
       const geometry = new THREE.SphereGeometry(0.12, 8, 8);
       const material = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff4400 });
       const projectile = new THREE.Mesh(geometry, material);
       projectile.position.set(from.x, 0.35, from.z);
       this.scene.add(projectile);
       
       const startTime = performance.now();
       const duration = 0.2;
       
       const animate = () => {
           const elapsed = (performance.now() - startTime) / 1000;
           const t = Math.min(1, elapsed / duration);
           
           const x = from.x + (to.x - from.x) * t;
           const z = from.z + (to.z - from.z) * t;
           const y = 0.35 + Math.sin(t * Math.PI) * 0.4;
           
           projectile.position.set(x, y, z);
           
           if (t < 1) {
               requestAnimationFrame(animate);
           } else {
               this.scene.remove(projectile);
               geometry.dispose();
               material.dispose();
               if (onComplete) onComplete();
           }
       };
       requestAnimationFrame(animate);
   }
   
   addExplosionEffect(q, r) {
       const center = this.hexTo3DPosition(q, r);
       
       // Взрывная вспышка
       const geometry = new THREE.SphereGeometry(0.45, 8, 8);
       const material = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400 });
       const flash = new THREE.Mesh(geometry, material);
       flash.position.set(center.x, 0.25, center.z);
       this.scene.add(flash);
       
       setTimeout(() => {
           this.scene.remove(flash);
           geometry.dispose();
           material.dispose();
       }, 150);
       
       // Частицы дыма
       for (let i = 0; i < 8; i++) {
           setTimeout(() => {
               const smokeGeo = new THREE.SphereGeometry(0.15, 4, 4);
               const smokeMat = new THREE.MeshStandardMaterial({ color: 0x666666, transparent: true, opacity: 0.6 });
               const smoke = new THREE.Mesh(smokeGeo, smokeMat);
               smoke.position.set(
                   center.x + (Math.random() - 0.5) * 0.5,
                   0.2 + Math.random() * 0.3,
                   center.z + (Math.random() - 0.5) * 0.5
               );
               this.scene.add(smoke);
               
               setTimeout(() => {
                   this.scene.remove(smoke);
                   smokeGeo.dispose();
                   smokeMat.dispose();
               }, 500);
           }, i * 30);
       }
   }
   
   addMissEffect(q, r) {
       const center = this.hexTo3DPosition(q, r);
       
       const geometry = new THREE.SphereGeometry(0.2, 6, 6);
       const material = new THREE.MeshStandardMaterial({ color: 0xaa8866, emissive: 0x664422 });
       const dust = new THREE.Mesh(geometry, material);
       dust.position.set(center.x, 0.15, center.z);
       this.scene.add(dust);
       
       setTimeout(() => {
           this.scene.remove(dust);
           geometry.dispose();
           material.dispose();
       }, 250);
   }
   
   zoomIn() {
       if (this.camera.position.y > 6) {
           this.camera.position.y -= 1;
           this.camera.position.z -= 1;
           this.camera.lookAt(0, 0, 0);
       }
   }
   
   zoomOut() {
       if (this.camera.position.y < 25) {
           this.camera.position.y += 1;
           this.camera.position.z += 1;
           this.camera.lookAt(0, 0, 0);
       }
   }
   
   resetZoom() {
       this.camera.position.set(12, 14, 12);
       this.camera.lookAt(0, 0, 0);
   }
   
   animate() {
       if (!this.isInitialized) return;
       requestAnimationFrame(() => this.animate());
       this.renderer.render(this.scene, this.camera);
   }
   
   dispose() {
       // Очистка ресурсов
       this.hexMeshes.forEach(mesh => {
           if (mesh.geometry) mesh.geometry.dispose();
           if (mesh.material) mesh.material.dispose();
       });
       this.tankMeshes.forEach(mesh => {
           if (mesh.geometry) mesh.geometry.dispose();
           if (mesh.material) mesh.material.dispose();
       });
       this.renderer.dispose();
   }
}

if (typeof window !== 'undefined') {
   window.ThreeDRenderer = ThreeDRenderer;
}
