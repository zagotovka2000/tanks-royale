// public/js/renderers/ThreeDRenderer.js
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
       
       this.terrainColors = {
           plains: 0x4a8c3f,
           forest: 0x2d5a27,
           mountain: 0x8a7a6a,
           swamp: 0x5a6e3a,
           base: 0xc9a03d,
           arena: 0x6b4c3b
       };
   }
   
   init() {
       if (!this.container) {
           console.error('Container not found!');
           return false;
       }
       
       // Получаем реальные размеры родителя
       const parent = this.container.parentElement;
       const width = parent ? parent.clientWidth : 800;
       const height = 500;
       
       console.log('Setting size to:', width, 'x', height);
       
       // Устанавливаем размеры контейнера
       this.container.style.width = width + 'px';
       this.container.style.height = height + 'px';
       
       // Сцена
       this.scene = new THREE.Scene();
       this.scene.background = new THREE.Color(0x1a2a3a);
       
       // Камера
       this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
       this.camera.position.set(12, 14, 12);
       this.camera.lookAt(0, 0, 0);
       
       // Рендерер
       this.renderer = new THREE.WebGLRenderer({ antialias: true });
       this.renderer.setSize(width, height);
       this.renderer.shadowMap.enabled = true;
       this.container.appendChild(this.renderer.domElement);
       
       // Освещение
       const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
       this.scene.add(ambientLight);
       
       const dirLight = new THREE.DirectionalLight(0xffffff, 1);
       dirLight.position.set(10, 20, 5);
       dirLight.castShadow = true;
       this.scene.add(dirLight);
       
       const fillLight = new THREE.PointLight(0x4466cc, 0.3);
       fillLight.position.set(0, -5, 0);
       this.scene.add(fillLight);
       
       // Сетка для ориентира
       const gridHelper = new THREE.GridHelper(25, 20, 0x88aaff, 0x335588);
       gridHelper.position.y = -0.5;
       this.scene.add(gridHelper);
       
       this.isInitialized = true;
       this.animate();
       
       console.log('ThreeDRenderer initialized');
       return true;
   }
   
   hexTo3DPosition(q, r) {
       const x = (q + r/2) * this.hexSize * 1.8;
       const z = r * this.hexSize * 1.6;
       return { x: x, y: 0, z: z };
   }
   
   createHexagon(q, r, color) {
       const center = this.hexTo3DPosition(q, r);
       const geometry = new THREE.CylinderGeometry(this.hexSize, this.hexSize, 0.25, 6);
       const material = new THREE.MeshStandardMaterial({
           color: color,
           roughness: 0.5,
           metalness: 0.1
       });
       
       const mesh = new THREE.Mesh(geometry, material);
       mesh.position.set(center.x, -0.12, center.z);
       mesh.castShadow = true;
       mesh.receiveShadow = true;
       mesh.userData = { q, r };
       
       return mesh;
   }
   
   drawMap(gameState) {
       if (!this.isInitialized || !gameState) return;
       
       console.log('Drawing map, cells:', gameState.cells?.length);
       
       this.hexMeshes.forEach(mesh => {
           this.scene.remove(mesh);
       });
       this.hexMeshes.clear();
       
       const cells = gameState.cells || [];
       
       cells.forEach(cell => {
           let color = this.terrainColors.plains;
           if (cell.terrain === 'forest') color = this.terrainColors.forest;
           else if (cell.terrain === 'mountain') color = this.terrainColors.mountain;
           else if (cell.terrain === 'swamp') color = this.terrainColors.swamp;
           else if (cell.terrain === 'base') color = this.terrainColors.base;
           
           const hexMesh = this.createHexagon(cell.q, cell.r, color);
           this.scene.add(hexMesh);
           this.hexMeshes.set(`${cell.q},${cell.r}`, hexMesh);
       });
       
       console.log(`Drew ${this.hexMeshes.size} hexes`);
   }
   
   createTankModel(color) {
       const group = new THREE.Group();
       
       const bodyGeo = new THREE.BoxGeometry(0.6, 0.2, 0.7);
       const bodyMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.6 });
       const body = new THREE.Mesh(bodyGeo, bodyMat);
       body.position.y = 0;
       body.castShadow = true;
       group.add(body);
       
       const turretGeo = new THREE.CylinderGeometry(0.45, 0.5, 0.18, 8);
       const turretMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.7 });
       const turret = new THREE.Mesh(turretGeo, turretMat);
       turret.position.y = 0.18;
       turret.castShadow = true;
       group.add(turret);
       
       const barrelGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.55, 6);
       const barrelMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
       const barrel = new THREE.Mesh(barrelGeo, barrelMat);
       barrel.rotation.x = Math.PI / 2;
       barrel.position.set(0.4, 0.2, 0);
       barrel.castShadow = true;
       group.add(barrel);
       
       return group;
   }
   
   updateTanks(gameState) {
       if (!this.isInitialized || !gameState) return;
       
       this.tankMeshes.forEach((mesh, id) => {
           this.scene.remove(mesh);
       });
       this.tankMeshes.clear();
       
       const addTank = (unit, isPlayer) => {
           if (!unit.active) return;
           
           let color = 0xe94560;
           if (isPlayer) color = 0x4caf50;
           else if (unit.team === 'ally') color = 0x2196f3;
           
           const tank = this.createTankModel(color);
           const pos = this.hexTo3DPosition(unit.q, unit.r);
           tank.position.set(pos.x, 0.08, pos.z);
           
           let rotation = 0;
           switch(unit.direction) {
               case 'right': rotation = 0; break;
               case 'up': rotation = -Math.PI / 2; break;
               case 'left': rotation = Math.PI; break;
               case 'down': rotation = Math.PI / 2; break;
               case 'up-right': rotation = -Math.PI / 6; break;
               case 'down-right': rotation = Math.PI / 6; break;
           }
           tank.rotation.y = rotation;
           
           this.scene.add(tank);
           this.tankMeshes.set(unit.id, tank);
       };
       
       if (gameState.myTank) addTank(gameState.myTank, true);
       if (gameState.allies) gameState.allies.forEach(a => addTank(a, false));
       if (gameState.enemies) gameState.enemies.forEach(e => addTank(e, false));
   }
   
   highlightHex(q, r, color) {
       if (this.currentHighlight) {
           this.scene.remove(this.currentHighlight);
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
               if (onComplete) onComplete();
           }
       };
       requestAnimationFrame(animate);
   }
   
   addExplosionEffect(q, r) {
       const center = this.hexTo3DPosition(q, r);
       
       const geometry = new THREE.SphereGeometry(0.45, 8, 8);
       const material = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400 });
       const flash = new THREE.Mesh(geometry, material);
       flash.position.set(center.x, 0.25, center.z);
       this.scene.add(flash);
       
       setTimeout(() => this.scene.remove(flash), 150);
   }
   
   addMissEffect(q, r) {
       const center = this.hexTo3DPosition(q, r);
       
       const geometry = new THREE.SphereGeometry(0.2, 6, 6);
       const material = new THREE.MeshStandardMaterial({ color: 0xaa8866 });
       const dust = new THREE.Mesh(geometry, material);
       dust.position.set(center.x, 0.15, center.z);
       this.scene.add(dust);
       
       setTimeout(() => this.scene.remove(dust), 250);
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
       this.renderer.render(this.scene, this.camera);
       requestAnimationFrame(() => this.animate());
   }
}

window.ThreeDRenderer = ThreeDRenderer;
