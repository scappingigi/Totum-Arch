# 🏛️ Project ACE Architecture — Master Creation Prompt & Blueprint

This document contains the complete, self-contained prompt and technical specification required to generate the **Project ACE Architecture WebApp** (with Dynamic Belt & Pulley Mechanical Engine, Specular Data Circuits, Stepping Sidecar Wheels, Anchor-Aware Layout Synchronizer, and Multi-Screen Server) entirely from scratch.

---

## 🎯 Master One-Shot Prompt (Copy & Paste to LLM / Agent)

```markdown
Build a dynamic, animated, single-page cybernetic web application titled **"Project ACE Architecture"** (subtitles: *"With local second brains"* and *"And central collective brain"*). 

The app visualizes a distributed AI agent architecture as an interactive mechanical and holographic engine combining HTML5 Canvas, DOM draggable glassmorphism cards, specular data conduits, stepping capsule wheels, and responsive multi-screen layout synchronization.

### Key Requirements & Specifications:

1. **Visual Aesthetic & Styling**:
   - **Theme**: Deep cyberpunk / dark glassmorphism (`#070b12` space background with radial neon ambient glows).
   - **Palette**: Electric Cyan (`#00f0ff`), Vivid Magenta/Purple (`#866bf6`, `#cba9fd`), Deep Blue (`#1589ee`), Warm Gold (`#fbbc05`), Coral Red (`#ea4335`), and Emerald Green (`#34a853`).
   - **Typography**: `Cinzel` (bold serif for titles & machinery headers) and `Inter` (clean sans-serif for labels, telemetry, and cards).
   - **Visual Effects**: Glowing neon dropshadows, frosted glass badges (`backdrop-filter: blur(12px)`), pulsing border gradients, and interactive hover highlights.

2. **Kinematic Pulley & Belt Transmission Engine (HTML5 Canvas)**:
   - **Wheels**:
     - **1 Large Central Drive Wheel (Bottom-Center)** representing *"Central Totum / Central Collective Brain"*. Rotates continuously with machined rim, inner radial spokes, and custom flywheel image (`large-wheel.png`).
     - **2 Small Driven Wheels (Top-Left & Top-Right)** representing *"Personal Totum / Local Second Brains"*. Rotates in physical kinematic synchronization according to gear ratio ($\omega_{\text{small}} \cdot r_{\text{small}} = \omega_{\text{big}} \cdot r_{\text{big}}$) with glowing neural brain artwork (`brain-wheel.jpg`).
   - **Belts**:
     - Dual continuous physical belts connecting the central drive wheel to the left and right wheels using exact tangent vector calculations and circular wrap arcs.
     - Flowing neon photon pulses / energy particles streaming along the belt trajectories in the direction of motion.
   - **Chassis**:
     - Machined structural triangular truss linking all three wheels.
     - Lower cybernetic rectangular basement platform with glowing perimeter holding aligned internal tool nodes.

3. **Specular Data Circuits & Curved Conduits**:
   - Two mirrored (left & right) cybernetic circuits connecting the agent interfaces to the system modules via curved frosted-glass sleeve conduits with flowing data pulses:
     - **Totum Retriever Skills**: Curved conduit from Jetski Skills badge to Top Apex of Personal Totum wheel (`pipeLen: 190px`, `fontSize: 10.5px`).
     - **Totum Local Curator Skills**: Curved conduit from Jetski Skills badge to Marina Wheel (`pipeLen: 215px`, `fontSize: 10.5px`).
     - **Google Workspace Skills**: Curved conduit from Jetski Skills badge to Personal Workspace card (`pipeLen: 210px`, `fontSize: 10.5px`).
     - **ACE Skills**: Extended curved conduit from Jetski Skills badge down to the basement hub (`pipeLen: 230px`, `fontSize: 13.0px`, `iconSize: 28px`, `pipeW: 52px`, `badgeH: 38px`, featuring the preloaded embedded ACE logo).

4. **Stepping Sidecar Wheels ("Marina Capsule Sidecar Curator")**:
   - Two dedicated mini-canvas wheels (Left & Right) representing sidecar curation pipelines.
   - Each wheel has a 4-segmented capsule dial that executes a discrete **90° stepped rotation every 4.0 seconds** with smooth cubic easing and neon indexing marks.

5. **Interactive Floating & Draggable DOM Modules**:
   - **Page Title**: 3-row center-top header:
     - Row 1: `Project ACE Architecture` (32px, Cinzel bold, neon cyan glow)
     - Row 2: `With local second brains` (15px, Inter uppercase)
     - Row 3: `And central collective brain` (15px, Inter uppercase)
   - **Jetski Agents (Left & Right)**: Draggable Jetski icon with gradient sparkle "Skills" badge.
   - **Personal Workspaces (Left & Right)**: Glassmorphism preview cards (`Workspace.png`).
   - **Central Tool Nodes (Floating)**:
     - `Central Curator` (ADK icon)
     - `Semantic Links` (Spanner icon)
     - `Central Docs` (Google Drive icon)
     - `Totum Project` (Google Cloud icon)
   - **Basement Nodes (10 Horizontally Aligned Items)**:
     - Symmetrically aligned across the basement chassis (`offsetY = 45.0px`, uniform `116px` step from `-522px` to `+522px`):
       1. `go/demos` (Google Cloud)
       2. `Shared Drive` (Google Drive)
       3. `Vector` (Salesforce)
       4. `Moma` (Moma)
       5. `Horizon` (Horizon)
       6. `GitHub` (GitHub with inverted dark-theme SVG)
       7. `Buganizer` (Buganizer)
       8. `WAF` (ADK)
       9. `Prod Docs` (Google Cloud)
       10. `Qwiklabs` (Google Cloud)

6. **Anchor-Aware Layout Engine & Responsive Proportional Anchoring**:
   - Full drag-and-drop capability for every floating module with mouse and touch support.
   - Automatic screen-zone categorization (`anchor: "left" | "center" | "right"`, `vAnchor: "top" | "bottom"`).
   - Responsive scaling: When resizing between laptop, 4K, or Ultrawide, central items stay locked relative to canvas midline, left items stay locked relative to left edge, and right items stay locked relative to right edge.

7. **Multi-Screen Sync Backend (`server.py`)**:
   - Lightweight Python HTTP server handling static assets and a REST endpoint `POST /api/save-layout`.
   - Floating `"💾 Lock Layout for All Browsers"` button that serializes the current screen coordinates to `default_positions.json`.
   - Real-time mirrored display support (e.g. Master on port `8011`/`8022`, Mirror on port `8010`/`8020`).

8. **Web Audio API Procedural Sound Engine**:
   - Procedural mechanical hum and belt friction synthesizer generating smooth pitch-modulated ambient sound without external MP3/WAV files.
```

---

## 🏗️ Technical Architecture & Component Breakdown

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 Project ACE Architecture                │
                  │               With local second brains                  │
                  │              And central collective brain               │
                  └─────────────────────────────────────────────────────────┘

   [LEFT CIRCUIT]                                                        [RIGHT CIRCUIT]
 ┌─────────────────┐                                                   ┌─────────────────┐
 │ Jetski (Left)   │                                                   │  Jetski (Right) │
 │ ├─ Skills Badge │                                                   │ ├─ Skills Badge │
 └────────┬────────┘                                                   └────────┬────────┘
          │ (Totum Retriever)                                (Totum Retriever) │
          ▼                                                                     ▼
 ┌─────────────────┐                                                   ┌─────────────────┐
 │  Personal Totum │ ═══════════ (Photon Energy Belts) ═══════════════ │  Personal Totum │
 │  (Left Driven)  │ \                                               / │  (Right Driven) │
 └─────────────────┘   \                                           /   └─────────────────┘
          │              \                                       /              │
(Totum Curator)            \                                   /          (Totum Curator)
          ▼                  \                               /                  ▼
 ┌─────────────────┐           ▼                           ▼           ┌─────────────────┐
 │  Marina Capsule │             ┌───────────────────────┐             │  Marina Capsule │
 │ (90° Step/4.0s) │             │     Central Totum     │             │ (90° Step/4.0s) │
 └─────────────────┘             │  (Large Drive Wheel)  │             └─────────────────┘
          │                      └───────────────────────┘                      │
 (Workspace Skills)                          │                         (Workspace Skills)
          ▼                                  │                                  ▼
 ┌─────────────────┐                         │                         ┌─────────────────┐
 │ Workspace (Left)│                         │                         │Workspace (Right)│
 └─────────────────┘                         │                         └─────────────────┘
          │                                  │                                  │
          └─────────────────┐                │                ┌─────────────────┘
              (ACE Skills)  ▼                ▼                ▼  (ACE Skills)
         ┌────────────────────────────────────────────────────────────────────────┐
         │                  Cybernetic Rectangular Basement                       │
         │ [go/demos] [SharedDrive] [Vector] [Moma] [Horizon] [GitHub] ... [Qwik] │
         └────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure & Assets

```
ACE/
├── index.html               # Main HTML5 document with structured DOM elements
├── style.css                # Glassmorphism, animations, layouts, responsive rules
├── app.js                   # Physics engine, canvas renderer, conduits, drag & layout
├── server.py                # Python HTTP server & layout synchronization endpoint
├── default_positions.json   # Serialized default layout coordinates and anchors
├── PROMPT.md                # This master blueprint document
├── SESSION_HISTORY.md       # Complete architectural iteration log
│
└── Assets/
    ├── large-wheel.png      # High-res Central Totum network graph
    ├── brain-wheel.jpg      # Glowing neural brain texture for Personal Totum wheels
    ├── Workspace.png        # Transparent Personal Workspace IDE preview card
    ├── Jetski.svg           # High-tech Jetski agent icon
    ├── ACE.png              # Central ACE logo badge asset
    ├── ADK.png / ADK.svg    # Central Curator & WAF icon
    ├── Spanner.png          # Semantic Links Spanner icon
    ├── gdrive.png           # Central Docs & Shared Drive Google Drive icon
    ├── GoogleCloud.svg      # Google Cloud logo (Totum Project, Qwiklabs, go/demos, Prod Docs)
    ├── Salesforce.svg       # Vector icon
    ├── Moma.svg             # Moma internal search icon
    ├── Horizon.svg          # Horizon telemetry icon
    ├── GitHub.svg           # GitHub Octocat vector logo
    └── Buganizer.svg        # Issue Tracker slate vector logo
```

---

## 🧮 Mathematical & Kinematic Formulations

### 1. Circle-to-Circle Outer Tangent Calculation (Belts)
Given Drive Wheel $C_1(x_1, y_1, r_1)$ and Driven Wheel $C_2(x_2, y_2, r_2)$:
$$\text{Distance } d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$
$$\text{Base Angle } \alpha = \text{atan2}(y_2 - y_1, x_2 - x_1)$$
$$\beta = \text{asin}\left(\frac{r_1 - r_2}{d}\right)$$
$$\theta_1 = \alpha + \beta + \frac{\pi}{2}, \quad \theta_2 = \alpha - \beta - \frac{\pi}{2}$$
$$\text{Tangent Points on } C_1: \quad P_{1a} = (x_1 + r_1 \cos \theta_1, \, y_1 + r_1 \sin \theta_1)$$
$$\text{Tangent Points on } C_2: \quad P_{2a} = (x_2 + r_2 \cos \theta_1, \, y_2 + r_2 \sin \theta_1)$$

### 2. Angular Velocity Ratio
$$\omega_{\text{small}} = \omega_{\text{big}} \cdot \left(\frac{r_{\text{big}}}{r_{\text{small}}}\right)$$

### 3. Curved Conduits (Cubic Bezier Arc & Tangent Rotation)
For points $P_{\text{start}}$ and $P_{\text{end}}$ with midpoint $M$, calculate perpendicular offset vector $\vec{N}$:
$$\vec{D} = P_{\text{end}} - P_{\text{start}}, \quad \vec{N} = (-D_y, D_x) \cdot \text{curveRatio}$$
$$\text{Control Point } C = M + \vec{N}$$
Evaluate along quadratic bezier $B(t) = (1-t)^2 P_{\text{start}} + 2(1-t)t C + t^2 P_{\text{end}}$ to position the conduit label and compute tangent angle $\phi = \text{atan2}(B'(t)_y, B'(t)_x)$.

### 4. Anchor-Aware Layout Serialization
- If element center $X < \text{viewportWidth} \cdot 0.33 \implies \text{anchor} = \text{"left"}$
- If element center $X > \text{viewportWidth} \cdot 0.67 \implies \text{anchor} = \text{"right"}$
- Else $\implies \text{anchor} = \text{"center"}$ (offset calculated relative to $\frac{\text{viewportWidth}}{2}$)

---

## 🚀 Execution & Verification Commands

```bash
# 1. Start the Master Server (Default port 8022 or 8011 for dev)
python3 server.py 8022

# 2. Start the Mirrored Server (Default port 8020 or 8010 for dev)
python3 server.py 8020

# 3. Open in Browser
open http://localhost:8022
open http://localhost:8020
```
