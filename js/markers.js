/* ======================================================================
   3D LOCATION MARKERS (GATES & ADMIN BUILDING)
   ป้ายบอกตำแหน่งซุ้มประตู 1-4 และอาคารอำนวยการ ย่อขนาด Mini-pins อัตโนมัติ
====================================================================== */

       4.1) CAMPUS GATES INTERACTION & MARKERS
       ====================================================================== */
    const gateMarkers = [];

    function initGateMarkers() {
      // ล้าง Markers เดิมหากมี
      gateMarkers.forEach(m => m.remove());
      gateMarkers.length = 0;

      GATES_CONFIG.forEach(gateCfg => {
        const el = document.createElement('div');
        el.className = 'gate-marker';
        el.dataset.gateId = gateCfg.id;
        el.title = `${gateCfg.name} — คลิกเพื่อนำทางและดูรายละเอียด`;

        el.innerHTML = `
          <div class="gate-marker-badge">
            <span class="gate-marker-icon">🚪</span>
            <span>${gateCfg.shortName || gateCfg.name}</span>
          </div>
          <div class="gate-marker-pulse"></div>
        `;

        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          focusGate(gateCfg.id);
        });

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'bottom'
        })
          .setLngLat(gateCfg.coords || gateCfg.coordinates)
          .addTo(map);

        gateMarkers.push(marker);
      });

      updateMarkersVisibility();
    }

    /* ======================================================================
       4.2) ADMIN BUILDING 3D LOCATION MARKER (อาคารอำนวยการ - ติดต่อราชการ)
       ====================================================================== */
    let adminMarker = null;

    function initAdminMarker() {
      if (adminMarker) {
        adminMarker.remove();
        adminMarker = null;
      }

      const adminCoords = [102.788829, 17.399158];

      const el = document.createElement('div');
      el.className = 'admin-marker';
      el.dataset.bid = '11';
      el.title = 'อาคารอำนวยการ (ศูนย์ประสานงานและจุดติดต่อราชการหลัก) — คลิกเพื่อนำทางและดูรายละเอียด';

      el.innerHTML = `
        <div class="admin-marker-badge">
          <span class="admin-marker-icon">🏛️</span>
          <span>อาคารอำนวยการ</span>
          <span class="admin-marker-tag">ติดต่อราชการ</span>
        </div>
        <div class="admin-marker-pulse"></div>
      `;

      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const f = buildingsData && buildingsData.features ?
          buildingsData.features.find(ft => Number(ft.properties.bid_id) === 11) : null;
        if (f) {
          focusBuilding(f);
        } else {
          focusBuilding({
            properties: {
              bid_id: 11,
              name: 'อาคารอำนวยการ',
              category: 'admin',
              color: '#f59e0b',
              isStar: true,
              starLabel: '⭐ จุดติดต่อราชการหลัก',
              visitorTip: 'ศูนย์ประสานงานและจุดติดต่อราชการหลักของวิทยาลัย ชั้น 1 งานทะเบียน การเงิน กิจการนักศึกษา',
              clickable: 'TRUE'
            },
            geometry: {
              type: 'Point',
              coordinates: adminCoords
            }
          });
        }
      });

      adminMarker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat(adminCoords)
        .addTo(map);

      updateMarkersVisibility();
    }

    let markersVisible = true;

    // ควบคุมการแสดงผลของ Marker (ทั้งซุ้มประตูและอาคารอำนวยการ) ตามระดับ Zoom และสถานะเปิด/ปิด
    function updateMarkersVisibility() {
      if (!map) return;
      const z = map.getZoom();
      const isMobile = window.innerWidth <= 768;

      // เกณฑ์ระดับ Zoom สำหรับการซ่อน/ย่อขนาดอัตโนมัติ:
      // บนมือถือ: หากซูมออกห่างกว่า 17.2 ให้ย่อเป็นหมุดกลมกะทัดรัด (Collapsed Mini-Pins)
      // หากซูมออกกว้างมาก (< 16.3) ให้ซ่อนทั้งหมดเพื่อไม่ให้เกะกะสายตามุมมองภาพรวม
      // บนเดสก์ท็อป: ย่อขนาดเมื่อซูมออก < 16.5 และซ่อนเมื่อซูมออก < 15.6
      const minVisibleZoom = isMobile ? 16.3 : 15.6;
      const collapseZoom = isMobile ? 17.2 : 16.5;

      const shouldShow = markersVisible && (z >= minVisibleZoom);
      const isCollapsed = z < collapseZoom;

      gateMarkers.forEach(m => {
        const el = m.getElement();
        if (el) {
          el.classList.toggle('collapsed', isCollapsed);
          el.style.opacity = shouldShow ? '1' : '0';
          el.style.pointerEvents = shouldShow ? 'auto' : 'none';
          if (!shouldShow) {
            el.style.transform = 'scale(0.4)';
          } else if (isCollapsed) {
            el.style.transform = 'scale(0.85)';
          } else {
            el.style.transform = 'scale(1)';
          }
        }
      });

      if (adminMarker) {
        const el = adminMarker.getElement();
        if (el) {
          el.classList.toggle('collapsed', isCollapsed);
          el.style.opacity = shouldShow ? '1' : '0';
          el.style.pointerEvents = shouldShow ? 'auto' : 'none';
          if (!shouldShow) {
            el.style.transform = 'scale(0.4)';
          } else if (isCollapsed) {
            el.style.transform = 'scale(0.85)';
          } else {
            el.style.transform = 'scale(1)';
          }
        }
      }
    }

    map.on('zoom', updateMarkersVisibility);
    window.addEventListener('resize', updateMarkersVisibility);

    function focusGate(gateId) {
      hoverTooltip.classList.remove('show');
      const gateCfg = getGateConfig(gateId);
      if (!gateCfg) return;

      setSelected(null);
      if (campus3DLayer && campus3DLayer.setSelectedGate) {
        campus3DLayer.setSelectedGate(gateId);
      }

      document.querySelectorAll('.gate-marker').forEach(el => {
        el.classList.toggle('active', el.dataset.gateId === gateId);
      });
      document.querySelectorAll('.admin-marker').forEach(el => el.classList.remove('active'));

      const coords = gateCfg.coords || gateCfg.coordinates;
      map.flyTo({
        center: coords,
        zoom: 19.2,
        pitch: 58,
        bearing: (gateCfg.heading || 26) + 4,
        speed: 0.9,
        curve: 1.3,
        essential: true
      });

      openGateInfoCard(gateCfg);
    }

    function openGateInfoCard(gateConfig) {
      const coords = gateConfig.coords || gateConfig.coordinates;
      const gateFeature = {
        properties: {
          bid_id: null,
          name: gateConfig.name,
          category: 'security',
          color: '#ef4444',
          isStar: gateConfig.isMain || gateConfig.id === 'gate-1',
          starLabel: gateConfig.isMain ? '⭐ ทางเข้าหลักวิทยาลัย' : '🛡️ ประตูทางเข้า-ออก',
          visitorTip: gateConfig.isMain
            ? 'ทางเข้าหลักติดถนนมิตรภาพ ตรงข้ามป้อมยาม สำหรับรถยนต์ บุคคลภายนอก และการติดต่อราชการ'
            : 'ประตูทางเข้า-ออกวิทยาลัย สำหรับนักเรียนนักศึกษา บุคลากร และยานพาหนะ',
          desc: gateConfig.desc || `ซุ้มประตูทางเข้า-ออกของวิทยาลัย (${gateConfig.name})`,
          isGate: true,
          gate_id: gateConfig.id
        },
        geometry: {
          type: 'Point',
          coordinates: coords
        }
      };
      openInfoCard(gateFeature);
    }

    /* ======================================================================
