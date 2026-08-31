/**
 * KinetiX • Dynamic Pulley & Belt Mechanical Simulation
 * 
 * Features:
 * - 1 Large Central Drive Wheel ("Central Totum") with Network Graph artwork & 3-Column Greek Temple Icon
 * - 2 Small Driven Wheels ("Personal Totum") with Glowing Neural Brain artwork
 * - Semi-Transparent Pipe Conduit over returning belts with "Feed Collective Brain" text (Marina colors, white text)
 * - Semi-Transparent Pipe Conduit over outward belts with "Consult Collective Brain" text (Marina colors, white text)
 * - Specular Dual Data Circuits:
 *     * Left: Personal Workspace (Left) -> Marina Capsule (Left) -> Left Small Wheel
 *     * Right: Personal Workspace (Right) -> Marina Capsule (Right) -> Right Small Wheel
 *   * Synchronized Photon Movement: Lights move ONLY when the Marina wheels spin/step!
 * - Triangular Support Basement behind Large Wheel (Chassis, inner A-frame truss, base beam, footpads with bolts)
 * - Ancient Latin Inscription below Greek Temple: "TOTUM MAIUM" / "PARTE EST" (in 2 lines)
 * - Freely Draggable & Positionable Objects with LocalStorage persistence
 * - Marina Stepping Wheels: independent, stepping 90 degrees every 4 seconds
 * - 2-row centered text hubs inside each main wheel
 * - Calm, smooth rotation speed (7 RPM)
 * - Verified directional arrowheads pointing exactly along the belt flow
 * - Dynamic Belt Coupling with accurate circle-to-circle outer tangents
 * - Kinematic Conservation of Linear Belt Speed (v = w * r)
 * - Interactive Drag-to-Spin & Inertia on all wheels
 */

(function () {
  'use strict';

  // --- Default Configuration ---
  const DEFAULT_CONFIG = {
    // Kinematics & Motor
    motorOn: true,
    motorDir: 1,       // 1 = CW, -1 = CCW
    targetRPM: 7,      // Slower, gentle, meditative rotation speed
    currentRPM: 7,
    linearSpeed: 0,
    beltOffset: 0,

    // Geometry
    bigRadius: 155,    // Radius of bottom center wheel
    smallRadius: 59.4, // Radius of top 2 wheels (increased by 10%)
    spacing: 310,      // Horizontal distance to left and right wheels
    vDistance: 360,    // Vertical separation between top row & big wheel

    // Physics
    tension: 0.94,
    inertia: 6,
    friction: 3,

    // Belt & Visual Styling
    beltType: 'arrows',
    routingMode: 'dual-direct',
    showSpokes: true,
    showVibration: true,

    // Labels (2 Rows: Line 1 & Line 2)
    largeWheelLines: ['Central', 'Totum'],
    smallWheelLines: ['Personal', 'Totum'],

    // Theme Palette
    theme: {
      bgGrad1: '#141c28',
      bgGrad2: '#080b0f',
      wheelOuter: '#2d3748',
      wheelInner: '#1a202c',
      wheelBevel: '#4a5568',
      beltBase: '#121820',
      beltRidge: 'rgba(0, 240, 255, 0.4)',
      beltArrow: '#00f0ff',
      accent: '#00f0ff',
      accentGlow: 'rgba(0, 240, 255, 0.35)',
      hubBgGrad1: 'rgba(12, 18, 28, 0.92)',
      hubBgGrad2: 'rgba(8, 12, 18, 0.96)',
      hubBorder: 'rgba(0, 240, 255, 0.45)',
      textPrimary: '#ffffff',
      textAccent: '#00f0ff'
    }
  };

  // Active state
  const state = {
    ...DEFAULT_CONFIG,
    isDraggingWheel: false,
    draggedWheelIdx: -1,
    dragLastAngle: 0,
    dragAngularVel: 0,
    dragMoved: false,
    pulleys: []
  };

  // --- Preload Artwork Images with Cache-Buster ---
  const timestamp = Date.now();

  // 1. Large Wheel Artwork (Network Graph)
  const largeWheelImg = new Image();
  let largeImageLoaded = false;
  largeWheelImg.onload = () => {
    largeImageLoaded = true;
  };
  largeWheelImg.src = 'large-wheel.png?v=' + timestamp;
  if (largeWheelImg.complete && largeWheelImg.naturalWidth > 0) {
    largeImageLoaded = true;
  }

  // 2. Small Wheels Artwork (Glowing Neural Brain)
  const brainWheelImg = new Image();
  let brainImageLoaded = false;
  brainWheelImg.onload = () => {
    brainImageLoaded = true;
  };
  brainWheelImg.src = 'brain-wheel.jpg?v=' + timestamp;
  if (brainWheelImg.complete && brainWheelImg.naturalWidth > 0) {
    brainImageLoaded = true;
  }

  // 3. Marina Stepping Wheel Artwork
  const marinaImg = new Image();
  let marinaImageLoaded = false;
  marinaImg.onload = () => {
    marinaImageLoaded = true;
  };
  marinaImg.src = 'Marina.png?v=' + timestamp;
  if (marinaImg.complete && marinaImg.naturalWidth > 0) {
    marinaImageLoaded = true;
  }

  // --- Wheel Factory ---
  function createPulley(id, name, lines, x, y, radius, isDriver = false) {
    return {
      id,
      name,
      lines,
      x,
      y,
      radius,
      isDriver,
      angle: 0,
      angularVel: 0
    };
  }

  // --- Geometry Helpers: Outer Tangents & Wrap Arcs ---
  function findOuterArcDir(cx, cy, tx, ty, thetaStart, thetaEnd) {
    const dx = tx - cx;
    const dy = ty - cy;

    let dThetaCW = thetaEnd - thetaStart;
    while (dThetaCW < 0) dThetaCW += Math.PI * 2;
    const midAngleCW = thetaStart + dThetaCW / 2;
    const dotCW = Math.cos(midAngleCW) * dx + Math.sin(midAngleCW) * dy;

    let dThetaCCW = thetaStart - thetaEnd;
    while (dThetaCCW < 0) dThetaCCW += Math.PI * 2;
    const midAngleCCW = thetaStart - dThetaCCW / 2;
    const dotCCW = Math.cos(midAngleCCW) * dx + Math.sin(midAngleCCW) * dy;

    return dotCCW < dotCW;
  }

  function getOuterTangents(c1, c2) {
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= Math.abs(c1.radius - c2.radius) || dist === 0) {
      return null;
    }

    const baseAngle = Math.atan2(dy, dx);
    const dr = c1.radius - c2.radius;
    const alpha = Math.asin(Math.max(-1, Math.min(1, dr / dist)));

    // Tangent A
    const angle1a = baseAngle + Math.PI / 2 - alpha;
    const angle2a = baseAngle + Math.PI / 2 - alpha;
    const p1a = {
      x: c1.x + c1.radius * Math.cos(angle1a),
      y: c1.y + c1.radius * Math.sin(angle1a)
    };
    const p2a = {
      x: c2.x + c2.radius * Math.cos(angle2a),
      y: c2.y + c2.radius * Math.sin(angle2a)
    };

    // Tangent B
    const angle1b = baseAngle - Math.PI / 2 + alpha;
    const angle2b = baseAngle - Math.PI / 2 + alpha;
    const p1b = {
      x: c1.x + c1.radius * Math.cos(angle1b),
      y: c1.y + c1.radius * Math.sin(angle1b)
    };
    const p2b = {
      x: c2.x + c2.radius * Math.cos(angle2b),
      y: c2.y + c2.radius * Math.sin(angle2b)
    };

    // Unambiguously identify Left span vs Right span
    let leftSpan, rightSpan;
    if (p1b.x < p1a.x) {
      leftSpan = { p1: p1b, p2: p2b, angle1: angle1b, angle2: angle2b };
      rightSpan = { p1: p1a, p2: p2a, angle1: angle1a, angle2: angle2a };
    } else {
      leftSpan = { p1: p1a, p2: p2a, angle1: angle1a, angle2: angle2a };
      rightSpan = { p1: p1b, p2: p2b, angle1: angle1b, angle2: angle2b };
    }

    return {
      p1a, p2a, angle1a, angle2a,
      p1b, p2b, angle1b, angle2b,
      leftSpan, rightSpan,
      dist
    };
  }

  // --- Master Layout Manager & Cross-Browser Synchronizer ---
  // --- Master Layout Manager & Anchor-Aware Aspect Ratio Synchronizer ---
  const LayoutManager = {
    items: [],
    masterDefaults: null,

    register(item) {
      this.items.push(item);
    },

    async loadMasterDefaults() {
      try {
        const res = await fetch('default_positions.json?t=' + Date.now());
        if (res.ok) {
          this.masterDefaults = await res.json();
          this.applyMasterDefaults();
        }
      } catch (e) {
        console.warn('[LayoutManager] Using default calculated positions:', e);
      }
    },

    applyMasterDefaults() {
      if (!this.masterDefaults) return;
      this.items.forEach(item => {
        if (this.masterDefaults[item.elementId]) {
          const pos = this.masterDefaults[item.elementId];
          item.applyPositionData(pos);
        }
      });
    },

    syncCurrentToMaster() {
      const payload = {};
      const winW = window.innerWidth || 1920;
      const winH = window.innerHeight || 1080;
      const cx = winW / 2;
      const cy = winH / 2;

      // Base uniform scaling factor relative to 1920x1080 baseline
      const curScale = Math.min(winW / 1920, winH / 1080) || 1.0;

      this.items.forEach(item => {
        const rect = item.el.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const itemCenterY = rect.top + rect.height / 2;

        let anchor = 'left';
        let vAnchor = itemCenterY <= cy ? 'top' : 'bottom';
        let offsetX = 0;
        let offsetY = 0;

        // Center-aligned items (e.g. tools below the wheel or near center column)
        const isCenterTool = ['gcp-object', 'gcp-copy', 'gcp-copy-2', 'gcp-copy-3', 'spanner-object', 'gdrive-object', 'gdrive-copy-2', 'adk-object', 'adk-copy', 'salesforce-object', 'moma-object', 'buganizer-object', 'horizon-object', 'github-object'].includes(item.elementId);
        
        if (isCenterTool || (itemCenterX >= cx - 220 && itemCenterX <= cx + 220)) {
          anchor = 'center';
          offsetX = Number(((itemCenterX - cx) / curScale).toFixed(2));
          offsetY = Number(((winH - rect.bottom) / curScale).toFixed(2));
          vAnchor = 'bottom';
        } else if (itemCenterX > cx) {
          // Right-side items
          anchor = 'right';
          offsetX = Number(((winW - rect.right) / curScale).toFixed(2));
          offsetY = Number((vAnchor === 'top' ? rect.top / curScale : (winH - rect.bottom) / curScale).toFixed(2));
        } else {
          // Left-side items
          anchor = 'left';
          offsetX = Number((rect.left / curScale).toFixed(2));
          offsetY = Number((vAnchor === 'top' ? rect.top / curScale : (winH - rect.bottom) / curScale).toFixed(2));
        }

        payload[item.elementId] = {
          anchor,
          vAnchor,
          offsetX,
          offsetY,
          storageKey: item.storageKey
        };
      });

      console.log('[LayoutManager] Explicitly saving anchor-aware master layout payload:', payload);

      fetch('/api/save-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json()).then(data => {
        console.log('[LayoutManager] Anchor-aware master layout saved successfully to server:', data);
        const toast = document.getElementById('sync-toast');
        if (toast) {
          toast.innerHTML = '<strong>✓ Master Layout Saved!</strong><br>Center, left & right ratios will now stay locked on all screens.';
          toast.classList.add('visible');
          setTimeout(() => toast.classList.remove('visible'), 5000);
        }
      }).catch(err => {
        console.error('[LayoutManager] Error saving master layout:', err);
        alert('Could not save to server: ' + err.message);
      });
    }
  };

  // Expose to window for global access
  window.LayoutManager = LayoutManager;

  // --- Reusable Draggable Item Controller with Anchor-Aware Proportional Positioning ---
  class DraggableItem {
    constructor(elementId, storageKey, defaultLeft, defaultTop) {
      this.elementId = elementId;
      this.el = document.getElementById(elementId);
      this.storageKey = storageKey;
      this.defaultLeft = defaultLeft;
      this.defaultTop = defaultTop;
      if (!this.el) return;

      this.posData = null;
      this.isDragging = false;
      this.startX = 0;
      this.startY = 0;
      this.initialLeft = 0;
      this.initialTop = 0;

      LayoutManager.register(this);
      this.initPosition();
      this.bindEvents();
    }

    initPosition() {
      if (LayoutManager.masterDefaults && LayoutManager.masterDefaults[this.elementId]) {
        this.applyPositionData(LayoutManager.masterDefaults[this.elementId]);
        return;
      }

      this.resetToDefault();
    }

    applyPositionData(pos) {
      if (pos && pos.anchor !== undefined) {
        this.posData = pos;
        this.recalculateFromAnchor();
      } else if (pos && pos.left !== undefined) {
        this.setPosition(pos.left, pos.top, false);
      }
    }

    recalculateFromAnchor() {
      if (!this.posData) return;

      const winW = window.innerWidth || 1920;
      const winH = window.innerHeight || 1080;
      const cx = winW / 2;
      const scale = Math.min(1.25, Math.max(0.5, Math.min(winW / 1920, winH / 1080)));

      const rect = this.el.getBoundingClientRect();
      const elWidth = rect.width || this.el.offsetWidth || 120;
      const elHeight = rect.height || this.el.offsetHeight || 120;

      let left = 0;
      let top = 0;

      if (this.posData.anchor === 'center') {
        left = cx + (this.posData.offsetX * scale) - (elWidth / 2);
        top = (this.posData.vAnchor === 'top') 
          ? (this.posData.offsetY * scale) 
          : (winH - (this.posData.offsetY * scale) - elHeight);
      } else if (this.posData.anchor === 'right') {
        left = winW - (this.posData.offsetX * scale) - elWidth;
        top = (this.posData.vAnchor === 'top') 
          ? (this.posData.offsetY * scale) 
          : (winH - (this.posData.offsetY * scale) - elHeight);
      } else {
        // Left anchor
        left = this.posData.offsetX * scale;
        top = (this.posData.vAnchor === 'top') 
          ? (this.posData.offsetY * scale) 
          : (winH - (this.posData.offsetY * scale) - elHeight);
      }

      this.setPosition(Math.round(left), Math.round(top), false);
    }

    resetToDefault() {
      let initLeft = this.defaultLeft;
      let initTop = this.defaultTop;

      const rect = this.el.getBoundingClientRect();
      const elWidth = rect.width || this.el.offsetWidth || 120;
      const elHeight = rect.height || this.el.offsetHeight || 120;

      // Handle negative offsets relative to right/bottom corners
      if (initLeft < 0) {
        initLeft = Math.max(10, window.innerWidth + initLeft - elWidth);
      }
      if (initTop < 0) {
        initTop = Math.max(10, window.innerHeight + initTop - elHeight);
      }

      this.setPosition(initLeft, initTop, false);
    }

    setPosition(left, top, isUserDrag = false) {
      const rect = this.el.getBoundingClientRect();
      const elWidth = rect.width || this.el.offsetWidth || 120;
      const elHeight = rect.height || this.el.offsetHeight || 120;
      const maxX = Math.max(0, window.innerWidth - elWidth);
      const maxY = Math.max(0, window.innerHeight - elHeight);

      const clampX = Math.max(10, Math.min(maxX - 10, left));
      const clampY = Math.max(10, Math.min(maxY - 10, top));

      this.el.style.left = `${clampX}px`;
      this.el.style.top = `${clampY}px`;
      this.el.style.right = 'auto';
      this.el.style.bottom = 'auto';
    }

    bindEvents() {
      const onWindowResizeOrLoad = () => {
        if (this.posData) {
          this.recalculateFromAnchor();
        } else if (!LayoutManager.masterDefaults || !LayoutManager.masterDefaults[this.elementId]) {
          this.resetToDefault();
        } else {
          this.applyPositionData(LayoutManager.masterDefaults[this.elementId]);
        }
      };

      window.addEventListener('resize', onWindowResizeOrLoad);
      window.addEventListener('load', onWindowResizeOrLoad);

      // Disable dragging if running on port 8010
      if (window.location.port === '8010' || window.location.href.includes(':8010') || document.body.classList.contains('mirrored-view')) {
        return;
      }

      const onPointerDown = (e) => {
        this.isDragging = true;
        this.el.classList.add('dragging');
        this.startX = e.clientX;
        this.startY = e.clientY;

        const rect = this.el.getBoundingClientRect();
        this.initialLeft = rect.left;
        this.initialTop = rect.top;

        this.el.setPointerCapture(e.pointerId);
        e.stopPropagation();
      };

      const onPointerMove = (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;
        this.setPosition(this.initialLeft + dx, this.initialTop + dy, true);
        e.stopPropagation();
      };

      const onPointerUp = (e) => {
        if (this.isDragging) {
          this.isDragging = false;
          this.el.classList.remove('dragging');
          try {
            this.el.releasePointerCapture(e.pointerId);
          } catch (err) {}
          e.stopPropagation();
        }
      };

      this.el.addEventListener('pointerdown', onPointerDown);
      this.el.addEventListener('pointermove', onPointerMove);
      this.el.addEventListener('pointerup', onPointerUp);
      this.el.addEventListener('pointercancel', onPointerUp);
    }
  }

  // --- Marina Stepping Wheel Controller (90° every 4 seconds) ---
  class MarinaWheelRenderer {
    constructor(canvasIds = ['marina-canvas-left', 'marina-canvas-right']) {
      this.size = 116;
      this.radius = 50;
      this.stepInterval = 4000;       // 4 seconds per step
      this.transitionDuration = 500;   // 500ms smooth ease-out rotation transition
      this.dpr = window.devicePixelRatio || 1;

      this.canvases = [];
      canvasIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          const ctx = el.getContext('2d');
          el.width = Math.round(this.size * this.dpr);
          el.height = Math.round(this.size * this.dpr);
          el.style.width = `${this.size}px`;
          el.style.height = `${this.size}px`;
          ctx.scale(this.dpr, this.dpr);
          this.canvases.push({ el, ctx });
        }
      });
    }

    getProgress(timestamp) {
      const stepIndex = Math.floor(timestamp / this.stepInterval);
      const timeInStep = timestamp % this.stepInterval;

      if (timeInStep < this.transitionDuration) {
        const t = timeInStep / this.transitionDuration;
        const ease = 1 - Math.pow(1 - t, 3);
        return {
          stepIndex,
          isMoving: true,
          transitionT: t,
          totalProgress: stepIndex + ease,
          angle: (stepIndex + ease) * (Math.PI / 2),
          activity: Math.sin(t * Math.PI)
        };
      } else {
        return {
          stepIndex,
          isMoving: false,
          transitionT: 1,
          totalProgress: stepIndex + 1,
          angle: (stepIndex + 1) * (Math.PI / 2),
          activity: 0
        };
      }
    }

    render(timestamp) {
      if (!this.canvases.length) return;
      const progress = this.getProgress(timestamp);
      const angle = progress.angle;
      const cx = this.size / 2;
      const cy = this.size / 2;
      const r = this.radius;

      this.canvases.forEach(({ ctx }) => {
        ctx.clearRect(0, 0, this.size, this.size);

        ctx.save();
        ctx.translate(cx, cy);

        // 1. Outer Belt Guide Rim & Glow (Brightens during spin)
        const glowAlpha = progress.isMoving ? 0.75 : 0.45;
        const glowBlur = progress.isMoving ? 20 : 14;
        ctx.shadowColor = `rgba(218, 112, 214, ${glowAlpha})`;
        ctx.shadowBlur = glowBlur;
        ctx.fillStyle = 'rgba(16, 20, 30, 0.65)';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Clear shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // 2. Machined Bevel Rim
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = progress.isMoving ? 'rgba(218, 112, 214, 0.95)' : 'rgba(140, 110, 180, 0.85)';
        ctx.stroke();

        // 3. Inner Rotating Marina Graphic
        ctx.save();
        ctx.rotate(angle);

        // Circular clip
        const clipRadius = r - 2;
        ctx.beginPath();
        ctx.arc(0, 0, clipRadius, 0, Math.PI * 2);
        ctx.clip();

        if (marinaImageLoaded || (marinaImg.complete && marinaImg.naturalWidth > 0)) {
          const imgSize = r * 1.65;
          ctx.drawImage(marinaImg, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
        } else {
          ctx.fillStyle = 'transparent';
          ctx.fill();
        }

        ctx.restore();

        // 4. Subtle Outer Rim Highlight
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
        ctx.stroke();

        // 5. Outer Groove
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      });
    }
  }

  // --- Main Simulation App ---
  class DynamicBeltApp {
    constructor(config) {
      this.config = config || { readOnly: false };
      console.log("[DynamicBeltApp] Initializing. Config:", this.config);
      if (this.config.readOnly) {
        document.body.classList.add('mirrored-view');
      }
      this.canvas = document.getElementById('sim-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.width = 0;
      this.height = 0;
      this.dpr = window.devicePixelRatio || 1;

      this.lastTime = performance.now();
      this.vibrationPhase = 0;

      // Preload ACE icon for conduit text badge
      this.aceImg = new Image();
      this.aceImg.src = 'ACE.png';

      this.initPulleys();
      this.setupEventListeners();
      this.resize();

      // Initialize Draggable Positionable Objects
      // Left Circuit
      new DraggableItem('workspace-left', 'workspace_left_pos', 40, 40);         // Top Left
      new DraggableItem('marina-left', 'marina_left_pos', 40, -40);             // Bottom Left

      // Right Circuit (Specular)
      new DraggableItem('workspace-right', 'workspace_right_pos', -40, 40);      // Top Right
      new DraggableItem('marina-right', 'marina_right_pos', -40, -40);          // Bottom Right

      // Floating items
      new DraggableItem('jetski-object', 'jetski_pos', 40, 240);                // Mid Left
      new DraggableItem('jetski-object-right', 'jetski_right_pos', -40, 240);   // Mid Right (Mirrored)
      new DraggableItem('gcp-object', 'gcp_pos', 40, -180);                     // Bottom Mid Left (Totum Project)
      new DraggableItem('gcp-copy', 'gcp_copy_pos', 140, -180);                 // Google Cloud Copy
      new DraggableItem('gcp-copy-2', 'gcp_copy2_pos', 200, -180);              // Google Cloud Copy 2
      new DraggableItem('gcp-copy-3', 'gcp_copy3_pos', 260, -180);              // Google Cloud Copy 3 (Prod Docs)
      new DraggableItem('adk-object', 'adk_pos', -40, -180);                    // Bottom Mid Right
      new DraggableItem('adk-copy', 'adk_copy_pos', -140, -180);                // WAF Copy
      new DraggableItem('spanner-object', 'spanner_pos', 150, -180);            // Bottom Mid Center
      new DraggableItem('gdrive-object', 'gdrive_pos', 260, -180);              // Bottom Mid Right-Center (Central Docs)

      new DraggableItem('gdrive-copy-2', 'gdrive_copy2_pos', 430, -180);        // Google Drive Copy 2
      new DraggableItem('salesforce-object', 'salesforce_pos', 590, -180);      // Salesforce (Vector) Object
      new DraggableItem('moma-object', 'moma_pos', -140, 240);                  // Moma Object
      new DraggableItem('buganizer-object', 'buganizer_pos', -240, 240);        // Buganizer Object
      new DraggableItem('horizon-object', 'horizon_pos', -340, 240);            // Horizon Object
      new DraggableItem('github-object', 'github_pos', -440, 240);              // GitHub Object

      // Load Master Shared Layout Defaults (for Incognito & other browsers)
      LayoutManager.loadMasterDefaults();

      // Hook up Lock Master Layout Button
      const syncBtn = document.getElementById('btn-sync-layout');
      const isMirrored = window.location.port === '8010' || window.location.href.includes(':8010') || document.body.classList.contains('mirrored-view');
      if (syncBtn) {
        if (isMirrored) {
          syncBtn.style.display = 'none';
        } else {
          syncBtn.addEventListener('click', (e) => {
            e.preventDefault();
            LayoutManager.syncCurrentToMaster();
          });
        }
      }

      // If running on port 8010, poll for layout updates to mirror 8011
      if (isMirrored) {
        setInterval(() => {
          LayoutManager.loadMasterDefaults();
        }, 2000);
      }

      // Initialize Dual Marina Stepping Wheel Renderers
      this.marinaRenderer = new MarinaWheelRenderer(['marina-canvas-left', 'marina-canvas-right']);

      // Initial velocity
      state.pulleys[0].angularVel = (state.targetRPM * state.motorDir) * (2 * Math.PI / 60);

      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    initPulleys() {
      state.pulleys = [
        createPulley(0, 'Main Drive', state.largeWheelLines, 0, 0, state.bigRadius, true),
        createPulley(1, 'Pulley Left', state.smallWheelLines, 0, 0, state.smallRadius, false),
        createPulley(2, 'Pulley Right', state.smallWheelLines, 0, 0, state.smallRadius, false)
      ];
      this.updatePulleyPositions();
    }

    updatePulleyPositions() {
      const targetWidth = state.spacing * 2 + state.smallRadius * 2 + 80;
      const targetHeight = state.vDistance + state.bigRadius + state.smallRadius + 180;

      const scaleX = this.width / targetWidth;
      const scaleY = this.height / targetHeight;
      const baseScale = Math.min(1.0, Math.max(0.55, Math.min(scaleX, scaleY)));
      
      const rBig = state.bigRadius * baseScale;
      const rSmall = state.smallRadius * baseScale;
      const spacing = state.spacing * baseScale;
      const vDist = state.vDistance * baseScale;

      const cx = this.width / 2;
      const cy = this.height / 2;

      // Vertically center whole assembly including the extended basement
      const totalH = vDist + rBig + rSmall + 115 * baseScale;
      const topY = cy - totalH / 2 + rSmall + 10;
      const driveY = topY + vDist;

      // Bottom Center Large Wheel ("Central Totum")
      state.pulleys[0].x = cx;
      state.pulleys[0].y = driveY;
      state.pulleys[0].radius = rBig;

      // Top 2 Small Wheels (Left & Right)
      state.pulleys[1].x = cx - spacing;
      state.pulleys[1].y = topY;
      state.pulleys[1].radius = rSmall;

      state.pulleys[2].x = cx + spacing;
      state.pulleys[2].y = topY;
      state.pulleys[2].radius = rSmall;
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = window.devicePixelRatio || 1;

      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;

      this.ctx.resetTransform?.();
      this.ctx.scale(this.dpr, this.dpr);

      this.updatePulleyPositions();
    }

    updatePhysics(dt) {
      const delta = Math.min(dt, 0.1);
      const targetAngVel = (state.motorOn ? state.targetRPM * state.motorDir : 0) * (2 * Math.PI / 60);
      const driver = state.pulleys[0];

      if (state.isDraggingWheel) {
        driver.angularVel = this.dragAngularVel;
      } else if (state.motorOn) {
        const accelRate = (11 - state.inertia) * 3.5;
        driver.angularVel += (targetAngVel - driver.angularVel) * Math.min(1.0, accelRate * delta);
      } else {
        const frictionCoeff = state.friction * 0.4;
        driver.angularVel -= driver.angularVel * frictionCoeff * delta;
        if (Math.abs(driver.angularVel) < 0.005) {
          driver.angularVel = 0;
        }
      }

      state.linearSpeed = driver.angularVel * driver.radius;
      state.currentRPM = driver.angularVel * 60 / (2 * Math.PI);
      state.beltOffset += state.linearSpeed * delta;

      driver.angle += driver.angularVel * delta;

      for (let i = 1; i < state.pulleys.length; i++) {
        const p = state.pulleys[i];
        p.angularVel = (driver.angularVel * driver.radius) / p.radius;
        p.angle += p.angularVel * delta;
      }

      this.vibrationPhase += delta * Math.max(8, Math.abs(driver.angularVel) * 4);
    }

    // --- Draw Flow Arrowhead ---
    drawFlowArrow(ctx, x, y, angle, size = 6.5, color = '#00f0ff') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = color;

      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(-size * 0.6, -size * 0.6);
      ctx.lineTo(-size * 0.15, 0);
      ctx.lineTo(-size * 0.6, size * 0.6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // --- Reusable Curved Light Tube with Photon Movement Synchronized to Marina Spin ---
    drawCurvedLightTube(ctx, p0, p3, marinaStatus, options = {}) {
      const {
        curveAmountRatio = 0.22,
        collarStartColor = '#00f0ff',
        collarEndColor = '#f7a8e8',
        numLights = 10,
        reverseBulge = false,
        speedMultiplier = 1.0
      } = options;

      const dx = p3.x - p0.x;
      const dy = p3.y - p0.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 15) return;

      let nx = -dy / dist;
      let ny = dx / dist;
      if (reverseBulge) {
        nx = -nx;
        ny = -ny;
      }

      const curveAmount = Math.max(30, Math.min(100, dist * curveAmountRatio));
      const p1 = {
        x: p0.x + dx * 0.32 + nx * curveAmount,
        y: p0.y + dy * 0.32 + ny * curveAmount
      };
      const p2 = {
        x: p0.x + dx * 0.68 + nx * curveAmount,
        y: p0.y + dy * 0.68 + ny * curveAmount
      };

      const getBezierPoint = (t) => {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        const uuu = uu * u;
        const ttt = tt * t;

        return {
          x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
          y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
        };
      };

      ctx.save();

      const isMoving = marinaStatus.isMoving;

      // Outer Translucent Tube Glow
      const glowBlur = isMoving ? 14 : 8;
      const glowAlpha = isMoving ? 0.35 : 0.15;
      ctx.shadowColor = `rgba(218, 112, 214, ${glowAlpha})`;
      ctx.shadowBlur = glowBlur;
      ctx.lineWidth = 7;
      ctx.strokeStyle = `rgba(218, 112, 214, ${isMoving ? 0.24 : 0.12})`;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      ctx.stroke();

      // Glass Tube Conduit Core
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(20, 12, 28, 0.75)';
      ctx.stroke();

      // Thin Dual Glass Sheen Guide
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = isMoving ? 'rgba(247, 168, 232, 0.75)' : 'rgba(218, 112, 214, 0.4)';
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Connector Collars at Tube Endpoints
      const drawCollar = (pt, color) => {
        ctx.fillStyle = 'rgba(16, 10, 24, 0.95)';
        ctx.strokeStyle = color;
        ctx.lineWidth = isMoving ? 2.2 : 1.6;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      };
      drawCollar(p0, collarStartColor);
      drawCollar(p3, collarEndColor);

      // Flowing Lights synchronized to Marina spin
      const basePhase = (marinaStatus.totalProgress * speedMultiplier) % 1;

      for (let i = 0; i < numLights; i++) {
        const lightPhase = (basePhase + i / numLights) % 1;
        const pt = getBezierPoint(lightPhase);

        let alpha = 1;
        if (lightPhase < 0.08) {
          alpha = lightPhase / 0.08;
        } else if (lightPhase > 0.92) {
          alpha = (1 - lightPhase) / 0.08;
        }

        const baseIntensity = isMoving ? 1.0 : 0.65;
        const effectiveAlpha = alpha * baseIntensity;

        const isRose = i % 2 === 0;
        const glowColor = isRose 
          ? `rgba(247, 168, 232, ${effectiveAlpha * 0.95})` 
          : `rgba(0, 240, 255, ${effectiveAlpha * 0.95})`;

        ctx.save();
        ctx.shadowColor = isRose ? '#f7a8e8' : '#00f0ff';
        ctx.shadowBlur = isMoving ? 10 : 4;

        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isMoving ? 3.4 : 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${effectiveAlpha * 0.95})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isMoving ? 1.8 : 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      ctx.restore();
    }

    // --- Draw Curved Dotted Skill Conduit with Shorter Transparent Pipe & Text Badge ---
    drawCurvedSkillConduit(ctx, p0, p3, text, timestamp, options = {}) {
      const dx = p3.x - p0.x;
      const dy = p3.y - p0.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 20) return;

      const curveRatio = options.curveRatio || 0.16;
      const reverseBulge = options.reverseBulge || false;
      const bulgeSign = reverseBulge ? -1 : 1;

      // Gentle curved Bézier path
      const nx = (-dy / dist) * bulgeSign;
      const ny = (dx / dist) * bulgeSign;
      const curveAmount = Math.max(20, Math.min(70, dist * curveRatio));

      const p1 = {
        x: p0.x + dx * 0.35 + nx * curveAmount,
        y: p0.y + dy * 0.35 + ny * curveAmount
      };
      const p2 = {
        x: p0.x + dx * 0.65 + nx * curveAmount,
        y: p0.y + dy * 0.65 + ny * curveAmount
      };

      // 1. Static Small Real Round Dots along the curve
      ctx.save();
      const numDots = Math.max(16, Math.round(dist / 6.8));
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = 'rgba(0, 240, 255, 0.65)';
      ctx.shadowBlur = 4;

      for (let i = 0; i <= numDots; i++) {
        const t = i / numDots;
        const u = 1 - t;
        const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
        const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;

        ctx.beginPath();
        ctx.arc(x, y, 1.25, 0, Math.PI * 2);
        ctx.fill();
      }

      // Endpoint Connector Collars
      const drawPointCollar = (pt, color) => {
        ctx.fillStyle = 'rgba(10, 16, 26, 0.95)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      };
      drawPointCollar(p0, '#00f0ff');
      drawPointCollar(p3, '#00f0ff');

      ctx.restore();

      // 2. Position & Tangent Angle for the Pipe
      const tPipe = options.tPipe !== undefined ? options.tPipe : 0.40;
      const u = 1 - tPipe;
      const midX = u * u * u * p0.x + 3 * u * u * tPipe * p1.x + 3 * u * tPipe * tPipe * p2.x + tPipe * tPipe * tPipe * p3.x;
      const midY = u * u * u * p0.y + 3 * u * u * tPipe * p1.y + 3 * u * tPipe * tPipe * p2.y + tPipe * tPipe * tPipe * p3.y;

      const tanX = 3 * u * u * (p1.x - p0.x) + 6 * u * tPipe * (p2.x - p1.x) + 3 * tPipe * tPipe * (p3.x - p2.x);
      const tanY = 3 * u * u * (p1.y - p0.y) + 6 * u * tPipe * (p2.y - p1.y) + 3 * tPipe * tPipe * (p3.y - p2.y);
      const angle = Math.atan2(tanY, tanX);

      // 3. Shorter Transparent Pipe Geometry
      const fontSize = options.fontSize || 8.2;
      ctx.font = `700 ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
      const textW = ctx.measureText(text.toUpperCase()).width;

      const iconSize = options.iconSize || 16;
      const iconGap = options.iconGap || 6;

      let badgeW = Math.max(132, Math.round(textW + 22));
      let badgeH = options.badgeH || 19;
      let pipeW = options.pipeW || 25;

      if (options.icon) {
        badgeW = Math.max(160, Math.round(textW + 28 + iconSize + iconGap));
        badgeH = options.badgeH || 24;
        pipeW = options.pipeW || 34; // Increased size of the pipe
      }

      const pipeLen = options.pipeLen || Math.min(170, Math.max(badgeW + 18, dist * 0.44));
      const r = pipeW / 2;

      ctx.save();
      ctx.translate(midX, midY);
      ctx.rotate(angle);

      // Pipe Frosted Glass Glow & Body
      ctx.shadowColor = 'rgba(0, 240, 255, 0.35)';
      ctx.shadowBlur = 12;

      const pipeGrad = ctx.createLinearGradient(0, -pipeW / 2, 0, pipeW / 2);
      pipeGrad.addColorStop(0, 'rgba(0, 240, 255, 0.24)');
      pipeGrad.addColorStop(0.25, 'rgba(12, 18, 30, 0.72)');
      pipeGrad.addColorStop(0.75, 'rgba(16, 12, 26, 0.72)');
      pipeGrad.addColorStop(1, 'rgba(218, 112, 214, 0.20)');

      ctx.fillStyle = pipeGrad;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-pipeLen / 2, -pipeW / 2, pipeLen, pipeW, r);
      } else {
        ctx.rect(-pipeLen / 2, -pipeW / 2, pipeLen, pipeW);
      }
      ctx.fill();

      // Glass Pipe Outer Stroke
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Metallic End Collar Rings
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';

      ctx.beginPath();
      ctx.moveTo(-pipeLen / 2 + 3, -pipeW / 2);
      ctx.lineTo(-pipeLen / 2 + 3, pipeW / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pipeLen / 2 - 3, -pipeW / 2);
      ctx.lineTo(pipeLen / 2 - 3, pipeW / 2);
      ctx.stroke();

      // Longitudinal Sheen Highlight Line
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.moveTo(-pipeLen / 2 + 6, -pipeW / 4);
      ctx.lineTo(pipeLen / 2 - 6, -pipeW / 4);
      ctx.stroke();

      // 4. Centered Text Badge
      ctx.save();
      let textAngle = 0;
      let textNormalAngle = angle;
      while (textNormalAngle < 0) textNormalAngle += Math.PI * 2;
      while (textNormalAngle >= Math.PI * 2) textNormalAngle -= Math.PI * 2;
      if (textNormalAngle > Math.PI / 2 && textNormalAngle < (Math.PI * 3) / 2) {
        textAngle = Math.PI; // Keep text readable right-side up
      }
      ctx.rotate(textAngle);

      ctx.fillStyle = 'rgba(12, 16, 26, 0.94)';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
      ctx.lineWidth = 1.1;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 8;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 9.5);
      } else {
        ctx.rect(-badgeW / 2, -badgeH / 2, badgeW, badgeH);
      }
      ctx.fill();
      ctx.stroke();

      // Crisp White Text with subtle Cyan glow (and optional icon)
      if (options.icon && options.icon.complete && options.icon.naturalWidth !== 0) {
        const totalW = iconSize + iconGap + textW;

        // Draw icon on the left
        const iconX = -totalW / 2;
        const iconY = -iconSize / 2;
        ctx.drawImage(options.icon, iconX, iconY, iconSize, iconSize);

        // Draw text on the right
        ctx.shadowColor = 'rgba(0, 240, 255, 0.65)';
        ctx.shadowBlur = 4;
        ctx.font = `700 ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text.toUpperCase(), iconX + iconSize + iconGap, 0.5);
      } else {
        // Standard centered text drawing
        ctx.shadowColor = 'rgba(0, 240, 255, 0.65)';
        ctx.shadowBlur = 4;
        ctx.font = `700 ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text.toUpperCase(), 0, 0.5);
      }

      ctx.restore(); // Restore text flip
      ctx.restore(); // Restore pipe transform
    }

    // --- Draw All Curved Data Light Tubes (Left & Right Specular Circuits + Skills) ---
    drawDataConduits(ctx, timestamp) {
      if (!this.marinaRenderer) return;
      const marinaStatus = this.marinaRenderer.getProgress(timestamp);


      // 1. LEFT CIRCUIT
      const wsLeftEl = document.getElementById('workspace-left');
      const marinaLeftEl = document.getElementById('marina-left');
      const leftWheel = state.pulleys[1];

      let pWsLeft = null;
      let pMarinaLeft = null;

      if (wsLeftEl) {
        const wsLeftRect = wsLeftEl.getBoundingClientRect();
        pWsLeft = {
          x: wsLeftRect.left + wsLeftRect.width / 2,
          y: wsLeftRect.top + wsLeftRect.height / 2
        };
      }

      if (marinaLeftEl) {
        const marinaLeftRect = marinaLeftEl.getBoundingClientRect();
        pMarinaLeft = {
          x: marinaLeftRect.left + marinaLeftRect.width / 2,
          y: marinaLeftRect.top + marinaLeftRect.height / 2
        };

        if (pWsLeft) {
          this.drawCurvedLightTube(ctx, pWsLeft, pMarinaLeft, marinaStatus, {
            curveAmountRatio: 0.22,
            collarStartColor: '#00f0ff',
            collarEndColor: '#f7a8e8',
            numLights: 10,
            reverseBulge: true,
            speedMultiplier: 1.0
          });
        }

        if (leftWheel) {
          const pLeftWheel = {
            x: leftWheel.x,
            y: leftWheel.y
          };
          this.drawCurvedLightTube(ctx, pMarinaLeft, pLeftWheel, marinaStatus, {
            curveAmountRatio: 0.18,
            collarStartColor: '#f7a8e8',
            collarEndColor: '#00f0ff',
            numLights: 12,
            reverseBulge: true,
            speedMultiplier: 1.0
          });
        }
      }

      // 2. LEFT JETSKI SKILLS CONDUITS
      const skillsEl = document.getElementById('jetski-skills-badge') || document.getElementById('jetski-object');
      if (skillsEl) {
        const skillsRect = skillsEl.getBoundingClientRect();
        
        // Left side of Skills badge
        const pSkillsLeft = {
          x: skillsRect.left,
          y: skillsRect.top + skillsRect.height / 2
        };

        // Right side of Skills badge
        const pSkillsRight = {
          x: skillsRect.right,
          y: skillsRect.top + skillsRect.height / 2
        };

        // Bottom center of Skills badge
        const pSkillsBottom = {
          x: skillsRect.left + skillsRect.width / 2,
          y: skillsRect.bottom
        };

        // 2a. Jetski Skills (Right) -> Left Wheel (Top Apex): "Totum Retriever"
        if (leftWheel) {
          const pLeftWheelTop = {
            x: leftWheel.x,
            y: leftWheel.y - leftWheel.radius
          };
          this.drawCurvedSkillConduit(ctx, pSkillsRight, pLeftWheelTop, 'Totum Retriever', timestamp, {
            reverseBulge: true,
            tPipe: 0.30,
            curveRatio: 0.16
          });
        }

        // 2b. Jetski Skills (Bottom) -> Marina Wheel: "Totum Curator Skills"
        if (pMarinaLeft) {
          this.drawCurvedSkillConduit(ctx, pSkillsBottom, pMarinaLeft, 'Totum Curator Skills', timestamp, {
            reverseBulge: true,
            tPipe: 0.48,
            curveRatio: 0.18,
            fontSize: 10.5,
            badgeH: 22,
            pipeW: 30
          });
        }

        // 2c. Jetski Skills (Bottom) -> Personal Workspace: "Google Workspace"
        if (pWsLeft) {
          this.drawCurvedSkillConduit(ctx, pSkillsBottom, pWsLeft, 'Google Workspace', timestamp, {
            reverseBulge: false,
            tPipe: 0.28,
            curveRatio: 0.18
          });
        }

        // 2d. Jetski Skills (Left) -> Big Rectangular Basement (Left Side): "ACE Skills"
        const mainWheel = state.pulleys[0];
        if (mainWheel) {
          const baseW = mainWheel.radius * 4.15;
          const footY = mainWheel.y + mainWheel.radius + 126;
          const rectW = Math.max(980, Math.min(this.width - 48, baseW * 1.68));
          const rectH = 108;
          const rectX = mainWheel.x - rectW / 2;
          const pBasementLeft = {
            x: rectX,
            y: footY + rectH / 2
          };
          this.drawCurvedSkillConduit(ctx, pSkillsLeft, pBasementLeft, 'ACE Skills', timestamp, {
            reverseBulge: false, // Curved the other way
            tPipe: 0.35,
            curveRatio: 0.16,
            icon: this.aceImg,
            iconSize: 28,
            iconGap: 10,
            fontSize: 13.0,
            pipeW: 52,
            badgeH: 38,
            pipeLen: 230
          });
        }
      }

      // 3. RIGHT CIRCUIT (Specular)
      const wsRightEl = document.getElementById('workspace-right');
      const marinaRightEl = document.getElementById('marina-right');
      const rightWheel = state.pulleys[2];

      let pWsRight = null;
      let pMarinaRight = null;

      if (wsRightEl) {
        const wsRightRect = wsRightEl.getBoundingClientRect();
        pWsRight = {
          x: wsRightRect.left + wsRightRect.width / 2,
          y: wsRightRect.top + wsRightRect.height / 2
        };
      }

      if (marinaRightEl) {
        const marinaRightRect = marinaRightEl.getBoundingClientRect();
        pMarinaRight = {
          x: marinaRightRect.left + marinaRightRect.width / 2,
          y: marinaRightRect.top + marinaRightRect.height / 2
        };

        if (pWsRight) {
          this.drawCurvedLightTube(ctx, pWsRight, pMarinaRight, marinaStatus, {
            curveAmountRatio: 0.22,
            collarStartColor: '#00f0ff',
            collarEndColor: '#f7a8e8',
            numLights: 10,
            reverseBulge: false,
            speedMultiplier: 1.0
          });
        }

        if (rightWheel) {
          const pRightWheel = {
            x: rightWheel.x,
            y: rightWheel.y
          };
          this.drawCurvedLightTube(ctx, pMarinaRight, pRightWheel, marinaStatus, {
            curveAmountRatio: 0.18,
            collarStartColor: '#f7a8e8',
            collarEndColor: '#00f0ff',
            numLights: 12,
            reverseBulge: false,
            speedMultiplier: 1.0
          });
        }
      }

      // 4. RIGHT JETSKI SKILLS CONDUITS (Specular Mirrored)
      const skillsRightEl = document.getElementById('jetski-skills-badge-right') || document.getElementById('jetski-object-right');
      if (skillsRightEl) {
        const skillsRightRect = skillsRightEl.getBoundingClientRect();

        // Left side of Right Skills badge
        const pSkillsRightLeft = {
          x: skillsRightRect.left,
          y: skillsRightRect.top + skillsRightRect.height / 2
        };

        // Right side of Right Skills badge
        const pSkillsRightRight = {
          x: skillsRightRect.right,
          y: skillsRightRect.top + skillsRightRect.height / 2
        };

        // Bottom center of Right Skills badge
        const pSkillsRightBottom = {
          x: skillsRightRect.left + skillsRightRect.width / 2,
          y: skillsRightRect.bottom
        };

        // 4a. Right Jetski Skills (Left) -> Right Wheel (Top Apex): "Totum Retriever"
        if (rightWheel) {
          const pRightWheelTop = {
            x: rightWheel.x,
            y: rightWheel.y - rightWheel.radius
          };
          this.drawCurvedSkillConduit(ctx, pSkillsRightLeft, pRightWheelTop, 'Totum Retriever', timestamp, {
            reverseBulge: false, // Mirrored upward/inward arch towards right wheel top
            tPipe: 0.30,
            curveRatio: 0.16
          });
        }

        // 4b. Right Jetski Skills (Bottom) -> Right Marina Wheel: "Totum Curator Skills"
        if (pMarinaRight) {
          this.drawCurvedSkillConduit(ctx, pSkillsRightBottom, pMarinaRight, 'Totum Curator Skills', timestamp, {
            reverseBulge: false, // Mirrored downward arch towards right marina wheel
            tPipe: 0.48,
            curveRatio: 0.18,
            fontSize: 10.5,
            badgeH: 22,
            pipeW: 30
          });
        }

        // 4c. Right Jetski Skills (Bottom) -> Right Personal Workspace: "Google Workspace"
        if (pWsRight) {
          this.drawCurvedSkillConduit(ctx, pSkillsRightBottom, pWsRight, 'Google Workspace', timestamp, {
            reverseBulge: true, // Mirrored arc towards right workspace
            tPipe: 0.28,
            curveRatio: 0.18
          });
        }

        // 4d. Right Jetski Skills (Right) -> Big Rectangular Basement (Right Side): "ACE Skills"
        const mainWheel = state.pulleys[0];
        if (mainWheel) {
          const baseW = mainWheel.radius * 4.15;
          const footY = mainWheel.y + mainWheel.radius + 126;
          const rectW = Math.max(980, Math.min(this.width - 48, baseW * 1.68));
          const rectH = 108;
          const rectX = mainWheel.x - rectW / 2;
          const pBasementRight = {
            x: rectX + rectW,
            y: footY + rectH / 2
          };
          this.drawCurvedSkillConduit(ctx, pSkillsRightRight, pBasementRight, 'ACE Skills', timestamp, {
            reverseBulge: true, // Mirrored outward/downward arc towards right edge of basement
            tPipe: 0.35,
            curveRatio: 0.16,
            icon: this.aceImg,
            iconSize: 28,
            iconGap: 10,
            fontSize: 13.0,
            pipeW: 52,
            badgeH: 38,
            pipeLen: 230
          });
        }
      }
    }

    // --- Draw Semi-Transparent Pipe Conduit & Text Label (Marina Colors, White Text) ---
    drawConduitPipe(ctx, pStart, pEnd, theme, text) {
      const dx = pEnd.x - pStart.x;
      const dy = pEnd.y - pStart.y;
      const spanLen = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      const midX = (pStart.x + pEnd.x) / 2;
      const midY = (pStart.y + pEnd.y) / 2;

      const pipeLen = spanLen * 0.52;
      const pipeW = 26;
      const r = 13;

      ctx.save();
      ctx.translate(midX, midY);
      ctx.rotate(angle);

      // Pipe Glass Glow & Semi-Transparent Body
      ctx.shadowColor = 'rgba(218, 112, 214, 0.45)';
      ctx.shadowBlur = 14;

      const pipeGrad = ctx.createLinearGradient(0, -pipeW / 2, 0, pipeW / 2);
      pipeGrad.addColorStop(0, 'rgba(247, 168, 232, 0.26)');
      pipeGrad.addColorStop(0.2, 'rgba(24, 12, 32, 0.68)');
      pipeGrad.addColorStop(0.8, 'rgba(16, 8, 24, 0.72)');
      pipeGrad.addColorStop(1, 'rgba(218, 112, 214, 0.22)');

      ctx.fillStyle = pipeGrad;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-pipeLen / 2, -pipeW / 2, pipeLen, pipeW, r);
      } else {
        ctx.rect(-pipeLen / 2, -pipeW / 2, pipeLen, pipeW);
      }
      ctx.fill();

      // Glass Pipe Outer Stroke
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(218, 112, 214, 0.65)';
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Metallic / Marina Violet Collar Rings at Ends
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(247, 168, 232, 0.88)';

      ctx.beginPath();
      ctx.moveTo(-pipeLen / 2 + 3, -pipeW / 2);
      ctx.lineTo(-pipeLen / 2 + 3, pipeW / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pipeLen / 2 - 3, -pipeW / 2);
      ctx.lineTo(pipeLen / 2 - 3, pipeW / 2);
      ctx.stroke();

      // Longitudinal Sheen Highlight Line
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 230, 250, 0.35)';
      ctx.beginPath();
      ctx.moveTo(-pipeLen / 2 + 8, -pipeW / 4);
      ctx.lineTo(pipeLen / 2 - 8, -pipeW / 4);
      ctx.stroke();

      // Centered Label Badge
      ctx.save();
      let textAngle = 0;
      let textNormalAngle = angle;
      while (textNormalAngle < 0) textNormalAngle += Math.PI * 2;
      while (textNormalAngle >= Math.PI * 2) textNormalAngle -= Math.PI * 2;
      if (textNormalAngle > Math.PI / 2 && textNormalAngle < (Math.PI * 3) / 2) {
        textAngle = Math.PI;
      }
      ctx.rotate(textAngle);

      const isConsult = text.toUpperCase().includes('CONSULT');
      const badgeW = isConsult ? 168 : 154;
      const badgeH = 20;

      ctx.fillStyle = 'rgba(18, 10, 24, 0.94)';
      ctx.strokeStyle = 'rgba(218, 112, 214, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 10);
      } else {
        ctx.rect(-badgeW / 2, -badgeH / 2, badgeW, badgeH);
      }
      ctx.fill();
      ctx.stroke();

      // Crisp White Text
      ctx.shadowColor = 'rgba(218, 112, 214, 0.65)';
      ctx.shadowBlur = 5;
      ctx.font = '700 8.8px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text.toUpperCase(), 0, 0.5);

      ctx.restore();
      ctx.restore();
    }

    // --- Belt Drawing with Accurate Flow Arrowheads & Conduit Pipes ---
    drawDirectBelt(c1, c2, theme) {
      const tangents = getOuterTangents(c1, c2);
      if (!tangents) return;

      const { leftSpan, rightSpan, dist } = tangents;
      const ctx = this.ctx;

      const c1ArcCCW = findOuterArcDir(c1.x, c1.y, c2.x, c2.y, leftSpan.angle1, rightSpan.angle1);
      const c2ArcCCW = findOuterArcDir(c2.x, c2.y, c1.x, c1.y, rightSpan.angle2, leftSpan.angle2);

      const sagAmp = state.showVibration ? (1.0 - state.tension) * 4 * Math.sin(this.vibrationPhase) : 0;
      
      const midLeft = { x: (leftSpan.p1.x + leftSpan.p2.x) / 2, y: (leftSpan.p1.y + leftSpan.p2.y) / 2 };
      const midRight = { x: (rightSpan.p1.x + rightSpan.p2.x) / 2, y: (rightSpan.p1.y + rightSpan.p2.y) / 2 };

      const normLeftX = -(leftSpan.p2.y - leftSpan.p1.y) / dist;
      const normLeftY = (leftSpan.p2.x - leftSpan.p1.x) / dist;

      const normRightX = -(rightSpan.p2.y - rightSpan.p1.y) / dist;
      const normRightY = (rightSpan.p2.x - rightSpan.p1.x) / dist;

      ctx.save();
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Belt Outer Casing
      ctx.strokeStyle = theme.beltBase;
      ctx.beginPath();
      ctx.arc(c1.x, c1.y, c1.radius, rightSpan.angle1, leftSpan.angle1, c1ArcCCW);
      ctx.quadraticCurveTo(midLeft.x - normLeftX * sagAmp, midLeft.y - normLeftY * sagAmp, leftSpan.p2.x, leftSpan.p2.y);
      ctx.arc(c2.x, c2.y, c2.radius, leftSpan.angle2, rightSpan.angle2, c2ArcCCW);
      ctx.quadraticCurveTo(midRight.x + normRightX * sagAmp, midRight.y + normRightY * sagAmp, rightSpan.p1.x, rightSpan.p1.y);
      ctx.closePath();
      ctx.stroke();

      // Center Track
      ctx.lineWidth = 2;
      ctx.strokeStyle = theme.beltRidge;
      ctx.stroke();

      // Flow Arrowheads
      const isCW = state.pulleys[0].angularVel >= 0;

      const angleUpLeft = Math.atan2(leftSpan.p2.y - leftSpan.p1.y, leftSpan.p2.x - leftSpan.p1.x);
      const angleDownRight = Math.atan2(rightSpan.p1.y - rightSpan.p2.y, rightSpan.p1.x - rightSpan.p2.x);

      const leftArrowAngle = isCW ? angleUpLeft : angleUpLeft + Math.PI;
      const rightArrowAngle = isCW ? angleDownRight : angleDownRight + Math.PI;

      const arrowSpacing = 30;
      const totalSpan = dist;
      
      const offsetLeft = ((state.beltOffset % arrowSpacing) + arrowSpacing) % arrowSpacing;
      const offsetRight = ((state.beltOffset % arrowSpacing) + arrowSpacing) % arrowSpacing;

      for (let s = offsetLeft; s < totalSpan - 10; s += arrowSpacing) {
        if (s < 12) continue;
        const t = s / totalSpan;
        const tx = leftSpan.p1.x + (leftSpan.p2.x - leftSpan.p1.x) * t - normLeftX * sagAmp * (1 - 4 * (t - 0.5) ** 2);
        const ty = leftSpan.p1.y + (leftSpan.p2.y - leftSpan.p1.y) * t - normLeftY * sagAmp * (1 - 4 * (t - 0.5) ** 2);
        this.drawFlowArrow(ctx, tx, ty, leftArrowAngle, 6.5, theme.beltArrow);
      }

      for (let s = offsetRight; s < totalSpan - 10; s += arrowSpacing) {
        if (s < 12) continue;
        const t = s / totalSpan;
        const tx = rightSpan.p2.x + (rightSpan.p1.x - rightSpan.p2.x) * t + normRightX * sagAmp * (1 - 4 * (t - 0.5) ** 2);
        const ty = rightSpan.p2.y + (rightSpan.p1.y - rightSpan.p2.y) * t + normRightY * sagAmp * (1 - 4 * (t - 0.5) ** 2);
        this.drawFlowArrow(ctx, tx, ty, rightArrowAngle, 6.5, theme.beltArrow);
      }

      ctx.restore();

      if (isCW) {
        this.drawConduitPipe(ctx, leftSpan.p1, leftSpan.p2, theme, 'Consult Collective Brain');
        this.drawConduitPipe(ctx, rightSpan.p2, rightSpan.p1, theme, 'Feed Collective Brain');
      } else {
        this.drawConduitPipe(ctx, rightSpan.p1, rightSpan.p2, theme, 'Consult Collective Brain');
        this.drawConduitPipe(ctx, leftSpan.p2, leftSpan.p1, theme, 'Feed Collective Brain');
      }
    }

    // --- Wheel Drawing (Artwork + Centered Text Hub) ---
    drawWheel(pulley, theme, isLarge = false) {
      const { x, y, radius, angle, lines } = pulley;
      const ctx = this.ctx;

      ctx.save();
      ctx.translate(x, y);

      // 1. Outer Belt Guide & Drop Shadow
      ctx.shadowColor = theme.accentGlow;
      ctx.shadowBlur = isLarge ? 24 : 14;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      ctx.fillStyle = theme.wheelOuter;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // Clear shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // 2. Machined Outer Bevel Rim
      ctx.lineWidth = isLarge ? 4 : 2.5;
      ctx.strokeStyle = theme.wheelBevel;
      ctx.stroke();

      // 3. Rotating Artwork Image Content
      ctx.save();
      ctx.rotate(angle);

      // Circular Clipping Mask
      const clipRadius = radius - (isLarge ? 3 : 2);
      ctx.beginPath();
      ctx.arc(0, 0, clipRadius, 0, Math.PI * 2);
      ctx.clip();

      if (isLarge) {
        // Large Wheel: Central Totum Network Graph Image
        if (largeImageLoaded || (largeWheelImg.complete && largeWheelImg.naturalWidth > 0)) {
          ctx.drawImage(largeWheelImg, -radius, -radius, radius * 2, radius * 2);
        } else {
          ctx.fillStyle = theme.wheelInner;
          ctx.fill();
        }
      } else {
        // Small Wheels: Personal Totum Glowing Neural Brain Image
        if (brainImageLoaded || (brainWheelImg.complete && brainWheelImg.naturalWidth > 0)) {
          ctx.drawImage(brainWheelImg, -radius, -radius, radius * 2, radius * 2);
        } else {
          ctx.fillStyle = theme.wheelInner;
          ctx.fill();
        }
      }

      ctx.restore();

      // 4. Subtle Outer Rim Highlight Ring
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, radius - (isLarge ? 3 : 2), 0, Math.PI * 2);
      ctx.stroke();

      // 5. Outer Belt Groove Channel
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, radius - 1, 0, Math.PI * 2);
      ctx.stroke();

      // 6. Centered Upright Hub (Text, Greek Temple & Latin Inscription on Large Wheel)
      this.drawCenteredTextHub(ctx, radius, lines, isLarge, theme);

      ctx.restore();
    }

    // --- Draw Classical Greek Temple Icon (3 Columns, Pediment & Steps) ---
    drawGreekTempleIcon(ctx, x, y, w, h, theme) {
      ctx.save();
      ctx.translate(x, y);

      const color = theme.accent || '#00f0ff';

      ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = color;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.18)';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const halfW = w / 2;
      const roofH = h * 0.32;
      const entablatureH = 3.6;
      const columnH = h * 0.46;
      const step1H = 3;
      const step2H = 3.5;

      const topY = -h / 2;
      const roofBaseY = topY + roofH;
      const entablatureY = roofBaseY + entablatureH;
      const columnBaseY = entablatureY + columnH;
      const step1Y = columnBaseY + step1H;

      // 1. Pediment (Triangular Gable Roof)
      ctx.beginPath();
      ctx.moveTo(0, topY);
      ctx.lineTo(halfW, roofBaseY);
      ctx.lineTo(-halfW, roofBaseY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pediment Center Rosette Dot
      ctx.beginPath();
      ctx.arc(0, topY + roofH * 0.65, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 4;
      ctx.fill();

      // 2. Entablature / Architrave Lintel Beam
      ctx.fillStyle = 'rgba(10, 18, 30, 0.9)';
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fillRect(-halfW - 1, roofBaseY, w + 2, entablatureH);
      ctx.strokeRect(-halfW - 1, roofBaseY, w + 2, entablatureH);

      // 3. 3 Classical Columns (Left, Center, Right)
      const colSpacing = halfW * 0.66;
      const colPositions = [-colSpacing, 0, colSpacing];
      const colW = 3.8;
      const capW = 7.5;

      colPositions.forEach(colX => {
        ctx.fillStyle = color;
        ctx.fillRect(colX - capW / 2, entablatureY, capW, 1.8);

        const shaftGrad = ctx.createLinearGradient(colX - colW / 2, 0, colX + colW / 2, 0);
        shaftGrad.addColorStop(0, 'rgba(0, 240, 255, 0.9)');
        shaftGrad.addColorStop(0.5, '#ffffff');
        shaftGrad.addColorStop(1, 'rgba(0, 240, 255, 0.85)');

        ctx.fillStyle = shaftGrad;
        ctx.fillRect(colX - colW / 2, entablatureY + 1.8, colW, columnH - 3.6);

        ctx.strokeStyle = 'rgba(10, 18, 30, 0.75)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(colX, entablatureY + 2.5);
        ctx.lineTo(colX, entablatureY + columnH - 2.5);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.fillRect(colX - capW / 2, entablatureY + columnH - 1.8, capW, 1.8);
      });

      // 4. Stepped Base (Stylobate Platform - 2 Steps)
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = color;
      ctx.fillStyle = 'rgba(12, 20, 32, 0.94)';

      const s1W = w + 4;
      ctx.fillRect(-s1W / 2, columnBaseY, s1W, step1H);
      ctx.strokeRect(-s1W / 2, columnBaseY, s1W, step1H);

      const s2W = w + 10;
      ctx.fillRect(-s2W / 2, step1Y, s2W, step2H);
      ctx.strokeRect(-s2W / 2, step1Y, s2W, step2H);

      ctx.restore();
    }

    // --- Centered Upright Hub (With Greek Temple & 2-Line Latin Inscription on Large Wheel) ---
    drawCenteredTextHub(ctx, radius, lines, isLarge, theme) {
      ctx.save();

      const hubR = radius * (isLarge ? 0.44 : 0.52);

      // Hub Drop Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = isLarge ? 16 : 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 3;

      // Hub Disc Gradient Background
      const hubGrad = ctx.createRadialGradient(0, 0, hubR * 0.2, 0, 0, hubR);
      hubGrad.addColorStop(0, theme.hubBgGrad1);
      hubGrad.addColorStop(1, theme.hubBgGrad2);

      ctx.fillStyle = hubGrad;
      ctx.beginPath();
      ctx.arc(0, 0, hubR, 0, Math.PI * 2);
      ctx.fill();

      // Clear Shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Subtle Outer Hub Ring Border
      ctx.lineWidth = isLarge ? 2 : 1.4;
      ctx.strokeStyle = theme.hubBorder;
      ctx.stroke();

      // Inner Accent Glow Ring
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(0, 0, hubR - (isLarge ? 3 : 2), 0, Math.PI * 2);
      ctx.stroke();

      if (isLarge) {
        // Large Wheel: Text moved to top with reduced font + Greek Temple Icon + Latin Inscription below
        const fontSize = Math.max(7.5, Math.round(radius * 0.082));
        const textCenterY = -hubR * 0.48;
        const lineSpacing = fontSize * 1.15;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Row 1: "Central" (White bold)
        ctx.font = `700 ${fontSize}px 'Inter', -apple-system, sans-serif`;
        ctx.fillStyle = theme.textPrimary;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(lines[0], 0, textCenterY - lineSpacing * 0.52);

        // Row 2: "Totum" (Cyan accent bold)
        ctx.font = `700 ${fontSize * 1.05}px 'Inter', -apple-system, sans-serif`;
        ctx.fillStyle = theme.textAccent;
        ctx.fillText(lines[1], 0, textCenterY + lineSpacing * 0.52);

        // 3-Column Greek Temple Icon positioned in center hub
        const templeW = hubR * 0.74;
        const templeH = hubR * 0.44;
        const templeY = hubR * 0.01;
        this.drawGreekTempleIcon(ctx, 0, templeY, templeW, templeH, theme);

        // Ancient Latin text in 2 lines detached below the Greek Temple
        const latinFontSize = Math.max(5.2, Math.round(radius * 0.040));
        const latinLineSpacing = latinFontSize * 1.25;
        const latinBaseY = templeY + templeH / 2 + latinFontSize * 2.65;

        ctx.save();
        ctx.font = `700 ${latinFontSize}px 'Cinzel', 'Trajan Pro', 'Georgia', 'Times New Roman', serif`;
        ctx.fillStyle = '#e0f7ff';
        ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
        ctx.shadowBlur = 6;
        ctx.letterSpacing = '0.9px';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Line 1: "TOTUM MAIUS EST"
        ctx.fillText('TOTUM MAIUS EST', 0, latinBaseY);
        // Line 2: "SUMMA PARTE"
        ctx.fillText('SUMMA PARTE', 0, latinBaseY + latinLineSpacing);

        ctx.restore();
      } else {
        // Small Wheels: Standard 2-Row Centered Text
        const fontScale = 0.18;
        const fontSize = Math.max(8.5, Math.round(radius * fontScale));
        const lineSpacing = fontSize * 1.15;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Row 1: "Personal" (White bold)
        ctx.font = `700 ${fontSize}px 'Inter', -apple-system, sans-serif`;
        ctx.fillStyle = theme.textPrimary;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(lines[0], 0, -lineSpacing * 0.52);

        // Row 2: "Totum" (Cyan accent bold)
        ctx.font = `700 ${fontSize * 1.05}px 'Inter', -apple-system, sans-serif`;
        ctx.fillStyle = theme.textAccent;
        ctx.fillText(lines[1], 0, lineSpacing * 0.52);
      }

      ctx.restore();
    }

    // --- Draw Triangular Support Basement Behind the Large Wheel (Moved Down) ---
    drawWheelSupportBasement(wheel, theme) {
      const { x, y, radius } = wheel;
      const ctx = this.ctx;

      const baseW = radius * 4.15;        // Generous lateral stance
      const topApexY = y - radius * 0.15; // Apex hidden behind the wheel
      const basementRoomH = 126;          // Moved bottom line down for generous vertical height
      const footY = y + radius + basementRoomH; // Bottom baseline

      const leftX = x - baseW / 2;
      const rightX = x + baseW / 2;

      ctx.save();

      // 1. Basement Drop Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;

      // 2. Main Triangular Chassis Plate
      const chassisGrad = ctx.createLinearGradient(x, topApexY, x, footY);
      chassisGrad.addColorStop(0, '#101622');
      chassisGrad.addColorStop(0.5, '#151d2c');
      chassisGrad.addColorStop(1, '#0c1018');

      ctx.fillStyle = chassisGrad;
      ctx.beginPath();
      ctx.moveTo(x, topApexY);
      ctx.lineTo(rightX, footY);
      ctx.lineTo(leftX, footY);
      ctx.closePath();
      ctx.fill();

      // Clear Shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // 3. Machined Outer Bevel Border (Clean line around the triangle)
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.stroke();

      // 4. Wide Rectangular Basement Attached Just Below the Triangle (Fitted to page)
      const rectW = Math.max(980, Math.min(this.width - 48, baseW * 1.68));
      const rectH = 108;
      const rectX = x - rectW / 2;
      const rectY = footY; // Attached directly to the bottom line of the triangle

      // Rectangular Basement Drop Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;

      // Rectangular Chassis Body
      const rectGrad = ctx.createLinearGradient(x, rectY, x, rectY + rectH);
      rectGrad.addColorStop(0, '#101724');
      rectGrad.addColorStop(0.5, '#151e2e');
      rectGrad.addColorStop(1, '#0c1018');

      ctx.fillStyle = rectGrad;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(rectX, rectY, rectW, rectH, 6);
      } else {
        ctx.rect(rectX, rectY, rectW, rectH);
      }
      ctx.fill();

      // Clear Shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Outer Bevel Border on Rectangular Basement
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
      ctx.stroke();

      // Top Connection Seam Highlight
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
      ctx.beginPath();
      ctx.moveTo(leftX, footY);
      ctx.lineTo(rightX, footY);
      ctx.stroke();



      ctx.restore();
    }

    render(timestamp) {
      const ctx = this.ctx;
      const theme = state.theme;

      // 1. Main Background
      ctx.clearRect(0, 0, this.width, this.height);

      const bgGrad = ctx.createRadialGradient(
        this.width / 2, this.height / 2 + 80, 40,
        this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.85
      );
      bgGrad.addColorStop(0, theme.bgGrad1);
      bgGrad.addColorStop(1, theme.bgGrad2);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      // 2. Dual Specular Curved Fiber-Optic Light Conduits (Left & Right Circuits)
      this.drawDataConduits(ctx, timestamp);

      // 3. Triangular Support Basement (Drawn behind the large wheel)
      this.drawWheelSupportBasement(state.pulleys[0], theme);

      // 4. Belts & Conduit Pipes (Connecting Central Totum to the 2 Personal Totums: Left and Right)
      this.drawDirectBelt(state.pulleys[0], state.pulleys[1], theme);
      this.drawDirectBelt(state.pulleys[0], state.pulleys[2], theme);

      // 5. Top 2 Small Wheels ("Personal Totum" with Brain artwork)
      this.drawWheel(state.pulleys[1], theme, false);
      this.drawWheel(state.pulleys[2], theme, false);

      // 6. Bottom Center Large Wheel ("Central Totum" with Network Graph artwork & Greek Temple Icon)
      this.drawWheel(state.pulleys[0], theme, true);

      // 7. Independent Marina Stepping Wheels (Dual synchronized canvases)
      if (this.marinaRenderer) {
        this.marinaRenderer.render(timestamp);
      }
    }

    loop(timestamp) {
      const dt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

      this.updatePhysics(dt);
      this.render(timestamp);

      requestAnimationFrame(this.loop);
    }

    // --- Interactive Controls ---
    setupEventListeners() {
      window.addEventListener('resize', () => this.resize());

      const isMirrored = window.location.port === '8010' || window.location.href.includes(':8010') || document.body.classList.contains('mirrored-view');

      if (!isMirrored) {
        this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        window.addEventListener('pointermove', (e) => this.onPointerMove(e));
        window.addEventListener('pointerup', (e) => this.onPointerUp(e));
        window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
      }

      window.addEventListener('keydown', (e) => {
        if (isMirrored) {
          return;
        }
        if (e.code === 'Space') {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
            return;
          }
          e.preventDefault();
          state.motorOn = !state.motorOn;
        } else if (e.code === 'KeyR') {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
            return;
          }
          e.preventDefault();
          state.motorDir *= -1;
        }
      });
    }

    getPointerPos(e) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }

    onPointerDown(e) {
      const pos = this.getPointerPos(e);
      state.dragMoved = false;

      for (let i = 0; i < state.pulleys.length; i++) {
        const p = state.pulleys[i];
        const dist = Math.hypot(pos.x - p.x, pos.y - p.y);

        if (dist <= p.radius + 15) {
          state.isDraggingWheel = true;
          state.draggedWheelIdx = i;
          state.dragLastAngle = Math.atan2(pos.y - p.y, pos.x - p.x);
          this.dragAngularVel = 0;
          return;
        }
      }
    }

    onPointerMove(e) {
      if (!state.isDraggingWheel || state.draggedWheelIdx === -1) return;

      const pos = this.getPointerPos(e);
      const p = state.pulleys[state.draggedWheelIdx];
      const currentAngle = Math.atan2(pos.y - p.y, pos.x - p.x);

      let deltaAngle = currentAngle - state.dragLastAngle;
      while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
      while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

      if (Math.abs(deltaAngle) > 0.01) {
        state.dragMoved = true;
      }

      state.dragLastAngle = currentAngle;

      const ratioToDriver = p.isDriver ? 1 : p.radius / state.pulleys[0].radius;
      this.dragAngularVel = (deltaAngle / 0.016) * ratioToDriver;

      state.pulleys[0].angle += deltaAngle * ratioToDriver;
      state.pulleys[0].angularVel = this.dragAngularVel;
    }

    onPointerUp(e) {
      if (state.isDraggingWheel) {
        if (!state.dragMoved && e) {
          state.motorOn = !state.motorOn;
        }
        state.isDraggingWheel = false;
        state.draggedWheelIdx = -1;
      }
    }
  }

  // Fetch configuration from server before starting the app
  async function startApp() {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      new DynamicBeltApp(config);
    } catch (e) {
      console.error("Failed to load server config, falling back to port detection:", e);
      // Fallback detection in case backend is static / config fails
      const isMirrored = window.location.port === '8010' || window.location.href.includes(':8010');
      new DynamicBeltApp({ readOnly: isMirrored });
    }
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }
})();
