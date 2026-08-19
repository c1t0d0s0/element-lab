# Element Lab (元素ラボ) ⚗️⚛️

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.2+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An interactive, web-based physics and chemistry simulation game designed to make learning chemistry fun and intuitive on both desktop and mobile devices.

> **[日本語のREADMEはこちら (README.ja.md)](./README.ja.md)**

---

## 🌟 Overview

**Element Lab** is a sandbox simulation game built with TypeScript and HTML5 Canvas. Place atomic elements and compounds onto a 2D physics canvas, manipulate temperature with burners or coolant, trigger sparks, and discover genuine chemical reactions—ranging from water synthesis and iron rusting to redox reductions and acid-base neutralizations.

Educational descriptions and reaction rules are aligned with standard chemistry curricula (e.g., MEXT Japan guidelines), providing an accurate and engaging learning platform.

---

## ✨ Key Features

- **⚛️ Complete 118 Elements Periodic Table**
  - Full dataset for all 118 elements (Hydrogen #1 to Oganesson #118).
  - Includes atomic numbers, groups, periods, categories, atomic radii, melting/boiling points, molar masses, and educational facts.
  - Periodic size scaling: Visual atomic radius accurately reflects periodic trends (e.g., Helium is small, Francium is large).

- **💨 Realistic Physics & Particle Thermodynamics**
  - **Buoyancy & Aerodynamics**: Gases float or sink based on comparison with air's molar mass (~28.8 g/mol). Light gases like $\text{He}$ and $\text{H}_2$ rise quickly; heavy gases like $\text{CO}_2$ sink.
  - **Phase Changes**: Elements and compounds dynamically change state (Solid 🧊 / Liquid 💧 / Gas ♨) based on local temperature vs. melting/boiling points.
  - **Thermal Conduction & Convection**: Particles exchange heat upon collision, and heated gases experience thermal lift and Brownian motion.
  - **High-Temperature Visuals**: Iron ($\text{Fe}$) glows red-hot when heated above 500°C. Toxic gases ($\text{CO}$, $\text{HCl}$) display cautionary warning auras.

- **🔥 Accurate Chemical Reaction Engine**
  - **Water Synthesis**: $2\text{H} + \text{O} \to \text{H}_2\text{O}$ or $2\text{H}_2 + \text{O}_2 \to 2\text{H}_2\text{O}$ with explosive energy and sound.
  - **Iron Rusting (Low Temp vs. High Temp)**:
    - *Red Rust* (Hydrated Iron(III) Oxide): $\text{Fe} + \text{H}_2\text{O} + \text{O}_2 \to \text{Fe}_2\text{O}_3\cdot n\text{H}_2\text{O}$ (gradual oxidation at room temperature).
    - *Black Rust* (Magnetite): $3\text{Fe} + 4\text{H}_2\text{O}\text{ (steam)} \to \text{Fe}_3\text{O}_4 + 4\text{H}_2$ (formed at red-hot temperatures >500°C).
  - **Combustion & Toxicity**:
    - Magnesium combustion: $2\text{Mg} + \text{O}_2 \to 2\text{MgO}$ (intense, blinding white flash and heat producing magnesium oxide white ash).
    - Magnesium burning in $\text{CO}_2$: $2\text{Mg} + \text{CO}_2 \to 2\text{MgO} + \text{C}$.
    - Complete combustion: $\text{C} + \text{O}_2 \to \text{CO}_2$.
    - Incomplete combustion: $2\text{C} + \text{O}_2 \to 2\text{CO}$ (toxic, colorless, odorless carbon monoxide with alert warnings).
    - Methane combustion: $\text{CH}_4 + 2\text{O}_2 \to \text{CO}_2 + 2\text{H}_2\text{O}$.
  - **Reduction & Metallurgy**:
    - Carbon reduction of copper oxide: $2\text{CuO} + \text{C} \to 2\text{Cu} + \text{CO}_2$.
  - **Acids, Bases & Neutralization**:
    - Neutralization: $\text{HCl} + \text{NaOH} \to \text{NaCl} + \text{H}_2\text{O}$.
    - Gas Neutralization (White Smoke): $\text{NH}_3 + \text{HCl} \to \text{NH}_4\text{Cl}$.
    - Metal-acid hydrogen generation: $\text{Zn} + 2\text{HCl} \to \text{ZnCl}_2 + \text{H}_2$.
  - **🧪 Sandbox Experiments & Industrial Synthesis**:
    - **Hydrogen Peroxide ($\text{H}_2\text{O}_2$)**:
      - Synthesis: $\text{H}_2\text{O} + \text{O} \to \text{H}_2\text{O}_2$
      - $\text{MnO}_2$ Catalytic Decomposition: $2\text{H}_2\text{O}_2 + \text{MnO}_2 \to 2\text{H}_2\text{O} + \text{O}_2 + \text{MnO}_2$ (rapid oxygen gas generation)
    - **Sulfuric Acid ($\text{H}_2\text{SO}_4$) Contact Process**:
      - $\text{S} + \text{O}_2 \to \text{SO}_2 \to 2\text{SO}_3 \to \text{H}_2\text{SO}_4$ (multi-step oxidation and hydration)
    - **Iron & Sulfur Reaction**:
      - $\text{Fe} + \text{S} \to \text{FeS}$ (iron sulfide synthesis) & $\text{FeS} + 2\text{HCl} \to \text{H}_2\text{S} + \dots$
    - **Haber-Bosch Ammonia Process**:
      - $\text{N}_2 + 3\text{H}_2 \to 2\text{NH}_3$
    - **Limestone ($\text{CaCO}_3$) & Limewater Cycle**:
      - Thermal decomposition: $\text{CaCO}_3 \to \text{CaO} + \text{CO}_2$
      - Quicklime hydration: $\text{CaO} + \text{H}_2\text{O} \to \text{Ca(OH)}_2$ (exothermic)
      - Carbon dioxide detection: $\text{Ca(OH)}_2 + \text{CO}_2 \to \text{CaCO}_3 + \text{H}_2\text{O}$ (white precipitate)
      - Gas generation: $\text{CaCO}_3 + 2\text{HCl} \to \text{CaCl}_2 + \text{H}_2\text{O} + \text{CO}_2$

- **🎯 Quests & Discovery Encyclopedia**
  - Guided step-by-step educational missions to guide learners through essential experiments.
  - Compound discovery encyclopedia tracking unlocked substances and their real-world applications.
  - Real-time particle inspector detailing temperature, physical state, mass, atomic radius, and educational takeaways.

- **🔊 Dynamic Audio Effects**
  - Web Audio API procedural sound synthesizer (spark, water sizzle, pop, explosion, rustling, and discovery chimes) without external audio file dependencies.

- **📱 Fully Responsive & Cross-Platform**
  - Smooth 60 FPS Canvas rendering optimized for desktop mouse interaction and mobile/tablet touch screens.

---

## 🎮 How to Play & Tools

| Tool | Icon | Description |
| :--- | :---: | :--- |
| **Spawn** | 🧪 | Place elements or compounds onto the canvas from the quick palette or full periodic table. |
| **Heat** | 🔥 | Apply burner heat (up to >1000°C). Causes phase changes and ignites thermal reactions. |
| **Cool** | ❄️ | Apply cooling spray (down to sub-zero temperatures). Condenses gases and freezes water into ice. |
| **Spark** | ⚡ | Trigger high-voltage ignition sparks to ignite combustible gas mixtures (e.g., $2\text{H}_2 + \text{O}_2$). |
| **Wall** | 🧱 | Draw heat-resistant barrier blocks to contain gases or liquids in custom test chambers. |
| **Erase** | 🧹 | Remove individual particles under the brush. |
| **Inspect** | 🔍 | Hover over or tap any particle to view its properties and educational notes in the inspector. |

---

## 🛠️ Tech Stack

- **Language**: TypeScript 5.4+
- **Bundler & Dev Server**: Vite 5.2+
- **Rendering**: HTML5 2D Canvas API (High DPI / Retina support)
- **Audio**: Web Audio API (Procedural sound synthesis)
- **Styling**: Modern CSS3 (CSS Variables, Flexbox, Grid, Glassmorphism UI)
- **Testing**: Node.js test runner / TypeScript simulation assertions

---

## 📂 Project Structure

```text
element-lab/
├── index.html              # Main HTML entry point
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
├── src/
│   ├── main.ts             # Game app orchestration and loop
│   ├── style.css           # Global dark theme styles and modal layouts
│   ├── data/
│   │   ├── elements.ts     # 118 chemical elements dataset & radii calculator
│   │   ├── compounds.ts    # Compound definitions, formulas & properties
│   │   ├── reactions.ts    # Chemical reaction rules, conditions & thermal effects
│   │   └── quests.ts       # Educational quests & progression checks
│   ├── engine/
│   │   ├── Particle.ts     # Particle model, thermodynamics & state rendering
│   │   ├── PhysicsWorld.ts # Spatial grid partitioning, buoyancy & collision physics
│   │   ├── ReactionEngine.ts # Collision-based chemical reaction resolver
│   │   └── AudioEffects.ts # Procedural Web Audio API sound synthesizer
│   └── ui/
│       ├── Toolbar.ts             # Navigation, tools, and quick-access palette
│       ├── Inspector.ts           # Real-time particle telemetry & MEXT notes
│       ├── PeriodicTableModal.ts  # Full 118-element periodic table dialog
│       ├── EncyclopediaModal.ts   # Chemical discovery catalog modal
│       └── QuestModal.ts          # Missions and objective progress modal
└── tests/
    └── simulation_test.ts  # Headless unit tests for physics & chemistry rules
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)

### Installation

1. Clone the repository or navigate to the project directory:
   ```bash
   cd element-lab
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

Start the Vite development server:
```bash
npm run dev
```
Open your browser and navigate to the displayed local URL (typically `http://localhost:5173`).

### Production Build

Compile TypeScript and build the optimized production assets:
```bash
npm run build
```
Preview the production build locally:
```bash
npm run preview
```

### Running Tests

Execute the automated simulation logic verification tests:
```bash
npx tsx tests/simulation_test.ts
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
