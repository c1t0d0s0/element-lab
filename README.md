# Element Lab (元素ラボ) ⚗️⚛️

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.2+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An interactive, web-based physics and chemistry simulation game designed to make learning chemistry fun and intuitive on both desktop and mobile devices.

> **[日本語のREADMEはこちら (README.ja.md)](./README.ja.md)**

---

## 🌟 Overview

**Element Lab** is a sandbox simulation game built with TypeScript and HTML5 Canvas. Place atomic elements and compounds onto a 2D physics canvas, manipulate temperature with burners or coolant, trigger sparks, and discover genuine chemical reactions—ranging from water synthesis and iron rusting to redox reductions and acid-base neutralizations.

Educational descriptions and reaction rules are based on standard chemistry curricula (e.g., the Japanese MEXT course of study), providing an accurate and engaging learning platform.

---

## ✨ Key Features

- **⚛️ Complete 118 Elements Periodic Table**
  - Full dataset for all 118 elements (Hydrogen #1 to Oganesson #118).
  - Includes atomic numbers, groups, periods, categories, atomic radii, melting/boiling points, molar masses, and educational facts.
  - Periodic size scaling: Visual atomic radius accurately reflects periodic trends (e.g., Helium is small, Francium is large).
  - **🎓 High School Chemistry Data (periodic law)**: Each element's detail pane shows an electron shell diagram (K, L, M, ... shells, with the outermost electrons highlighted), the electron configuration, outermost and valence electrons, electronegativity (Pauling), first ionization energy and density. The **Color by** menu recolors the table by electronegativity, first ionization energy, atomic radius, density or valence electrons, so the periodic trends can be seen at a glance. Mission 25 asks you to compare electronegativity and ionization energy. The values come from the mendeleev library (scripts/generate-element-properties.py).

- **💨 Realistic Physics & Particle Thermodynamics**
  - **Buoyancy & Aerodynamics**: Gases float or sink based on comparison with air's molar mass (~28.8 g/mol). Light gases like $\text{He}$ and $\text{H}_2$ rise quickly; heavy gases like $\text{CO}_2$ sink.
  - **Phase Changes**: Elements and compounds dynamically change state (Solid 🧊 / Liquid 💧 / Gas ♨) based on local temperature vs. melting/boiling points.
  - **📈 Temperature Graph (Grade 7 "Changes of State")**: Press "📈 Temperature graph" on a particle's inspector card to plot its temperature over time. While it melts or boils, the added heat goes into changing state (latent heat), so the line stays flat at the melting or boiling point (drawn in yellow, with dashed reference lines). Mission 24 asks you to heat ice and see the flat parts at 0°C and 100°C.
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
    - Incomplete combustion: $2\text{C} + \text{O}_2 \to 2\text{CO}$ (happens only when oxygen is short; toxic, colorless, odorless carbon monoxide with alert warnings).
    - Methane combustion: $\text{CH}_4 + 2\text{O}_2 \to \text{CO}_2 + 2\text{H}_2\text{O}$.
  - **Junior High Key Experiments**:
    - Thermal decomposition of silver oxide (Grade 8): $2\text{Ag}_2\text{O} \to 4\text{Ag} + \text{O}_2$.
    - Making ammonia (Grades 7–8): $2\text{NH}_4\text{Cl} + \text{Ca(OH)}_2 \to \text{CaCl}_2 + 2\text{NH}_3 + 2\text{H}_2\text{O}$ (heated).
    - Magnesium and hydrochloric acid: $\text{Mg} + 2\text{HCl} \to \text{MgCl}_2 + \text{H}_2$.
    - Neutralization with a white precipitate (Grade 9): $\text{H}_2\text{SO}_4 + \text{Ba(OH)}_2 \to \text{BaSO}_4\downarrow + 2\text{H}_2\text{O}$.
    - Copper and sulfur combine (Grade 8): $\text{Cu} + \text{S} \to \text{CuS}$ (the textbook formula; heating also forms much $\text{Cu}_2\text{S}$).
  - **Common Organic Compounds**:
    - Ethanol combustion (alcohol lamp): $\text{C}_2\text{H}_5\text{OH} + 3\text{O}_2 \to 2\text{CO}_2 + 3\text{H}_2\text{O}$.
    - Alcoholic fermentation in warm water (30–40°C; the yeast is left out): $\text{C}_6\text{H}_{12}\text{O}_6 \to 2\text{C}_2\text{H}_5\text{OH} + 2\text{CO}_2$.
    - Alcohol turning into vinegar (the acetic acid bacteria are left out): $\text{C}_2\text{H}_5\text{OH} + \text{O}_2 \to \text{CH}_3\text{COOH} + \text{H}_2\text{O}$.
    - Vinegar and baking soda: $\text{CH}_3\text{COOH} + \text{NaHCO}_3 \to \text{CH}_3\text{COONa} + \text{H}_2\text{O} + \text{CO}_2$.
    - Ethylene from ethanol (conc. $\text{H}_2\text{SO}_4$, 160°C+) or from acetylene ($\text{H}_2$, Ni catalyst), and back to ethanol with steam ($\text{H}_3\text{PO}_4$ catalyst, 250–350°C).
    - Burning ethylene and glucose (the same equation as respiration).
  - **Reduction & Metallurgy**:
    - Carbon reduction of copper oxide: $2\text{CuO} + \text{C} \to 2\text{Cu} + \text{CO}_2$.
  - **Acids, Bases & Neutralization**:
    - Neutralization: $\text{HCl} + \text{NaOH} \to \text{NaCl} + \text{H}_2\text{O}$.
    - Gas Neutralization (White Smoke): $\text{NH}_3 + \text{HCl} \to \text{NH}_4\text{Cl}$.
    - Metal-acid hydrogen generation: $\text{Zn} + 2\text{HCl} \to \text{ZnCl}_2 + \text{H}_2$.
  - **🧪 Sandbox Experiments & Industrial Synthesis**:
    - **Hydrogen Peroxide ($\text{H}_2\text{O}_2$)**:
      - Synthesis: $\text{H}_2\text{O} + \text{O} \to \text{H}_2\text{O}_2$ (a game shortcut; it does not happen this way in reality)
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

- **🔥 Flame Emission Test Simulation (Flame Colors of Metal Ions)**
  - Heating or sparking metal elements and their compounds triggers characteristic emission flame plumes and glowing sparks:
  - **Li (Lithium)**: Crimson Red
  - **Na (Sodium / NaCl)**: Bright Yellow (D-line)
  - **K (Potassium)**: Pale Lilac / Violet
  - **Cu (Copper / CuO)**: Emerald Blue-Green
  - **Ca (Calcium / CaCl₂)**: Orange-Red
  - **Sr (Strontium)**: Bright Crimson
  - **Ba (Barium)**: Apple Yellow-Green
  - **Cs (Caesium)**: Blue-Violet
  - **Rb (Rubidium)**: Deep Red (slightly red-violet)
  - Real-time inspector, periodic table modal, and encyclopedia feature flame test color badges and mnemonics.

- **💧 Dissolving & Solubility (Grade 5 "How Things Dissolve" / Grade 7 Solubility)**
  - Salt ($\text{NaCl}$), potassium nitrate ($\text{KNO}_3$), alum and sugar (sucrose) dissolve when they touch liquid water and become hard to see, but stay in the solution and keep their mass.
  - The amount that can dissolve follows real solubility tables (g per 100 g of water, interpolated by temperature) and scales with the amount of water. Extra solute stays undissolved (a saturated solution).
  - Cooling the solution or evaporating the water brings the excess back out as crystals (recrystallization). $\text{KNO}_3$ and alum change a lot with temperature; salt barely changes, so it is recovered by evaporation.
  - Dissolved electrolytes conduct electricity, while sugar water does not. The inspector shows how much is dissolved and whether the solution is saturated, and the encyclopedia shows each solubility table.

- **⚡ Electricity, Electrolysis & Electrical Conduction**
  - **⚡ Electric Tool**: Interactive electrical discharging tool with realistic fractal lightning arcs (`electric_arc`).
  - **Water Electrolysis**: $2\text{H}_2\text{O} \xrightarrow{\text{electricity}} 2\text{H}_2 \uparrow + \text{O}_2 \uparrow$ (generating bubbling hydrogen and oxygen gas in 2:1 volume ratio). Pure water barely conducts, so dissolve sodium hydroxide first.
  - **Copper Chloride Electrolysis**: $\text{CuCl}_2 \xrightarrow{\text{electricity}} \text{Cu} \downarrow + \text{Cl}_2 \uparrow$ (copper precipitation on cathode, chlorine gas at anode).
  - **Joule Heating & Metallic Chain Conduction**: Conducting elements (metals, carbon) transmit lightning bolts through adjacent particles and heat up via Joule resistance.
  - **Real-Time Inspector Diagnostics**: Instant classification of particles as Conductors, Electrolytes, or Insulators.

- **⚖️ Conservation of Mass (Grade 8 "Chemical Changes and Mass")**
  - Put a container on a pan balance and run a gas-producing reaction in it, such as $\text{CaCO}_3 + 2\text{HCl} \rightarrow \text{CaCl}_2 + \text{H}_2\text{O} + \text{CO}_2$. With the lid on, the balance reading stays the same; with the lid off (or after removing it), the bubbling $\text{CO}_2$ escapes and the container gets lighter by exactly that amount.
  - Each compound particle weighs the sum of its atoms' atomic masses, so every reaction keeps the total mass exactly.
  - Mission 21 asks you to see both results.

- **🔋 Seeing Ions (Grade 9 "Ions")**
  - Electrolytes that are dissolved in water (or melted) are drawn as their separate ions, e.g. $\text{NaCl} \rightarrow \text{Na}^+ + \text{Cl}^-$ and $\text{CuCl}_2 \rightarrow \text{Cu}^{2+} + 2\text{Cl}^-$. Cations have red rims and anions blue rims. Molecular acids such as hydrogen chloride split only in water, and weak acids (acetic acid, phosphoric acid) split only partly. Sugar does not split at all.
  - The ⚡ tool's **🔋 Electrodes** mode connects a pair of carbon electrodes and a power supply to a beaker. With current on, cations move to the cathode (−) and anions to the anode (+), and the electrolysis products appear at the right electrode: copper plates the cathode while chlorine bubbles from the anode, and hydrogen and oxygen form at the cathode and anode in a 2 : 1 ratio.
  - Mission 20 asks you to electrolyze copper chloride solution with electrodes while watching the ions move.

- **⚙️ Metal Ionization Tendency & Batteries (Grade 9 "Chemical Changes and Batteries")**
  - A metal put into a solution of a less reactive metal's ions makes that metal come out: $\text{Zn} + \text{CuSO}_4 \rightarrow \text{ZnSO}_4 + \text{Cu}$, $\text{Mg} + \text{ZnSO}_4 \rightarrow \text{MgSO}_4 + \text{Zn}$, iron in copper sulfate, and the silver tree $\text{Cu} + 2\text{AgNO}_3 \rightarrow \text{Cu(NO}_3)_2 + 2\text{Ag}$. These happen only in water, and never in reverse (copper in zinc sulfate solution stays unchanged), which shows the order Mg > Zn > Cu > Ag.
  - The ⚡ tool's **⚙️ Battery** mode turns a beaker into a Daniell cell: a zinc plate (−) and a copper plate (+) separated by cellophane and wired to a motor. With an electrolyte on the zinc side and copper sulfate solution on the copper side, the motor turns and electrons flow from zinc to copper through the wire. Zinc dissolves as $\text{Zn}^{2+}$ (the plate gets thinner) and copper forms on the copper plate. Copper sulfate on the zinc side instead plates copper straight onto the zinc with no current.
  - Missions 22 and 23 ask you to compare the three metals and to run the motor with a Daniell cell.

- **🎓 Interactive Step-by-Step Tutorial**
  - Interactive onboarding guide for first-time learners covering element spawning, water synthesis, burner heating & boiling, glassware placement, and particle inspection.
  - Visual pulse highlights direct users to the exact buttons needed for each action.

- **🎯 Quests & Discovery Encyclopedia**
  - Guided step-by-step educational missions to guide learners through essential experiments.
  - Compound discovery encyclopedia tracking unlocked substances and their real-world applications.
  - Real-time particle inspector detailing temperature, physical state, mass, atomic radius, flame emission test color, and educational takeaways.

- **🔊 Dynamic Audio Effects**
  - Web Audio API procedural sound synthesizer (spark, water sizzle, pop, explosion, rustling, and discovery chimes) without external audio file dependencies.

- **📱 Fully Responsive & Cross-Platform**
  - Smooth 60 FPS Canvas rendering optimized for desktop mouse interaction and mobile/tablet touch screens.

---

## 🎮 How to Play & Tools

| Tool | Icon | Description |
| :--- | :---: | :--- |
| **Spawn** | 🧪 | Place elements or compounds onto the canvas from the quick palette or full periodic table. |
| **Flask** | 🏺 | Place laboratory glassware (Erlenmeyer flask, beaker, or round-bottom test tube) to hold and heat liquids. |
| **Heat** | 🔥 | Apply burner heat (up to >1000°C). Causes phase changes and ignites thermal reactions. |
| **Cool** | ❄️ | Apply cooling spray (down to sub-zero temperatures). Condenses gases and freezes water into ice. |
| **Electricity** | ⚡ | **Discharge** sends current wherever you drag (conduction, electrolysis). **Electrodes** connects electrodes to a beaker so you can watch the ions move and electrolyze the solution. **Battery** turns a beaker into a Daniell cell that makes electricity. |
| **Spark** | 💥 | Trigger high-voltage ignition sparks to ignite combustible gas mixtures (e.g., $2\text{H}_2 + \text{O}_2$). |
| **Wall** | 🧱 | Draw heat-resistant barrier blocks to contain gases or liquids in custom test chambers. |
| **Erase** | 🧹 | Remove individual particles under the brush. |
| **Inspect** | 🔍 | Hover over or tap any particle to view its properties and educational notes in the inspector. **📈 Temperature graph** records the particle's temperature over time. |

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
│   │   ├── solubility.ts   # Solubility tables (g/100 g water) for dissolving
│   │   ├── ions.ts         # Which ions each electrolyte splits into
│   │   ├── elementProperties.ts # Electron shells, electronegativity, ionization energy, density (scripts/generate-element-properties.py)
│   │   ├── periodicTrends.ts # Valence electrons and periodic table coloring by value
│   │   ├── generatedStructures.ts # 3D structures made with RDKit (scripts/generate-structures.py)
│   │   └── quests.ts       # Educational quests & progression checks
│   ├── engine/
│   │   ├── Particle.ts     # Particle model, thermodynamics & state rendering
│   │   ├── PhysicsWorld.ts # Spatial grid partitioning, buoyancy & collision physics
│   │   ├── ReactionEngine.ts # Collision-based chemical reaction resolver
│   │   ├── Solutions.ts    # Dissolving, saturation & crystallization in water
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

## 🔒 Privacy

- The app never asks for personal information such as names or email addresses, and there are no accounts.
- Discovered compounds, quest progress, and settings are stored only in your browser (localStorage) and are never sent to a server.
- The public site may use Google Analytics (via Google Tag Manager) to understand usage. It is loaded only when the site is deployed with a `GTM_ID`, and it counts page views and similar data without identifying individuals.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
