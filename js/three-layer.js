/* ======================================================================
   THREE.JS CUSTOM LAYER & 3D MODEL LOADER
   รองรับโมเดลอาคารแบบ Multi-model และซุ้มประตู 1-4 ผ่าน DRACOLoader
====================================================================== */


    function notifyModelLoaded(bid) {
      loaded3DBuildingIds.add(Number(bid));
      const loadedList = getLoaded3DBuildingIds();
      if (typeof map !== 'undefined' && map) {
        if (map.getLayer('buildings-3d')) {
          map.setFilter('buildings-3d', ['!', ['in', ['to-number', ['get', 'bid_id']], ['literal', loadedList]]]);
          map.setPaintProperty('buildings-3d', 'fill-extrusion-height', [
            'case',
            ['in', ['to-number', ['get', 'bid_id']], ['literal', loadedList]], 0,
            ['coalesce', ['to-number', ['get', 'height']], 3]
          ]);
        }
        if (map.getLayer('buildings-roof-line')) {
          map.setFilter('buildings-roof-line', ['!', ['in', ['to-number', ['get', 'bid_id']], ['literal', loadedList]]]);
        }
      }
    }

    function createCampus3DLayer() {
      // ใช้ Campus Center เป็นจุดอ้างอิงหลักที่เสถียร (Anchor Origin)
      const anchorCoords = CAMPUS_CENTER;
      let anchorMercator = maplibregl.MercatorCoordinate.fromLngLat(anchorCoords, 0);

      let anchorTransform = {
        translateX: anchorMercator.x,
        translateY: anchorMercator.y,
        translateZ: anchorMercator.z,
        rotateX: Math.PI / 2,
        rotateY: 0,
        rotateZ: 0,
        scale: anchorMercator.meterInMercatorCoordinateUnits()
      };

      return {
        id: 'campus-3d-models-layer',
        type: 'custom',
        renderingMode: '3d',

        onAdd: function (mapInstance, gl) {
          this.map = mapInstance;
          this.gl = gl;
          this.camera = new THREE.Camera();
          this.scene = new THREE.Scene();

          // 1) เพิ่มประสิทธิภาพ Raycaster: เปิด firstHitOnly และใช้ Proxy Bounding Box
          this.raycaster = new THREE.Raycaster();
          this.raycaster.firstHitOnly = true;

          this.buildingsContainer = new THREE.Group();
          this.scene.add(this.buildingsContainer);

          this.gatesContainer = new THREE.Group();
          this.scene.add(this.gatesContainer);

          this.loadedModels = new Map();     // bid_id -> THREE.Group
          this.loadedGates = new Map();      // gate_id -> THREE.Group
          this.loadingModels = new Set();
          this.raycastProxies = [];          // Lightweight Invisible Proxy Box Meshes for ultra-fast raycasting
          this.originalMaterials = new Map();

          this.selectedBid = null;
          this.hoveredBid = null;
          this.selectedGateId = null;
          this.hoveredGateId = null;

          // 2) แสงสภาพแวดล้อมที่สมดุลและเป็นธรรมชาติ ไม่จ้าหรือเรืองแสงพลาสติก
          const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
          this.scene.add(ambientLight);

          const sunLight = new THREE.DirectionalLight(0xfffaed, 0.85);
          sunLight.position.set(40, 70, 30);
          this.scene.add(sunLight);

          // 3) WebGLRenderer พร้อม ACESFilmicToneMapping ป้องกันสีฟุ้ง/ขาววาบ
          this.renderer = new THREE.WebGLRenderer({
            canvas: mapInstance.getCanvas(),
            context: gl,
            antialias: true
          });
          this.renderer.autoClear = false;
          if ('outputEncoding' in this.renderer && THREE.sRGBEncoding) {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
          }
          this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
          this.renderer.toneMappingExposure = 1.0;

          // 4) Single Shared Instance: LoadingManager + DRACOLoader + GLTFLoader
          this.loadingManager = new THREE.LoadingManager();
          this.dracoLoader = new THREE.DRACOLoader(this.loadingManager);
          this.dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
          this.dracoLoader.preload();

          this.gltfLoader = new THREE.GLTFLoader(this.loadingManager);
          this.gltfLoader.setDRACOLoader(this.dracoLoader);

          // 5) Progressive Queue: โหลดโมเดลแบบ Asynchronous รองรับ Concurrency เพื่อความรวดเร็ว
          this.loadQueue = [];
          this.activeLoads = 0;
          this.maxConcurrentLoads = 2;

          CUSTOM_MODELS_CONFIG.forEach(cfg => {
            if (cfg.preload) {
              this.queueBuildingLoad(cfg.bid_id);
            }
          });

          // 6) โหลดและวางตำแหน่งโมเดล 3D ประตู 1-4 โดยใช้ Single Shared Model (gate.glb) แบบ Instancing / Cloning
          this.loadGateModels();
        },

        // จัดคิวโหลดแบบ Progressive ไม่บล็อก UI
        queueBuildingLoad: function (bid) {
          const numBid = Number(bid);
          if (this.loadedModels.has(numBid) || this.loadingModels.has(numBid) || this.loadQueue.includes(numBid)) return;
          this.loadQueue.push(numBid);
          this.processQueue();
        },

        processQueue: function () {
          if (this.loadQueue.length === 0) return;
          while (this.activeLoads < this.maxConcurrentLoads && this.loadQueue.length > 0) {
            const nextBid = this.loadQueue.shift();
            this.activeLoads++;
            this.loadBuildingModel(nextBid, () => {
              this.activeLoads = Math.max(0, this.activeLoads - 1);
              setTimeout(() => this.processQueue(), 40);
            });
          }
        },

        // โหลดโมเดล 3D ประจำอาคาร (Progressive + Strip Glow + Proxy Mesh)
        loadBuildingModel: function (bid, onComplete) {
          const numBid = Number(bid);
          const cfg = getModelConfig(numBid);
          if (!cfg || this.loadedModels.has(numBid) || this.loadingModels.has(numBid)) {
            if (onComplete) onComplete();
            return;
          }

          this.loadingModels.add(numBid);

          const candidatePaths = [
            cfg.modelPath,
            cfg.fallbackModelPath,
            `./3D/bid_${numBid}.glb`,
            `./3d/bid_${numBid}.glb`,
            `./3D/${cfg.name}.glb`,
            `./3d/${cfg.name}.glb`
          ].filter(Boolean);

          const uniquePaths = [...new Set(candidatePaths)];
          let currentIdx = 0;

          const tryLoadNext = () => {
            if (currentIdx >= uniquePaths.length) {
              console.warn(`[3D] ไม่พบไฟล์ 3D สำหรับอาคาร #${numBid} (${cfg.name})`);
              this.loadingModels.delete(numBid);
              if (onComplete) onComplete();
              return;
            }

            const url = uniquePaths[currentIdx++];
            this.gltfLoader.load(
              url,
              (gltf) => {
                const model = gltf.scene;
                const bGroup = new THREE.Group();
                bGroup.userData = { bid_id: numBid, config: cfg };

                // ปรับแต่ง Material: ล้างแสงเรืองที่ไม่เป็นธรรมชาติ (Strip Glow) และปรับพื้นผิวด้าน Matte
                model.traverse((child) => {
                  if (child.isMesh) {
                    child.userData = { bid_id: numBid };
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach((mat) => {
                      if (!mat) return;
                      mat.side = THREE.DoubleSide;
                      if (mat.emissive) mat.emissive.setHex(0x000000); // ปิดแสงเรืองทั้งหมด
                      if (mat.roughness !== undefined) mat.roughness = 0.7; // ผิวด้าน Matte สมจริง
                      if (mat.metalness !== undefined) mat.metalness = 0.1; // ลดความมันวาวสะท้อนแสง
                      mat.needsUpdate = true;
                    });
                  }
                });

                // Auto-normalize และปรับขนาดโมเดลให้ตรงกับมิติโลกจริงในหน่วยเมตร
                const bbox = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                bbox.getSize(size);
                const center = new THREE.Vector3();
                bbox.getCenter(center);

                const dims = cfg.dimensions || {};
                const targetW = Number(dims.width || cfg.targetWidth || (size.x || 1));
                const targetD = Number(dims.depth || cfg.targetDepth || (size.z || 1));
                const targetH = Number(dims.height || cfg.targetHeight || (size.y || 1));
                const mult = Number(cfg.scaleMultiplier) || 1.0;

                const sx = ((size.x > 0.0001) ? (targetW / size.x) : 1) * mult;
                const sy = ((size.y > 0.0001) ? (targetH / size.y) : 1) * mult;
                const sz = ((size.z > 0.0001) ? (targetD / size.z) : 1) * mult;

                // วางกึ่งกลาง Footprint และวางแนบพื้นดิน (Y = 0) พอดี โดยชดเชย Scale ในแกน Y
                if (cfg.proportionalScale) {
                  const ps = ((size.x > 0.0001) ? (targetW / size.x) : 1) * mult;
                  model.scale.set(ps, ps, ps);
                  model.position.set(-center.x * ps, -bbox.min.y * ps, -center.z * ps);
                } else {
                  model.scale.set(sx, sy, sz);
                  model.position.set(-center.x * sx, -bbox.min.y * sy, -center.z * sz);
                }

                // หมุนโมเดลตามทิศ Heading + Rotation Offset ชดเชยองศา
                const heading = cfg.heading !== undefined ? Number(cfg.heading) : 26;
                const rotOffset = cfg.rotationDeg !== undefined ? Number(cfg.rotationDeg) : (Number(cfg.rotationOffsetDeg) || 0);
                const rad = ((90 - heading) + rotOffset) * (Math.PI / 180);
                bGroup.rotation.y = rad;

                // กำหนดตำแหน่ง Mercator Anchor
                let coords = cfg.coordinates;
                if (!coords && buildingsData && buildingsData.features) {
                  const f = buildingsData.features.find(ft => Number(ft.properties.bid_id) === numBid);
                  if (f) coords = getCentroid(f);
                }
                this.updateBuildingPosition(bGroup, coords || CAMPUS_CENTER);

                // สร้าง Invisible Low-Poly Proxy Box สำหรับ Raycasting โดยเฉพาะ (ลดคำนวณจากหลายหมื่นรูปเหลือ 1 กล่อง)
                const proxyGeo = new THREE.BoxGeometry(targetW, targetH, targetD);
                const proxyMat = new THREE.MeshBasicMaterial({ visible: false, wireframe: false });
                const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
                proxyMesh.position.set(0, targetH / 2, 0);
                proxyMesh.userData = { bid_id: numBid, isProxy: true };
                bGroup.add(proxyMesh);
                this.raycastProxies.push(proxyMesh);

                bGroup.add(model);
                this.buildingsContainer.add(bGroup);
                this.loadedModels.set(numBid, bGroup);
                this.loadingModels.delete(numBid);

                // ซ่อน Polygon เดิมเฉพาะเมื่อโมเดล 3D โหลดเสร็จและพร้อมแสดงผล 100%
                notifyModelLoaded(numBid);

                // ค่อยๆ Fade in โมเดล 3D เข้ามาอย่างนุ่มนวล
                let fadeStart = performance.now();
                const fadeDuration = 300;
                const fadeStep = () => {
                  const elapsed = performance.now() - fadeStart;
                  const progress = Math.min(elapsed / fadeDuration, 1.0);
                  model.traverse((c) => {
                    if (c.isMesh && !c.userData.isProxy && c.material) {
                      const mats = Array.isArray(c.material) ? c.material : [c.material];
                      mats.forEach(m => {
                        m.transparent = progress < 1.0;
                        m.opacity = progress;
                      });
                    }
                  });
                  if (this.map) this.map.triggerRepaint();
                  if (progress < 1.0) {
                    requestAnimationFrame(fadeStep);
                  }
                };
                requestAnimationFrame(fadeStep);

                console.log(`✅ โหลดโมเดล 3D อาคาร #${numBid} (${cfg.name}) สำเร็จ`);
                if (onComplete) onComplete();
              },
              undefined,
              (err) => {
                tryLoadNext();
              }
            );
          };

          tryLoadNext();
        },

        updateBuildingPosition: function (bGroup, coords) {
          if (!coords || !coords.length) return;
          const bid = bGroup.userData?.bid_id;
          const cfg = bGroup.userData?.config || getModelConfig(bid) || {};
          const bMercator = maplibregl.MercatorCoordinate.fromLngLat(coords, 0);
          const dx = (bMercator.x - anchorTransform.translateX) / anchorTransform.scale;
          const dz = (bMercator.y - anchorTransform.translateY) / anchorTransform.scale;

          const ox = Number(cfg.offsetX) || 0;
          const oy = Number(cfg.offsetY) || 0;
          const alt = Number(cfg.altitudeOffset !== undefined ? cfg.altitudeOffset : (cfg.altitude || 0));

          bGroup.position.set(dx + ox, alt, dz - oy);
        },

        setOffset: function (bid, { x, y, altitude } = {}) {
          const cfg = getModelConfig(bid);
          if (!cfg) return;
          if (x !== undefined) cfg.offsetX = Number(x);
          if (y !== undefined) cfg.offsetY = Number(y);
          if (altitude !== undefined) {
            cfg.altitudeOffset = Number(altitude);
            cfg.altitude = Number(altitude);
          }
          const bGroup = this.loadedModels.get(Number(bid));
          if (bGroup) {
            this.updateBuildingPosition(bGroup, cfg.coordinates);
            if (this.map) this.map.triggerRepaint();
          }
          console.log(`📍 อาคาร #${bid} (${cfg.name}): offsetX=${cfg.offsetX}m, offsetY=${cfg.offsetY}m, altitudeOffset=${cfg.altitudeOffset || 0}m`);
        },

        setRotation: function (bid, degOffset) {
          const cfg = getModelConfig(bid);
          if (!cfg) return;
          if (degOffset !== undefined) {
            cfg.rotationDeg = degOffset;
            cfg.rotationOffsetDeg = degOffset;
          }
          this.applyHeadingRotation(bid, degOffset);
          console.log(`🔄 อาคาร #${bid} (${cfg.name}): rotationDeg=${cfg.rotationDeg}°`);
        },

        ensureBuildingLoaded: function (bid) {
          const numBid = Number(bid);
          if (getModelConfig(numBid) && !this.loadedModels.has(numBid)) {
            // ดันขึ้นหน้าสุดของคิวเพื่อโหลดทันที
            const idx = this.loadQueue.indexOf(numBid);
            if (idx > -1) this.loadQueue.splice(idx, 1);
            this.loadQueue.unshift(numBid);
            if (!this.loadingModels.has(numBid)) {
              this.loadBuildingModel(numBid);
            } else {
              this.processQueue();
            }
          }
        },

        updateCentroid: function (bid, coords) {
          const cfg = getModelConfig(bid);
          if (cfg) cfg.coordinates = coords;
          const bGroup = this.loadedModels.get(Number(bid));
          if (bGroup) {
            this.updateBuildingPosition(bGroup, coords);
            if (this.map) this.map.triggerRepaint();
          }
        },

        applyHeadingRotation: function (bid, degOffset) {
          const targetBid = Number(bid || 11);
          const cfg = getModelConfig(targetBid);
          if (!cfg) return;
          if (degOffset !== undefined) {
            cfg.rotationDeg = degOffset;
            cfg.rotationOffsetDeg = degOffset;
          }
          const bGroup = this.loadedModels.get(cfg.bid_id);
          if (bGroup) {
            const heading = cfg.heading !== undefined ? Number(cfg.heading) : 26;
            const offset = cfg.rotationDeg !== undefined ? Number(cfg.rotationDeg) : (Number(cfg.rotationOffsetDeg) || 0);
            const rad = ((90 - heading) + offset) * (Math.PI / 180);
            bGroup.rotation.y = rad;
            if (this.map) this.map.triggerRepaint();
          }
        },

        setSelected: function (bid) {
          const nextBid = bid !== null ? Number(bid) : null;
          if (this.selectedBid === nextBid) return;
          this.selectedBid = nextBid;
          this.updateVisualState();
        },

        setHovered: function (bid) {
          const targetBid = bid !== null ? Number(bid) : null;
          if (this.hoveredBid === targetBid) return;
          this.hoveredBid = targetBid;
          this.updateVisualState();
        },

        setSelectedGate: function (gateId) {
          if (this.selectedGateId === gateId) return;
          this.selectedGateId = gateId;
          this.updateVisualState();
        },

        setHoveredGate: function (gateId) {
          if (this.hoveredGateId === gateId) return;
          this.hoveredGateId = gateId;
          this.updateVisualState();
        },

        // โหลดและสร้างโมเดลซุ้มประตู 1-4 โดยใช้ single shared asset (gate.glb) แบบ Instancing / Cloning
        loadGateModels: function () {
          const candidatePaths = [
            './3D/gate.glb',
            './3d/gate.glb',
            '3D/gate.glb',
            '3d/gate.glb'
          ];
          let currentIdx = 0;

          const tryLoadGate = () => {
            if (currentIdx >= candidatePaths.length) {
              console.warn('[3D Gate] ไม่พบไฟล์ gate.glb ในไดเรกทอรี 3D หรือ 3d');
              return;
            }
            const url = candidatePaths[currentIdx++];
            this.gltfLoader.load(
              url,
              (gltf) => {
                const gateTemplate = gltf.scene;
                this.initGatesFromTemplate(gateTemplate);
              },
              undefined,
              (err) => {
                console.warn(`[3D Gate] โหลด ${url} ไม่สำเร็จ:`, err);
                tryLoadGate();
              }
            );
          };

          tryLoadGate();
        },

        initGatesFromTemplate: function (gateTemplate) {
          if (!gateTemplate || !GATES_CONFIG.length) return;

          GATES_CONFIG.forEach(gateCfg => {
            const gateGroup = new THREE.Group();
            gateGroup.userData = { gate_id: gateCfg.id, gateConfig: gateCfg, isGate: true };

            // Clone the template model using gateTemplate.clone(true)
            const gateModel = gateTemplate.clone(true);

            // ปรับแต่ง Material: ล้างแสงเรืองที่ไม่เป็นธรรมชาติ (Anti-glow fix) และปรับผิวด้าน Matte
            // Clone Material เพื่อให้แต่ละประตูสามารถไฮไลต์หรือเปลี่ยนสถานะได้อย่างอิสระ
            gateModel.traverse((child) => {
              if (child.isMesh) {
                child.userData = { gate_id: gateCfg.id, isGate: true };
                if (child.material) {
                  if (Array.isArray(child.material)) {
                    child.material = child.material.map(m => {
                      const cloned = m.clone();
                      cloned.side = THREE.DoubleSide;
                      if (cloned.emissive) cloned.emissive.setHex(0x000000);
                      if (cloned.roughness !== undefined) cloned.roughness = 0.7;
                      if (cloned.metalness !== undefined) cloned.metalness = 0.1;
                      cloned.needsUpdate = true;
                      return cloned;
                    });
                  } else {
                    child.material = child.material.clone();
                    child.material.side = THREE.DoubleSide;
                    if (child.material.emissive) child.material.emissive.setHex(0x000000);
                    if (child.material.roughness !== undefined) child.material.roughness = 0.7;
                    if (child.material.metalness !== undefined) child.material.metalness = 0.1;
                    child.material.needsUpdate = true;
                  }
                }
              }
            });

            // Auto-normalize และปรับขนาดโมเดลให้ตรงกับมิติโลกจริงในหน่วยเมตร ผ่าน THREE.Box3
            const bbox = new THREE.Box3().setFromObject(gateModel);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            const center = new THREE.Vector3();
            bbox.getCenter(center);

            const dims = gateCfg.dimensions || { width: 10, depth: 2, height: 5 };
            const targetW = Number(dims.width || 10);
            const targetD = Number(dims.depth || 2);
            const targetH = Number(dims.height || 5);

            const sx = size.x > 0.0001 ? (targetW / size.x) : 1;
            const sy = size.y > 0.0001 ? (targetH / size.y) : 1;
            const sz = size.z > 0.0001 ? (targetD / size.z) : 1;
            gateModel.scale.set(sx, sy, sz);

            // ปรับให้อยู่กึ่งกลางฐาน footprint และวางแนบพื้นดิน (Y = 0) พอดี ไม่จมดิน
            gateModel.position.set(-center.x * sx, -bbox.min.y * sy, -center.z * sz);

            // หมุนโมเดลตามทิศ Heading + Rotation Offset ชดเชยองศา
            const heading = gateCfg.heading !== undefined ? Number(gateCfg.heading) : 26;
            const rotOffset = gateCfg.rotationDeg !== undefined ? Number(gateCfg.rotationDeg) : 0;
            const rad = ((90 - heading) + rotOffset) * (Math.PI / 180);
            gateGroup.rotation.y = rad;

            // กำหนดตำแหน่ง Mercator Anchor
            const coords = gateCfg.coords || gateCfg.coordinates;
            const gMercator = maplibregl.MercatorCoordinate.fromLngLat(coords, 0);
            const dx = (gMercator.x - anchorTransform.translateX) / anchorTransform.scale;
            const dz = (gMercator.y - anchorTransform.translateY) / anchorTransform.scale;
            const alt = Number(gateCfg.altitudeOffset || 0);
            gateGroup.position.set(dx, alt, dz);

            // สร้าง Invisible Low-Poly Proxy Box สำหรับ Raycasting โดยเฉพาะ
            const proxyGeo = new THREE.BoxGeometry(targetW, targetH, targetD);
            const proxyMat = new THREE.MeshBasicMaterial({ visible: false, wireframe: false });
            const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
            proxyMesh.position.set(0, targetH / 2, 0);
            proxyMesh.userData = { gate_id: gateCfg.id, isProxy: true, isGate: true };
            gateGroup.add(proxyMesh);
            this.raycastProxies.push(proxyMesh);

            gateGroup.add(gateModel);
            this.gatesContainer.add(gateGroup);
            this.loadedGates.set(gateCfg.id, gateGroup);

            console.log(`✅ ติดตั้งโมเดล 3D ซุ้มประตู #${gateCfg.id} (${gateCfg.name}) สำเร็จ`);
          });

          if (this.map) this.map.triggerRepaint();
        },

        updateVisualState: function () {
          let needsRepaint = false;

          // ไฮไลต์อาคาร
          this.loadedModels.forEach((bGroup, bid) => {
            const isSelected = this.selectedBid === bid;
            const isHovered = this.hoveredBid === bid && !isSelected;

            bGroup.traverse((child) => {
              if (child.isMesh && !child.userData.isProxy && child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach(m => {
                  if (!m || !m.emissive) return;
                  if (isSelected) {
                    m.emissive.setHex(0x5a3e00);
                    m.emissiveIntensity = 0.5;
                    needsRepaint = true;
                  } else if (isHovered) {
                    m.emissive.setHex(0x222833);
                    m.emissiveIntensity = 0.35;
                    needsRepaint = true;
                  } else {
                    m.emissive.setHex(0x000000);
                    m.emissiveIntensity = 0.0;
                    needsRepaint = true;
                  }
                });
              }
            });
          });

          // ไฮไลต์ซุ้มประตู 1-4
          this.loadedGates.forEach((gGroup, gateId) => {
            const isSelected = this.selectedGateId === gateId;
            const isHovered = this.hoveredGateId === gateId && !isSelected;

            gGroup.traverse((child) => {
              if (child.isMesh && !child.userData.isProxy && child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach(m => {
                  if (!m || !m.emissive) return;
                  if (isSelected) {
                    m.emissive.setHex(0x5a3e00);
                    m.emissiveIntensity = 0.6;
                    needsRepaint = true;
                  } else if (isHovered) {
                    m.emissive.setHex(0x222833);
                    m.emissiveIntensity = 0.4;
                    needsRepaint = true;
                  } else {
                    m.emissive.setHex(0x000000);
                    m.emissiveIntensity = 0.0;
                    needsRepaint = true;
                  }
                });
              }
            });
          });

          if (needsRepaint && this.map) this.map.triggerRepaint();
        },

        // Raycasting รวดเร็วเป็นพิเศษผ่าน Low-Poly Proxy Boxes เท่านั้น (รองรับทั้งอาคารและประตู)
        raycast: function (point, lngLat) {
          if (!this.raycastProxies.length || !this.map) return null;
          try {
            const freeCam = typeof this.map.getFreeCameraOptions === 'function' ? this.map.getFreeCameraOptions() : null;
            if (!freeCam || !freeCam.position || !lngLat) return null;

            const camMerc = freeCam.position;
            const camX = (camMerc.x - anchorTransform.translateX) / anchorTransform.scale;
            const camY = (camMerc.z || 0) / anchorTransform.scale;
            const camZ = (camMerc.y - anchorTransform.translateY) / anchorTransform.scale;

            const groundMerc = maplibregl.MercatorCoordinate.fromLngLat(lngLat, 0);
            const gX = (groundMerc.x - anchorTransform.translateX) / anchorTransform.scale;
            const gY = 0;
            const gZ = (groundMerc.y - anchorTransform.translateY) / anchorTransform.scale;

            const origin = new THREE.Vector3(camX, camY, camZ);
            const dir = new THREE.Vector3(gX - camX, gY - camY, gZ - camZ).normalize();

            this.raycaster.set(origin, dir);
            this.raycaster.near = 1;
            this.raycaster.far = 25000;
            const intersects = this.raycaster.intersectObjects(this.raycastProxies, false);
            if (intersects && intersects.length > 0) {
              const hit = intersects[0];
              if (hit.object && hit.object.userData) {
                if (hit.object.userData.isGate && hit.object.userData.gate_id) {
                  return { hit: true, isGate: true, gate_id: hit.object.userData.gate_id };
                }
                if (hit.object.userData.bid_id) {
                  return { hit: true, isGate: false, bid_id: Number(hit.object.userData.bid_id) };
                }
              }
            }
          } catch (e) {
            console.warn('Raycast error:', e);
          }
          return null;
        },

        render: function (gl, matrix) {
          const rotationX = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(1, 0, 0),
            anchorTransform.rotateX
          );
          const rotationY = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 1, 0),
            anchorTransform.rotateY
          );
          const rotationZ = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 0, 1),
            anchorTransform.rotateZ
          );

          const m = new THREE.Matrix4().fromArray(matrix);
          const l = new THREE.Matrix4()
            .makeTranslation(
              anchorTransform.translateX,
              anchorTransform.translateY,
              anchorTransform.translateZ
            )
            .scale(
              new THREE.Vector3(
                anchorTransform.scale,
                -anchorTransform.scale,
                anchorTransform.scale
              )
            )
            .multiply(rotationX)
            .multiply(rotationY)
            .multiply(rotationZ);

          this.camera.projectionMatrix = m.multiply(l);
          if (this.camera.projectionMatrixInverse) {
            this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
          }

          this.renderer.resetState();
          this.renderer.render(this.scene, this.camera);
          // หมายเหตุ: ตัด this.map.triggerRepaint() ออกจาก render() เพื่อหยุด Infinite Loop 60fps ที่ทำให้เครื่องค้าง
        }
      };
    }
