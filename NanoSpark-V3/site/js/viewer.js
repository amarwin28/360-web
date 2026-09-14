/**
 * Nano Spark — Professional 360° Viewer
 * Three.js interior sphere + hotspot projection + controls
 * @module viewer
 */
import * as THREE from 'three';

const DEFAULTS = {
  fov: 75,
  minFov: 30,
  maxFov: 95,
  autoRotateSpeed: 0.22,
  sphereRadius: 500,
};

/**
 * Convert yaw/pitch (degrees) to position on sphere
 * @param {number} yaw -180..180
 * @param {number} pitch -85..85
 * @param {number} radius
 * @returns {THREE.Vector3}
 */
export function yawPitchToVector3(yaw, pitch, radius = DEFAULTS.sphereRadius) {
  const yawRad = THREE.MathUtils.degToRad(yaw);
  const pitchRad = THREE.MathUtils.degToRad(pitch);
  const x = radius * Math.cos(pitchRad) * Math.sin(yawRad);
  const y = radius * Math.sin(pitchRad);
  const z = radius * Math.cos(pitchRad) * Math.cos(yawRad);
  return new THREE.Vector3(x, y, z);
}

/**
 * Professional panorama viewer class
 */
export class PanoramaViewer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLElement} container
   * @param {Object} opts
   * @param {HTMLElement} hotspotLayer
   * @param {HTMLElement} titleEl
   * @param {HTMLElement} descEl
   * @param {HTMLElement} loadingEl
   * @param {HTMLElement} thumbStrip
   * @param {import('./config.js').Panorama[]} panoramas
   * @param {Function} onHotspotClick - (targetId) => void
   */
  constructor(canvas, container, opts = {}) {
    if (!canvas || !container) throw new Error('Canvas or container missing');

    this.canvas = canvas;
    this.container = container;
    this.hotspotLayer = opts.hotspotLayer;
    this.titleEl = opts.titleEl;
    this.descEl = opts.descEl;
    this.loadingEl = opts.loadingEl;
    this.thumbStrip = opts.thumbStrip;
    this.panoramas = opts.panoramas || [];
    this.onHotspotNavigate = opts.onHotspotNavigate || (() => {});

    // State
    this.currentId = this.panoramas[0]?.id || null;
    this.isDragging = false;
    this.prevX = 0;
    this.prevY = 0;
    this.lon = 0;
    this.lat = 0;
    this.fov = DEFAULTS.fov;
    this.autoRotate = true;
    this.autoRotateSpeed = DEFAULTS.autoRotateSpeed;
    this.gyroEnabled = false;
    this.hotspotEls = []; // {el, vec, data}
    this.textures = new Map();
    this.rafId = 0;
    this.thumbShown = 12;
    this.thumbPageSize = 12;

    // Three core
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 1100);
    this.camera.position.set(0, 0, 0.1);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.textureLoader = new THREE.TextureLoader();
    this.textureLoader.setCrossOrigin('anonymous');

    const geo = new THREE.SphereGeometry(DEFAULTS.sphereRadius, 64, 48);
    geo.scale(-1, 1, 1);
    this.material = new THREE.MeshBasicMaterial({ map: null });
    this.sphere = new THREE.Mesh(geo, this.material);
    this.scene.add(this.sphere);

    this._bindEvents();
    this._buildThumbs();
    this._handleResize();
    new ResizeObserver(() => this._handleResize()).observe(container);
    window.addEventListener('resize', () => this._handleResize());

    if (this.currentId) this.load(this.currentId);
    this._animate();
  }

  // ---------------- Public API ----------------

  /** Load panorama by ID */
  async load(id) {
    const pano = this.panoramas.find((p) => p.id === id);
    if (!pano) {
      console.warn(`[viewer] panorama not found: ${id}`);
      return;
    }
    this.currentId = id;
    if (this.titleEl) this.titleEl.textContent = pano.title;
    if (this.descEl) this.descEl.textContent = pano.desc;

    this._updateThumbs();
    this._renderHotspots(pano);
    this._showLoading(true);

    try {
      const tex = await this._loadTexture(pano.image, id);
      tex.colorSpace = THREE.SRGBColorSpace;
      this.material.map = tex;
      this.material.needsUpdate = true;
      this.material.opacity = 1;
      this.material.transparent = false;
      // fade in
      this.material.transparent = true;
      this.material.opacity = 0;
      let op = 0;
      const fade = setInterval(() => {
        op += 0.08;
        this.material.opacity = Math.min(op, 1);
        if (op >= 1) {
          clearInterval(fade);
          this.material.transparent = false;
        }
      }, 16);
    } catch (err) {
      console.error('[viewer] texture load failed:', err);
      if (this.titleEl) this.titleEl.textContent = 'Failed to load panorama';
    } finally {
      this._showLoading(false);
      const prog = document.getElementById('loaderProgress');
      if (prog) prog.textContent = `LOADING: ${pano.title}`;
    }
  }

  /** Add a new panorama at runtime (e.g., drag-drop) */
  addPanorama(pano, makeCurrent = true) {
    this.panoramas.unshift(pano);
    if (this.thumbShown < 12) this.thumbShown = 12;
    this._buildThumbs();
    if (makeCurrent) this.load(pano.id);
  }

  /** Set auto-rotate */
  setAutoRotate(v) {
    this.autoRotate = v;
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    this.renderer.dispose();
    this.material.dispose();
    this.sphere.geometry.dispose();
  }

  // ---------------- Internal ----------------

  _loadTexture(url, id) {
    if (this.textures.has(id)) return Promise.resolve(this.textures.get(id));
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (tex) => {
          this.textures.set(id, tex);
          resolve(tex);
        },
        undefined,
        reject
      );
    });
  }

  _showLoading(show) {
    if (!this.loadingEl) return;
    this.loadingEl.classList.toggle('hidden', !show);
  }

  _buildThumbs() {
    if (!this.thumbStrip) return;
    this.thumbStrip.innerHTML = '';
    const visible = this.panoramas.slice(0, this.thumbShown);
    visible.forEach((p) => {
      const btn = document.createElement('button');
      btn.className = 'thumb-btn' + (p.id === this.currentId ? ' active' : '');
      btn.dataset.id = p.id;
      btn.innerHTML = `<img src="${p.image}" alt="${p.title}" loading="lazy"><span>${p.title}</span>`;
      btn.addEventListener('click', () => this.load(p.id));
      this.thumbStrip.appendChild(btn);
    });
    if (this.panoramas.length > this.thumbShown) {
      const more = document.createElement('button');
      more.className = 'thumb-more';
      more.type = 'button';
      const remaining = this.panoramas.length - this.thumbShown;
      const next = Math.min(this.thumbPageSize, remaining);
      more.textContent = `Show ${next} more (${this.thumbShown}/${this.panoramas.length})`;
      more.addEventListener('click', () => {
        this.thumbShown = Math.min(this.panoramas.length, this.thumbShown + this.thumbPageSize);
        this._buildThumbs();
        this._updateThumbs();
      });
      this.thumbStrip.appendChild(more);
    }
  }

  _updateThumbs() {
    if (!this.thumbStrip) return;
    [...this.thumbStrip.children].forEach((btn) => {
      if (!btn.dataset.id) return;
      btn.classList.toggle('active', btn.dataset.id === this.currentId);
    });
  }

  _renderHotspots(pano) {
    if (!this.hotspotLayer) return;
    this.hotspotLayer.innerHTML = '';
    this.hotspotEls = [];

    (pano.hotspots || []).forEach((h) => {
      const el = document.createElement('button');
      el.className = 'pano-hotspot';
      el.type = 'button';
      el.setAttribute('aria-label', `Go to ${h.label}`);
      el.innerHTML = `<div class="pano-hotspot-dot">+</div><label>${h.label}</label>`;
      el.addEventListener('click', () => {
        this.onHotspotNavigate(h.target, h);
        this.load(h.target);
      });
      this.hotspotLayer.appendChild(el);
      const vec = yawPitchToVector3(h.yaw, h.pitch);
      this.hotspotEls.push({ el, vec, data: h });
    });
  }

  _projectHotspots() {
    if (!this.hotspotEls.length) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.hotspotEls.forEach(({ el, vec }) => {
      const pos = vec.clone().project(this.camera);
      const visible = pos.z < 1;
      if (!visible) {
        el.classList.add('hidden');
        return;
      }
      const x = (pos.x * 0.5 + 0.5) * w;
      const y = (-pos.y * 0.5 + 0.5) * h;
      const isOff = x < -40 || x > w + 40 || y < -40 || y > h + 40;

      if (isOff) {
        el.classList.add('hidden');
      } else {
        el.classList.remove('hidden');
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        const scale = THREE.MathUtils.clamp(1 - pos.z * 0.25, 0.7, 1.15);
        el.style.transform = `translate(-50%,-50%) scale(${scale})`;
        el.style.opacity = `${THREE.MathUtils.clamp(1.3 - Math.abs(pos.z), 0, 1)}`;
      }
    });
  }

  _handleResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _bindEvents() {
    const onDown = (e) => {
      if (e.target.closest('.pano-controls') || e.target.closest('.pano-hotspot') || e.target.closest('.pano-btn')) return;
      this.isDragging = true;
      this.container.classList.add('dragging');
      this.prevX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      this.prevY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      this.autoRotate = false;
      document.getElementById('btnAutorotate')?.classList.remove('active');
      if (e.pointerId !== undefined) {
        try {
          this.container.setPointerCapture(e.pointerId);
        } catch {}
      }
    };

    const onMove = (e) => {
      if (!this.isDragging) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? this.prevX;
      const y = e.clientY ?? e.touches?.[0]?.clientY ?? this.prevY;
      const dx = x - this.prevX;
      const dy = y - this.prevY;
      this.lon -= dx * 0.22;
      this.lat += dy * 0.22;
      this.lat = Math.max(-85, Math.min(85, this.lat));
      this.prevX = x;
      this.prevY = y;
    };

    const onUp = () => {
      this.isDragging = false;
      this.container.classList.remove('dragging');
    };

    this.container.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    this.container.addEventListener('touchstart', onDown, { passive: false });
    this.container.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
        onMove(e);
      },
      { passive: false }
    );
    this.container.addEventListener('touchend', onUp);

    // Wheel zoom
    this.container.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.fov += e.deltaY * 0.04;
        this.fov = THREE.MathUtils.clamp(this.fov, DEFAULTS.minFov, DEFAULTS.maxFov);
        this.camera.fov = this.fov;
        this.camera.updateProjectionMatrix();
      },
      { passive: false }
    );

    // Pinch
    let lastDist = 0;
    this.container.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          if (lastDist) {
            const delta = lastDist - dist;
            this.fov += delta * 0.12;
            this.fov = THREE.MathUtils.clamp(this.fov, DEFAULTS.minFov, DEFAULTS.maxFov);
            this.camera.fov = this.fov;
            this.camera.updateProjectionMatrix();
          }
          lastDist = dist;
        }
      },
      { passive: false }
    );
    this.container.addEventListener('touchend', () => (lastDist = 0));

    // Buttons - robust fixed
    const btnAuto = document.getElementById('btnAutorotate');
    const btnReset = document.getElementById('btnReset');
    const btnFs = document.getElementById('btnFullscreen');
    if (!btnAuto) console.warn('[viewer] btnAutorotate not found');
    if (!btnFs) console.warn('[viewer] btnFullscreen not found');
    btnAuto?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.autoRotate = !this.autoRotate;
      btnAuto.classList.toggle('active', this.autoRotate);
      if (this.autoRotate) {
        this.gyroEnabled = false;
        const gBtn = document.getElementById('btnGyro');
        if (gBtn) { gBtn.classList.remove('active'); gBtn.textContent = '◉ Gyro'; }
      }
      console.info('[viewer] autorotate', this.autoRotate);
    });
    btnReset?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.lon = 0;
      this.lat = 0;
      this.fov = DEFAULTS.fov;
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
      this.autoRotate = true;
      this.gyroEnabled = false;
      document.getElementById('btnGyro')?.classList.remove('active');
      const gBtn = document.getElementById('btnGyro');
      if (gBtn) gBtn.textContent = '◉ Gyro';
      btnAuto?.classList.add('active');
      console.info('[viewer] reset -> autorotate resumed');
    });
    btnFs?.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          if (this.container.requestFullscreen) await this.container.requestFullscreen();
          else if (this.container.webkitRequestFullscreen) this.container.webkitRequestFullscreen();
          else alert('Fullscreen not supported');
        } else {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
      } catch (err) {
        console.error('[viewer] fullscreen failed', err);
        alert('Fullscreen failed: ' + err.message + ' (Use HTTPS or allow fullscreen)');
      }
    });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) =>
      document.addEventListener(ev, () => {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (btnFs) btnFs.textContent = isFs ? '⛶ Exit' : '⛶ Full';
        setTimeout(() => this._handleResize(), 150);
      })
    );

    // Gyro - robust fixed
    const btnGyro = document.getElementById('btnGyro');
    btnGyro?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (this.gyroEnabled) {
        this.gyroEnabled = false;
        btnGyro.classList.remove('active');
        btnGyro.textContent = '◉ Gyro';
        console.info('[viewer] gyro off');
        return;
      }
      if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        alert('Gyroscope requires HTTPS. Use https:// or localhost.');
        return;
      }
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        try {
          const perm = await DeviceOrientationEvent.requestPermission();
          if (perm !== 'granted') {
            alert('Gyro permission denied - please allow motion sensors');
            return;
          }
        } catch (err) {
          alert(`Gyro not supported: ${err.message}`);
          return;
        }
      }
      this.gyroEnabled = true;
      btnGyro.classList.add('active');
      btnGyro.textContent = '◉ Gyro ON';
      window.addEventListener('deviceorientation', (e) => this._handleOrientation(e), { once: false });
      console.info('[viewer] gyro on');
    });

    // Drag & drop preview
    ['dragenter', 'dragover'].forEach((ev) =>
      this.container.addEventListener(ev, (e) => {
        e.preventDefault();
        this.container.style.outline = '2px dashed #70e5c1';
        this.container.style.outlineOffset = '-4px';
      })
    );
    this.container.addEventListener('dragleave', () => {
      this.container.style.outline = '';
    });
    this.container.addEventListener('drop', async (e) => {
      e.preventDefault();
      this.container.style.outline = '';
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith('image/')) {
        alert('Drop an image file (JPG/PNG)');
        return;
      }
      const url = URL.createObjectURL(file);
      this._showLoading(true);
      try {
        const tex = await new Promise((resolve, reject) =>
          this.textureLoader.load(url, resolve, undefined, reject)
        );
        tex.colorSpace = THREE.SRGBColorSpace;
        this.material.map = tex;
        this.material.needsUpdate = true;
        this._showLoading(false);
        if (this.titleEl) this.titleEl.textContent = file.name.replace(/\.[^/.]+$/, '');
        if (this.descEl)
          this.descEl.textContent = 'Dropped preview — drag another to replace. Add to panoramas/ to keep.';
        // Hotspot back to lab
        if (this.hotspotLayer) {
          this.hotspotLayer.innerHTML = '';
          this.hotspotEls = [];
          const vec = yawPitchToVector3(0, 0);
          const el = document.createElement('button');
          el.className = 'pano-hotspot';
          el.innerHTML = `<div class="pano-hotspot-dot">↩</div><label>Back to Lab</label>`;
          el.addEventListener('click', () => this.load(this.panoramas.find((p) => p.id === 'lab-main') ? 'lab-main' : this.panoramas[0].id));
          this.hotspotLayer.appendChild(el);
          this.hotspotEls.push({ el, vec, data: { target: 'lab-main' } });
        }
        const previewId = `__preview__${Date.now()}`;
        this.panoramas.unshift({
          id: previewId,
          title: file.name,
          desc: 'Drag-drop preview',
          image: url,
          hotspots: [],
        });
        this._buildThumbs();
        this.currentId = previewId;
        this._updateThumbs();
      } catch {
        this._showLoading(false);
        alert('Failed to load dropped image');
      }
    });

    // Keyboard
    window.addEventListener('keydown', (e) => {
      const idx = this.panoramas.findIndex((p) => p.id === this.currentId);
      if (e.key === 'ArrowRight') {
        const next = (idx + 1) % this.panoramas.length;
        this.load(this.panoramas[next].id);
      }
      if (e.key === 'ArrowLeft') {
        const prev = (idx - 1 + this.panoramas.length) % this.panoramas.length;
        this.load(this.panoramas[prev].id);
      }
    });
  }

  _handleOrientation(e) {
    if (!this.gyroEnabled) return;
    const gamma = e.gamma ?? 0;
    const beta = e.beta ?? 0;
    const targetLon = gamma * 1.2;
    const targetLat = THREE.MathUtils.clamp((beta - 45) * 0.5, -60, 60);
    this.lon += (targetLon - this.lon) * 0.04;
    this.lat += (targetLat - this.lat) * 0.04;
  }

  _animate = () => {
    this.rafId = requestAnimationFrame(this._animate);
    if (this.autoRotate && !this.isDragging && !this.gyroEnabled) {
      this.lon += this.autoRotateSpeed;
    }
    this.lat = Math.max(-85, Math.min(85, this.lat));
    const phi = THREE.MathUtils.degToRad(90 - this.lat);
    const theta = THREE.MathUtils.degToRad(this.lon);
    const r = DEFAULTS.sphereRadius;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(theta);
    this.camera.lookAt(x, y, z);
    this.renderer.render(this.scene, this.camera);
    this._projectHotspots();
  };
}
