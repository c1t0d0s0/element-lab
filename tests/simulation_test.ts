import { PhysicsWorld, computeLocalPh, ELECTROLYTES, CELL_ZINC_PLATE, ERLENMEYER, TESTTUBE, MAX_CHEMICAL_PARTICLES } from '../src/engine/PhysicsWorld';
import { ION_FORMS, ionEquationProducts, isDissociatedWeakAcid } from '../src/data/ions';
import { ReactionEngine, GOLD_SPARKS_STORAGE_KEY, DISCOVERED_REACTIONS_STORAGE_KEY, DISCOVERED_COMPOUNDS_STORAGE_KEY, INDICATOR_RESULTS_STORAGE_KEY, FLAME_TESTS_STORAGE_KEY } from '../src/engine/ReactionEngine';
import { FireworksShow, FIREWORK_ELEMENTS, isWillowUnlocked, getFireworkColorInfo, isFireworkColorUnlocked, isMagnesiumWhiteUnlocked, isShapeUnlocked, isStarLit, projectShaped, randomShellOrientation, ShellOrientation } from '../src/engine/Fireworks';
import { selectProfessorLine, getUndiscoveredReactions, REACTION_LINES, ELECTRODE_LINES, MASS_CHECK_LINES } from '../src/data/professorLines';
import { QUESTS_DATA, GameStats } from '../src/data/quests';
import { getStructure, NO_STRUCTURE_COMPOUNDS, ionicRadius } from '../src/data/structures';
import { buildMoleculeGroup } from '../src/engine/MoleculeScene';
import { FIREWORK_SHAPES, createShot, createProgram, sampleProgram, serializeFireworkProgram, parseFireworkProgram, programDuration, sortShotsByTime, MAX_PROGRAM_SHOTS } from '../src/data/fireworkProgram';
import { chargeLabel } from '../src/engine/MoleculeRenderer';
import { Particle } from '../src/engine/Particle';
import { ELEMENT_PROPERTIES } from '../src/data/elementProperties';
import { TREND_MODES, trendValue, trendRange, trendPosition, trendColor, valenceElectrons, outermostElectrons, shellNotation } from '../src/data/periodicTrends';
import { titrationPh, equivalenceVolume, equivalencePh, endpointVolume, judgeEndpoint, indicatorColor, TITRATION_ANALYTES, TITRATION_INDICATORS, MYSTERY_CONCENTRATIONS, BURETTE_CAPACITY, ENDPOINT_TOLERANCE } from '../src/data/titration';
import { airPressure, particlePressure, sealedPressure, CONTAINER_VOLUME_ML, ATMOSPHERIC_PRESSURE } from '../src/engine/GasPressure';
import { forwardRateConstant, equilibriumConstant, equilibriumState, stepEquilibrium, initialState, isAtEquilibrium, totalPressure, forwardRate, reverseRate } from '../src/data/equilibrium';
import { addFurigana, kidText } from '../src/i18n/furigana';
import { makeQrMatrix } from '../src/ui/qrCode';
import { snapshotExtent, fitLabZoom, MIN_LAB_ZOOM } from '../src/engine/LabSnapshot';
import { captureLab, restoreLab, sanitizeSnapshot, encodeSnapshot, decodeSnapshot, UndoHistory, saveLab, loadSavedLabs, deleteSavedLab, isEmptySnapshot, MAX_SAVED_LABS } from '../src/engine/LabSnapshot';
import { getElementKidHint, ELEMENT_KID_HINT_SYMBOLS } from '../src/data/elementKidHints';
import { FixedStepClock, SIM_STEP_MS, MAX_STEPS_PER_FRAME } from '../src/engine/FixedStep';
import { TemperatureLog, TEMPERATURE_SAMPLE_INTERVAL, TEMPERATURE_MAX_SAMPLES } from '../src/engine/TemperatureLog';
import { getSolubility, soluteCapacity, isSolute, SOLUBILITY_TABLES } from '../src/data/solubility';
import { TutorialManager, formatEmphasis } from '../src/ui/TutorialManager';
import { ELEMENTS_DATA, getAtomicRenderRadius, isTextbookFlameElement } from '../src/data/elements';
import { COMPOUNDS_DATA, COMPOUND_PH, isStarterCompound, COMPOUND_CATEGORY_LIST, getCompoundKidHint, getCompoundFormula, getIndicatorColor, classifyPh } from '../src/data/compounds';
import { REACTIONS_DATA, getReactionEquation } from '../src/data/reactions';
import { WALL_BLOCK, WALL_TYPES, WallTypeId, wallImpact } from '../src/data/walls';
import { flashScale, REDUCED_FLASH_ALPHA } from '../src/engine/Motion';
import { reactionMatchesFilter, compoundMatchesFilter, COMPOUND_FILTERS, DISPLAY_REACTIONS, getMergedReactionCount } from '../src/ui/EncyclopediaModal';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${msg}`);
  }
}

// 端末の「動きを減らす」設定のかわり (Motion.ts は初めて使うときに matchMedia を読む)
const reducedMotionQuery = { matches: false };
(globalThis as unknown as { matchMedia: (q: string) => { matches: boolean } }).matchMedia = (q: string) =>
  q.includes('prefers-reduced-motion') ? reducedMotionQuery : { matches: false };

console.log('=== Test 1: Atomic Radius Trend ===');
const heRadius = getAtomicRenderRadius(ELEMENTS_DATA['He'].atomicRadius);
const hRadius = getAtomicRenderRadius(ELEMENTS_DATA['H'].atomicRadius);
const feRadius = getAtomicRenderRadius(ELEMENTS_DATA['Fe'].atomicRadius);
const frRadius = getAtomicRenderRadius(ELEMENTS_DATA['Fr'].atomicRadius);

console.log(`He radius: ${heRadius}px, H: ${hRadius}px, Fe: ${feRadius}px, Fr: ${frRadius}px`);
assert(heRadius < hRadius, 'He atomic radius should be smaller than H');
assert(hRadius < feRadius, 'H atomic radius should be smaller than Fe');
assert(feRadius < frRadius, 'Fe atomic radius should be smaller than Fr (maximum)');

console.log('\n=== Test 2: Gas Buoyancy Physics ===');
const world = new PhysicsWorld(800, 600);
const heParticle = new Particle('p1', 'element', 'He', 400, 300, 25);
const co2Particle = new Particle('p2', 'compound', 'CO2', 400, 300, 25);
world.addParticle(heParticle);
world.addParticle(co2Particle);

// Update physics for 30 frames
for (let f = 0; f < 30; f++) {
  world.update();
}

console.log(`He final Y: ${heParticle.y.toFixed(1)} (started at 300)`);
console.log(`CO2 final Y: ${co2Particle.y.toFixed(1)} (started at 300)`);
assert(heParticle.y < 300, 'He (molar mass 4.0) must float upwards');
assert(co2Particle.y > 300, 'CO2 (molar mass 44.0) must sink downwards');

console.log('\n=== Test 3: Water Synthesis from 2H + O ===');
const rxEngine = new ReactionEngine(world);
world.clear();
const h1 = new Particle('h1', 'element', 'H', 200, 200, 25);
const h2 = new Particle('h2', 'element', 'H', 205, 200, 25);
const o1 = new Particle('o1', 'element', 'O', 202, 204, 25);
world.addParticle(h1);
world.addParticle(h2);
world.addParticle(o1);

rxEngine.checkReactions();

const hasH2O = world.particles.some(p => p.symbolOrId === 'H2O');
console.log(`Particles count: ${world.particles.length}, has H2O: ${hasH2O}`);
assert(hasH2O, '2H + O must produce H2O (Water)');

console.log('\n=== Test 3b: Water (H2O) Stability Verification ===');
world.clear();
const water1 = new Particle('w1', 'compound', 'H2O', 200, 200, 25);
const water2 = new Particle('w2', 'compound', 'H2O', 205, 200, 25);
const water3 = new Particle('w3', 'compound', 'H2O', 202, 205, 25);
world.addParticle(water1);
world.addParticle(water2);
world.addParticle(water3);

rxEngine.checkReactions();

const allH2O = world.particles.every(p => p.symbolOrId === 'H2O');
const noH2OrO2 = !world.particles.some(p => p.symbolOrId === 'H2' || p.symbolOrId === 'O2');
assert(allH2O && noH2OrO2, 'Water particles touching must NOT spontaneously decompose without electricity');

console.log('\n=== Test 4: Red-hot Iron + Steam -> Fe3O4 (Black Rust) + H2 ===');
world.clear();
const fe1 = new Particle('fe1', 'element', 'Fe', 300, 300, 600); // 600°C 赤熱
const fe2 = new Particle('fe2', 'element', 'Fe', 302, 300, 600);
const fe3 = new Particle('fe3', 'element', 'Fe', 304, 300, 600);
const steam1 = new Particle('st1', 'compound', 'H2O', 300, 302, 120); // 120°C 水蒸気
const steam2 = new Particle('st2', 'compound', 'H2O', 302, 302, 120);
const steam3 = new Particle('st3', 'compound', 'H2O', 304, 302, 120);
const steam4 = new Particle('st4', 'compound', 'H2O', 306, 302, 120);

world.addParticle(fe1);
world.addParticle(fe2);
world.addParticle(fe3);
world.addParticle(steam1);
world.addParticle(steam2);
world.addParticle(steam3);
world.addParticle(steam4);

rxEngine.checkReactions();

const hasFe3O4 = world.particles.some(p => p.symbolOrId === 'Fe3O4');
const hasH2Gas = world.particles.some(p => p.symbolOrId === 'H2');
console.log(`Reaction result: has Fe3O4: ${hasFe3O4}, has H2: ${hasH2Gas}`);
assert(hasFe3O4 && hasH2Gas, '3Fe(>500°C) + 4H2O(steam) must produce Fe3O4 and H2');

console.log('\n=== Test 5: Incomplete Combustion C + O -> Toxic CO ===');
world.clear();
const c1 = new Particle('c1', 'element', 'C', 100, 100, 250);
const c2 = new Particle('c2', 'element', 'C', 102, 100, 250);
const o2_gas = new Particle('og', 'compound', 'O2', 101, 102, 250);
world.addParticle(c1);
world.addParticle(c2);
world.addParticle(o2_gas);

rxEngine.checkReactions();
const coFound = world.particles.filter(p => p.symbolOrId === 'CO');
console.log(`Found CO count: ${coFound.length}, isToxic: ${coFound[0]?.isToxic}`);
assert(coFound.length === 2, 'Incomplete combustion should produce 2 CO molecules');

// 酸素が十分にあれば不完全燃焼は起こらず、すべて CO₂ になる
world.clear();
world.addParticle(new Particle('cx1', 'element', 'C', 400, 500, 300));
world.addParticle(new Particle('cx2', 'element', 'C', 406, 500, 300));
for (let i = 0; i < 4; i++) world.addParticle(new Particle(`ox${i}`, 'compound', 'O2', 398 + i * 5, 492, 300));
for (let f = 0; f < 3; f++) rxEngine.checkReactions();
assert(!world.particles.some(p => p.symbolOrId === 'CO'), 'Carbon with plenty of O2 must not burn incompletely into CO');
assert(world.particles.filter(p => p.symbolOrId === 'CO2').length === 2, 'Carbon with plenty of O2 must burn completely into CO2');

console.log('\n=== Test 6: Magnesium Combustion (2Mg + O2 -> 2MgO) ===');
world.clear();
const mg1 = new Particle('mg1', 'element', 'Mg', 200, 200, 300); // 300°C
const mg2 = new Particle('mg2', 'element', 'Mg', 202, 200, 300);
const o2_p = new Particle('o2p', 'compound', 'O2', 201, 202, 300);
world.addParticle(mg1);
world.addParticle(mg2);
world.addParticle(o2_p);

rxEngine.checkReactions();
const mgoFound = world.particles.filter(p => p.symbolOrId === 'MgO');
console.log(`Found MgO count: ${mgoFound.length}`);
assert(mgoFound.length === 2, '2Mg + O2 must produce 2 MgO (Magnesium Oxide)');

console.log('\n=== Test 7: Magnesium Burning in CO2 (2Mg + CO2 -> 2MgO + C) ===');
world.clear();
const mg3 = new Particle('mg3', 'element', 'Mg', 250, 250, 350);
const mg4 = new Particle('mg4', 'element', 'Mg', 252, 250, 350);
const co2_p = new Particle('co2p', 'compound', 'CO2', 251, 252, 350);
world.addParticle(mg3);
world.addParticle(mg4);
world.addParticle(co2_p);

rxEngine.checkReactions();
const mgoFromCO2 = world.particles.filter(p => p.symbolOrId === 'MgO');
const cFromCO2 = world.particles.filter(p => p.symbolOrId === 'C');
console.log(`Found MgO count: ${mgoFromCO2.length}, Carbon count: ${cFromCO2.length}`);
assert(mgoFromCO2.length === 2, '2Mg + CO2 must produce 2 MgO');
assert(cFromCO2.length === 1, '2Mg + CO2 must produce 1 C (Carbon)');

console.log('\n=== Test 8: Hydrogen Peroxide (H2O2) Synthesis & Catalytic Decomposition ===');
world.clear();
const h2o_1 = new Particle('h2o1', 'compound', 'H2O', 200, 200, 25);
const o_atom = new Particle('o_at', 'element', 'O', 202, 200, 25);
world.addParticle(h2o_1);
world.addParticle(o_atom);

rxEngine.checkReactions();
const h2o2Found = world.particles.filter(p => p.symbolOrId === 'H2O2');
console.log(`Found H2O2 count: ${h2o2Found.length}`);
assert(h2o2Found.length === 1, 'H2O + O must produce H2O2 (Hydrogen Peroxide)');

// Catalytic decomposition: 2H2O2 + MnO2 -> 2H2O + O2 + MnO2
world.clear();
const hp1 = new Particle('hp1', 'compound', 'H2O2', 300, 300, 25);
const hp2 = new Particle('hp2', 'compound', 'H2O2', 302, 300, 25);
const mno2 = new Particle('mno2', 'compound', 'MnO2', 301, 302, 25);
world.addParticle(hp1);
world.addParticle(hp2);
world.addParticle(mno2);

rxEngine.checkReactions();
const decompWater = world.particles.filter(p => p.symbolOrId === 'H2O');
const decompO2 = world.particles.filter(p => p.symbolOrId === 'O2');
const preservedMnO2 = world.particles.filter(p => p.symbolOrId === 'MnO2');
console.log(`Decomposition products: H2O: ${decompWater.length}, O2: ${decompO2.length}, MnO2: ${preservedMnO2.length}`);
assert(decompWater.length === 2, '2H2O2 decomposition must produce 2 H2O');
assert(decompO2.length === 1, '2H2O2 decomposition must produce 1 O2');
assert(preservedMnO2.length === 1, 'MnO2 must act as a catalyst and be preserved');

console.log('\n=== Test 9: Sulfuric Acid (H2SO4) Multi-step Industrial Synthesis ===');
// Step 1: S + O2 -> SO2
world.clear();
const sulfur = new Particle('s1', 'element', 'S', 100, 100, 200);
const o2_for_s = new Particle('o2s', 'compound', 'O2', 102, 100, 200);
world.addParticle(sulfur);
world.addParticle(o2_for_s);
rxEngine.checkReactions();
const so2Found = world.particles.filter(p => p.symbolOrId === 'SO2');
assert(so2Found.length === 1, 'S + O2 must produce SO2');

// Step 2: SO3 + H2O -> H2SO4
world.clear();
const so3 = new Particle('so3', 'compound', 'SO3', 150, 150, 25);
const water_for_h2so4 = new Particle('wh', 'compound', 'H2O', 152, 150, 25);
world.addParticle(so3);
world.addParticle(water_for_h2so4);
rxEngine.checkReactions();
const h2so4Found = world.particles.filter(p => p.symbolOrId === 'H2SO4');
console.log(`Found H2SO4 count: ${h2so4Found.length}, isToxic: ${h2so4Found[0]?.isToxic}`);
assert(h2so4Found.length === 1, 'SO3 + H2O must produce H2SO4 (Sulfuric Acid)');

console.log('\n=== Test 10: Iron + Sulfur (FeS) & Ammonia Neutralization (NH4Cl) ===');
world.clear();
const fe_atom = new Particle('fea', 'element', 'Fe', 200, 200, 250);
const s_atom = new Particle('sa', 'element', 'S', 202, 200, 250);
world.addParticle(fe_atom);
world.addParticle(s_atom);
rxEngine.checkReactions();
const fesFound = world.particles.filter(p => p.symbolOrId === 'FeS');
assert(fesFound.length === 1, 'Fe + S must produce FeS (Iron Sulfide)');

world.clear();
const nh3 = new Particle('nh3', 'compound', 'NH3', 250, 250, 25);
const hcl = new Particle('hcl', 'compound', 'HCl', 252, 250, 25);
world.addParticle(nh3);
world.addParticle(hcl);
rxEngine.checkReactions();
const nh4clFound = world.particles.filter(p => p.symbolOrId === 'NH4Cl');
assert(nh4clFound.length === 1, 'NH3 + HCl must produce NH4Cl (Ammonium Chloride White Smoke)');

// FeS + 2HCl -> FeCl2 + H2S
world.clear();
const fes = new Particle('fes1', 'compound', 'FeS', 200, 200, 25);
const hcl1 = new Particle('hcl1', 'compound', 'HCl', 202, 200, 25);
const hcl2 = new Particle('hcl2', 'compound', 'HCl', 204, 200, 25);
world.addParticle(fes);
world.addParticle(hcl1);
world.addParticle(hcl2);
rxEngine.checkReactions();
const fecl2Found = world.particles.filter(p => p.symbolOrId === 'FeCl2');
const h2sFound = world.particles.filter(p => p.symbolOrId === 'H2S');
assert(fecl2Found.length === 1 && h2sFound.length === 1, 'FeS + 2HCl must produce FeCl2 (Iron(II) Chloride) and H2S (Hydrogen Sulfide)');

console.log('\n=== Test 11: Limestone Cycle (Ca(OH)2 + CO2 -> CaCO3, CaCO3 + 2HCl -> CaCl2 + H2O + CO2) ===');
world.clear();
const limewater = new Particle('caoh', 'compound', 'CaOH2', 300, 300, 25);
const co2_gas = new Particle('co2g', 'compound', 'CO2', 302, 300, 25);
world.addParticle(limewater);
world.addParticle(co2_gas);
rxEngine.checkReactions();
const caco3Found = world.particles.filter(p => p.symbolOrId === 'CaCO3');
assert(caco3Found.length === 1, 'Ca(OH)2 + CO2 must produce CaCO3 (Limewater turbidity)');

console.log('\n=== Test 12: Laboratory Glassware (Line-based Glass Containers) & Liquid Containment ===');
world.clear();
const flask = world.spawnFlask(400, 300, 'erlenmeyer');
assert(!!flask, 'Erlenmeyer flask container must be created');
assert(flask.segments.length >= 7, 'Erlenmeyer flask must have line segments for all sides and neck');
assert(world.containers.length === 1, 'world.containers must contain the flask');

// Drop water liquid inside flask
const waterInFlask = new Particle('w_in', 'compound', 'H2O', 400, 240, 25);
world.addParticle(waterInFlask);

for (let frame = 0; frame < 30; frame++) {
  world.update();
}

console.log(`Water Y after 30 frames: ${waterInFlask.y.toFixed(1)} (flask bottom is ${flask.cy.toFixed(1)})`);
assert(waterInFlask.y <= flask.cy && waterInFlask.y >= flask.cy - 50, 'Water must be held cleanly inside the flask and not fall through');

// Beaker and test tube spawning
const beaker = world.spawnFlask(200, 300, 'beaker');
const tube = world.spawnFlask(600, 300, 'testtube');
assert(beaker.segments.length >= 4, 'Beaker must have walls and spout segments');
assert(tube.segments.length >= 10, 'Test tube must have walls and rounded bottom segments');
assert(world.containers.length === 3, 'All 3 glassware apparatuses must be in world');

// Thermal conductivity test: heat flask and verify water heats up
world.applyHeat(400, flask.cy, 60, 100);
assert(flask.temperature > 30, 'Flask must heat up from burner');
for (let frame = 0; frame < 20; frame++) {
  world.update();
}
assert(waterInFlask.temperature > 25, 'Water inside flask must absorb heat from heated glass container');

console.log('\n=== Test 13: Full 118 Elements Completeness & Integrity ===');
const elementKeys = Object.keys(ELEMENTS_DATA);
assert(elementKeys.length === 118, `Periodic table must have exactly 118 elements (found: ${elementKeys.length})`);

for (let i = 1; i <= 118; i++) {
  const el = Object.values(ELEMENTS_DATA).find(e => e.number === i);
  assert(!!el, `Element #${i} must exist in ELEMENTS_DATA`);
  assert(el!.nameJa.length > 0, `Element #${i} must have a Japanese name`);
  assert(el!.symbol.length > 0, `Element #${i} must have a chemical symbol`);
  assert(el!.atomicRadius > 0, `Element #${i} must have valid atomic radius`);
  assert(el!.mextFactJa.length > 0, `Element #${i} must have educational MEXT facts`);
}

// Test spawning superheavy and radioactive elements into the simulation
world.clear();
const nihonium = new Particle('nh1', 'element', 'Nh', 150, 150, 25);
const oganesson = new Particle('og1', 'element', 'Og', 170, 150, 25);
const uranium = new Particle('u1', 'element', 'U', 190, 150, 25);
world.addParticle(nihonium);
world.addParticle(oganesson);
world.addParticle(uranium);

assert(nihonium.displayName === 'Nh', 'Nihonium particle must display Nh');
assert(oganesson.displayName === 'Og', 'Oganesson particle must display Og');
assert(uranium.displayName === 'U', 'Uranium particle must display U');

console.log('\n=== Test 14: Interactive Tutorial Flow & Progress Verification ===');
const tutWorld = new PhysicsWorld(800, 600);
const tutRx = new ReactionEngine(tutWorld);
const tutManager = new TutorialManager(tutWorld);

tutManager.startTutorial();
assert(tutManager.isActive, 'Tutorial must be active after startTutorial');
assert(tutManager.currentStepIndex === 0, 'Tutorial must start at Step 1');

// Step 1: Place Hydrogen (H)
const hTut = new Particle('htut', 'element', 'H', 200, 200, 25);
tutWorld.addParticle(hTut);
tutManager.checkProgress('spawn');
assert(tutManager.currentStepIndex === 1, 'Tutorial must advance to Step 2 after placing Hydrogen');

// Step 2: Synthesize Water
const hTut2 = new Particle('htut2', 'element', 'H', 202, 200, 25);
const oTut = new Particle('otut', 'element', 'O', 201, 202, 25);
tutWorld.addParticle(hTut2);
tutWorld.addParticle(oTut);
tutRx.checkReactions();
tutManager.checkProgress('reaction');
assert(tutManager.currentStepIndex === 2, 'Tutorial must advance to Step 3 after synthesizing Water');

// Step 3: Heat and steam (沸騰している間は温度が一定なので、何回か加熱する)
for (let i = 0; i < 5; i++) tutWorld.applyHeat(200, 200, 50, 150);
tutWorld.update();
tutManager.checkProgress('heat');
assert(tutManager.currentStepIndex === 3, 'Tutorial must advance to Step 4 after boiling water into steam');

// Step 4: Spawn Flask
tutWorld.spawnFlask(300, 300, 'erlenmeyer');
tutManager.checkProgress('flask');
assert(tutManager.currentStepIndex === 4, 'Tutorial must advance to Step 5 after placing Flask');

// Step 5: Inspect
tutManager.checkProgress('inspect');
assert(tutManager.currentStepIndex === 5, 'Tutorial must advance to Step 6 (completion screen)');

// Test Navigation: Going back with prevStep
tutManager.prevStep();
assert(tutManager.currentStepIndex === 4, 'Tutorial must go back to Step 5');
tutManager.prevStep();
assert(tutManager.currentStepIndex === 3, 'Tutorial must go back to Step 4');
tutManager.prevStep();
assert(tutManager.currentStepIndex === 2, 'Tutorial must go back to Step 3');

// Frame update must NOT automatically advance step right after prevStep
tutManager.checkProgress();
assert(tutManager.currentStepIndex === 2, 'Tutorial must remain on Step 3 and not auto-skip forward');

console.log('\n=== Test 16: Flame Reaction (炎色反応) Verification ===');
import { getFlameReactionInfo } from '../src/data/elements';

const flameElementsToTest = [
  { sym: 'Li', expectedName: '深赤色 (深紅)' },
  { sym: 'Na', expectedName: '黄色 (D線)' },
  { sym: 'K', expectedName: '淡赤紫色 (赤紫)' },
  { sym: 'Cu', expectedName: '青緑色' },
  { sym: 'Ca', expectedName: '橙赤色 (橙)' },
  { sym: 'Sr', expectedName: '深赤色 (紅)' },
  { sym: 'Ba', expectedName: '黄緑色' },
  { sym: 'Cs', expectedName: '青紫色 (青)' },
  { sym: 'Rb', expectedName: '深赤色 (赤紫がかる)' },
  { sym: 'P', expectedName: '淡い青色 (淡青)' },
  { sym: 'B', expectedName: '黄緑色' },
  { sym: 'Zn', expectedName: '青緑色〜青白色' },
  { sym: 'As', expectedName: '淡青色' },
  { sym: 'Se', expectedName: '青色' },
  { sym: 'Mo', expectedName: '黄緑色' },
  { sym: 'In', expectedName: '藍色 (インディゴ)' },
  { sym: 'Sb', expectedName: '淡緑色 (青緑色)' },
  { sym: 'Te', expectedName: '淡緑色' },
  { sym: 'Tl', expectedName: '緑色 (鮮緑色)' },
  { sym: 'Pb', expectedName: '青白色 (淡青色)' },
  { sym: 'Ra', expectedName: '深赤色 (洋紅)' }
];

for (const item of flameElementsToTest) {
  const info = getFlameReactionInfo('element', item.sym);
  assert(info !== null, `Element ${item.sym} must have flame reaction info`);
  assert(info!.hasFlameReaction, `Element ${item.sym} hasFlameReaction must be true`);
  assert(info!.flameColorNameJa === item.expectedName, `Element ${item.sym} flame name must match`);
}

// 化合物からの炎色判定 (NaCl -> Na, CaCl2 -> Ca, CuO -> Cu, ZnCl2 -> Zn)
const naclFlame = getFlameReactionInfo('compound', 'NaCl');
assert(naclFlame !== null && naclFlame.elementSymbol === 'Na', 'NaCl must have Na flame reaction');

const cuoFlame = getFlameReactionInfo('compound', 'CuO');
assert(cuoFlame !== null && cuoFlame.elementSymbol === 'Cu', 'CuO must have Cu flame reaction');

// マグネシウムは炎色反応を示さない (燃えるときの白い光は燃焼の光)
assert(getFlameReactionInfo('element', 'Mg') === null, 'Mg must not have a flame test color');
assert(getFlameReactionInfo('compound', 'MgO') === null, 'MgO must not have a flame test color');
// 指示薬は炎色反応を示さない (ID が Ca で始まるムラサキキャベツ液を Ca と取り違えない)
assert(getFlameReactionInfo('compound', 'CabbageJuice') === null, 'Cabbage juice must not show the Ca flame color');
// 化合物の炎色は構成元素から決まる
assert(getFlameReactionInfo('compound', 'RbOH')?.elementSymbol === 'Rb', 'RbOH must show the Rb flame color');
assert(getFlameReactionInfo('compound', 'CsOH')?.elementSymbol === 'Cs', 'CsOH must show the Cs flame color');
assert(getFlameReactionInfo('compound', 'BaSO4')?.elementSymbol === 'Ba', 'BaSO4 must show the Ba flame color');
assert(getFlameReactionInfo('compound', 'AgNO3') === null, 'AgNO3 must not have a flame test color');

const zncl2Flame = getFlameReactionInfo('compound', 'ZnCl2');
assert(zncl2Flame !== null && zncl2Flame.elementSymbol === 'Zn', 'ZnCl2 must have Zn flame reaction');

// ボトムバーのクイックパレットに全炎色反応元素が含まれているか検証
import { Toolbar, ERASER_RADIUS, ERASER_SIZES, eraserErasesGlassware } from '../src/ui/Toolbar';
const testToolbar = new Toolbar();
for (const item of flameElementsToTest) {
  assert(
    testToolbar.quickElements.includes(item.sym),
    `Toolbar quickElements must include flame reaction element ${item.sym}`
  );
}

// 加熱・点火時の炎色エフェクト生成テスト
const flameWorld = new PhysicsWorld(800, 600);
const naParticle = new Particle('na1', 'element', 'Na', 300, 300, 25);
flameWorld.addParticle(naParticle);
flameWorld.applySpark(300, 300, 40);

const flameEffect = flameWorld.effects.find(e => e.type === 'flame_plume');
assert(flameEffect !== undefined, 'applySpark on Na must generate flame_plume visual effect');
assert(flameEffect!.color === '#FACC15', 'Na flame_plume must have yellow color #FACC15');

console.log('\n=== Test 17: Electricity & Electrolysis Verification ===');
const elecWorld = new PhysicsWorld(800, 600);

// 1. 導電性の検証 (金属・炭素は良導体、非金属気体は不導体)
const feElec = new Particle('fe_elec1', 'element', 'Fe', 200, 200, 25);
const cElec = new Particle('c_elec1', 'element', 'C', 220, 200, 25);
const heElec = new Particle('he_elec1', 'element', 'He', 240, 200, 25);
const o2Elec = new Particle('o2_elec1', 'compound', 'O2', 260, 200, 25);

assert(elecWorld.isConductor(feElec) === true, 'Fe must be a conductor');
assert(elecWorld.isConductor(cElec) === true, 'C (graphite) must be a conductor');
assert(elecWorld.isConductor(heElec) === false, 'He must not be a conductor');
assert(elecWorld.isConductor(o2Elec) === false, 'O2 must not be a conductor');

// 2. 金属への通電とジュール熱・放電アーク
elecWorld.addParticle(feElec);
const initFeTemp = feElec.temperature;
const elecRes = elecWorld.applyElectric(200, 200, 30);
assert(feElec.temperature > initFeTemp, 'Fe particle temperature must increase by Joule heat');
assert(elecRes.conductedCount >= 1, 'conductedCount must be >= 1');

const arcEffect = elecWorld.effects.find(e => e.type === 'electric_arc');
assert(arcEffect !== undefined, 'applyElectric must generate electric_arc effect');

// 3. 水の電気分解 (2H2O -> 2H2 + O2): 純水はほとんど電気を通さないので、水酸化ナトリウムを溶かしたときだけ分解する
const pureWaterWorld = new PhysicsWorld(800, 600);
for (let i = 0; i < 5; i++) {
  pureWaterWorld.addParticle(new Particle(`pw${i}`, 'compound', 'H2O', 300, 300, 25));
}
let pureDecompCount = 0;
let pureWaterHinted = false;
for (let attempt = 0; attempt < 10; attempt++) {
  const res = pureWaterWorld.applyElectric(300, 300, 40);
  pureDecompCount += res.decomposedCount;
  pureWaterHinted ||= res.pureWaterOnly;
}
assert(pureDecompCount === 0, 'Pure water must not be electrolyzed');
assert(pureWaterHinted, 'Electrifying pure water must report pureWaterOnly so the hint can be shown');
assert(pureWaterWorld.getConductivity(pureWaterWorld.particles[0]) === 'pure_water', 'Pure water must be labeled as barely conducting');

const waterWorld = new PhysicsWorld(800, 600);
for (let i = 0; i < 5; i++) {
  waterWorld.addParticle(new Particle(`w${i}`, 'compound', 'H2O', 300, 300, 25));
}
waterWorld.addParticle(new Particle('w_naoh', 'compound', 'NaOH', 302, 300, 25));
assert(waterWorld.getConductivity(waterWorld.particles[0]) === 'ionic_water', 'Water with NaOH must conduct');
let waterDecompCount = 0;
for (let attempt = 0; attempt < 5; attempt++) {
  const res = waterWorld.applyElectric(300, 300, 40);
  waterDecompCount += res.decomposedCount;
}
assert(waterDecompCount > 0, 'Water with NaOH must decompose H2O particles into H2/O2');
const hasH2OrO2 = waterWorld.particles.some(p => p.symbolOrId === 'H2' || p.symbolOrId === 'O2');
assert(hasH2OrO2, 'WaterWorld must contain H2 or O2 after electrolysis');
assert(waterWorld.particles.some(p => p.symbolOrId === 'NaOH'), 'NaOH must remain unchanged after water electrolysis');

// 4. 塩化銅の電気分解 (CuCl2 -> Cu + Cl2): 水溶液のときだけ。乾いた固体はイオンが動けず分解しない
const dryCuclWorld = new PhysicsWorld(800, 600);
for (let i = 0; i < 4; i++) {
  dryCuclWorld.addParticle(new Particle(`dcucl${i}`, 'compound', 'CuCl2', 400, 400, 25));
}
let dryCuclDecompCount = 0;
for (let attempt = 0; attempt < 10; attempt++) {
  dryCuclDecompCount += dryCuclWorld.applyElectric(400, 400, 40).decomposedCount;
}
assert(dryCuclDecompCount === 0, 'Dry solid CuCl2 must not be electrolyzed');

const cuclWorld = new PhysicsWorld(800, 600);
for (let i = 0; i < 4; i++) {
  cuclWorld.addParticle(new Particle(`cucl${i}`, 'compound', 'CuCl2', 400, 400, 25));
}
cuclWorld.addParticle(new Particle('cucl_w', 'compound', 'H2O', 402, 400, 25));
let cuclDecompCount = 0;
for (let attempt = 0; attempt < 4; attempt++) {
  const res = cuclWorld.applyElectric(400, 400, 40);
  cuclDecompCount += res.decomposedCount;
}
assert(cuclDecompCount > 0, 'CuCl2 solution electrolysis must decompose into Cu/Cl2');

// 5. 電解質は、イオンが動けるとき (水に溶けている・融けている) だけ電気を通す
const condWorld = new PhysicsWorld(800, 600);
const drySalt = new Particle('cond_salt', 'compound', 'NaCl', 100, 300, 25);
const hclGas = new Particle('cond_hcl', 'compound', 'HCl', 200, 300, 25);
const moltenSalt = new Particle('cond_molten', 'compound', 'NaCl', 300, 300, 900);
const wetSalt = new Particle('cond_wet', 'compound', 'NaCl', 500, 300, 25);
const saltWater = new Particle('cond_water', 'compound', 'H2O', 503, 300, 25);
[drySalt, hclGas, moltenSalt, wetSalt, saltWater].forEach(p => condWorld.addParticle(p));
assert(!condWorld.isConductor(drySalt) && condWorld.getConductivity(drySalt) === 'electrolyte_dry', 'Solid NaCl must not conduct');
assert(!condWorld.isConductor(hclGas), 'HCl gas without water must not conduct');
assert(condWorld.isConductor(moltenSalt), 'Molten NaCl must conduct');
assert(condWorld.isConductor(wetSalt), 'NaCl dissolved in water must conduct');
const dryTemp = drySalt.temperature;
condWorld.applyElectric(100, 300, 30);
assert(drySalt.temperature === dryTemp, 'Solid NaCl must not be heated by current');

console.log('\n=== Test 18: Transparent Chamber (透明ケース) & Toxic Gas Color Shift & Ventilation ===');
const chamberWorld = new PhysicsWorld(800, 600);
assert(chamberWorld.chamber.width > 0 && chamberWorld.chamber.height > 0, 'Chamber bounds must be initialized');
assert(chamberWorld.chamber.toxicLevel === 0, 'Initial chamber toxic level must be 0 (Clean)');

// 1. 粒子のケース内衝突と閉じ込め
const pInside = new Particle('pin', 'element', 'H', chamberWorld.chamber.minX + 20, chamberWorld.chamber.minY + 20, 25);
pInside.vx = -10; // ケース左壁に向かって高速移動
chamberWorld.addParticle(pInside);

for (let frame = 0; frame < 10; frame++) {
  chamberWorld.update();
}
assert(pInside.x >= chamberWorld.chamber.minX + pInside.radius - 1, 'Particle must stay inside chamber left wall');

// 2. 有毒ガス (CO: 一酸化炭素) 発生時のケース内カラー変化 & 検知
const coGas1 = new Particle('co_g1', 'compound', 'CO', 400, 300, 25);
const coGas2 = new Particle('co_g2', 'compound', 'CO', 420, 300, 25);
chamberWorld.addParticle(coGas1);
chamberWorld.addParticle(coGas2);

for (let frame = 0; frame < 15; frame++) {
  chamberWorld.update();
}

console.log(`Chamber toxicLevel: ${chamberWorld.chamber.toxicLevel.toFixed(2)}, dominant: ${chamberWorld.chamber.dominantToxicCompound}, dominantName: ${chamberWorld.chamber.dominantToxicNameJa}`);
assert(chamberWorld.chamber.toxicLevel > 0.2, 'Chamber toxic level must increase when toxic gas is present');
assert(chamberWorld.chamber.dominantToxicCompound === 'CO', 'Chamber must identify CO as dominant toxic compound');
assert(chamberWorld.chamber.dominantToxicNameJa === '一酸化炭素', 'Chamber must identify Japanese name of dominant toxic compound');

// 3. 有毒ガス (Cl2: 塩素ガス) に変化させた場合の黄緑色カラー適応
chamberWorld.clear();
const clGas = new Particle('cl_g', 'compound', 'Cl2', 400, 300, 25);
chamberWorld.addParticle(clGas);
for (let frame = 0; frame < 15; frame++) {
  chamberWorld.update();
}
assert(chamberWorld.chamber.dominantToxicCompound === 'Cl2', 'Chamber must identify Cl2');
assert(chamberWorld.chamber.dominantToxicColor.includes('163, 230, 53'), 'Cl2 must use yellow-green toxic color');

// 4. チャンバー換気 (Ventilation) による有毒ガスの排気とクリーン復帰
const ventRes = chamberWorld.ventilateChamber();
assert(ventRes.purgedCount >= 1, 'Ventilating chamber must purge toxic gas');

for (let frame = 0; frame < 30; frame++) {
  chamberWorld.update();
}
console.log(`Chamber toxicLevel after ventilation: ${chamberWorld.chamber.toxicLevel.toFixed(2)}`);
assert(chamberWorld.chamber.toxicLevel < 0.05, 'Chamber toxic level must return to 0 (Clean) after ventilation');

console.log('\n=== Test 19: Internationalization (i18n) & Bilingual Support ===');
import { getLanguage, setLanguage, onLanguageChange, t, TRANSLATIONS, getGrade, setGrade, hasChosenGrade } from '../src/i18n';
import { getElementName, getElementDescription, getElementFact } from '../src/data/elements';
import { getCompoundName, getCompoundDescription, getCompoundFact, getCompoundToxicWarning } from '../src/data/compounds';
import { getReactionName, getReactionDescription, getReactionCategory } from '../src/data/reactions';
import { QUESTS_DATA, getQuestTitle, getQuestCategory, getQuestObjective, getQuestHint, getQuestNote } from '../src/data/quests';

// 1. Language switching & listeners
let notifiedLang = '';
const unsub = onLanguageChange((l) => { notifiedLang = l; });

setLanguage('ja');
assert(getLanguage() === 'ja', 'Language must be ja after setLanguage(ja)');
assert(notifiedLang === 'ja', 'Listener must receive ja notification');
assert(t().appTitle === '元素ラボ', 'Japanese appTitle must be 元素ラボ');
assert(t().chamber.title.includes('密閉実験ケース'), 'Japanese chamber title must mention 密閉実験ケース');

setLanguage('en');
assert(getLanguage() === 'en', 'Language must be en after setLanguage(en)');
assert(notifiedLang === 'en', 'Listener must receive en notification');
assert(t().appTitle === 'Element Lab', 'English appTitle must be Element Lab');
assert(t().chamber.title.includes('Sealed'), 'English chamber title must mention Sealed');
assert(t().chamber.cleanStatus.includes('Normal'), 'English clean status must mention Normal');
assert(t().chamber.toxicAlert('Carbon Monoxide', 'CO').includes('Carbon Monoxide (CO)'), 'English toxic alert must format compound correctly');

unsub();

// 2. Elements bilingual data verification
const hElem = ELEMENTS_DATA['H'];
assert(getElementName(hElem, 'ja') === '水素', 'H Japanese name must be 水素');
assert(getElementName(hElem, 'en') === 'Hydrogen', 'H English name must be Hydrogen');
assert(getElementDescription(hElem, 'ja').includes('宇宙で最も多く'), 'H Japanese description check');
assert(getElementFact(hElem, 'ja').includes('最も密度が小さく'), 'H Japanese fact check');
assert(getElementFact(hElem, 'en').includes('least dense'), 'H English fact check');

// 3. Compounds bilingual data verification
const h2oComp = COMPOUNDS_DATA['H2O'];
assert(getCompoundName(h2oComp, 'ja') === '水', 'H2O Japanese name must be 水');
assert(getCompoundName(h2oComp, 'en') === 'Water', 'H2O English name must be Water');

const coComp = COMPOUNDS_DATA['CO'];
assert(getCompoundName(coComp, 'ja') === '一酸化炭素', 'CO Japanese name must be 一酸化炭素');
assert(getCompoundName(coComp, 'en') === 'Carbon Monoxide', 'CO English name must be Carbon Monoxide');
assert(getCompoundToxicWarning(coComp, 'en').includes('toxic') || getCompoundToxicWarning(coComp, 'en').includes('Toxic') || getCompoundToxicWarning(coComp, 'en').includes('Deadly'), 'CO English toxic warning check');

// 4. Reactions bilingual data verification
const rxn1 = REACTIONS_DATA.find(r => r.id === 'water_synthesis_atomic')!;
assert(!!rxn1, 'water_synthesis_atomic must exist');
assert(getReactionName(rxn1, 'ja').includes('水の合成') || getReactionName(rxn1, 'ja').includes('水素'), 'Reaction Japanese name check');
assert(getReactionName(rxn1, 'en').length > 0, 'Reaction English name check');
assert(getReactionCategory(rxn1, 'en').length > 0, 'Reaction English category check');

// 5. Quests bilingual data verification
const q1 = QUESTS_DATA[0];
assert(getQuestTitle(q1, 'ja').length > 0, 'Quest Japanese title check');
assert(getQuestTitle(q1, 'en').length > 0, 'Quest English title check');
assert(getQuestObjective(q1, 'en').length > 0, 'Quest English objective check');
assert(getQuestHint(q1, 'en').length > 0, 'Quest English hint check');
assert(getQuestNote(q1, 'en').length > 0, 'Quest English note check');

// 6. Periodic Table detail pure English verification in English mode
const oElem = ELEMENTS_DATA['O'];
const headerEn = 'en' === 'en' ? oElem.nameEn : `${oElem.nameJa} (${oElem.nameEn})`;
assert(!headerEn.includes('酸素'), 'English mode header must NOT contain Japanese characters (酸素)');
assert(headerEn === 'Oxygen', 'English mode header must be Oxygen');

const stateEn = 'en' === 'en'
  ? (oElem.stateAtRoomTemp === 'gas' ? 'Gas ♨' : (oElem.stateAtRoomTemp === 'liquid' ? 'Liquid 💧' : 'Solid 🧊'))
  : (oElem.stateAtRoomTemp === 'gas' ? '気体 ♨' : (oElem.stateAtRoomTemp === 'liquid' ? '液体 💧' : '固体 🧊'));
assert(!stateEn.includes('気体'), 'English mode state must NOT contain Japanese (気体)');
assert(stateEn.includes('Gas'), 'English mode state must contain Gas');

console.log('\n=== Test 20: Flask Cap & Sealing Physics Verification ===');
const capWorld = new PhysicsWorld(800, 600);
const cappedFlask = capWorld.spawnFlask(400, 350, 'erlenmeyer');
assert(cappedFlask.hasCap === false, 'Newly spawned flask must have hasCap === false');
const uncappedSegmentCount = cappedFlask.segments.length;
assert(uncappedSegmentCount === 7, 'Uncapped erlenmeyer flask must have 7 segments');

// 1. Toggle cap ON
const capResultOn = capWorld.toggleFlaskCap(cappedFlask);
assert(capResultOn === true && cappedFlask.hasCap === true, 'toggleFlaskCap must turn hasCap to true');
assert(cappedFlask.segments.length === 8, 'Capped flask must have 8 segments (mouth closure segment added)');

// 2. Click/tap point detection at cap
const detectedFlask = capWorld.getContainerAtCapPoint(400, 350 - ERLENMEYER.height - 10);
assert(detectedFlask === cappedFlask, 'getContainerAtCapPoint must detect flask when tapping mouth/cap area');
const missFlask = capWorld.getContainerAtCapPoint(100, 100);
assert(missFlask === null, 'getContainerAtCapPoint must return null for far coordinates');

// 3. Sealed flask retains floating gas inside
const trappedHe = new Particle('trapped_he', 'element', 'He', 400, 300, 25);
capWorld.addParticle(trappedHe);

for (let f = 0; f < 40; f++) {
  capWorld.update();
}

const neckTop = cappedFlask.cy - ERLENMEYER.height;
console.log(`Trapped He Y position: ${trappedHe.y.toFixed(1)} (neck top is ${neckTop.toFixed(1)})`);
assert(trappedHe.y >= neckTop - 2, 'Light gas (He) must remain trapped inside sealed flask');

// 4. Toggle cap OFF: gas must escape through opening
const capResultOff = capWorld.toggleFlaskCap(cappedFlask);
assert(capResultOff === false && cappedFlask.hasCap === false, 'toggleFlaskCap must turn hasCap to false');
assert(cappedFlask.segments.length === 7, 'Uncapped flask segments must return to 7');

for (let f = 0; f < 60; f++) {
  capWorld.update();
}

const openNeckTop = cappedFlask.cy - ERLENMEYER.height;
console.log(`Escaped He Y position: ${trappedHe.y.toFixed(1)} (should be above neck ${openNeckTop.toFixed(1)})`);
assert(trappedHe.y < openNeckTop, 'He gas must escape out of flask after removing cap');

console.log('\n=== Test 21: Precision Pan Balance (上皿天秤) Physics & Mass Comparison Verification ===');
const balWorld = new PhysicsWorld(800, 600);
const balance = balWorld.spawnBalance(400, 500);

assert(balance !== null, 'spawnBalance must return a valid LabBalance instance');
assert(balance.angle === 0, 'Initial balance angle must be 0');
assert(balance.leftPan.cx < balance.cx, 'Left pan must be positioned to the left of center');
assert(balance.rightPan.cx > balance.cx, 'Right pan must be positioned to the right of center');
assert(balance.segments.length >= 7, 'Balance must have collision segments for both pans and base');

// 1. Hover & Click detection
const hoveredBal = balWorld.getHoveredBalance(400, 450);
assert(hoveredBal === balance, 'getHoveredBalance must detect balance');
const panLeftHit = balWorld.getBalanceAtPan(balance.leftPan.cx, balance.leftPan.cy);
assert(panLeftHit?.side === 'left', 'getBalanceAtPan must detect left pan tap');
const panRightHit = balWorld.getBalanceAtPan(balance.rightPan.cx, balance.rightPan.cy);
assert(panRightHit?.side === 'right', 'getBalanceAtPan must detect right pan tap');

// 2. Mass comparison: H2 (2.02) on left vs O2 (32.00) on right
const p_h2 = new Particle('test_h2', 'compound', 'H2', balance.leftPan.cx, balance.leftPan.cy - 10, 25);
const p_o2 = new Particle('test_o2', 'compound', 'O2', balance.rightPan.cx, balance.rightPan.cy - 10, 25);
balWorld.addParticle(p_h2);
balWorld.addParticle(p_o2);

for (let f = 0; f < 60; f++) {
  balWorld.update();
}

console.log(`Left mass: ${balance.leftPan.totalMass.toFixed(2)}, Right mass: ${balance.rightPan.totalMass.toFixed(2)}, Angle: ${balance.angle.toFixed(3)}`);
assert(balance.leftPan.particles.length === 1, 'Left pan must hold H2 particle');
assert(balance.rightPan.particles.length === 1, 'Right pan must hold O2 particle');
assert(balance.leftPan.totalMass >= 2.0 && balance.leftPan.totalMass <= 2.1, 'Left pan totalMass must reflect H2 molar mass (~2.02)');
assert(balance.rightPan.totalMass >= 31.9 && balance.rightPan.totalMass <= 32.1, 'Right pan totalMass must reflect O2 molar mass (~32.00)');
assert(balance.angle > 0.1, 'Balance must tilt downward to the right because O2 is heavier than H2');

// 3. Balancing experiment: add 15 more H2 particles (total 16 H2 = 32.26 g/mol) vs 1 O2 (32.00 g/mol)
for (let i = 2; i <= 16; i++) {
  const x = balance.leftPan.cx + ((i % 4) - 1.5) * 8;
  const y = balance.leftPan.cy - 10 - Math.floor(i / 4) * 12;
  const h = new Particle(`test_h2_${i}`, 'compound', 'H2', x, y, 25);
  balWorld.addParticle(h);
}

for (let f = 0; f < 80; f++) {
  balWorld.update();
}

console.log(`16 H2 mass: ${balance.leftPan.totalMass.toFixed(2)} vs 1 O2 mass: ${balance.rightPan.totalMass.toFixed(2)}, Balanced angle: ${balance.angle.toFixed(4)}`);
assert(balance.leftPan.particles.length === 16, 'Left pan must hold all 16 H2 molecules');
assert(Math.abs(balance.leftPan.totalMass - balance.rightPan.totalMass) < 1.0, 'Mass difference between 16 H2 and 1 O2 must be < 1.0 g/mol');
assert(Math.abs(balance.angle) < 0.05, 'Balance must return to almost horizontal (balanced) state with 16 H2 vs 1 O2');

// 4. Clear left pan
const clearedCount = balWorld.clearPan(balance, 'left');
assert(clearedCount === 16, 'clearPan must remove all 16 particles from left pan');
assert(balance.leftPan.particles.length === 0 && balance.leftPan.totalMass === 0, 'Left pan must be empty after clearPan');

// 5. Balance lock
const lockState = balWorld.toggleBalanceLock(balance);
assert(lockState === true && balance.isLocked === true, 'toggleBalanceLock must engage lock');
balWorld.update();
assert(balance.angle === 0, 'Locked balance must remain at horizontal angle 0');

console.log('\n=== Test 22: Flask Gravity, Balance Pan Landing & Mass Comparison Verification ===');
const fWorld = new PhysicsWorld(800, 600);

// 1. Free fall and landing on chamber floor
const fallingFlask = fWorld.spawnFlask(200, 200, 'erlenmeyer');
assert(fallingFlask.cy === 200, 'Newly spawned flask in air starts at spawn Y');
assert(fallingFlask.tareMass === 50.0, 'Erlenmeyer flask must have default tareMass 50.0g');

for (let f = 0; f < 5; f++) {
  fWorld.update();
}
assert(fallingFlask.cy > 200, 'Flask must fall downward due to gravity');
assert(fallingFlask.vy > 0, 'Flask vertical velocity must be positive while falling');

for (let f = 0; f < 50; f++) {
  fWorld.update();
}
assert(fallingFlask.cy === fWorld.chamber.maxY, 'Flask must land safely on chamber floor');
assert(fallingFlask.vy === 0, 'Flask velocity must be 0 after landing on floor');
assert(fallingFlask.isGrounded === true, 'Flask isGrounded must be true on floor');

// 2. Spawn and land on Pan Balance left pan
const fBal = fWorld.spawnBalance(500, 520);
const leftFlask = fWorld.spawnFlask(fBal.leftPan.cx, fBal.leftPan.cy - 30, 'erlenmeyer');

for (let f = 0; f < 25; f++) {
  fWorld.update();
}
console.log(`Left flask Y: ${leftFlask.cy.toFixed(1)}, left pan Y: ${fBal.leftPan.cy.toFixed(1)}, supported: ${leftFlask.supportedByPanSide}`);
assert(leftFlask.supportedByBalanceId === fBal.id, 'Flask must be supported by balance');
assert(leftFlask.supportedByPanSide === 'left', 'Flask must be supported on left pan');
assert(Math.abs(leftFlask.cy - fBal.leftPan.cy) < 1.0, 'Flask base Y must align with left pan Y');
assert(fBal.leftPan.totalMass >= 50.0, 'Left pan totalMass must include flask tareMass (50.0g)');
assert(fBal.angle < -0.1, 'Balance must tilt downward to the left due to flask weight');

// 3. Place identical flask on right pan -> Perfect balance!
const rightFlask = fWorld.spawnFlask(fBal.rightPan.cx, fBal.rightPan.cy, 'erlenmeyer');
assert(rightFlask.supportedByBalanceId === fBal.id && rightFlask.supportedByPanSide === 'right', 'Right flask must snap/land on right pan');

for (let f = 0; f < 60; f++) {
  fWorld.update();
}
console.log(`Left mass: ${fBal.leftPan.totalMass.toFixed(1)}, Right mass: ${fBal.rightPan.totalMass.toFixed(1)}, Balance angle: ${fBal.angle.toFixed(4)}`);
assert(fBal.leftPan.totalMass === 50.0, 'Left pan must have 50.0g');
assert(fBal.rightPan.totalMass === 50.0, 'Right pan must have 50.0g');
assert(Math.abs(fBal.angle) < 0.05, 'Balance must return to balanced state when identical flasks are placed on both pans');

// 4. Add Water (H2O = 18.02 g/mol) inside left flask
const p_water = new Particle('water_sample', 'compound', 'H2O', leftFlask.cx, leftFlask.cy - 30, 25);
p_water.containerId = leftFlask.id;
fWorld.addParticle(p_water);

for (let f = 0; f < 60; f++) {
  fWorld.update();
}
console.log(`Left with water: ${fBal.leftPan.totalMass.toFixed(2)} vs Right empty flask: ${fBal.rightPan.totalMass.toFixed(2)}, Angle: ${fBal.angle.toFixed(4)}`);
assert(fBal.leftPan.totalMass >= 68.0 && fBal.leftPan.totalMass <= 68.1, 'Left pan must include flask tare (50.0) + water (18.02) = ~68.02 g');
assert(fBal.angle < -0.05, 'Balance must tilt to the left after adding water to left flask');
assert(Math.abs(leftFlask.cy - fBal.leftPan.cy) < 1.0, 'Left flask must stay attached to pan during tilting motion');

// 5. Clear all pans -> Removes flasks and particles on pans
const clearedPans = fWorld.clearPan(fBal, 'all');
assert(fBal.leftPan.totalMass === 0 && fBal.rightPan.totalMass === 0, 'Both pans must be 0g after clearPan');
assert(fWorld.containers.find(c => c.id === leftFlask.id) === undefined, 'Left flask must be removed from world');
assert(fWorld.containers.find(c => c.id === rightFlask.id) === undefined, 'Right flask must be removed from world');

console.log('\n=== Test 23: Sealed Flask Toxic Gas Isolation & Containment Verification ===');
const toxWorld = new PhysicsWorld(800, 600);

// 1. Spawn flask and seal it with cap
const sealedFlask = toxWorld.spawnFlask(400, 500, 'erlenmeyer');
toxWorld.setFlaskCap(sealedFlask, true);
assert(sealedFlask.hasCap === true, 'Flask must be sealed with cap');

// 2. Inject toxic gas (HCl - Hydrogen Chloride) inside sealed flask
const testHclGas = new Particle('test_hcl', 'compound', 'HCl', sealedFlask.cx, sealedFlask.cy - 30, 25);
testHclGas.containerId = sealedFlask.id;
toxWorld.addParticle(testHclGas);
assert(testHclGas.isToxic === true, 'HCl must be toxic');
assert(testHclGas.state === 'gas', 'HCl must be gas at room temperature');

for (let f = 0; f < 30; f++) {
  toxWorld.update();
}

console.log(`Chamber toxicLevel with sealed HCl: ${toxWorld.chamber.toxicLevel.toFixed(3)}, dominant: ${toxWorld.chamber.dominantToxicCompound}`);
assert(toxWorld.chamber.toxicLevel === 0, 'Chamber toxicLevel must remain 0 (Clean) when HCl is sealed inside flask');
assert(toxWorld.chamber.dominantToxicCompound === null, 'No dominant toxic gas in chamber when sealed inside flask');

// 3. Toggle cap OFF (unseal) -> Toxic gas escapes into chamber
toxWorld.toggleFlaskCap(sealedFlask);
assert(sealedFlask.hasCap === false, 'Flask must be unsealed');

for (let f = 0; f < 50; f++) {
  toxWorld.update();
}

console.log(`Chamber toxicLevel after removing cap: ${toxWorld.chamber.toxicLevel.toFixed(3)}, dominant: ${toxWorld.chamber.dominantToxicCompound}`);
assert(toxWorld.chamber.toxicLevel > 0.2, 'Chamber toxicLevel must rise after unsealing flask');
assert(toxWorld.chamber.dominantToxicCompound === 'HCl', 'Chamber dominant toxic compound must be HCl');

// 4. Ventilate chamber
const ventRes2 = toxWorld.ventilateChamber();
assert(ventRes2.purgedCount >= 1, 'Ventilating chamber must purge toxic gas');
for (let f = 0; f < 30; f++) {
  toxWorld.update();
}
console.log(`Chamber toxicLevel after ventilation: ${toxWorld.chamber.toxicLevel.toFixed(3)}`);
assert(toxWorld.chamber.toxicLevel < 0.05, 'Chamber toxicLevel must return to 0 after ventilation');

console.log('\n=== Test 24: Flask Overlap Prevention & Balance Pan Duplicate Prevention Verification ===');
const ovWorld = new PhysicsWorld(800, 600);

// 1. Placement of first flask on floor
const flask1 = ovWorld.spawnFlask(300, 500, 'erlenmeyer');
assert(flask1 !== null, 'First flask must spawn successfully');

// 2. Direct overlap attempt at exact same location
const checkExact = ovWorld.canSpawnFlask(300, 500, 'erlenmeyer');
assert(checkExact.allowed === false && checkExact.reason === 'overlap_container', 'canSpawnFlask must reject exact overlap with overlap_container');
const overlapExact = ovWorld.spawnFlask(300, 500, 'erlenmeyer');
assert(overlapExact === null, 'spawnFlask must return null when attempting exact overlap');

// 3. Horizontal overlap within container radius distance (dx = 30 < 48+48-10 = 86)
const checkNear = ovWorld.canSpawnFlask(330, 500, 'erlenmeyer');
assert(checkNear.allowed === false && checkNear.reason === 'overlap_container', 'canSpawnFlask must reject nearby overlapping flask');
const overlapNear = ovWorld.spawnFlask(330, 500, 'erlenmeyer');
assert(overlapNear === null, 'spawnFlask must return null for overlapping flask');

// 4. Above existing floor flask: air spawn that would land on floor at same X
const checkAbove = ovWorld.canSpawnFlask(300, 200, 'erlenmeyer');
assert(checkAbove.allowed === false && checkAbove.reason === 'overlap_container', 'canSpawnFlask must reject air spawn directly above floor flask');
const overlapAbove = ovWorld.spawnFlask(300, 200, 'erlenmeyer');
assert(overlapAbove === null, 'spawnFlask must return null when spawning directly above floor flask');

// 5. Balance pan duplicate prevention
const ovBalance = ovWorld.spawnBalance(600, 520);
// Spawn first flask on left pan
const panFlask1 = ovWorld.spawnFlask(ovBalance.leftPan.cx, ovBalance.leftPan.cy, 'erlenmeyer');
assert(panFlask1 !== null, 'First flask on left pan must spawn successfully');
assert(panFlask1.supportedByPanSide === 'left', 'Flask must be supported on left pan');

// Try to spawn second flask on left pan -> must be rejected with 'pan_occupied'
const checkLeftAgain = ovWorld.canSpawnFlask(ovBalance.leftPan.cx, ovBalance.leftPan.cy, 'beaker');
assert(checkLeftAgain.allowed === false && checkLeftAgain.reason === 'pan_occupied', 'canSpawnFlask must reject 2nd flask on same pan with pan_occupied');
const overlapPanFlask = ovWorld.spawnFlask(ovBalance.leftPan.cx, ovBalance.leftPan.cy, 'beaker');
assert(overlapPanFlask === null, 'spawnFlask must return null when placing 2nd flask on same pan');

// Spawn flask on right pan -> allowed
const checkRight = ovWorld.canSpawnFlask(ovBalance.rightPan.cx, ovBalance.rightPan.cy, 'erlenmeyer');
assert(checkRight.allowed === true, 'Right pan is empty so canSpawnFlask must allow');
const panFlask2 = ovWorld.spawnFlask(ovBalance.rightPan.cx, ovBalance.rightPan.cy, 'erlenmeyer');
assert(panFlask2 !== null && panFlask2.supportedByPanSide === 'right', 'Right pan flask must spawn successfully');

// Try to spawn second flask on right pan -> rejected
const checkRightAgain = ovWorld.canSpawnFlask(ovBalance.rightPan.cx, ovBalance.rightPan.cy, 'erlenmeyer');
assert(checkRightAgain.allowed === false && checkRightAgain.reason === 'pan_occupied', 'canSpawnFlask must reject 2nd flask on right pan');

// 6. Non-overlapping placement at safe distance
const safeX = 120;
const checkSafe = ovWorld.canSpawnFlask(safeX, 500, 'beaker');
assert(checkSafe.allowed === true, 'canSpawnFlask must allow safe distance container');
const safeBeaker = ovWorld.spawnFlask(safeX, 500, 'beaker');
assert(safeBeaker !== null, 'safeBeaker must spawn successfully');

console.log(`Containers in world: ${ovWorld.containers.length} (Expected: 4 - 1 floor, 2 balance, 1 safe beaker)`);
assert(ovWorld.containers.length === 4, 'Total containers in world must be exactly 4');

console.log('\n=== Test 25: Kid-Friendly Mystery Hints & Recipe Synthesis Verification ===');
const allCompounds = Object.values(COMPOUNDS_DATA);
assert(allCompounds.length === 90, 'Total compounds in database must be 90 (68 + 6 indicators + 3 dissolving reagents + 5 organic + 4 junior-high experiments + 3 metal sulfates + calcium hydrogen carbonate)');

// 1. Verify that all 46 compounds have kidHintJa, kidHintEn, and recipe
for (const comp of allCompounds) {
  const hintJa = getCompoundKidHint(comp, 'ja');
  const hintEn = getCompoundKidHint(comp, 'en');
  assert(hintJa && hintJa.length > 5, `Compound [${comp.id}] must have kidHintJa`);
  assert(hintEn && hintEn.length > 5, `Compound [${comp.id}] must have kidHintEn`);

  // 指示薬は作るものではなく最初から使える実験道具なので、つくり方はない
  if (isStarterCompound(comp)) continue;
  assert(comp.recipe !== undefined, `Compound [${comp.id}] must have recipe`);
  const recipe = comp.recipe!;
  assert(recipe.materials.length >= 1, `Compound [${comp.id}] recipe must have materials`);
  assert(recipe.materials.every(m => m.count >= 1 && m.id.length >= 1), `Compound [${comp.id}] materials must be valid`);
  assert(recipe.methodJa.length > 0, `Compound [${comp.id}] recipe must have methodJa`);
  assert(recipe.methodEn.length > 0, `Compound [${comp.id}] recipe must have methodEn`);
  assert(recipe.toastGuideJa.length > 0, `Compound [${comp.id}] recipe must have toastGuideJa`);
  assert(recipe.toastGuideEn.length > 0, `Compound [${comp.id}] recipe must have toastGuideEn`);
}
console.log(`Verified all 46 compounds have complete kid hints and craft recipes!`);

// 2. Specific kid-friendly clues verification
const water = COMPOUNDS_DATA['H2O'];
assert(water.kidHintJa.includes('のどが渇いた') || water.kidHintJa.includes('飲む'), 'Water kidHintJa must describe drinking/thirst');
assert(water.kidHintEn.toLowerCase().includes('drink'), 'Water kidHintEn must mention drinking');
assert(water.recipe?.materials.some(m => m.id === 'H' && m.count === 2), 'Water recipe needs H x 2');
assert(water.recipe?.materials.some(m => m.id === 'O' && m.count === 1), 'Water recipe needs O x 1');

const salt = COMPOUNDS_DATA['NaCl'];
assert(salt.kidHintJa.includes('食塩') || salt.kidHintJa.includes('ポテト'), 'NaCl kidHintJa must describe table salt / food');
assert(salt.recipe?.materials.some(m => m.id === 'Na') && salt.recipe?.materials.some(m => m.id === 'Cl'), 'NaCl recipe needs Na and Cl');

const co2 = COMPOUNDS_DATA['CO2'];
assert(co2.kidHintJa.includes('炭酸') || co2.kidHintJa.includes('息'), 'CO2 kidHintJa must describe soda bubbles / breathing');

// 3. Simulation of player following recipe clues to manually spawn elements and trigger reaction in lab
const simLabWorld = new PhysicsWorld(800, 600);
const simReactionEngine = new ReactionEngine(simLabWorld);

// (a) Water synthesis from atoms: 2H + O -> H2O (contact reaction)
const waterRecipe = water.recipe!;
for (const mat of waterRecipe.materials) {
  for (let i = 0; i < mat.count; i++) {
    const p = new Particle(`test_p_${mat.id}_${i}`, mat.type, mat.id, 400, 500, 25);
    simLabWorld.addParticle(p);
  }
}
assert(simLabWorld.particles.length === 3, 'Spawned 2 H and 1 O particles in lab');

// Contact reaction triggers
simReactionEngine.checkReactions();
console.log(`Particles remaining: ${simLabWorld.particles.length}, H2O created: ${simReactionEngine.stats.createdCompounds['H2O']}`);
assert(simReactionEngine.stats.createdCompounds['H2O'] === 1, 'H2O must be created from 2H + O contact!');
assert(simLabWorld.particles.some(p => p.symbolOrId === 'H2O'), 'H2O particle must exist in world');

// (b) Carbon Dioxide synthesis: C + 2O -> CO2 (requires heat > 100°C)
const co2Recipe = co2.recipe!;
for (const mat of co2Recipe.materials) {
  for (let i = 0; i < mat.count; i++) {
    const p = new Particle(`test_c_${mat.id}_${i}`, mat.type, mat.id, 200, 500, 25);
    simLabWorld.addParticle(p);
  }
}
const preCO2Count = simReactionEngine.stats.createdCompounds['CO2'] || 0;
// At 25°C, carbon combustion should not trigger
simReactionEngine.checkReactions();
assert((simReactionEngine.stats.createdCompounds['CO2'] || 0) === preCO2Count, 'CO2 should not form at room temperature without heat');

// Heat the carbon particles (>100°C)
simLabWorld.particles.filter(p => p.x < 300).forEach(p => p.temperature = 250);
simReactionEngine.checkReactions();
assert((simReactionEngine.stats.createdCompounds['CO2'] || 0) >= 1, 'CO2 must form after heating carbon and oxygen!');
console.log(`CO2 created: ${simReactionEngine.stats.createdCompounds['CO2']}`);

console.log('\n=== Test 26: New Famous Compounds & Reactions (Categories 1, 2, 3) Verification ===');
const newWorld = new PhysicsWorld(800, 600);
const newEngine = new ReactionEngine(newWorld);

// Category 1: 2Na + 2H2O -> 2NaOH + H2
newWorld.addParticle(new Particle('cat1_na1', 'element', 'Na', 100, 500, 25));
newWorld.addParticle(new Particle('cat1_na2', 'element', 'Na', 104, 500, 25));
newWorld.addParticle(new Particle('cat1_w1', 'compound', 'H2O', 100, 504, 25));
newWorld.addParticle(new Particle('cat1_w2', 'compound', 'H2O', 104, 504, 25));
newEngine.checkReactions();
assert(newEngine.stats.createdCompounds['NaOH'] === 2 && newEngine.stats.createdCompounds['H2'] === 1, '2Na + 2H2O must produce 2NaOH + H2');

// Category 1: C + 4H -> CH4
newWorld.addParticle(new Particle('cat1_c', 'element', 'C', 200, 500, 25));
for (let i = 0; i < 4; i++) {
  newWorld.addParticle(new Particle(`cat1_h_${i}`, 'element', 'H', 200 + i, 500, 25));
}
newEngine.checkReactions();
assert(newEngine.stats.createdCompounds['CH4'] === 1, 'C + 4H must produce CH4 before 2H -> H2');

// Category 2: CuO + H2 -> Cu + H2O (heat >= 180)
newWorld.addParticle(new Particle('cat2_cuo', 'compound', 'CuO', 300, 500, 250));
newWorld.addParticle(new Particle('cat2_h2', 'compound', 'H2', 302, 500, 250));
newEngine.checkReactions();
assert(newWorld.particles.some(p => p.symbolOrId === 'Cu') && (newEngine.stats.createdCompounds['H2O'] || 0) >= 1, 'CuO + H2 reduction must produce Cu + H2O');

// Category 3: 4P + 5O2 -> P4O10 (黄リンの発火点 34℃以上)
for (let i = 0; i < 4; i++) newWorld.addParticle(new Particle(`cat3_p_${i}`, 'element', 'P', 400 + i * 4, 500, 100));
for (let i = 0; i < 5; i++) newWorld.addParticle(new Particle(`cat3_o2_${i}`, 'compound', 'O2', 400 + i * 4, 506, 100));
newEngine.checkReactions();
assert(newEngine.stats.createdCompounds['P4O10'] === 1, 'Phosphorus combustion must produce P4O10');

// Category 3: 2NaHCO3 -> Na2CO3 + H2O + CO2 (heat >= 150)
newWorld.addParticle(new Particle('cat3_nahco3_1', 'compound', 'NaHCO3', 500, 500, 200));
newWorld.addParticle(new Particle('cat3_nahco3_2', 'compound', 'NaHCO3', 502, 500, 200));
newEngine.checkReactions();
assert(newEngine.stats.createdCompounds['Na2CO3'] === 1, 'Thermal decomposition of 2NaHCO3 must produce Na2CO3 + H2O + CO2');

// Category 3: Thermite 2Al + Fe2O3 -> Al2O3 + 2Fe (heat >= 350)
newWorld.addParticle(new Particle('cat3_al_1', 'element', 'Al', 600, 500, 400));
newWorld.addParticle(new Particle('cat3_al_2', 'element', 'Al', 602, 500, 400));
newWorld.addParticle(new Particle('cat3_fe2o3', 'compound', 'Fe2O3', 604, 500, 400));
newEngine.checkReactions();
assert(newEngine.stats.createdCompounds['Al2O3'] === 1, 'Thermite reaction 2Al + Fe2O3 must produce Al2O3 + 2Fe');

// Category 3: AgNO3 + HCl -> AgCl + HNO3
newWorld.addParticle(new Particle('cat3_agno3', 'compound', 'AgNO3', 700, 500, 25));
newWorld.addParticle(new Particle('cat3_hcl', 'compound', 'HCl', 702, 500, 25));
newEngine.checkReactions();
assert(newEngine.stats.createdCompounds['AgCl'] === 1 && newEngine.stats.createdCompounds['HNO3'] === 1, 'AgNO3 + HCl must precipitate AgCl + HNO3');
console.log('Verified all new Category 1, 2, and 3 reactions!');

console.log('\n=== Test: Ozone Generation (3O2 -> 2O3) & Thermal Decomposition (2O3 -> 3O2) ===');
const ozoneWorld = new PhysicsWorld(800, 600);
for (let i = 0; i < 6; i++) {
  ozoneWorld.addParticle(new Particle(`oz_o2_${i}`, 'compound', 'O2', 300 + i, 300, 25));
}
let ozonizedTotal = 0;
for (let attempt = 0; attempt < 20 && ozoneWorld.particles.some(p => p.symbolOrId === 'O2'); attempt++) {
  ozonizedTotal += ozoneWorld.applyElectric(300, 300, 40).ozonizedCount;
}
const o3Count = ozoneWorld.particles.filter(p => p.symbolOrId === 'O3').length;
const o2Left = ozoneWorld.particles.filter(p => p.symbolOrId === 'O2').length;
assert(ozonizedTotal > 0, 'Electric discharge on O2 must generate O3');
assert(o3Count === ozonizedTotal * 2, '3O2 -> 2O3 must produce 2 O3 per reaction');
assert(o3Count * 3 + o2Left * 2 === 12, 'Oxygen atoms must be conserved during ozone generation');
assert(ozoneWorld.particles.find(p => p.symbolOrId === 'O3')!.isToxic, 'O3 must be flagged as toxic');

// 2O3 -> 3O2 (heat >= 120)
const ozoneDecompWorld = new PhysicsWorld(800, 600);
const ozoneDecompEngine = new ReactionEngine(ozoneDecompWorld);
ozoneDecompWorld.addParticle(new Particle('oz_o3_1', 'compound', 'O3', 300, 300, 25));
ozoneDecompWorld.addParticle(new Particle('oz_o3_2', 'compound', 'O3', 302, 300, 25));
ozoneDecompEngine.checkReactions();
assert(ozoneDecompWorld.particles.filter(p => p.symbolOrId === 'O3').length === 2, 'O3 must be stable at room temperature');
ozoneDecompWorld.particles.forEach(p => { p.temperature = 150; });
ozoneDecompEngine.checkReactions();
assert(ozoneDecompWorld.particles.filter(p => p.symbolOrId === 'O2').length === 3, 'Heating 2O3 must decompose into 3O2');
console.log('Verified ozone generation and decomposition!');

console.log('\n=== Test: Reaction Intensity (Explosion / Ignition / Smoke / Heat) ===');
for (const id of ['water_combustion', 'potassium_water_reaction', 'thermite_reaction', 'naf_synthesis_molecular']) {
  assert(!!REACTIONS_DATA.find(r => r.id === id)?.intensities?.includes('explosion'), `${id} must be classified as explosion`);
}
const intensitiesOf = (id: string) => REACTIONS_DATA.find(r => r.id === id)?.intensities ?? [];
assert(['explosion', 'ignition', 'heat'].every(i => intensitiesOf('sodium_water_reaction').includes(i as 'explosion')), 'Na + H2O must be classified as explosion + ignition + heat');
assert(intensitiesOf('phosphorus_combustion').includes('ignition') && intensitiesOf('phosphorus_combustion').includes('smoke'), 'P + O2 must be classified as both ignition and smoke');
assert(intensitiesOf('ammonia_hcl_white_smoke').includes('smoke'), 'NH3 + HCl must be classified as smoke');
assert(intensitiesOf('lithium_water_reaction').includes('heat'), 'Li + H2O must be classified as heat');
const part1: [string, string][] = [
  ['iron_sulfur_combination', 'heat'], ['sulfur_combustion', 'ignition'], ['carbon_complete_combustion', 'ignition'],
  ['co_combustion', 'ignition'], ['iron_high_temp_oxidation', 'ignition'], ['neutralization', 'heat'],
  ['potassium_neutralization', 'heat'], ['h2o2_catalytic_decomposition', 'heat'], ['phosphoric_acid_synthesis', 'heat'],
  ['licl_synthesis_molecular', 'ignition'], ['cacl2_synthesis_molecular', 'ignition'], ['cucl2_synthesis', 'ignition'],
  ['calcium_oxidation', 'ignition']
];
for (const [id, intensity] of part1) {
  assert(intensitiesOf(id).includes(intensity as 'heat'), `${id} must be classified as ${intensity}`);
}
for (const r of REACTIONS_DATA) {
  const list = r.intensities ?? [];
  if (new Set(list).size !== list.length) assert(false, `${r.id} must not list the same intensity twice`);
}

// 全反応の生成物・反応物が定義済みであること
for (const r of REACTIONS_DATA) {
  for (const x of [...r.reactants, ...r.products]) {
    const exists = x.type === 'element' ? !!ELEMENTS_DATA[x.id] : !!COMPOUNDS_DATA[x.id];
    if (!exists) assert(false, `Reaction ${r.id} references undefined ${x.type} ${x.id}`);
  }
}
console.log('Verified all reaction reactants/products exist');

// Li + H2O -> LiOH + H2 (穏やかな発熱)
const liWorld = new PhysicsWorld(800, 600);
const liEngine = new ReactionEngine(liWorld);
liWorld.addParticle(new Particle('li_1', 'element', 'Li', 300, 300, 25));
liWorld.addParticle(new Particle('li_2', 'element', 'Li', 304, 300, 25));
liWorld.addParticle(new Particle('li_w1', 'compound', 'H2O', 300, 304, 25));
liWorld.addParticle(new Particle('li_w2', 'compound', 'H2O', 304, 304, 25));
liEngine.checkReactions();
const liOH = liWorld.particles.find(p => p.symbolOrId === 'LiOH');
assert(!!liOH, 'Li + H2O must produce LiOH');
assert(liWorld.particles.some(p => p.symbolOrId === 'H2'), 'Li + H2O must release H2');
assert(liOH!.temperature > 25, 'Li + H2O must be exothermic');

// ハロゲン分子の生成とアルカリ金属との反応
const halWorld = new PhysicsWorld(800, 600);
const halEngine = new ReactionEngine(halWorld);
halWorld.addParticle(new Particle('f_1', 'element', 'F', 200, 300, 25));
halWorld.addParticle(new Particle('f_2', 'element', 'F', 203, 300, 25));
halEngine.checkReactions();
assert(halWorld.particles.some(p => p.symbolOrId === 'F2'), '2F must form F2');

const naBrWorld = new PhysicsWorld(800, 600);
const naBrEngine = new ReactionEngine(naBrWorld);
naBrWorld.addParticle(new Particle('nb_na1', 'element', 'Na', 300, 300, 25));
naBrWorld.addParticle(new Particle('nb_na2', 'element', 'Na', 304, 300, 25));
naBrWorld.addParticle(new Particle('nb_br2', 'compound', 'Br2', 302, 304, 25));
naBrEngine.checkReactions();
assert(naBrWorld.particles.filter(p => p.symbolOrId === 'NaBr').length === 2, '2Na + Br2 must produce 2NaBr');

const kiWorld = new PhysicsWorld(800, 600);
const kiEngine = new ReactionEngine(kiWorld);
kiWorld.addParticle(new Particle('ki_k1', 'element', 'K', 300, 300, 25));
kiWorld.addParticle(new Particle('ki_k2', 'element', 'K', 304, 300, 25));
kiWorld.addParticle(new Particle('ki_i2', 'compound', 'I2', 302, 304, 25));
kiEngine.checkReactions();
assert(kiWorld.particles.filter(p => p.symbolOrId === 'KI').length === 2, '2K + I2 must produce 2KI');

console.log('\n=== Test: Flask Shattering by Explosive Reactions ===');
// 密閉フラスコ内の H2 + O2 爆発 (水素の発火点 約500℃以上) -> フラスコ破裂
const shatterWorld = new PhysicsWorld(800, 600);
const shatterEngine = new ReactionEngine(shatterWorld);
const sealed = shatterWorld.spawnFlask(400, 350, 'erlenmeyer')!;
shatterWorld.setFlaskCap(sealed, true);
let shatteredCallback = 0;
shatterEngine.onContainerShattered = () => { shatteredCallback++; };
shatterWorld.addParticle(new Particle('sh_h1', 'compound', 'H2', 395, 310, 600));
shatterWorld.addParticle(new Particle('sh_h2', 'compound', 'H2', 400, 310, 600));
shatterWorld.addParticle(new Particle('sh_o', 'compound', 'O2', 405, 310, 600));
const bystander = new Particle('sh_n2', 'compound', 'N2', 410, 320, 25);
shatterWorld.addParticle(bystander);
shatterWorld.applyContainerContainment();
assert(bystander.containerId === sealed.id, 'Bystander particle must start inside the sealed flask');
shatterEngine.checkReactions();
assert(shatterWorld.containers.length === 0, 'Sealed flask must shatter on H2 + O2 explosion');
assert(shatterWorld.glassShards.length >= 16, 'Shattered flask must scatter glass shards');
assert(shatteredCallback === 1, 'onContainerShattered must fire once');
assert(shatterEngine.stats.shatteredFlasks === 1, 'Shattered flask count must be recorded');
assert(shatterWorld.particles.every(p => p.containerId === null), 'Particles must be released from the shattered flask');
assert(bystander.vx > 0, 'Blast must push particles outward from the explosion center');
const shardsBefore = shatterWorld.glassShards.length;
for (let f = 0; f < 300; f++) shatterWorld.update();
assert(shatterWorld.glassShards.length === 0 && shardsBefore > 0, 'Glass shards must fade out over time');

// 開放フラスコ内の Na + H2O (爆発だが反応熱150 < 180) -> フラスコは無事
const openWorld = new PhysicsWorld(800, 600);
const openEngine = new ReactionEngine(openWorld);
openWorld.spawnFlask(400, 350, 'erlenmeyer');
openWorld.addParticle(new Particle('op_na', 'element', 'Na', 400, 320, 25));
openWorld.addParticle(new Particle('op_na2', 'element', 'Na', 404, 320, 25));
openWorld.addParticle(new Particle('op_w', 'compound', 'H2O', 400, 324, 25));
openWorld.addParticle(new Particle('op_w2', 'compound', 'H2O', 404, 324, 25));
openEngine.checkReactions();
assert(openWorld.particles.some(p => p.symbolOrId === 'NaOH'), 'Na + H2O must react in an open flask');
assert(openWorld.containers.length === 1, 'Open flask must survive Na + H2O (below open-flask shatter threshold)');

// 密閉フラスコ内の Na + H2O -> 破裂
const naSealedWorld = new PhysicsWorld(800, 600);
const naSealedEngine = new ReactionEngine(naSealedWorld);
naSealedWorld.setFlaskCap(naSealedWorld.spawnFlask(400, 350, 'erlenmeyer')!, true);
naSealedWorld.addParticle(new Particle('ns_na', 'element', 'Na', 400, 320, 25));
naSealedWorld.addParticle(new Particle('ns_na2', 'element', 'Na', 404, 320, 25));
naSealedWorld.addParticle(new Particle('ns_w', 'compound', 'H2O', 400, 324, 25));
naSealedWorld.addParticle(new Particle('ns_w2', 'compound', 'H2O', 404, 324, 25));
naSealedEngine.checkReactions();
assert(naSealedWorld.containers.length === 0, 'Sealed flask must shatter on Na + H2O');

// 開放フラスコ内の H2 + Cl2 (弱い爆発) -> 無事、密閉なら破裂 (点火したときと同じ温度にしておく)
const weakOpenWorld = new PhysicsWorld(800, 600);
const weakOpenEngine = new ReactionEngine(weakOpenWorld);
weakOpenWorld.spawnFlask(400, 350, 'erlenmeyer');
weakOpenWorld.addParticle(new Particle('wo_h2', 'compound', 'H2', 400, 320, 600));
weakOpenWorld.addParticle(new Particle('wo_cl2', 'compound', 'Cl2', 404, 320, 600));
weakOpenEngine.checkReactions();
assert(weakOpenWorld.particles.some(p => p.symbolOrId === 'HCl'), 'H2 + Cl2 must react');
assert(weakOpenWorld.containers.length === 1, 'Open flask must survive a weak explosion (H2 + Cl2)');

const weakSealedWorld = new PhysicsWorld(800, 600);
const weakSealedEngine = new ReactionEngine(weakSealedWorld);
weakSealedWorld.setFlaskCap(weakSealedWorld.spawnFlask(400, 350, 'erlenmeyer')!, true);
weakSealedWorld.addParticle(new Particle('ws_h2', 'compound', 'H2', 400, 320, 600));
weakSealedWorld.addParticle(new Particle('ws_cl2', 'compound', 'Cl2', 404, 320, 600));
weakSealedEngine.checkReactions();
assert(weakSealedWorld.containers.length === 0, 'Sealed flask must shatter even on a weak explosion (H2 + Cl2)');

// 開放フラスコ内の K + H2O (激しい爆発) -> 破裂
const violentWorld = new PhysicsWorld(800, 600);
const violentEngine = new ReactionEngine(violentWorld);
violentWorld.spawnFlask(400, 350, 'erlenmeyer');
violentWorld.addParticle(new Particle('vi_k', 'element', 'K', 400, 320, 25));
violentWorld.addParticle(new Particle('vi_k2', 'element', 'K', 404, 320, 25));
violentWorld.addParticle(new Particle('vi_w', 'compound', 'H2O', 400, 324, 25));
violentWorld.addParticle(new Particle('vi_w2', 'compound', 'H2O', 404, 324, 25));
violentEngine.checkReactions();
assert(violentWorld.containers.length === 0, 'Open flask must shatter on a violent explosion (K + H2O)');

// 容器外の爆発ではフラスコは割れない
const outsideWorld = new PhysicsWorld(800, 600);
const outsideEngine = new ReactionEngine(outsideWorld);
outsideWorld.spawnFlask(600, 350, 'erlenmeyer');
outsideWorld.addParticle(new Particle('ou_k', 'element', 'K', 200, 320, 25));
outsideWorld.addParticle(new Particle('ou_k2', 'element', 'K', 204, 320, 25));
outsideWorld.addParticle(new Particle('ou_w', 'compound', 'H2O', 200, 324, 25));
outsideWorld.addParticle(new Particle('ou_w2', 'compound', 'H2O', 204, 324, 25));
outsideEngine.checkReactions();
assert(outsideWorld.containers.length === 1, 'Explosions outside a flask must not shatter it');
console.log('Verified flask shattering rules!');

console.log('\n=== Test: Encyclopedia Filters ===');
const rxnIds = (f: Parameters<typeof reactionMatchesFilter>[1]) => REACTIONS_DATA.filter(r => reactionMatchesFilter(r, f)).map(r => r.id);
assert(rxnIds('all').length === REACTIONS_DATA.length, 'Filter "all" must match every reaction');
assert(rxnIds('explosion').includes('water_combustion') && rxnIds('explosion').includes('sodium_water_reaction') && !rxnIds('explosion').includes('lithium_water_reaction'), 'Explosion filter must include H2+O2 and Na+H2O but exclude Li+H2O');
assert(rxnIds('ignition').includes('phosphorus_combustion') && rxnIds('smoke').includes('phosphorus_combustion'), 'P combustion must appear under both ignition and smoke filters');
assert(rxnIds('smoke').includes('ammonia_hcl_white_smoke'), 'Smoke filter must include NH3 + HCl');
assert(rxnIds('heat').includes('lithium_water_reaction'), 'Heat filter must include Li + H2O');
assert(rxnIds('toxic').includes('hcl_synthesis_molecular') && !rxnIds('toxic').includes('water_synthesis_atomic'), 'Toxic filter must include reactions involving toxic compounds only');
const compIds = (f: Parameters<typeof compoundMatchesFilter>[1]) => Object.values(COMPOUNDS_DATA).filter(c => compoundMatchesFilter(c, f)).map(c => c.id);
assert(compIds('toxic').includes('Cl2') && !compIds('toxic').includes('H2O'), 'Toxic compound filter must use isToxic');
assert(!COMPOUND_FILTERS.some(f => ['explosion', 'ignition', 'smoke', 'heat'].includes(f)), 'Compound tab must not offer reaction-intensity filters (e.g. H2O is not explosive)');
assert(compIds('all').length === Object.keys(COMPOUNDS_DATA).length, 'Compound filter "all" must list every compound');

console.log('\n=== Test: Missing Major Reactions (Part 2) ===');
const runPair = (specs: [string, 'element' | 'compound', string, number][], frames = 1) => {
  const w = new PhysicsWorld(800, 600);
  const e = new ReactionEngine(w);
  specs.forEach(([id, kind, sym, temp], idx) => w.addParticle(new Particle(id, kind, sym, 300 + (idx % 3) * 4, 300 + Math.floor(idx / 3) * 4, temp)));
  for (let f = 0; f < frames; f++) e.checkReactions();
  return { w, e, has: (sym: string) => w.particles.filter(p => p.symbolOrId === sym).length };
};
// 反応式の係数どおりの粒子を並べる: many('fe', 'element', 'Fe', 4, 25) -> Fe を4個
const many = (prefix: string, kind: 'element' | 'compound', sym: string, count: number, temp: number) =>
  Array.from({ length: count }, (_, i) => [`${prefix}${i}`, kind, sym, temp] as [string, 'element' | 'compound', string, number]);

// 化学カイロ: 4Fe + 3O2 + 食塩水 -> 2Fe2O3 (食塩水は残る)
const pack = runPair([...many('pk_fe', 'element', 'Fe', 4, 25), ...many('pk_o2', 'compound', 'O2', 3, 25), ['pk_w', 'compound', 'H2O', 25], ['pk_na', 'compound', 'NaCl', 25]]);
assert(pack.has('Fe2O3') === 2 && pack.has('NaCl') === 1 && pack.has('H2O') === 1, 'Hand warmer: 4Fe + 3O2 + salt water -> 2Fe2O3, salt water remains');
assert(pack.w.particles.find(p => p.symbolOrId === 'Fe2O3')!.temperature > 50, 'Hand warmer reaction must release heat');
assert(pack.w.particles.find(p => p.symbolOrId === 'H2O')!.state === 'liquid', 'Hand warmer must stay warm, not boil its water');

// 水素とハロゲン: F2 は常温で爆発、Br2 は加熱が必要、I2 はさらに高温
assert(runPair([['hf_h', 'compound', 'H2', 25], ['hf_f', 'compound', 'F2', 25]]).has('HF') === 2, 'H2 + F2 must react at room temperature');
assert(runPair([['hb_h', 'compound', 'H2', 25], ['hb_b', 'compound', 'Br2', 25]]).has('HBr') === 0, 'H2 + Br2 must not react at room temperature');
assert(runPair([['hb_h', 'compound', 'H2', 250], ['hb_b', 'compound', 'Br2', 250]]).has('HBr') === 2, 'H2 + Br2 must react when heated');
assert(runPair([['hi_h', 'compound', 'H2', 250], ['hi_i', 'compound', 'I2', 250]]).has('HI') === 0, 'H2 + I2 must need higher temperature than Br2');
assert((runPair([['hi_h', 'compound', 'H2', 350], ['hi_i', 'compound', 'I2', 350]], 300).e.stats.triggeredReactions['hi_synthesis'] || 0) >= 1, 'H2 + I2 must react at high temperature (slowly, a little at a time)');

// 両性金属アルミニウム
const alHcl = runPair([...many('al_a', 'element', 'Al', 2, 25), ...many('al_h', 'compound', 'HCl', 6, 25)]);
assert(alHcl.has('AlCl3') === 2 && alHcl.has('H2') === 3, '2Al + 6HCl must produce 2AlCl3 + 3H2');
const alNaoh = runPair([...many('an_a', 'element', 'Al', 2, 25), ...many('an_n', 'compound', 'NaOH', 2, 25), ...many('an_w', 'compound', 'H2O', 6, 25)]);
assert(alNaoh.has('NaAlOH4') === 2 && alNaoh.has('H2') === 3, '2Al + 2NaOH + 6H2O must produce 2Na[Al(OH)4] + 3H2');

// アセチレン: 製造 -> 発生 -> 燃焼
assert(runPair([['cc_o', 'compound', 'CaO', 1600], ['cc_c1', 'element', 'C', 1600], ['cc_c2', 'element', 'C', 1600], ['cc_c3', 'element', 'C', 1600]]).has('CaC2') === 1, 'CaO + 3C at 1600C must produce CaC2');
assert(runPair([['ag_c', 'compound', 'CaC2', 25], ['ag_w1', 'compound', 'H2O', 25], ['ag_w2', 'compound', 'H2O', 25]]).has('C2H2') === 1, 'CaC2 + 2H2O must produce C2H2');
assert(runPair([...many('ac_a', 'compound', 'C2H2', 2, 25), ...many('ac_o', 'compound', 'O2', 5, 25)]).has('CO2') === 0, 'Acetylene must not burn without ignition');
assert(runPair([...many('ac_a', 'compound', 'C2H2', 2, 350), ...many('ac_o', 'compound', 'O2', 5, 350)]).has('CO2') === 4, '2C2H2 + 5O2 must burn into 4CO2 when ignited');

// 溶解熱: 物質は残り、1回だけ発熱する
const dil = runPair([['dl_s', 'compound', 'H2SO4', 25], ['dl_w', 'compound', 'H2O', 25]], 5);
const acid = dil.w.particles.find(p => p.symbolOrId === 'H2SO4')!;
assert(!!acid && dil.has('H2O') === 1, 'Dilution must not consume sulfuric acid or water');
assert(acid.temperature > 100 && acid.temperature < 200, 'Heat of dilution must be released exactly once');
assert(dil.e.stats.triggeredReactions['sulfuric_acid_dilution'] === 1, 'Dilution must be recorded once');
const naohDiss = runPair([['nd_s', 'compound', 'NaOH', 25], ['nd_w', 'compound', 'H2O', 25]]);
assert(naohDiss.w.particles.find(p => p.symbolOrId === 'NaOH')!.temperature > 25, 'Dissolving NaOH must release heat');
console.log('Verified part-2 reactions!');

console.log('\n=== Test: Encyclopedia Merges Reaction Variants ===');
// 触媒 (反応物にも生成物にも現れる物質) を除いた生成物で比較する
const sortedIds = (list: { id: string }[], reactants: { id: string }[] = []) =>
  list.filter(x => !reactants.some(r => r.id === x.id)).map(x => x.id).sort().join(',');
for (const v of REACTIONS_DATA.filter(r => r.variantOf)) {
  const main = REACTIONS_DATA.find(r => r.id === v.variantOf);
  if (!main) assert(false, `${v.id}.variantOf must point to an existing reaction`);
  if (main!.variantOf) assert(false, `${v.id} must point to a main reaction, not another variant`);
  if (sortedIds(main!.products, main!.reactants) !== sortedIds(v.products, v.reactants)) assert(false, `${v.id} must produce the same substances as ${main!.id}`);
  if (v.equation === main!.equation) assert(false, `${v.id} must show its own (atomic) equation, not duplicate ${main!.id}`);
}
assert(!DISPLAY_REACTIONS.some(r => r.id === 'naf_synthesis_atomic') && DISPLAY_REACTIONS.some(r => r.id === 'naf_synthesis_molecular'), 'Encyclopedia must show Na + F only once');
const eqCount = new Map<string, number>();
DISPLAY_REACTIONS.forEach(r => eqCount.set(r.equation, (eqCount.get(r.equation) || 0) + 1));
assert([...eqCount.values()].every(c => c === 1), 'Encyclopedia must not list the same equation twice');
const mergedStats = { createdCompounds: {}, spawnedElements: {}, maxTemperatureReached: 25, minTemperatureReached: 25, triggeredReactions: { naf_synthesis_atomic: 2, naf_synthesis_molecular: 1 } };
assert(getMergedReactionCount(REACTIONS_DATA.find(r => r.id === 'naf_synthesis_molecular')!, mergedStats) === 3, 'Experiment count must include atomic-route triggers');
assert(!REACTIONS_DATA.some(r => /\((爆発|発火|発熱)し\)$/.test(r.nameJa)), 'Reaction names must not end with a dangling verb stem like "(爆発し)"');

console.log('\n=== Test: Discovered Reactions Persist in localStorage ===');
const memoryStore = new Map<string, string>();
(globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem'> }).localStorage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => { memoryStore.set(k, v); }
};
const saveWorld = new PhysicsWorld(800, 600);
const saveEngine = new ReactionEngine(saveWorld);
saveWorld.addParticle(new Particle('sv_h1', 'element', 'H', 300, 300, 25));
saveWorld.addParticle(new Particle('sv_h2', 'element', 'H', 304, 300, 25));
saveWorld.addParticle(new Particle('sv_o', 'element', 'O', 302, 304, 25));
saveEngine.checkReactions();
assert(memoryStore.has(DISCOVERED_REACTIONS_STORAGE_KEY), 'Triggered reactions must be saved to localStorage');
const reloaded = new ReactionEngine(new PhysicsWorld(800, 600));
assert(reloaded.stats.triggeredReactions['water_synthesis_atomic'] === 1, 'A new session must restore discovered reactions');
assert(memoryStore.has(DISCOVERED_COMPOUNDS_STORAGE_KEY), 'Created compounds must be saved to localStorage');
assert(reloaded.stats.createdCompounds['H2O'] === 1, 'A new session must restore discovered compounds');
const rediscoveries: string[] = [];
const reloadedWorld = new PhysicsWorld(800, 600);
const reloadedEngine = new ReactionEngine(reloadedWorld);
reloadedEngine.onNewDiscovery = (id) => rediscoveries.push(id);
reloadedWorld.addParticle(new Particle('rv_h1', 'element', 'H', 300, 300, 25));
reloadedWorld.addParticle(new Particle('rv_h2', 'element', 'H', 304, 300, 25));
reloadedWorld.addParticle(new Particle('rv_o', 'element', 'O', 302, 304, 25));
reloadedEngine.checkReactions();
assert(!rediscoveries.includes('H2O'), 'Compounds discovered in a previous session must not trigger the new-discovery toast again');
memoryStore.set(DISCOVERED_COMPOUNDS_STORAGE_KEY, JSON.stringify({ H2O: 2, NotACompound: 1 }));
assert(!('NotACompound' in new ReactionEngine(new PhysicsWorld(800, 600)).stats.createdCompounds), 'Unknown compound IDs must be ignored');
memoryStore.set(DISCOVERED_REACTIONS_STORAGE_KEY, JSON.stringify({ water_synthesis_atomic: 3, unknown_rule: 5, hcl_synthesis_atomic: 'x' }));
const sanitized = new ReactionEngine(new PhysicsWorld(800, 600));
assert(sanitized.stats.triggeredReactions['water_synthesis_atomic'] === 3, 'Saved counts must be restored');
assert(!('unknown_rule' in sanitized.stats.triggeredReactions) && !('hcl_synthesis_atomic' in sanitized.stats.triggeredReactions), 'Unknown IDs and invalid values must be ignored');
memoryStore.set(DISCOVERED_REACTIONS_STORAGE_KEY, JSON.stringify({ habber_bosch_molecular: 2 }));
assert(new ReactionEngine(new PhysicsWorld(800, 600)).stats.triggeredReactions['haber_bosch_molecular'] === 2, 'Discoveries saved under the old misspelled Haber-Bosch ID must carry over');
memoryStore.set(DISCOVERED_REACTIONS_STORAGE_KEY, '{broken json');
memoryStore.set(DISCOVERED_COMPOUNDS_STORAGE_KEY, '{broken json');
const corrupted = new ReactionEngine(new PhysicsWorld(800, 600));
assert(Object.keys(corrupted.stats.triggeredReactions).length === 0 && Object.keys(corrupted.stats.createdCompounds).length === 0, 'Corrupted save data must not crash');
delete (globalThis as unknown as { localStorage?: unknown }).localStorage;

console.log('\n=== Test: Electric Tool Reactions Count as Discoveries ===');
// 電気分解の生成物 (H2/O2, Cu/Cl2) は確率で決まるため、このテストだけ乱数を固定して結果を再現可能にする
const originalRandom = Math.random;
let seed = 12345;
Math.random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const elecDiscWorld = new PhysicsWorld(800, 600);
const elecDiscEngine = new ReactionEngine(elecDiscWorld);
const elecDiscoveries: string[] = [];
elecDiscEngine.onNewDiscovery = (id) => elecDiscoveries.push(id);
for (let i = 0; i < 4; i++) elecDiscWorld.addParticle(new Particle(`ed_w${i}`, 'compound', 'H2O', 300 + i * 3, 300, 25));
elecDiscWorld.addParticle(new Particle('ed_naoh', 'compound', 'NaOH', 306, 302, 25));
for (let i = 0; i < 3; i++) elecDiscWorld.addParticle(new Particle(`ed_c${i}`, 'compound', 'CuCl2', 500 + i * 3, 300, 25));
elecDiscWorld.addParticle(new Particle('ed_cw', 'compound', 'H2O', 503, 304, 25));
for (let i = 0; i < 6; i++) elecDiscWorld.addParticle(new Particle(`ed_o${i}`, 'compound', 'O2', 150 + i * 3, 450, 25));
for (let attempt = 0; attempt < 30; attempt++) {
  for (const [ex, ey] of [[300, 300], [500, 300], [155, 450]]) {
    const res = elecDiscWorld.applyElectric(ex, ey, 40);
    assert(new Set(res.triggeredReactionIds).size === res.triggeredReactionIds.length, 'applyElectric must report each reaction once per discharge');
    elecDiscEngine.recordElectricResult(res, ex, ey);
  }
}
const trig = elecDiscEngine.stats.triggeredReactions;
assert((trig['water_electrolysis'] || 0) > 0, 'Water electrolysis must be recorded as a discovered reaction');
assert((trig['copper_chloride_electrolysis'] || 0) > 0, 'CuCl2 electrolysis must be recorded as a discovered reaction');
assert((trig['ozone_generation'] || 0) > 0, 'Ozone generation must be recorded as a discovered reaction');
for (const id of ['H2', 'O2', 'Cl2', 'O3']) {
  assert((elecDiscEngine.stats.createdCompounds[id] || 0) > 0, `${id} made by the electric tool must be recorded as a discovered compound`);
}
assert(elecDiscoveries.includes('H2') && elecDiscoveries.filter(id => id === 'H2').length === 1, 'Electric-tool products must fire the new-discovery event exactly once');
const saltWorld = new PhysicsWorld(800, 600);
const saltEngine = new ReactionEngine(saltWorld);
// 固体の食塩は電流を通さないので分解されない
saltWorld.addParticle(new Particle('ed_na1', 'compound', 'NaCl', 300, 300, 25));
saltWorld.addParticle(new Particle('ed_na2', 'compound', 'NaCl', 304, 300, 25));
for (let attempt = 0; attempt < 10; attempt++) saltEngine.recordElectricResult(saltWorld.applyElectric(300, 300, 40), 300, 300);
assert(!saltEngine.stats.triggeredReactions['salt_electrolysis'], 'Solid NaCl must not be electrolyzed (ions cannot move)');
// 融解した食塩: 2NaCl -> 2Na + Cl2
saltWorld.particles.forEach(p => { p.temperature = 900; p.updateStateByTemperature(true); });
for (let attempt = 0; attempt < 30 && !saltEngine.stats.triggeredReactions['salt_electrolysis']; attempt++) {
  saltEngine.recordElectricResult(saltWorld.applyElectric(300, 300, 40), 300, 300);
}
assert(saltEngine.stats.triggeredReactions['salt_electrolysis'] === 1, 'Molten salt electrolysis must be recorded as a discovered reaction');
assert(saltWorld.particles.filter(p => p.symbolOrId === 'Na').length === 2 && saltWorld.particles.filter(p => p.symbolOrId === 'Cl2').length === 1, 'Molten 2NaCl must become 2Na + Cl2');
// 食塩水: 2NaCl + 2H2O -> 2NaOH + H2 + Cl2
const brineWorld = new PhysicsWorld(800, 600);
const brineEngine = new ReactionEngine(brineWorld);
brineWorld.addParticle(new Particle('br_s1', 'compound', 'NaCl', 300, 300, 25));
brineWorld.addParticle(new Particle('br_s2', 'compound', 'NaCl', 304, 300, 25));
brineWorld.addParticle(new Particle('br_w1', 'compound', 'H2O', 300, 304, 25));
brineWorld.addParticle(new Particle('br_w2', 'compound', 'H2O', 304, 304, 25));
for (let attempt = 0; attempt < 30 && !brineEngine.stats.triggeredReactions['brine_electrolysis']; attempt++) {
  brineEngine.recordElectricResult(brineWorld.applyElectric(302, 302, 40), 302, 302);
}
const brineHas = (sym: string) => brineWorld.particles.filter(p => p.symbolOrId === sym).length;
assert(brineHas('NaOH') === 2 && brineHas('H2') === 1 && brineHas('Cl2') === 1, 'Brine electrolysis must produce 2NaOH + H2 + Cl2');
// 水の電気分解は原子を保存する: 4H2O -> 4H2 + 2O2
const waterBalWorld = new PhysicsWorld(800, 600);
for (let i = 0; i < 4; i++) waterBalWorld.addParticle(new Particle(`wb_${i}`, 'compound', 'H2O', 300 + i * 3, 300, 25));
waterBalWorld.addParticle(new Particle('wb_naoh', 'compound', 'NaOH', 305, 302, 25));
for (let attempt = 0; attempt < 30 && waterBalWorld.particles.some(p => p.symbolOrId === 'H2O'); attempt++) waterBalWorld.applyElectric(305, 300, 40);
assert(waterBalWorld.particles.filter(p => p.symbolOrId === 'H2').length === 4 && waterBalWorld.particles.filter(p => p.symbolOrId === 'O2').length === 2, 'Water electrolysis must conserve atoms (4H2O -> 4H2 + 2O2)');
Math.random = originalRandom;

console.log('\n=== Test: Chemistry Corrections ===');
// 全反応で原子の数が保存される (電気分解は applyElectric 側で別途検証)
const atomCount = (list: { type: string; id: string; count: number }[]) => {
  const m: Record<string, number> = {};
  for (const x of list) {
    const els = x.type === 'element' ? { [x.id]: 1 } : COMPOUNDS_DATA[x.id].elements;
    for (const [el, n] of Object.entries(els)) m[el] = (m[el] || 0) + n * x.count;
  }
  return Object.keys(m).sort().map(k => `${k}${m[k]}`).join(' ');
};
for (const r of REACTIONS_DATA) {
  if (atomCount(r.reactants) !== atomCount(r.products)) {
    assert(false, `${r.id} must conserve atoms (${atomCount(r.reactants)} -> ${atomCount(r.products)})`);
  }
}
console.log('Verified atom conservation for all reactions');

// 発火点: 水素は 300℃ では爆発せず、点火 (600℃) で爆発する
assert(runPair([...many('ig_h', 'compound', 'H2', 2, 300), ['ig_o', 'compound', 'O2', 300]]).has('H2O') === 0, 'H2 + O2 must not explode at 300C (below ignition point)');
assert(runPair([...many('ig_h', 'compound', 'H2', 2, 600), ['ig_o', 'compound', 'O2', 600]]).has('H2O') === 2, 'H2 + O2 must explode when ignited (600C)');

// 赤サビ: サビが進みきった鉄4個からまとめて生成 (1個の鉄が瞬時に Fe2O3 になることはない)
const rustWorld = new PhysicsWorld(800, 600);
const rustEngine = new ReactionEngine(rustWorld);
rustWorld.addParticle(new Particle('rs_fe', 'element', 'Fe', 300, 300, 25));
rustWorld.addParticle(new Particle('rs_o2', 'compound', 'O2', 304, 300, 25));
rustWorld.addParticle(new Particle('rs_w', 'compound', 'H2O', 300, 304, 25));
for (let f = 0; f < 300; f++) rustEngine.checkReactions();
assert(!rustWorld.particles.some(p => p.symbolOrId === 'Fe2O3'), 'A single iron particle must not turn into Fe2O3 (atom conservation)');
assert(rustWorld.particles.find(p => p.symbolOrId === 'Fe')!.rustProgress === 1, 'Rust progress must still accumulate on wet iron');
const rusted = runPair([...many('rr_fe', 'element', 'Fe', 4, 25), ...many('rr_o', 'compound', 'O2', 3, 25), ['rr_w', 'compound', 'H2O', 25]]);
assert(rusted.has('Fe2O3') === 0, 'Fresh iron must not rust instantly');
const rustedReady = new PhysicsWorld(800, 600);
const rustedReadyEngine = new ReactionEngine(rustedReady);
[...many('rq_fe', 'element', 'Fe', 4, 25), ...many('rq_o', 'compound', 'O2', 3, 25), ['rq_w', 'compound', 'H2O', 25] as [string, 'compound', string, number]]
  .forEach(([id, kind, sym, temp], idx) => {
    const p = new Particle(id, kind, sym, 300 + (idx % 3) * 4, 300 + Math.floor(idx / 3) * 4, temp);
    if (sym === 'Fe') p.rustProgress = 1;
    rustedReady.addParticle(p);
  });
rustedReadyEngine.checkReactions();
assert(rustedReady.particles.filter(p => p.symbolOrId === 'Fe2O3').length === 2, 'Fully rusted 4Fe + 3O2 + H2O must become 2Fe2O3');

// 窒素の酸化: 高温で NO -> 常温で空気中の O2 と NO2
assert(runPair([['nx_n', 'compound', 'N2', 300], ['nx_o', 'compound', 'O2', 300]]).has('NO') === 0, 'N2 + O2 must not react at 300C');
assert(runPair([['nx_n', 'compound', 'N2', 1600], ['nx_o', 'compound', 'O2', 1600]]).has('NO') === 2, 'N2 + O2 must form 2NO at very high temperature');
assert(runPair([...many('no_n', 'compound', 'NO', 2, 25), ['no_o', 'compound', 'O2', 25]]).has('NO2') === 2, '2NO + O2 must form 2NO2 at room temperature');

// ハーバー・ボッシュ法: 400℃以上 + 鉄触媒
assert(runPair([['hb_n', 'compound', 'N2', 450], ...many('hb_h', 'compound', 'H2', 3, 450)]).has('NH3') === 0, 'Haber-Bosch must not proceed without the iron catalyst');
const haber = runPair([['hb_n', 'compound', 'N2', 450], ...many('hb_h', 'compound', 'H2', 3, 450), ['hb_fe', 'element', 'Fe', 450]]);
assert(haber.has('NH3') === 2 && haber.has('Fe') === 1, 'N2 + 3H2 with Fe catalyst at 450C must form 2NH3 and keep the catalyst');
assert(runPair([['hb_n', 'compound', 'N2', 250], ...many('hb_h', 'compound', 'H2', 3, 250), ['hb_fe', 'element', 'Fe', 250]]).has('NH3') === 0, 'Haber-Bosch must need >= 400C');

// 銅と濃硝酸: 硝酸銅(II) が生じる
const cuNitric = runPair([['cn_cu', 'element', 'Cu', 25], ...many('cn_h', 'compound', 'HNO3', 4, 25)]);
assert(cuNitric.has('CuNO32') === 1 && cuNitric.has('NO2') === 2 && cuNitric.has('CuO') === 0, 'Cu + 4HNO3 must form Cu(NO3)2 (not CuO)');

// 二酸化窒素と水: NO も生じる
const no2Water = runPair([...many('nw_n', 'compound', 'NO2', 3, 25), ['nw_w', 'compound', 'H2O', 25]]);
assert(no2Water.has('HNO3') === 2 && no2Water.has('NO') === 1, '3NO2 + H2O must form 2HNO3 + NO');

assert(!REACTIONS_DATA.some(r => r.id === 'h2o2_synthesis_gas'), 'Unrealistic H2O2 synthesis from water + O2 must be removed');

console.log('\n=== Test: Indicators Change Color With pH ===');
// 指示薬を1つ置き、周りの物質を並べて数回更新した後の液性と色を返す
function indicatorAfter(indicatorId: string, others: [string, number][]) {
  const w = new PhysicsWorld(800, 600);
  const ind = new Particle('ind', 'compound', indicatorId, 400, 400, 25);
  ind.pinned = true;
  w.addParticle(ind);
  let k = 0;
  for (const [id, n] of others) {
    for (let i = 0; i < n; i++) {
      const o = new Particle(`io_${k++}`, 'compound', id, 400 + (k % 4) * 6 - 9, 410 + Math.floor(k / 4) * 6, 25);
      o.pinned = true;
      w.addParticle(o);
    }
  }
  for (let i = 0; i < 20; i++) w.updateIndicators();
  return { cls: ind.indicatorClass, color: ind.color, ph: ind.indicatorPh! };
}
const btbInfo = COMPOUNDS_DATA['BTB'].indicator!;
assert(indicatorAfter('BTB', []).cls === 'neutral', 'BTB alone must be neutral (green)');
assert(indicatorAfter('BTB', [['H2O', 5]]).cls === 'neutral', 'BTB in water must stay neutral (water does not change pH)');
const btbAcid = indicatorAfter('BTB', [['HCl', 1]]);
assert(btbAcid.cls === 'acid' && btbAcid.color === getIndicatorColor(btbInfo, btbAcid.ph) && btbAcid.color.toUpperCase() === '#FACC15', 'BTB + HCl must turn yellow');
assert(indicatorAfter('BTB', [['NaOH', 1]]).cls === 'alkaline', 'BTB + NaOH must turn blue (alkaline)');
assert(indicatorAfter('BTB', [['CO2', 1]]).cls === 'acid', 'BTB + CO2 (breath) must turn yellow');
assert(indicatorAfter('BTB', [['HCl', 1], ['NaOH', 1]]).cls === 'neutral', 'Equal HCl and NaOH must neutralize back to green');
assert(indicatorAfter('Phenolphthalein', [['HCl', 1]]).color.toUpperCase() === '#F1F5F9', 'Phenolphthalein must stay colorless in acid');
assert(indicatorAfter('Phenolphthalein', [['NaOH', 1]]).cls === 'alkaline', 'Phenolphthalein + NaOH must turn pinkish-red');
assert(indicatorAfter('RedLitmus', [['NH3', 1]]).color.toUpperCase() === '#3B82F6', 'Red litmus + NH3 must turn blue');
assert(indicatorAfter('BlueLitmus', [['HCl', 1]]).color.toUpperCase() === '#F87171', 'Blue litmus + HCl must turn red');
assert(indicatorAfter('BlueLitmus', [['NaOH', 1]]).color.toUpperCase() === '#60A5FA', 'Blue litmus must stay blue in alkali');
const cabStrongAcid = indicatorAfter('CabbageJuice', [['HCl', 2]]).color;
const cabWeakAcid = indicatorAfter('CabbageJuice', [['CO2', 1]]).color;
assert(cabStrongAcid !== cabWeakAcid, 'Red cabbage juice must show different colors for strong and weak acids');
assert(computeLocalPh([]) === 7 && classifyPh(7) === 'neutral', 'No acid or alkali around means pH 7');

// 色は少しずつ変わり、液性が変わった時にだけ通知される
const fadeWorld = new PhysicsWorld(800, 600);
const changes: string[] = [];
fadeWorld.onIndicatorChange = (_p, cls, isInitial) => changes.push(`${cls}:${isInitial}`);
const fadeBtb = new Particle('fade_btb', 'compound', 'BTB', 400, 400, 25);
fadeBtb.pinned = true;
fadeWorld.addParticle(fadeBtb);
fadeWorld.updateIndicators();
const acidP = new Particle('fade_hcl', 'compound', 'HCl', 405, 400, 25);
acidP.pinned = true;
fadeWorld.addParticle(acidP);
fadeWorld.updateIndicators();
assert(fadeBtb.indicatorPh! > 1 && fadeBtb.indicatorPh! < 7, 'Indicator pH must move gradually toward the target');
for (let i = 0; i < 20; i++) fadeWorld.updateIndicators();
assert(changes.join(',') === 'neutral:true,acid:false', 'Indicator change callback must fire once for the initial class and once per change');

// 容器の中では同じ容器の中身全体で判定する (離れていても同じビーカーなら色が変わる)
const beakerWorld = new PhysicsWorld(800, 600);
const inBtb = new Particle('bk_btb', 'compound', 'BTB', 100, 100, 25);
const inAcid = new Particle('bk_hcl', 'compound', 'HCl', 300, 300, 25);
inBtb.pinned = inAcid.pinned = true;
inBtb.containerId = inAcid.containerId = 'beaker_1';
beakerWorld.addParticle(inBtb);
beakerWorld.addParticle(inAcid);
for (let i = 0; i < 20; i++) beakerWorld.updateIndicators();
assert(inBtb.indicatorClass === 'acid', 'Indicator inside a container must sense everything in the same container');

console.log('\n=== Test: Limewater Turns Cloudy ===');
const limeWorld = new PhysicsWorld(800, 600);
const limeEngine = new ReactionEngine(limeWorld);
limeWorld.addParticle(new Particle('lw_ca', 'compound', 'CaOH2', 300, 300, 25));
limeWorld.addParticle(new Particle('lw_co2', 'compound', 'CO2', 305, 300, 25));
limeEngine.checkReactions();
assert(limeWorld.particles.some(p => p.symbolOrId === 'CaCO3'), 'Limewater + CO2 must form CaCO3');
assert(limeWorld.effects.filter(e => e.type === 'smoke').length >= 4, 'Limewater reaction must show a white cloudy effect');

console.log('\n=== Test: Flame Tests Unlock Firework Colors ===');
const ftWorld = new PhysicsWorld(800, 600);
const ftEngine = new ReactionEngine(ftWorld);
const flameSeen: string[] = [];
ftWorld.onFlameTest = (sym) => { if (ftEngine.recordFlameTest(sym)) flameSeen.push(sym); };
ftWorld.addParticle(new Particle('ft_sr', 'element', 'Sr', 300, 300, 25));
ftWorld.applySpark(300, 300, 20);
assert(flameSeen.includes('Sr'), 'Igniting Sr must report a flame test for Sr');
ftWorld.applySpark(300, 300, 20);
assert(flameSeen.filter(s => s === 'Sr').length === 1, 'A flame test must be reported as new only once');
ftWorld.clear();
ftWorld.addParticle(new Particle('ft_cucl', 'compound', 'CuCl2', 300, 300, 25));
ftWorld.applySpark(300, 300, 20);
assert(flameSeen.includes('Cu'), 'Heating a copper compound must unlock the copper (Cu) color');
assert(!ftEngine.recordFlameTest('Fe'), 'Elements without a firework color must not be recorded');

console.log('\n=== Test: Fireworks Launch, Burst and Fade ===');
const show = new FireworksShow();
const bounds = { minX: 0, maxX: 800, minY: 0, maxY: 600 };
let bursts = 0;
show.onBurst = () => bursts++;
show.launch({ symbols: ['Sr', 'Ba', 'Cu'], shape: 'double', count: 5 }, bounds);
let maxStars = 0;
for (let i = 0; i < 1200 && show.isActive(); i++) {
  show.update(bounds);
  maxStars = Math.max(maxStars, show.stars.length);
}
assert(bursts === 5, 'A starmine must burst 5 times');
assert(maxStars > 50, 'Each burst must scatter many stars');
assert(!show.isActive(), 'Fireworks must fade out completely');
assert(FIREWORK_ELEMENTS.every(sym => getFireworkColorInfo(sym)), 'Every firework element must have a firework color');
assert(FIREWORK_ELEMENTS.filter(sym => sym !== 'Mg').every(sym => ELEMENTS_DATA[sym]?.flameColor), 'Every firework colorant except Mg must have a flame color');

console.log('\n=== Test: Magnesium White Is Unlocked By Burning Magnesium ===');
const mgStats = (): GameStats => ({
  createdCompounds: {}, triggeredReactions: {}, spawnedElements: {}, maxTemperatureReached: 25, minTemperatureReached: 25, shatteredFlasks: 0,
  indicatorResults: {}, flameTestsSeen: {}, goldSparksSeen: {}, fireworksLaunched: 0, maxFireworkColors: 0
});
const mgLocked = mgStats();
assert(!isFireworkColorUnlocked('Mg', mgLocked), 'Mg white must start locked');
const mgBurned = mgStats();
mgBurned.triggeredReactions['magnesium_combustion'] = 1;
assert(isFireworkColorUnlocked('Mg', mgBurned), 'Burning Mg in oxygen must unlock the white firework color');
const mgAtomic = mgStats();
mgAtomic.triggeredReactions['magnesium_oxidation_atomic'] = 1;
assert(isFireworkColorUnlocked('Mg', mgAtomic), 'The atomic variant of Mg combustion must also unlock white');
const mgLegacy = mgStats();
mgLegacy.flameTestsSeen!['Mg'] = 3;
assert(isFireworkColorUnlocked('Mg', mgLegacy), 'Mg white unlocked by an older version must stay unlocked');
const srStats = mgStats();
srStats.flameTestsSeen!['Sr'] = 1;
assert(isFireworkColorUnlocked('Sr', srStats) && !isFireworkColorUnlocked('Mg', srStats), 'Other colors must still unlock by their flame tests');
// 実際に Mg を燃やすと記録され、白が使えるようになる
const mgWorld = new PhysicsWorld(800, 600);
const mgEngine = new ReactionEngine(mgWorld);
mgWorld.addParticle(new Particle('mgw1', 'element', 'Mg', 300, 300, 300));
mgWorld.addParticle(new Particle('mgw2', 'element', 'Mg', 302, 300, 300));
mgWorld.addParticle(new Particle('mgw_o', 'compound', 'O2', 301, 302, 300));
mgEngine.checkReactions();
assert(isMagnesiumWhiteUnlocked(mgEngine.stats), 'Burning Mg in the simulation must unlock the white firework color');
// 古い版で保存された Mg の炎色の記録は読み込みで消えない
const legacyStore = new Map<string, string>([[FLAME_TESTS_STORAGE_KEY, JSON.stringify({ Mg: 2 })]]);
(globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem'> }).localStorage = {
  getItem: (k: string) => legacyStore.get(k) ?? null,
  setItem: (k: string, v: string) => { legacyStore.set(k, v); }
};
assert(new ReactionEngine(new PhysicsWorld(800, 600)).stats.flameTestsSeen!['Mg'] === 2, 'Legacy Mg flame records must be kept when loading');
delete (globalThis as unknown as { localStorage?: unknown }).localStorage;

console.log('\n=== Test: Fireworks Use Only Real Firework Colorants ===');
assert(FIREWORK_ELEMENTS.join(',') === 'Sr,Ca,Na,Ba,Cu,Mg', 'Firework colors must be the six real colorants Sr, Ca, Na, Ba, Cu, Mg');
assert(!['Cs', 'Rb', 'K', 'Li', 'B'].some(sym => FIREWORK_ELEMENTS.includes(sym)), 'Cs, Rb, K, Li and B must not be firework colors');

// Cs の炎色反応は記録されるが、花火には使わない理由を博士が説明する
const csWorld = new PhysicsWorld(800, 600);
const csEngine = new ReactionEngine(csWorld);
const csSeen: string[] = [];
csWorld.onFlameTest = (sym) => { if (csEngine.recordFlameTest(sym)) csSeen.push(sym); };
csWorld.addParticle(new Particle('cs_1', 'element', 'Cs', 300, 300, 25));
csWorld.applySpark(300, 300, 20);
assert(csSeen.includes('Cs') && csEngine.stats.flameTestsSeen!['Cs'] === 1, 'Cs flame test must still be recorded');
const csLine = selectProfessorLine({ type: 'flameTest', symbol: 'Cs' }, 'ja')!.text;
assert(!csLine.includes('花火工房で使える') && csLine.includes('使わない'), 'Cs flame test line must explain that real fireworks do not use it');
assert(selectProfessorLine({ type: 'flameTest', symbol: 'K' }, 'ja')!.text.includes('火薬'), 'K flame test line must mention gunpowder');
assert(selectProfessorLine({ type: 'flameTest', symbol: 'Sr' }, 'ja')!.text.includes('花火工房で使える'), 'Sr flame test line must unlock the fireworks color');

console.log('\n=== Test: Willow Uses Golden Charcoal & Iron Trails ===');
const willowStats = (): GameStats => ({
  createdCompounds: {}, triggeredReactions: {}, spawnedElements: {},
  maxTemperatureReached: 25, minTemperatureReached: 25
});
const ws = willowStats();
assert(!isWillowUnlocked(ws), 'Willow must be locked at first');
ws.triggeredReactions['carbon_complete_combustion'] = 1;
assert(isWillowUnlocked(ws), 'Burning carbon must unlock the willow');
const ws2 = willowStats();
ws2.triggeredReactions['iron_high_temp_oxidation'] = 1;
assert(isWillowUnlocked(ws2), 'Burning iron must unlock the willow');

// 酸素がなくても、炭や鉄をバーナー・点火で熱して金色の火花を見れば柳が使えるようになる
for (const sym of ['C', 'Fe']) {
  const gsStore = new Map<string, string>();
  (globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem'> }).localStorage = {
    getItem: (k: string) => gsStore.get(k) ?? null,
    setItem: (k: string, v: string) => { gsStore.set(k, v); }
  };
  const gsWorld = new PhysicsWorld(800, 600);
  const gsEngine = new ReactionEngine(gsWorld);
  let unlockedBySparks = false;
  gsWorld.onGoldSparks = (s2) => { if (gsEngine.recordGoldSparks(s2) && isWillowUnlocked(gsEngine.stats)) unlockedBySparks = true; };
  assert(!isWillowUnlocked(gsEngine.stats), `Willow must be locked before heating ${sym}`);
  gsWorld.addParticle(new Particle(`gs_${sym}`, 'element', sym, 300, 300, 25));
  gsWorld.applySpark(300, 300, 20);
  assert(unlockedBySparks, `Igniting ${sym} alone (no oxygen) must unlock the willow`);
  assert(gsWorld.effects.some(e => e.type === 'sparkles'), `Igniting ${sym} must show golden sparks`);
  assert(gsStore.has(GOLD_SPARKS_STORAGE_KEY) && isWillowUnlocked(new ReactionEngine(new PhysicsWorld(800, 600)).stats), 'Willow unlock by sparks must be saved');
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
}
const coldWorld = new PhysicsWorld(800, 600);
let coldSparks = 0;
coldWorld.onGoldSparks = () => coldSparks++;
coldWorld.addParticle(new Particle('gs_cold', 'element', 'C', 300, 300, 25));
for (let i = 0; i < 3; i++) coldWorld.applyHeat(300, 300, 20, 30);
assert(coldSparks === 0, 'Carbon below the burning temperature must not give golden sparks');

const goldTrails = ['#FCD34D', '#F59E0B', '#FB923C'];
const srColor = ELEMENTS_DATA['Sr'].flameColor!;
const willowShow = new FireworksShow();
willowShow.launch({ symbols: ['Sr'], shape: 'willow', count: 1 }, bounds);
for (let i = 0; i < 400 && willowShow.stars.length === 0; i++) willowShow.update(bounds);
assert(willowShow.stars.length > 0 && willowShow.stars.every(st => st.trailColor && goldTrails.includes(st.trailColor) && st.color === srColor), 'Willow stars must have golden trails with the chosen color only at the tip');
assert(willowShow.labels[0]?.shape === 'willow', 'Willow burst label must know the shape (to explain the golden trails)');
const doubleShow = new FireworksShow();
doubleShow.launch({ symbols: ['Sr', 'Ba'], shape: 'double', count: 1 }, bounds);
for (let i = 0; i < 400 && doubleShow.stars.length === 0; i++) doubleShow.update(bounds);
assert(doubleShow.stars.length > 0 && doubleShow.stars.every(st => st.trailColor === undefined), 'Non-willow shapes must use the flame colors for their trails');
assert(selectProfessorLine({ type: 'firework', symbols: ['Sr'], shape: 'willow' }, 'ja')!.text.includes('炭'), 'Willow firework line must explain charcoal and iron');

console.log('\n=== Test: More Firework Shapes ===');
// 打ち上げて開くまで進め、開いた直後の花火を返す
const burstShow = (symbols: string[], shape: typeof FIREWORK_SHAPES[number]) => {
  const fs = new FireworksShow();
  const seen: string[] = [];
  fs.onBurst = info => seen.push(info.shape);
  fs.launch({ symbols, shape, count: 1 }, bounds);
  for (let i = 0; i < 400 && fs.stars.length === 0; i++) fs.update(bounds);
  return { fs, seen };
};
for (const shape of FIREWORK_SHAPES) {
  const { fs, seen } = burstShow(['Sr', 'Ba'], shape);
  assert(fs.stars.length > 0 && seen.join() === shape && fs.labels[0]?.shape === shape, `${shape} must burst into stars and label its shape`);
  for (let i = 0; i < 1500 && fs.isActive(); i++) fs.update(bounds);
  assert(!fs.isActive(), `${shape} must fade out completely`);
}
const baColor = ELEMENTS_DATA['Ba'].flameColor!;
// 変化菊: 1色目で開き、燃えるにつれて2色目に変わる
const changing = burstShow(['Sr', 'Ba'], 'changing').fs;
assert(changing.stars.every(st => st.color === srColor), 'Color-changing stars start with the first color');
for (let i = 0; i < 70; i++) changing.update(bounds);
assert(changing.stars.length > 0 && changing.stars.every(st => st.color === baColor), 'Color-changing stars turn into the second color');
// 千輪: 親の星が燃え尽きると、小さな花の星が出てくる (小さな花はもう分かれない)
const senrin = burstShow(['Sr'], 'senrin').fs;
const parents = senrin.stars.length;
let children = 0;
for (let i = 0; i < 200; i++) {
  senrin.update(bounds);
  children = Math.max(children, senrin.stars.filter(st => !st.childBurst).length);
}
assert(children > parents, `Senrin parents must open into many small blossoms (${parents} parents, ${children} blossom stars)`);
// 冠: 柳と同じ金色の尾で、柳と同じ条件で使えるようになる
const kamuro = burstShow(['Sr'], 'kamuro').fs;
assert(kamuro.stars.every(st => st.trailColor && goldTrails.includes(st.trailColor) && st.color === srColor), 'Kamuro stars must have golden trails');
assert(!isShapeUnlocked('kamuro', willowStats()) && isShapeUnlocked('kamuro', ws) && isShapeUnlocked('willow', ws) && isShapeUnlocked('heart', willowStats()), 'Kamuro unlocks with the willow; other shapes are free');
assert(selectProfessorLine({ type: 'firework', symbols: ['Sr'], shape: 'kamuro' }, 'ja')!.text.includes('炭'), 'Kamuro firework line must explain charcoal and iron');
// 型物・土星の向き: 正面・まっすぐなら形はそのまま、真横から見ると線、さかさまにもなる
const faceOn = { roll: 0, tilt: 0, tiltAxis: 0 };
const fo = projectShaped(3, -2, 0, faceOn);
assert(Math.abs(fo.x - 3) < 1e-9 && Math.abs(fo.y + 2) < 1e-9, 'A face-on, upright shell must keep its shape');
const edgeOn = projectShaped(3, -2, 0, { roll: 0, tilt: Math.PI / 2, tiltAxis: 0 });
assert(Math.abs(edgeOn.x - 3) < 1e-9 && Math.abs(edgeOn.y) < 1e-9, 'An edge-on shell (tilted about the x axis) must collapse into a line');
const upsideDown = projectShaped(0, -5, 0, { roll: Math.PI, tilt: 0, tiltAxis: 0 });
assert(Math.abs(upsideDown.y - 5) < 1e-9, 'Roll π must turn the shape upside down');
const tilted = projectShaped(4, 0, 0, { roll: 0, tilt: Math.PI / 3, tiltAxis: Math.PI / 2 });
assert(Math.abs(tilted.x - 2) < 1e-9 && Math.abs(tilted.y) < 1e-9, 'Tilting by 60° must foreshorten the shape to half');
// 向きの出やすさ (乱数を固定して数える): きれいに見える回もあれば、つぶれる・線になる・横向きやさかさまになる回もある
let orientSeed = 7;
const orientRand = () => (orientSeed = (orientSeed * 16807) % 2147483647) / 2147483647;
const orients = Array.from({ length: 2000 }, () => randomShellOrientation(orientRand));
const share = (f: (o: ShellOrientation) => boolean) => orients.filter(f).length / orients.length;
const niceShare = share(o => Math.cos(o.tilt) > 0.8 && Math.abs(o.roll) < Math.PI / 6);
const edgeShare = share(o => Math.cos(o.tilt) < 0.3);
const upsideShare = share(o => Math.abs(o.roll) > Math.PI * 0.75);
assert(niceShare > 0.08 && niceShare < 0.4, `Some shells must open nicely upright and face-on, but not all (${(niceShare * 100).toFixed(0)}%)`);
assert(edgeShare > 0.05 && edgeShare < 0.3, `Some shells must be seen nearly edge-on (${(edgeShare * 100).toFixed(0)}%)`);
assert(upsideShare > 0.01 && upsideShare < 0.15, `A few shells must open nearly upside down (${(upsideShare * 100).toFixed(0)}%)`);
// ハート: 開くたびに見え方 (横と縦の広がりの比) がちがう
const heartAspects = Array.from({ length: 12 }, () => {
  const hs = burstShow(['Sr'], 'heart').fs;
  for (let i = 0; i < 20; i++) hs.update(bounds);
  const xs = hs.stars.map(st => st.x);
  const ys = hs.stars.map(st => st.y);
  return (Math.max(...xs) - Math.min(...xs)) / Math.max(1, Math.max(...ys) - Math.min(...ys));
});
assert(Math.max(...heartAspects) / Math.min(...heartAspects) > 1.3, `Heart shells must look different each time (aspect ratios ${heartAspects.map(a => a.toFixed(2)).join(', ')})`);
// 土星: 輪の星は2色目で、どの向きに傾いても玉の中心を囲む (輪の星の速度の平均はほぼ 0)
const saturn = burstShow(['Sr', 'Ba'], 'saturn').fs;
const ringStars = saturn.stars.filter(st => st.color === baColor);
const ringMax = Math.max(...ringStars.map(st => Math.hypot(st.vx, st.vy)));
const ringMeanX = ringStars.reduce((m, st) => m + st.vx, 0) / ringStars.length;
const ringMeanY = ringStars.reduce((m, st) => m + st.vy, 0) / ringStars.length;
assert(ringStars.length > 0 && Math.hypot(ringMeanX, ringMeanY) < ringMax * 0.1, 'Saturn ring stars must be in the second color and surround the ball');
// 点滅: 光っていないフレームがある
assert(!isStarLit({ life: 5, strobe: { period: 10, phase: 0 } }) && isStarLit({ life: 2, strobe: { period: 10, phase: 0 } }) && isStarLit({ life: 5 }), 'Strobe stars must blink on and off');
const strobe = burstShow(['Sr'], 'strobe').fs;
assert(strobe.stars.every(st => st.strobe) && strobe.stars.some(st => !isStarLit(st)) && strobe.stars.some(st => isStarLit(st)), 'Strobe stars blink at different times');

console.log('\n=== Test: New Discoveries Are Saved ===');
const store2 = new Map<string, string>();
(globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem'> }).localStorage = {
  getItem: (k: string) => store2.get(k) ?? null,
  setItem: (k: string, v: string) => { store2.set(k, v); }
};
const saveEngine2 = new ReactionEngine(new PhysicsWorld(800, 600));
assert(saveEngine2.recordIndicatorResult('BTB', 'acid') === true, 'First BTB acid color must be new');
assert(saveEngine2.recordIndicatorResult('BTB', 'acid') === false, 'Second BTB acid color must not be new');
saveEngine2.recordFlameTest('Sr');
assert(store2.has(INDICATOR_RESULTS_STORAGE_KEY) && store2.has(FLAME_TESTS_STORAGE_KEY), 'Indicator colors and flame tests must be saved');
store2.set(INDICATOR_RESULTS_STORAGE_KEY, JSON.stringify({ 'BTB:acid': 2, 'Fake:acid': 1 }));
const reloaded2 = new ReactionEngine(new PhysicsWorld(800, 600));
assert(reloaded2.stats.indicatorResults!['BTB:acid'] === 2 && !('Fake:acid' in reloaded2.stats.indicatorResults!), 'Indicator colors must be restored and unknown keys ignored');
assert(reloaded2.stats.flameTestsSeen!['Sr'] === 1, 'Flame tests must be restored');
delete (globalThis as unknown as { localStorage?: unknown }).localStorage;

console.log('\n=== Test: New Quests ===');
const questStats = (): GameStats => ({
  createdCompounds: {}, triggeredReactions: {}, spawnedElements: {},
  maxTemperatureReached: 25, minTemperatureReached: 25,
  indicatorResults: {}, flameTestsSeen: {}, fireworksLaunched: 0, maxFireworkColors: 0
});
const quest = (id: string) => QUESTS_DATA.find(q => q.id === id)!;
const qs = questStats();
assert(!quest('quest_btb_three_colors').checkCompletion(qs), 'BTB quest must not be complete at start');
qs.indicatorResults = { 'BTB:acid': 1, 'BTB:neutral': 1, 'BTB:alkaline': 1 };
assert(quest('quest_btb_three_colors').checkCompletion(qs), 'BTB quest must complete after all three colors');
qs.triggeredReactions['limewater_co2_turbidity'] = 1;
assert(quest('quest_limewater').checkCompletion(qs), 'Limewater quest must complete after the reaction');
qs.maxFireworkColors = 2;
assert(!quest('quest_fireworks').checkCompletion(qs), 'Fireworks quest needs three colors');
const fwEngine = new ReactionEngine(new PhysicsWorld(800, 600));
fwEngine.recordFireworkLaunch({ symbols: ['Sr', 'Ba', 'Cu'], shape: 'peony', count: 1 });
assert(quest('quest_fireworks').checkCompletion(fwEngine.stats), 'Fireworks quest must complete after launching three colors');

console.log('\n=== Test: Professor Lines ===');
for (const id of Object.keys(REACTION_LINES)) {
  assert(REACTIONS_DATA.some(r => r.id === id && !r.variantOf), `Professor line must target an existing main reaction: ${id}`);
}
const naRule = REACTIONS_DATA.find(r => r.id === 'sodium_water_reaction')!;
const firstNa = selectProfessorLine({ type: 'reaction', rule: naRule, firstTime: true }, 'ja')!;
assert(firstNa.text === REACTION_LINES['sodium_water_reaction'].ja && firstNa.mood === 'excited', 'First Na + water must use its dedicated line');
const naVariant = REACTIONS_DATA.find(r => r.variantOf === 'nacl_synthesis_molecular');
if (naVariant) {
  const plain = selectProfessorLine({ type: 'reaction', rule: naVariant, firstTime: true }, 'en')!;
  assert(plain.text.includes(naVariant.equation), 'Reactions without a dedicated line must mention the equation');
}
const again = selectProfessorLine({ type: 'reaction', rule: naRule, firstTime: false }, 'ja', () => 0)!;
assert(again.priority < firstNa.priority, 'Repeated reactions must have lower priority than first discoveries');
const quietRule = REACTIONS_DATA.find(r => !r.intensities || r.intensities.length === 0)!;
assert(selectProfessorLine({ type: 'reaction', rule: quietRule, firstTime: false }, 'ja') === null, 'Repeated calm reactions must not interrupt');
const shatterLine = selectProfessorLine({ type: 'shatter' }, 'ja')!;
assert(shatterLine.mood === 'warning' && shatterLine.priority > firstNa.priority, 'Shatter safety tip must be a high-priority warning');
assert(selectProfessorLine({ type: 'indicator', compoundId: 'BTB', phClass: 'acid' }, 'ja')!.text.includes('黄色'), 'BTB acid line must say yellow');
assert(selectProfessorLine({ type: 'flameTest', symbol: 'Sr' }, 'ja')!.text.includes('花火'), 'Flame test line must invite to the fireworks workshop');
assert(selectProfessorLine({ type: 'newCompound', compoundId: 'CO' }, 'ja')!.mood === 'warning', 'Toxic compounds must trigger a warning');

const idleStats = questStats();
const idle = selectProfessorLine({ type: 'idle', stats: idleStats }, 'ja', () => 0)!;
const undiscovered = getUndiscoveredReactions(idleStats);
assert(idle.mood === 'thinking' && undiscovered.some(r => {
  const first = r.reactants[0];
  return idle.text.includes(`(${first.type === 'element' ? first.id : COMPOUNDS_DATA[first.id].formula})`);
}), 'Idle hint must point at an undiscovered reaction');
const allFound = questStats();
for (const r of REACTIONS_DATA) allFound.triggeredReactions[r.id] = 1;
assert(getUndiscoveredReactions(allFound).length === 0, 'No undiscovered reactions after finding all');
const variantOnly = questStats();
variantOnly.triggeredReactions['naf_synthesis_atomic'] = 1;
assert(!getUndiscoveredReactions(variantOnly).some(r => r.id === 'naf_synthesis_molecular'), 'Finding the atomic variant must count as discovering the main reaction');

console.log('\n=== Test: 3D Molecular Structures ===');
const dist3 = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const angleAt = (s: NonNullable<ReturnType<typeof getStructure>>, center: number, a: number, b: number) => {
  const c = s.atoms[center], p = s.atoms[a], q = s.atoms[b];
  const v1 = [p.x - c.x, p.y - c.y, p.z - c.z], v2 = [q.x - c.x, q.y - c.y, q.z - c.z];
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  return (Math.acos(dot / (Math.hypot(...v1) * Math.hypot(...v2))) * 180) / Math.PI;
};
for (const comp of Object.values(COMPOUNDS_DATA)) {
  const st = getStructure(comp.id);
  if (NO_STRUCTURE_COMPOUNDS.includes(comp.id)) {
    assert(st === null, `${comp.id} has no single molecular shape`);
    continue;
  }
  assert(st !== null, `Compound ${comp.id} must have a 3D structure`);
  const s3 = st!;
  assert(s3.bonds.every(([i, j]) => i >= 0 && j >= 0 && i < s3.atoms.length && j < s3.atoms.length && i !== j), `${comp.id} bonds must reference valid atoms`);
  if (s3.kind === 'molecule' || s3.kind === 'ions') {
    const counts: Record<string, number> = {};
    s3.atoms.forEach(a => { counts[a.el] = (counts[a.el] || 0) + 1; });
    const same = Object.keys(counts).length === Object.keys(comp.elements).length && Object.entries(comp.elements).every(([el, n]) => counts[el] === n);
    assert(same, `${comp.id} structure atoms must match its formula`);
  }
  if (s3.kind === 'molecule' || s3.kind === 'network') {
    assert(s3.bonds.filter(b => b[2] > 0).every(([i, j]) => { const d = dist3(s3.atoms[i], s3.atoms[j]); return d > 0.6 && d < 3.0; }), `${comp.id} bond lengths must be realistic`);
  }
}
const water3d = getStructure('H2O')!;
const wo = water3d.atoms.findIndex(a => a.el === 'O');
const wh = water3d.atoms.map((a, i) => (a.el === 'H' ? i : -1)).filter(i => i >= 0);
const waterAngle = angleAt(water3d, wo, wh[0], wh[1]);
assert(waterAngle > 100 && waterAngle < 110, `H2O must be bent (about 104.5°), got ${waterAngle.toFixed(1)}`);
const co2_3d = getStructure('CO2')!;
const cIdx = co2_3d.atoms.findIndex(a => a.el === 'C');
const oIdx = co2_3d.atoms.map((a, i) => (a.el === 'O' ? i : -1)).filter(i => i >= 0);
assert(angleAt(co2_3d, cIdx, oIdx[0], oIdx[1]) > 175, 'CO2 must be linear');
const ch4_3d = getStructure('CH4')!;
const chAngle = angleAt(ch4_3d, 0, 1, 2);
assert(Math.abs(chAngle - 109.5) < 1.5, `CH4 must be tetrahedral (109.5°), got ${chAngle.toFixed(1)}`);
const no2_3d = getStructure('NO2')!;
assert(Math.abs(angleAt(no2_3d, 0, 1, 2) - 134) < 0.5, 'NO2 must be bent at 134°');
const p4o10 = getStructure('P4O10')!;
assert(p4o10.bonds.length === 16, 'P4O10 cage must have 12 bridging P-O bonds and 4 P=O bonds');

// 岩塩型の結晶: となり合うイオンは陽イオンと陰イオンが交互で、間隔はイオン半径の和
const nacl3d = getStructure('NaCl')!;
assert(nacl3d.kind === 'crystal' && nacl3d.atoms.length === 27, 'NaCl must be a 3x3x3 rock-salt crystal');
const naclD = ionicRadius('Na', 1)! + ionicRadius('Cl', -1)!;
assert(nacl3d.bonds.every(([i, j]) => nacl3d.atoms[i].el !== nacl3d.atoms[j].el && Math.abs(dist3(nacl3d.atoms[i], nacl3d.atoms[j]) - naclD) < 1e-6), 'Neighboring ions in NaCl must alternate and touch (ionic radius sum)');
let minNaCl = Infinity;
for (let i = 0; i < nacl3d.atoms.length; i++) for (let j = i + 1; j < nacl3d.atoms.length; j++) minNaCl = Math.min(minNaCl, dist3(nacl3d.atoms[i], nacl3d.atoms[j]));
assert(Math.abs(minNaCl - naclD) < 1e-6, 'Nearest distance in NaCl must equal the ionic radius sum');
assert(getStructure('MgO')!.atoms.every(a => Math.abs(a.charge!) === 2), 'MgO ions must carry 2+ / 2- charges');
assert(getStructure('CuSO4')!.atoms.reduce((t, a) => t + (a.charge || 0), 0) === 0, 'CuSO4 ions must be electrically neutral overall');

// three.js のモデル: 原子ごとの球、結合次数ぶんの円柱 (半分ずつ2色)、イオンのとなり合いは点線
const ch4Model = buildMoleculeGroup(ch4_3d, 'ballStick');
assert(ch4Model.atomMeshes.length === 5 && ch4Model.bondMeshes.length === 8, 'CH4 ball-and-stick must have 5 atoms and 4 bonds split into 8 half-cylinders');
const co2Model = buildMoleculeGroup(co2_3d, 'ballStick');
assert(co2Model.bondMeshes.length === 8, 'CO2 two double bonds must be drawn as 2 lines each (8 half-cylinders)');
const ch4Center = ch4Model.atomMeshes.reduce((v, m) => v.add(m.position), ch4Model.atomMeshes[0].position.clone().multiplyScalar(0));
assert(ch4Center.length() < 1e-9, 'The model must be centered at the origin');
const ch4Fill = buildMoleculeGroup(ch4_3d, 'spaceFill');
assert(ch4Fill.bondMeshes.length === 0 && ch4Fill.atomMeshes[0].scale.x > ch4Model.atomMeshes[0].scale.x, 'Space-filling mode must draw large spheres and no bonds');
const naclModel = buildMoleculeGroup(nacl3d, 'ballStick');
assert(naclModel.contactLines.length === nacl3d.bonds.length && naclModel.bondMeshes.length === 0, 'Ion contacts in a crystal must be dashed lines, not bonds');
const naModel = naclModel.atomMeshes[nacl3d.atoms.findIndex(a => a.el === 'Na')];
const clModel = naclModel.atomMeshes[nacl3d.atoms.findIndex(a => a.el === 'Cl')];
assert(clModel.scale.x > naModel.scale.x, 'Cl- must look bigger than Na+');
assert(chargeLabel(2) === '²⁺' && chargeLabel(-1) === '⁻' && chargeLabel(0) === '', 'Charges must be shown as superscripts');
// 二重結合の2本の線は、平面の分子 (CO₂ は直線、SO₃ は平面) の結合の向きに垂直に並ぶ
const so3Model = buildMoleculeGroup(getStructure('SO3')!, 'ballStick');
assert(so3Model.bondMeshes.every(m => Number.isFinite(m.position.x) && m.scale.y > 0), 'Bond cylinders must have valid positions and lengths')

console.log('\n=== Test: Fireworks Launch Programs (JSON) ===');
const sample = sampleProgram('テスト');
const roundTrip = parseFireworkProgram(serializeFireworkProgram(sample));
assert('program' in roundTrip && JSON.stringify(roundTrip.program) === JSON.stringify(sample) && roundTrip.warnings.length === 0, 'A saved program must load back unchanged');
assert(programDuration(sample) === 5.4 && sample.shots.length === 7, 'Sample program must have 7 shots over 5.4 seconds');
assert(sortShotsByTime(createProgram('t', [createShot({ time: 3 }), createShot({ time: 1 })])).shots.map(x => x.time).join(',') === '1,3', 'Shots must sort by time');

const messy = parseFireworkProgram(JSON.stringify({
  format: 'element-lab-fireworks', version: 1, title: 'messy',
  shots: [
    { time: -5, colors: ['Sr', 'Xx', 'Sr'], shape: 'star', size: 400, x: 120, height: 3 },
    { time: '2.25', colors: [], shape: 'willow', size: 100, x: 50, height: 50 },
    { time: 1, colors: ['Sr', 'Ca', 'Na', 'Ba'], shape: 'peony', size: 100, x: 50, height: 50 }
  ]
}));
assert('program' in messy, 'A messy but valid program must still load');
if ('program' in messy) {
  const [a, b, c] = messy.program.shots;
  assert(a.time === 0 && a.size === 150 && a.x === 100 && a.height === 10, 'Out-of-range values must be clamped');
  assert(a.colors.join(',') === 'Sr' && a.shape === 'chrysanthemum', 'Unknown colors/shapes must be removed (duplicates too)');
  assert(b.time === 2.3 && b.colors.join(',') === 'Sr' && b.shape === 'willow', 'Numeric strings must be read, times rounded to 0.1s, and empty colors filled with Sr');
  assert(c.colors.length === 3, 'More than 3 colors must be trimmed');
  const codes = messy.warnings.map(w => w.code);
  assert(['clamped', 'unknownColor', 'unknownShape', 'noColors', 'tooManyColors'].every(code => codes.includes(code as typeof codes[number])), 'Each fix must be reported as a warning');
}
const notOurs = parseFireworkProgram(JSON.stringify({ shots: [] }));
assert('error' in notOurs && notOurs.error === 'wrongFormat', 'A file of another format must be rejected');
const broken = parseFireworkProgram('{ not json');
assert('error' in broken && broken.error === 'invalidJson', 'Broken JSON must be rejected');
const huge = parseFireworkProgram(serializeFireworkProgram(createProgram('huge', Array.from({ length: 130 }, () => createShot()))));
assert('program' in huge && huge.program.shots.length === MAX_PROGRAM_SHOTS && huge.warnings.some(w => w.code === 'tooManyShots'), 'Programs must be limited to 100 shots');

// 打ち上げ: 時刻順に破裂し、位置・高さ・サイズが反映される
const progBounds = { minX: 0, maxX: 800, minY: 0, maxY: 600 };
const timed = new FireworksShow();
const burstFrames: { frame: number; symbols: string }[] = [];
let frame = 0;
timed.onBurst = (info) => burstFrames.push({ frame, symbols: info.symbols.join('') });
timed.launchShots([
  createShot({ time: 2, colors: ['Cu'], height: 50 }),
  createShot({ time: 0, colors: ['Sr'], height: 50 }),
  createShot({ time: 1, colors: ['Ba'], height: 50 })
], progBounds);
for (frame = 0; frame < 600 && burstFrames.length < 3; frame++) timed.update(progBounds);
assert(burstFrames.map(b => b.symbols).join(',') === 'Sr,Ba,Cu', 'Shots must burst in time order');
assert(Math.abs(burstFrames[1].frame - burstFrames[0].frame - 60) <= 2 && Math.abs(burstFrames[2].frame - burstFrames[1].frame - 60) <= 2, 'Shots 1 second apart must burst about 60 frames apart');

const burstCenter = (shot: ReturnType<typeof createShot>) => {
  const show2 = new FireworksShow();
  show2.launchShots([shot], progBounds);
  for (let k = 0; k < 600 && show2.stars.length === 0; k++) show2.update(progBounds);
  const cx = show2.stars.reduce((t, st) => t + st.x, 0) / show2.stars.length;
  const cy = show2.stars.reduce((t, st) => t + st.y, 0) / show2.stars.length;
  for (let k = 0; k < 40; k++) show2.update(progBounds);
  const spread = Math.max(...show2.stars.map(st => Math.hypot(st.x - cx, st.y - cy)));
  return { cx, cy, spread };
};
assert(burstCenter(createShot({ x: 0 })).cx < 40 && burstCenter(createShot({ x: 100 })).cx > 760, 'x 0% / 100% must burst near the left / right edges');
assert(burstCenter(createShot({ height: 90 })).cy < burstCenter(createShot({ height: 30 })).cy, 'Height 90% must burst higher than 30%');
assert(burstCenter(createShot({ size: 150 })).spread > burstCenter(createShot({ size: 50 })).spread * 1.8, 'Size 150 must spread much wider than size 50');

// カスタム (発射プログラム) では、開いても画面下に炎色反応の説明を出さない。1発・スターマインでは出す
const labelCheck = (showLabels: boolean | undefined) => {
  const show3 = new FireworksShow();
  let bursts = 0;
  show3.onBurst = () => bursts++;
  if (showLabels === undefined) show3.launch({ symbols: ['Sr'], shape: 'chrysanthemum', count: 1 }, progBounds);
  else show3.launchShots([createShot({ colors: ['Sr'] })], progBounds, showLabels);
  for (let k = 0; k < 600 && bursts === 0; k++) show3.update(progBounds);
  return { bursts, labels: show3.labels.length };
};
const customLabels = labelCheck(false);
assert(customLabels.bursts === 1 && customLabels.labels === 0, 'Custom program shots must not show the flame-color caption');
assert(labelCheck(undefined).labels === 1, 'Single / star mine launches must still show the flame-color caption');

console.log('\n=== Test: Every Recipe Actually Makes Its Compound ===');
// 図鑑の「ひつような材料」どおりに置けば、その化合物が本当にできること。
// 常温・ぬるま湯 (35℃)・バーナー (600℃)・強熱 (1600℃) のどれかでできればよい。電気分解は通電ツールを使う。
// 赤サビのようにゆっくり進む反応もあるので、反応判定を何度かくり返す
for (const comp of Object.values(COMPOUNDS_DATA)) {
  const recipe = comp.recipe;
  if (!recipe) continue;
  let made = false;
  for (const temp of [25, 35, 600, 1600]) {
    if (made) break;
    const rw = new PhysicsWorld(800, 600);
    const re = new ReactionEngine(rw);
    let n = 0;
    for (const m of recipe.materials) {
      for (let c = 0; c < m.count; c++, n++) {
        rw.addParticle(new Particle(`rc_${n}`, m.type, m.id, 300 + (n % 4) * 6, 300 + Math.floor(n / 4) * 6, temp));
      }
    }
    for (let step = 0; step < 300 && !made; step++) {
      if (recipe.toolRequired === 'electric') made = rw.applyElectric(306, 306, 60).createdCompounds.includes(comp.id);
      re.checkReactions();
      made = made || rw.particles.some(p => p.symbolOrId === comp.id);
    }
  }
  assert(made, `Following the recipe for ${comp.id} must produce ${comp.id}`);
}

console.log('\n=== Test: Balances Fall Under Gravity Like Flasks ===');
const fallWorld = new PhysicsWorld(800, 600);
const floorY = fallWorld.chamber.maxY - 4;
const highBal = fallWorld.spawnBalance(400, fallWorld.chamber.minY + 200);
assert(!highBal.isGrounded && highBal.cy < floorY - 50, 'A balance placed in mid-air must start ungrounded');
const panGas = new Particle('fall_h2', 'compound', 'H2', highBal.leftPan.cx, highBal.leftPan.cy - 10, 25);
fallWorld.addParticle(panGas);
const panFlask = fallWorld.spawnFlask(highBal.rightPan.cx, highBal.rightPan.cy - 2, 'beaker');
for (let i = 0; i < 5; i++) fallWorld.update();
assert(panFlask !== null && panFlask.supportedByBalanceId === highBal.id, 'A flask placed on the pan must be supported by it');
const startCy = highBal.cy;
for (let i = 0; i < 240; i++) fallWorld.update();
assert(highBal.cy > startCy && highBal.isGrounded && Math.abs(highBal.cy - floorY) < 1e-6, 'The balance must fall and stop on the chamber floor');
assert(highBal.leftPan.particles.includes(panGas), 'Particles on a pan must ride down with the falling balance');
assert(panFlask!.supportedByBalanceId === highBal.id && Math.abs(panFlask!.cy - highBal.rightPan.cy) < 1, 'A flask on a pan must ride down with the falling balance');
const groundWorld = new PhysicsWorld(800, 600);
const groundBal = groundWorld.spawnBalance(400);
const groundCy = groundBal.cy;
for (let i = 0; i < 30; i++) groundWorld.update();
assert(groundBal.isGrounded && groundBal.cy === groundCy, 'A balance placed on the floor must stay put');

console.log('\n=== Test: Balances Cannot Overlap Other Balances or Flasks ===');
const ovw = new PhysicsWorld(1200, 700);
const midX = (ovw.chamber.minX + ovw.chamber.maxX) / 2;
assert(ovw.canSpawnBalance(midX).allowed, 'A balance can be placed in an empty chamber');
const balA = ovw.spawnBalance(midX);
assert(ovw.canSpawnBalance(midX + 150).reason === 'overlap_balance', 'A balance must not overlap another balance');
assert(ovw.canSpawnBalance(midX + 150, ovw.chamber.minY + 200).reason === 'overlap_balance', 'A balance placed in mid-air above another balance must be rejected too (it would land on it)');
assert(ovw.canSpawnBalance(midX + 290).allowed, 'A balance far enough away can be placed');
// フラスコ: 皿の真上なら (高い所からでも) 皿に乗る。それ以外で天秤の幅にかかる場所には置けない
const overPan = ovw.canSpawnFlask(balA.leftPan.cx, ovw.chamber.minY + 80, 'beaker');
assert(overPan.allowed && overPan.targetY === balA.leftPan.cy, 'A flask placed high above a pan must snap onto the pan');
assert(ovw.canSpawnFlask(balA.cx, ovw.chamber.maxY, 'beaker').reason === 'overlap_balance', 'A flask must not be placed on the balance base / pillar');
assert(ovw.canSpawnFlask(balA.leftPan.cx, ovw.chamber.maxY, 'beaker').reason === 'overlap_balance', 'A flask must not be placed under a pan');
ovw.spawnFlask(balA.leftPan.cx, balA.leftPan.cy, 'beaker');
assert(ovw.canSpawnFlask(balA.leftPan.cx, ovw.chamber.minY + 80, 'beaker').reason === 'pan_occupied', 'A second flask must not be placed on an occupied pan');
// 床のフラスコの近くには天秤を置けない
const floorFlaskX = ovw.chamber.minX + 80;
ovw.spawnFlask(floorFlaskX, ovw.chamber.maxY, 'erlenmeyer');
assert(ovw.canSpawnBalance(floorFlaskX + 100).reason === 'overlap_container', 'A balance must not overlap a flask on the floor');

console.log('\n=== Test: Atoms Added One by One (CH4 / H2O) ===');
// 実際の遊び方と同じく、炭素のそばに水素原子を1個ずつ入れていく (入れるたびに反応判定)
function addOneByOne(center: string, centerCount: number, hCount: number, inFlask: boolean) {
  const w = new PhysicsWorld(800, 600);
  const e = new ReactionEngine(w);
  const cx = 400;
  const cy = w.chamber.maxY - 30;
  if (inFlask) w.spawnFlask(cx, w.chamber.maxY, 'beaker');
  for (let i = 0; i < centerCount; i++) w.addParticle(new Particle(`seq_c${i}`, 'element', center, cx + i * 8, cy, 25));
  for (let i = 0; i < hCount; i++) {
    w.addParticle(new Particle(`seq_h${i}`, 'element', 'H', cx + ((i % 2) * 2 - 1) * 12, cy - 6 - i * 4, 25));
    for (let f = 0; f < 10; f++) {
      e.checkReactions();
      w.update();
    }
  }
  for (let f = 0; f < 30; f++) {
    e.checkReactions();
    w.update();
  }
  const count = (id: string) => w.particles.filter(p => p.symbolOrId === id).length;
  return { count };
}
const ch4Seq = addOneByOne('C', 1, 4, false);
assert(ch4Seq.count('CH4') === 1 && ch4Seq.count('H2') === 0, 'Adding 4 H one by one next to C must make CH4 (not H2)');
const ch4Flask = addOneByOne('C', 1, 4, true);
assert(ch4Flask.count('CH4') === 1 && ch4Flask.count('H2') === 0, 'Adding 4 H one by one to C in a beaker must make CH4');
const waterSeq = addOneByOne('O', 1, 2, false);
assert(waterSeq.count('H2O') === 1 && waterSeq.count('H2') === 0, 'Adding 2 H one by one next to O must make H2O');
// そばに相手の原子がない水素原子どうしは、これまでどおり H₂ になる
const loneH = new PhysicsWorld(800, 600);
const loneE = new ReactionEngine(loneH);
loneH.addParticle(new Particle('lone_h1', 'element', 'H', 300, 300, 25));
loneH.addParticle(new Particle('lone_h2', 'element', 'H', 305, 300, 25));
loneH.addParticle(new Particle('far_c', 'element', 'C', 600, 300, 25));
loneE.checkReactions();
assert(loneH.particles.some(p => p.symbolOrId === 'H2'), 'H atoms far from any partner atom must still form H2');

console.log('\n=== Test: Burner Heating Above 1500°C (CaO + 3C → CaC2) ===');
// バーナーで加熱し続けて 1500℃ 以上の反応を起こす (外でもビーカーの中でも)
function heatCarbide(inFlask: boolean) {
  const w = new PhysicsWorld(800, 600);
  const e = new ReactionEngine(w);
  const cx = 400;
  const cy = w.chamber.maxY - 30;
  if (inFlask) w.spawnFlask(cx, w.chamber.maxY, 'beaker');
  w.addParticle(new Particle('cac_cao', 'compound', 'CaO', cx, cy, 25));
  [-22, 22, 44].forEach((dx, i) => w.addParticle(new Particle(`cac_c${i}`, 'element', 'C', cx + dx, cy, 25)));
  let maxLift = 0;
  for (let f = 0; f < 600 && !w.particles.some(p => p.symbolOrId === 'CaC2'); f++) {
    // バーナーを山の上で左右に動かす (ドラッグで加熱するときと同じ)
    w.applyHeat(cx + 10 + Math.sin(f * 0.1) * 30, cy, 40, 25);
    e.checkReactions();
    w.update();
    const cao = w.particles.find(p => p.symbolOrId === 'CaO');
    // 置いた直後は床より少し上から落ちてくるので、落ち着いてから測る
    if (cao && f >= 60) maxLift = Math.max(maxLift, w.chamber.maxY - cao.radius - cao.y);
  }
  return { made: w.particles.some(p => p.symbolOrId === 'CaC2'), maxLift, containerTemp: w.containers[0]?.temperature ?? 0 };
}
const carbideOpen = heatCarbide(false);
assert(carbideOpen.made, 'Heating CaO + 3C with the burner must make CaC2');
assert(carbideOpen.maxLift < 10, `The burner must not lift heated solids off the floor (lifted ${carbideOpen.maxLift.toFixed(1)}px)`);
const carbideFlask = heatCarbide(true);
assert(carbideFlask.made, 'Heating CaO + 3C in a beaker must make CaC2 (beaker must reach above 1500°C)');
assert(carbideFlask.containerTemp > 1500, `A heated beaker must be able to exceed 1500°C (was ${carbideFlask.containerTemp.toFixed(0)}°C)`);

console.log('\n=== Test: Water from H2 + O, and H2 + O2 in a Sealed Flask ===');
// 水素分子と酸素原子は、そのまま水になる
const h2oWorld = new PhysicsWorld(800, 600);
const h2oEngine = new ReactionEngine(h2oWorld);
h2oWorld.addParticle(new Particle('h2o_h2', 'compound', 'H2', 400, 300, 25));
h2oWorld.addParticle(new Particle('h2o_o', 'element', 'O', 410, 300, 25));
h2oEngine.checkReactions();
assert(h2oWorld.particles.length === 1 && h2oWorld.particles[0].symbolOrId === 'H2O', 'H2 + O must produce H2O');
// 図鑑では「水の合成 (原子から)」を発見したことになる
const waterAtomicRule = REACTIONS_DATA.find(r => r.id === 'water_synthesis_atomic')!;
assert(getMergedReactionCount(waterAtomicRule, h2oEngine.stats) === 1, 'H2 + O must count as discovering "Water Synthesis (from atoms)"');
assert(!DISPLAY_REACTIONS.some(r => r.id === 'water_from_h2_and_atomic_o'), 'H2 + O must not be listed as a separate reaction in the encyclopedia');
// 水素は軽くてすぐ逃げるので、蓋をしたフラスコに水素と酸素を入れて加熱すると爆発して水ができる
function sealedHydrogenBurn(tool: 'heat' | 'spark') {
  const w = new PhysicsWorld(800, 600);
  const e = new ReactionEngine(w);
  w.spawnFlask(400, w.chamber.maxY, 'erlenmeyer');
  const c = w.containers[0];
  w.setFlaskCap(c, true);
  ['H2', 'H2', 'O2'].forEach((id, i) => w.addParticle(new Particle(`seal_${i}`, 'compound', id, 394 + i * 6, c.cy - 20, 25)));
  for (let f = 0; f < 60; f++) {
    e.checkReactions();
    w.update();
  }
  // フラスコが大きく、気体どうしが出会うまで時間がかかることがあるので、長めに加熱する。電気火花は気体のあるところに飛ばす
  for (let f = 0; f < 1500 && !w.particles.some(p => p.symbolOrId === 'H2O'); f++) {
    if (tool === 'heat') w.applyHeat(400, c.cy - 10, 40, 25);
    else if (f % 10 === 0) {
      const gases = w.particles.filter(p => p.containerId === c.id);
      w.applySpark(gases.reduce((s, p) => s + p.x, 0) / gases.length, gases.reduce((s, p) => s + p.y, 0) / gases.length, 35);
    }
    e.checkReactions();
    w.update();
  }
  return w.particles.filter(p => p.symbolOrId === 'H2O').length;
}
assert(sealedHydrogenBurn('heat') === 2, 'Heating 2H2 + O2 in a sealed flask must produce 2 H2O');
assert(sealedHydrogenBurn('spark') === 2, 'Sparking 2H2 + O2 in a sealed flask must produce 2 H2O');

console.log('\n=== Test: Brine Electrolysis in a Beaker (continuous current) ===');
// ビーカーに食塩2個と水を入れて電気を流し続ける。水が沸騰したり、できた H₂ と Cl₂ がその場で爆発したりしない
function brineInBeaker(waterCount: number) {
  const w = new PhysicsWorld(800, 600);
  const e = new ReactionEngine(w);
  w.spawnFlask(400, w.chamber.maxY, 'beaker');
  const c = w.containers[0];
  for (let i = 0; i < 2; i++) w.addParticle(new Particle(`bb_s${i}`, 'compound', 'NaCl', 390 + i * 12, c.cy - 20, 25));
  for (let i = 0; i < waterCount; i++) w.addParticle(new Particle(`bb_w${i}`, 'compound', 'H2O', 385 + i * 10, c.cy - 40, 25));
  for (let f = 0; f < 60; f++) {
    e.checkReactions();
    w.update();
  }
  for (let f = 0; f < 120; f++) {
    e.recordElectricResult(w.applyElectric(400, c.cy - 15, 42), 400, c.cy);
    e.checkReactions();
    w.update();
  }
  const has = (sym: string) => w.particles.filter(p => p.symbolOrId === sym).length;
  return { w, e, has };
}
const brine2 = brineInBeaker(2);
assert(brine2.e.stats.triggeredReactions['brine_electrolysis'] === 1, 'Electrifying 2NaCl + 2H2O in a beaker must be recorded as brine electrolysis');
assert(brine2.has('NaOH') === 2 && brine2.has('H2') === 1 && brine2.has('Cl2') === 1, 'Brine in a beaker must end as 2NaOH + H2 + Cl2');
assert(!brine2.e.stats.triggeredReactions['hcl_synthesis_molecular'] && brine2.w.containers.length === 1, 'H2 and Cl2 from brine electrolysis must not explode on the spot');
assert(!brine2.e.stats.triggeredReactions['water_electrolysis'] && !brine2.e.stats.triggeredReactions['salt_electrolysis'], 'Salt water must not be split as plain water or as molten salt');
assert(brine2.w.particles.every(p => p.temperature < 100), 'Electric current must only warm the solution, not boil it');
const brine4 = brineInBeaker(4);
assert(brine4.e.stats.triggeredReactions['brine_electrolysis'] === 1 && brine4.w.containers.length === 1, 'Brine with extra water must still be electrolyzed without exploding');
// 金属は通電でこれまでどおり熱くなる
const jouleWorld = new PhysicsWorld(800, 600);
const jouleFe = new Particle('joule_fe', 'element', 'Fe', 300, 300, 25);
jouleWorld.addParticle(jouleFe);
for (let i = 0; i < 20; i++) jouleWorld.applyElectric(300, 300, 30);
assert(jouleFe.temperature > 300, 'Metals must still heat up strongly by Joule heat');
// H2 + Cl2 は混ぜただけでは反応せず、点火すると反応する
const hclMixWorld = new PhysicsWorld(800, 600);
const hclMixEngine = new ReactionEngine(hclMixWorld);
hclMixWorld.addParticle(new Particle('hm_h2', 'compound', 'H2', 300, 300, 25));
hclMixWorld.addParticle(new Particle('hm_cl2', 'compound', 'Cl2', 306, 300, 25));
hclMixEngine.checkReactions();
assert(!hclMixWorld.particles.some(p => p.symbolOrId === 'HCl'), 'H2 + Cl2 must not react just by mixing at room temperature');
hclMixWorld.applySpark(303, 300, 35);
hclMixEngine.checkReactions();
assert(hclMixWorld.particles.some(p => p.symbolOrId === 'HCl'), 'Igniting H2 + Cl2 must produce HCl');

console.log('\n=== Test: Heat From a Reaction Warms the Flask (Hand Warmer) ===');
// 容器の中で発熱した反応の熱は、ガラスに吸い取られて消えず、容器ごと温まってからゆっくり冷める
const warmerWorld = new PhysicsWorld(800, 600);
const warmerEngine = new ReactionEngine(warmerWorld);
warmerWorld.spawnFlask(400, warmerWorld.chamber.maxY, 'beaker');
const warmerFlask = warmerWorld.containers[0];
const warmerItems: [string, 'element' | 'compound'][] = [['Fe', 'element'], ['Fe', 'element'], ['Fe', 'element'], ['Fe', 'element'], ['O2', 'compound'], ['O2', 'compound'], ['O2', 'compound'], ['H2O', 'compound'], ['NaCl', 'compound']];
warmerItems.forEach(([id, kind], i) => warmerWorld.addParticle(new Particle(`hw_${i}`, kind, id, 390 + (i % 3) * 10, warmerFlask.cy - 40 - Math.floor(i / 3) * 8, 25)));
let warmerFrame = -1;
for (let f = 0; f < 600 && warmerFrame < 0; f++) {
  warmerEngine.checkReactions();
  warmerWorld.update();
  if (warmerWorld.particles.some(p => p.symbolOrId === 'Fe2O3')) warmerFrame = f;
}
assert(warmerFrame >= 0, 'Hand warmer reaction must happen in a beaker');
for (let f = 0; f < 300; f++) {
  warmerEngine.checkReactions();
  warmerWorld.update();
}
const rustTemps = warmerWorld.particles.filter(p => p.symbolOrId === 'Fe2O3').map(p => p.temperature);
assert(rustTemps.length === 2 && rustTemps.every(t => t > 35), `Fe2O3 must still be warm 5 seconds after the hand warmer reaction in a beaker (was ${rustTemps.map(t => t.toFixed(1)).join(', ')}°C)`);
assert(warmerFlask.temperature > 35, `The beaker must warm up from the reaction heat (was ${warmerFlask.temperature.toFixed(1)}°C)`);

console.log('\n=== Test: Methane Combustion in a Sealed Flask ===');
// メタン (軽い) と酸素 (重い) は、蓋をした容器の中では上下に分かれず混ざり合い、加熱すると燃える
function sealedMethaneBurn(type: 'erlenmeyer' | 'beaker' | 'testtube') {
  const w = new PhysicsWorld(800, 600);
  const e = new ReactionEngine(w);
  w.spawnFlask(400, w.chamber.maxY, type);
  const c = w.containers[0];
  w.setFlaskCap(c, true);
  ['CH4', 'O2', 'O2'].forEach((id, i) => w.addParticle(new Particle(`sm_${i}`, 'compound', id, 392 + i * 8, c.cy - 20, 25)));
  for (let f = 0; f < 120; f++) {
    e.checkReactions();
    w.update();
  }
  for (let f = 0; f < 900 && !e.stats.triggeredReactions['methane_combustion']; f++) {
    w.applyHeat(400, c.cy - 5, 40, 25);
    e.checkReactions();
    w.update();
  }
  return e.stats.triggeredReactions['methane_combustion'] === 1;
}
for (const type of ['erlenmeyer', 'beaker', 'testtube'] as const) {
  assert(sealedMethaneBurn(type), `Heating CH4 + 2O2 in a sealed ${type} must burn the methane`);
}

console.log('\n=== Test: Nitric Acid from NO2 (with and without O2) ===');
// 粒子を1個ずつビーカーに入れる。酸素 (O₂) があれば 3NO₂ + H₂O で止まらず、全部そろうと 4NO₂ + O₂ + 2H₂O → 4HNO₃
function nitricInBeaker(items: string[]) {
  const w = new PhysicsWorld(800, 600);
  const e = new ReactionEngine(w);
  w.spawnFlask(400, w.chamber.maxY, 'beaker');
  items.forEach((id, i) => {
    w.addParticle(new Particle(`na_${i}`, 'compound', id, 392 + (i % 3) * 8, w.chamber.maxY - 40, 25));
    for (let f = 0; f < 20; f++) {
      e.checkReactions();
      w.update();
    }
  });
  for (let f = 0; f < 300; f++) {
    e.checkReactions();
    w.update();
  }
  const has = (sym: string) => w.particles.filter(p => p.symbolOrId === sym).length;
  return { e, has };
}
for (const order of [['NO2', 'NO2', 'NO2', 'NO2', 'O2', 'H2O', 'H2O'], ['H2O', 'H2O', 'O2', 'NO2', 'NO2', 'NO2', 'NO2'], ['NO2', 'NO2', 'H2O', 'O2', 'NO2', 'NO2', 'H2O']]) {
  const r = nitricInBeaker(order);
  assert(r.e.stats.triggeredReactions['no2_water_nitric_acid'] === 1 && r.has('HNO3') === 4 && r.has('NO') === 0, `4NO2 + O2 + 2H2O must all become HNO3 (order: ${order.join(',')})`);
}
const noOxygen = nitricInBeaker(['NO2', 'NO2', 'NO2', 'H2O']);
assert(noOxygen.e.stats.triggeredReactions['no2_water_only_nitric_acid'] === 1 && noOxygen.has('HNO3') === 2 && noOxygen.has('NO') === 1, 'Without O2, 3NO2 + H2O must make 2HNO3 + NO');

console.log('\n=== Test: Flasks and Balances Rest on Walls ===');
// 宙に並べた壁 (上面 y=388) の上にフラスコや天秤を置くと、壁の上に乗る。壁は一緒に落ちない
function wallShelf(w: PhysicsWorld, y: number, fromX: number, toX: number) {
  for (let x = fromX; x <= toX; x += 24) w.addParticle(new Particle(`shelf_${x}_${y}`, 'wall', 'wall', x, y, 25));
}
for (const type of ['erlenmeyer', 'beaker', 'testtube'] as const) {
  const w = new PhysicsWorld(800, 600);
  wallShelf(w, 400, 320, 480);
  const c = w.spawnFlask(400, 250, type)!;
  w.addParticle(new Particle(`shelf_water_${type}`, 'compound', 'H2O', 400, c.cy - 15, 25));
  for (let f = 0; f < 240; f++) w.update();
  assert(Math.abs(c.cy - 388) < 0.5 && c.isGrounded, `A ${type} dropped onto walls must rest on top of them (cy=${c.cy.toFixed(1)})`);
  assert(w.particles.filter(p => p.kind === 'wall').every(p => p.y === 400), `Walls must not fall together with the ${type}`);
  assert(w.particles.some(p => p.symbolOrId === 'H2O' && p.y < 388), `Contents must stay inside the ${type} resting on walls`);
  w.particles = w.particles.filter(p => p.kind !== 'wall');
  for (let f = 0; f < 240; f++) w.update();
  assert(c.cy === w.chamber.maxY, `Erasing the walls must let the ${type} fall to the floor`);
}
// 壁の上 (や少し下) をクリックしても壁の上に置かれる。積んだ壁はいちばん上に乗る
const clickWorld = new PhysicsWorld(800, 600);
wallShelf(clickWorld, 400, 320, 480);
clickWorld.addParticle(new Particle('shelf_stack', 'wall', 'wall', 400, 376, 25));
assert(clickWorld.canSpawnFlask(410, 410, 'beaker').targetY === 364, 'Clicking on stacked walls must place the flask on the top wall');
const shelfBalanceWorld = new PhysicsWorld(800, 600);
wallShelf(shelfBalanceWorld, 420, 300, 500);
const shelfBalance = shelfBalanceWorld.spawnBalance(400, 200);
for (let f = 0; f < 240; f++) shelfBalanceWorld.update();
assert(Math.abs(shelfBalance.cy - 408) < 0.5 && shelfBalance.isGrounded, `A balance dropped onto walls must rest on top of them (cy=${shelfBalance.cy.toFixed(1)})`);

console.log('\n=== Test: Placing Under a Wall Shelf ===');
// 高い棚 (y=300) の上のフラスコの真下でも、床との間に空間があればフラスコや天秤を置ける
const highShelf = new PhysicsWorld(800, 600);
wallShelf(highShelf, 300, 250, 550);
highShelf.spawnFlask(400, 200, 'erlenmeyer');
for (let f = 0; f < 200; f++) highShelf.update();
assert(highShelf.canSpawnFlask(400, 500, 'beaker').allowed, 'A beaker must be placeable on the floor under a shelf that holds a flask');
assert(highShelf.canSpawnBalance(400, 500).allowed, 'A balance must be placeable on the floor under a shelf that holds a flask');
assert(highShelf.canSpawnFlask(400, 100, 'beaker').reason === 'overlap_container', 'A beaker dropped onto the same spot of the shelf must still be rejected');
assert(highShelf.canSpawnFlask(520, 250, 'beaker').allowed, 'A beaker must be placeable beside the flask on the shelf');
const underShelf = highShelf.spawnFlask(400, 500, 'beaker')!;
for (let f = 0; f < 200; f++) highShelf.update();
assert(underShelf.cy === highShelf.chamber.maxY && highShelf.containers[0].cy === 288, 'The flask under the shelf must reach the floor while the shelf flask stays put');
// 低い棚 (y=520) の下は 44px しかないので入らない
const lowShelf = new PhysicsWorld(800, 600);
wallShelf(lowShelf, 520, 250, 550);
assert(lowShelf.canSpawnFlask(400, 560, 'testtube').reason === 'overlap_wall', 'A flask must not fit under a shelf that is too low');
assert(lowShelf.canSpawnBalance(400, 570).reason === 'overlap_wall', 'A balance must not fit under a shelf that is too low');
// 棚がなければ、これまでどおり床のフラスコの上には置けない
const noShelf = new PhysicsWorld(800, 600);
noShelf.spawnFlask(400, noShelf.chamber.maxY, 'beaker');
assert(noShelf.canSpawnFlask(400, 300, 'beaker').reason === 'overlap_container' && noShelf.canSpawnBalance(400, 300).reason === 'overlap_container', 'Without a shelf, nothing may be placed above a floor flask (it would fall onto it)');

console.log('\n=== Test: Wall Strength, Size and Explosion Damage ===');
// 壁ブラシ: 格子にそろえて 幅×高さ のブロックを置く。同じ場所に何度置いても重ならない
const brushWorld = new PhysicsWorld(800, 600);
assert(brushWorld.placeWallBrush(400, 300, 3, 2, 'wall_brick') === 6, 'A 3x2 wall brush must place 6 blocks');
assert(brushWorld.placeWallBrush(400, 300, 3, 2, 'wall_brick') === 0, 'Placing the same brush again must not stack blocks');
const brushWalls = brushWorld.particles.filter(p => p.kind === 'wall');
assert(brushWalls.every(p => ((p.x - brushWorld.chamber.minX - WALL_BLOCK / 2) / WALL_BLOCK) % 1 === 0 && ((p.y - brushWorld.chamber.minY - WALL_BLOCK / 2) / WALL_BLOCK) % 1 === 0), 'Wall blocks must snap to the grid');
assert(brushWalls.every(p => p.symbolOrId === 'wall_brick' && p.pinned && p.nameJa === 'れんがの壁'), 'Brush blocks must be pinned brick walls');
const edgePlaced = brushWorld.placeWallBrush(brushWorld.chamber.minX + 2, brushWorld.chamber.minY + 2, 3, 3, 'wall');
assert(edgePlaced === 4 && brushWorld.particles.every(p => p.x - p.radius >= brushWorld.chamber.minX && p.y - p.radius >= brushWorld.chamber.minY), 'Wall blocks must not be placed outside the chamber');
const area = brushWorld.wallBrushBounds(400, 300, 3, 2);
assert(area.maxX - area.minX === 3 * WALL_BLOCK && area.maxY - area.minY === 2 * WALL_BLOCK, 'Brush bounds must cover cols x rows blocks');

// 爆発の強さと壁の強度
function wallAt(type: WallTypeId, dist: number) {
  const w = new PhysicsWorld(800, 600);
  const p = new Particle(`dmg_${type}`, 'wall', type, 400 + dist, 300, 25);
  w.addParticle(p);
  return { w, p, alive: () => w.particles.includes(p) };
}
// 小さな爆発 (H2 + Cl2 相当: 強さ 3) のすぐそば
const smallWood = wallAt('wall_wood', 10);
smallWood.w.damageWalls(400, 300, 3);
assert(!smallWood.alive(), 'A small explosion must break a wooden wall nearby');
const smallBrick = wallAt('wall_brick', 10);
smallBrick.w.damageWalls(400, 300, 3);
assert(smallBrick.alive() && smallBrick.p.cracked, 'A small explosion must only crack a brick wall');
smallBrick.w.damageWalls(400, 300, 3);
assert(!smallBrick.alive(), 'A cracked brick wall must break on the next small explosion');
const smallConcrete = wallAt('wall_concrete', 10);
smallConcrete.w.damageWalls(400, 300, 3);
assert(smallConcrete.alive() && !smallConcrete.p.cracked, 'A small explosion must not even crack concrete');
// 大きな爆発 (テルミット相当: 強さ 9.5)
for (const type of ['wall_brick', 'wall_concrete'] as WallTypeId[]) {
  const big = wallAt(type, 20);
  const res = big.w.damageWalls(400, 300, 9.5);
  assert(!big.alive() && res.broken === 1, `A huge explosion must break a ${type} nearby`);
  assert(big.w.glassShards.some(g => g.color === WALL_TYPES[type].color), `Breaking a ${type} must scatter debris in its color`);
}
const heatproof = wallAt('wall', 0);
heatproof.w.damageWalls(400, 300, 20);
assert(heatproof.alive() && !heatproof.p.cracked, 'A thermal wall must never break or crack');
const farWood = wallAt('wall_wood', 300);
farWood.w.damageWalls(400, 300, 9.5);
assert(farWood.alive() && !farWood.p.cracked, 'Walls far from the explosion must be unharmed');
assert(wallImpact(5, 0) === 5 && wallImpact(5, 1000) === 0, 'Wall impact must be full at the center and zero out of reach');

// 実際の反応: H2 + Cl2 に点火して爆発させると、となりの木の壁は壊れ、れんがの壁は残る
function hclBlastBeside(type: WallTypeId) {
  const w = new PhysicsWorld(800, 600);
  const e = new ReactionEngine(w);
  const wall = new Particle(`blast_${type}`, 'wall', type, 420, 300, 25);
  w.addParticle(wall);
  w.addParticle(new Particle(`blast_h2_${type}`, 'compound', 'H2', 394, 300, 600));
  w.addParticle(new Particle(`blast_cl2_${type}`, 'compound', 'Cl2', 400, 300, 600));
  e.checkReactions();
  return { reacted: w.particles.some(p => p.symbolOrId === 'HCl'), alive: w.particles.includes(wall) };
}
const woodBlast = hclBlastBeside('wall_wood');
assert(woodBlast.reacted && !woodBlast.alive, 'The H2 + Cl2 explosion must break the wooden wall beside it');
const brickBlast = hclBlastBeside('wall_brick');
assert(brickBlast.reacted && brickBlast.alive, 'The H2 + Cl2 explosion must not break the brick wall beside it');

// 爆発で壁の棚が壊れると、上のフラスコは床まで落ちる
const collapseWorld = new PhysicsWorld(800, 600);
for (let x = 340; x <= 460; x += 24) collapseWorld.addParticle(new Particle(`collapse_${x}`, 'wall', 'wall_wood', x, 400, 25));
const collapseFlask = collapseWorld.spawnFlask(400, 300, 'beaker')!;
for (let f = 0; f < 120; f++) collapseWorld.update();
assert(Math.abs(collapseFlask.cy - 388) < 0.5, 'The beaker must first rest on the wooden shelf');
collapseWorld.damageWalls(400, 420, 9.5);
for (let f = 0; f < 240; f++) collapseWorld.update();
assert(collapseFlask.cy === collapseWorld.chamber.maxY, 'When the shelf is blown away, the beaker must fall to the floor');

// 壁ツールの設定 (強さ・大きさ) は保存され、次に開いたときも同じ設定で置ける
const wallSettingsStore = new Map<string, string>();
(globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem'> }).localStorage = {
  getItem: (k: string) => wallSettingsStore.get(k) ?? null,
  setItem: (k: string, v: string) => { wallSettingsStore.set(k, v); }
};
const wallToolbar = new Toolbar();
wallToolbar.activeTool = 'wall';
wallToolbar.selectedWallType = 'wall_concrete';
wallToolbar.wallCols = 4;
wallToolbar.wallRows = 2;
(wallToolbar as unknown as { saveWallSettings: () => void }).saveWallSettings();
const reloadedToolbar = new Toolbar();
assert(reloadedToolbar.selectedWallType === 'wall_concrete' && reloadedToolbar.wallCols === 4 && reloadedToolbar.wallRows === 2, 'Wall settings must be restored from storage');
wallSettingsStore.set('element_lab_wall_settings', '{"type":"bogus","cols":99,"rows":-3}');
const sanitizedToolbar = new Toolbar();
assert(sanitizedToolbar.selectedWallType === 'wall' && sanitizedToolbar.wallCols === 6 && sanitizedToolbar.wallRows === 1, 'Invalid saved wall settings must fall back to safe values');
delete (globalThis as unknown as { localStorage?: unknown }).localStorage;

console.log('\n=== Test: Every Compound And Reaction Stays Discoverable ===');
// パレットから置ける物 (全元素 + 化合物タブ) から出発し、反応・通電で作れる物を広げていく
const MAX_BURNER_TEMP = 1800;
const ELECTRIC_PRODUCTS: Record<string, string[]> = {
  water_electrolysis: ['H2', 'O2'], brine_electrolysis: ['NaOH', 'H2', 'Cl2'], salt_electrolysis: ['Na', 'Cl2'],
  copper_chloride_electrolysis: ['Cu', 'Cl2'], ozone_generation: ['O3']
};
const reachable = new Set<string>([
  ...Object.keys(ELEMENTS_DATA),
  ...COMPOUND_CATEGORY_LIST.flatMap(c => c.compoundIds)
]);
const reachableReactions = new Set<string>();
for (let changed = true; changed;) {
  changed = false;
  for (const rule of REACTIONS_DATA) {
    if (reachableReactions.has(rule.id)) continue;
    if ((rule.condition.minTemp ?? 0) > MAX_BURNER_TEMP) continue;
    if (!rule.reactants.every(r => reachable.has(r.id))) continue;
    reachableReactions.add(rule.id);
    const products = rule.condition.requiresElectricity ? (ELECTRIC_PRODUCTS[rule.id] ?? []) : rule.products.map(r => r.id);
    for (const id of products) reachable.add(id);
    changed = true;
  }
}
for (const rule of REACTIONS_DATA) {
  assert(reachableReactions.has(rule.id), `Reaction ${rule.id} must be possible to trigger`);
}
const createdAnyhow = new Set(REACTIONS_DATA.filter(r => reachableReactions.has(r.id)).flatMap(r =>
  r.condition.requiresElectricity ? (ELECTRIC_PRODUCTS[r.id] ?? []) : r.products.map(p => p.id)
));
for (const comp of Object.values(COMPOUNDS_DATA)) {
  assert(isStarterCompound(comp) || createdAnyhow.has(comp.id), `Compound ${comp.id} must be possible to discover in the encyclopedia`);
}

console.log('\n=== Test: Quests Changed By The Chemistry Fixes Are Still Clearable ===');
// ミッション10: 水酸化ナトリウムを溶かした水に通電すると達成できる
const q10World = new PhysicsWorld(800, 600);
const q10Engine = new ReactionEngine(q10World);
for (let i = 0; i < 4; i++) q10World.addParticle(new Particle(`q10_w${i}`, 'compound', 'H2O', 300 + i * 3, 300, 25));
q10World.addParticle(new Particle('q10_naoh', 'compound', 'NaOH', 305, 302, 25));
for (let attempt = 0; attempt < 10; attempt++) q10Engine.recordElectricResult(q10World.applyElectric(305, 300, 40), 305, 300);
assert(quest('quest_electrolysis').checkCompletion(q10Engine.stats), 'Water electrolysis quest must be clearable with NaOH added');
assert(quest('quest_electrolysis').hintJa.includes('水酸化ナトリウム'), 'Water electrolysis quest hint must tell players to add NaOH');
// 炭素の完全燃焼のミッション: 酸素が十分なら CO₂ が2個できる
const co2Quest = QUESTS_DATA.find(q => q.id === 'quest_combustion_co2')!;
const co2World = new PhysicsWorld(800, 600);
const co2Engine = new ReactionEngine(co2World);
co2World.addParticle(new Particle('qc_c1', 'element', 'C', 400, 500, 300));
co2World.addParticle(new Particle('qc_c2', 'element', 'C', 406, 500, 300));
for (let i = 0; i < 3; i++) co2World.addParticle(new Particle(`qc_o${i}`, 'compound', 'O2', 398 + i * 5, 492, 300));
for (let f = 0; f < 3; f++) co2Engine.checkReactions();
assert(co2Quest.checkCompletion(co2Engine.stats), 'CO2 combustion quest must be clearable when oxygen is plentiful');
// 花火のミッション: Mg を使わなくても3色そろう
assert(FIREWORK_ELEMENTS.filter(sym => sym !== 'Mg').length >= 3, 'Fireworks quest must be clearable with flame-test colors alone');

console.log('\n=== Test: Latent Heat Holds The Temperature During A Phase Change ===');
const boilWorld = new PhysicsWorld(800, 600);
const boilWater = new Particle('boil_w', 'compound', 'H2O', 400, 300, 90);
boilWorld.addParticle(boilWater);
boilWater.temperature = 120;
boilWater.updateStateByTemperature();
assert(boilWater.state === 'liquid' && boilWater.temperature === 100, 'Water heated past 100°C must hold at 100°C while boiling');
assert(boilWater.phaseChange === 'boiling', 'Water at the boiling point must report that it is boiling');
for (let i = 0; i < 40 && boilWater.state !== 'gas'; i++) {
  boilWater.temperature += 15;
  boilWater.updateStateByTemperature();
}
assert(boilWater.state === 'gas' && boilWater.temperature >= 100, 'Water must turn into steam after absorbing enough heat');
assert(boilWater.latentHeat === 0, 'Latent heat must reset after the phase change');
// 冷やすときは凝縮で熱を放出し、温度が 100℃ で止まる
boilWater.temperature = 80;
boilWater.updateStateByTemperature();
assert(boilWater.state === 'gas' && boilWater.temperature === 100 && boilWater.phaseChange === 'condensing', 'Cooling steam must hold at 100°C while condensing');
// 途中で加熱をやめると、たくわえた熱は温度に戻る
const halfIce = new Particle('half_ice', 'compound', 'H2O', 0, 0, -5);
halfIce.temperature = 10;
halfIce.updateStateByTemperature();
assert(halfIce.state === 'solid' && halfIce.temperature === 0 && halfIce.latentHeat === 10, 'Melting ice must hold at 0°C and store heat');
halfIce.temperature = -20;
halfIce.updateStateByTemperature();
assert(halfIce.state === 'solid' && halfIce.latentHeat === 0 && halfIce.temperature === -10, 'Cooling a half-melted solid must first give back the stored heat');
// 置いた直後や反応で物質が変わったときは、潜熱を待たずに状態が決まる
assert(new Particle('hot_spawn', 'compound', 'H2O', 0, 0, 150).state === 'gas', 'A particle created above its boiling point must start as gas');
const changed = new Particle('changed', 'compound', 'H2O', 0, 0, 25);
changed.symbolOrId = 'H2';
changed.applyData();
assert(changed.state === 'gas' && changed.temperature === 25, 'A particle that turns into another substance must take its state at once');

console.log('\n=== Test: Sublimation (melting point above boiling point) ===');
const arsenic = new Particle('as_sub', 'element', 'As', 0, 0, 25);
arsenic.temperature = 700;
for (let i = 0; i < 5; i++) {
  arsenic.updateStateByTemperature();
  if (arsenic.state === 'gas') break;
  arsenic.temperature += 100;
}
assert(arsenic.state === 'gas', 'Arsenic must sublime into gas near its sublimation point (614°C), not wait until 817°C');
assert(new Particle('as_hot', 'element', 'As', 0, 0, 650).state === 'gas', 'Arsenic above 614°C must be gas');
assert(new Particle('alcl3_hot', 'compound', 'AlCl3', 0, 0, 185).state === 'gas', 'AlCl3 above 180°C must be gas (sublimation)');
assert(new Particle('co2_dry', 'compound', 'CO2', 0, 0, -100).state === 'solid', 'Dry ice below -78.5°C must stay solid');

console.log('\n=== Test: Medium-Priority Data Corrections ===');
assert(ELEMENTS_DATA['F'].mextFactJa.includes('淡黄色') && !ELEMENTS_DATA['F'].mextFactJa.includes('淡黄緑色'), 'Fluorine must be pale yellow');
assert(ELEMENTS_DATA['Rb'].flameColorNameJa === '深赤色 (赤紫がかる)' && ELEMENTS_DATA['Rb'].mextFactJa.includes('深赤色') && ELEMENTS_DATA['Rb'].flameMnemonicJa!.includes('深赤'), 'Rb flame color must be described consistently');
for (const sym of ['Zn', 'Cd', 'Hg', 'Cn']) {
  assert(ELEMENTS_DATA[sym].category === 'post-transition-metal', `${sym} (group 12) must be treated as a main-group metal`);
}
assert(!Object.values(ELEMENTS_DATA).some(el => el.mextFactJa.includes('文科省')), 'Element notes must not claim to be MEXT statements');
assert(!REACTIONS_DATA.some(r => /イオン交換膜法・融解塩電解|アンモニアソーダ法/.test(r.mextCategoryJa)), 'Reaction categories must not mislabel processes');
assert(formatEmphasis('まず **水素 (H)** を置こう') === 'まず <strong>水素 (H)</strong> を置こう', 'Tutorial emphasis must render as bold, not raw asterisks');

console.log('\n=== Test: Stricter Quest Checks ===');
const strictStats = questStats();
strictStats.spawnedElements['Na'] = 1;
strictStats.maxTemperatureReached = 500;
assert(!quest('quest_flame_reaction').checkCompletion(strictStats), 'Placing Na and heating something else must not clear the flame quest');
strictStats.flameTestsSeen = { Na: 1 };
assert(quest('quest_flame_reaction').checkCompletion(strictStats), 'Seeing a flame test must clear the flame quest');
strictStats.createdCompounds['H2'] = 3;
assert(!quest('quest_electrolysis').checkCompletion(strictStats), 'Making H2 by other reactions must not clear the electrolysis quest');
strictStats.triggeredReactions['water_electrolysis'] = 1;
assert(quest('quest_electrolysis').checkCompletion(strictStats), 'Water electrolysis must clear the electrolysis quest');

console.log('\n=== Test: Low-Priority Data Corrections ===');
assert(!ELEMENTS_DATA['Be'].descriptionJa.includes('主成分'), 'Be is one component of emerald, not its main component');
assert(COMPOUNDS_DATA['H3PO4'].stateAtRoomTemp === 'solid' && COMPOUNDS_DATA['H3PO4'].meltingPoint > 25, 'Pure phosphoric acid is solid at 25°C (mp 42°C)');
assert(COMPOUNDS_DATA['CuSO4'].meltingPoint > 160, 'Anhydrous CuSO4 must stay solid when formed from hot concentrated sulfuric acid');
assert(REACTIONS_DATA.some(r => r.id === 'haber_bosch_molecular') && !REACTIONS_DATA.some(r => r.id.includes('habber')), 'Haber-Bosch reaction IDs must be spelled correctly');
for (const sym of ['Li', 'Na', 'K', 'Cu', 'Ca', 'Sr', 'Ba']) {
  assert(isTextbookFlameElement(sym), `${sym} flame color is textbook material`);
}
for (const sym of ['Zn', 'P', 'As', 'Se', 'Mo']) {
  assert(ELEMENTS_DATA[sym].flameColor !== undefined && !isTextbookFlameElement(sym), `${sym} flame color must be marked as reference only`);
}

console.log('\n=== Test: English Text Is Complete ===');
const JAPANESE_CHARS = /[\u3040-\u30ff\u4e00-\u9fff]/;
const englishOk = (text: string | undefined) => !!text && !JAPANESE_CHARS.test(text);
for (const el of Object.values(ELEMENTS_DATA)) {
  assert(englishOk(el.descriptionEn) && englishOk(el.mextFactEn), `${el.symbol} must have English description and key point`);
  if (el.flameColorNameJa) assert(englishOk(el.flameColorNameEn) && englishOk(el.flameMnemonicEn), `${el.symbol} must have an English flame color name and mnemonic`);
}
for (const comp of Object.values(COMPOUNDS_DATA)) {
  assert(englishOk(comp.descriptionEn) && englishOk(comp.mextFactEn) && englishOk(comp.kidHintEn), `${comp.id} must have English description, key point and kid hint`);
  if (comp.toxicWarning) assert(englishOk(comp.toxicWarningEn), `${comp.id} must have an English toxic warning`);
  assert(englishOk(getCompoundFormula(comp, 'en')), `${comp.id} formula label must not be Japanese in English mode`);
}
for (const r of REACTIONS_DATA) {
  assert(englishOk(r.nameEn) && englishOk(r.descriptionEn) && englishOk(r.mextCategoryEn), `${r.id} must have English name, description and category`);
  assert(englishOk(getReactionEquation(r, 'en')), `${r.id} equation must not contain Japanese in English mode`);
}
for (const q of QUESTS_DATA) {
  assert([q.titleEn, q.categoryEn, q.objectiveEn, q.hintEn, q.mextNoteEn].every(englishOk), `${q.id} must have English quest text`);
}
setLanguage('en');
const litmus = new Particle('lit_en', 'compound', 'RedLitmus', 100, 100, 25);
assert(litmus.displayName === 'RL', 'Red litmus paper must show an English label in English mode');
setLanguage('ja');
assert(litmus.displayName === '赤リ', 'Red litmus paper must keep its Japanese label in Japanese mode');
setLanguage('en');

console.log('\n=== Test: Dissolving & Solubility (小5 もののとけ方 / 中1 溶解度) ===');
assert(getSolubility('NaCl', 20) === 35.8, 'NaCl solubility at 20°C is 35.8 g/100 g water');
assert(Math.abs(getSolubility('KNO3', 35)! - 54.75) < 1e-9, 'KNO3 solubility is interpolated between table points');
assert(getSolubility('KNO3', -10) === 13.3 && getSolubility('Sucrose', 150) === 487.2, 'Solubility is clamped outside the table');
assert(getSolubility('KNO3', 60)! > getSolubility('KNO3', 20)! * 3, 'KNO3 is far more soluble in hot water');
assert(getSolubility('NaCl', 80)! - getSolubility('NaCl', 0)! < 3, 'NaCl solubility barely changes with temperature');
assert(!isSolute('H2O') && !isSolute('BTB') && isSolute('Alum'), 'Only the dissolving reagents are solutes');
for (const id of Object.keys(SOLUBILITY_TABLES)) {
  const comp = COMPOUNDS_DATA[id];
  assert(!!comp && comp.stateAtRoomTemp === 'solid', `${id} must be a solid compound`);
  assert(COMPOUND_CATEGORY_LIST.find(c => c.id === 'dissolve')!.compoundIds.includes(id), `${id} must be in the Dissolve tab`);
}
assert(['KNO3', 'Alum', 'Sucrose'].every(id => COMPOUNDS_DATA[id].reagent && isStarterCompound(COMPOUNDS_DATA[id])), 'New solutes are starter reagents');
assert(Math.abs(soluteCapacity('NaCl', 58.44, 24, 20) - 24 * 18.02 * 0.358 * 4 / 58.44) < 1e-9, 'Capacity scales with water amount and solubility');
assert(soluteCapacity('NaCl', 58.44, 48, 20) === soluteCapacity('NaCl', 58.44, 24, 20) * 2, 'Twice the water dissolves twice as much');
assert(!!getStructure('KNO3') && getStructure('Sucrose')?.atoms.length === 45, 'KNO3 and sucrose have 3D structures');
assert(NO_STRUCTURE_COMPOUNDS.includes('Alum'), 'Alum (ionic hydrate crystal) is listed as having no single molecule');

// ビーカーの温かい水に溶質を入れる
const makeSolution = (solute: string, waterCount: number, soluteCount: number, temp: number) => {
  const w = new PhysicsWorld(800, 600);
  w.ambientTemp = temp;
  const b = w.spawnFlask(400, 450, 'beaker');
  for (let f = 0; f < 60; f++) w.update();
  for (let i = 0; i < waterCount; i++) w.addParticle(new Particle(`dw${i}`, 'compound', 'H2O', b.cx - 30 + (i % 8) * 8, b.cy - 20 - Math.floor(i / 8) * 8, temp));
  for (let i = 0; i < soluteCount; i++) w.addParticle(new Particle(`ds${i}`, 'compound', solute, b.cx - 16 + (i % 4) * 10, b.cy - 50 - Math.floor(i / 4) * 12, temp));
  const events = { dissolve: 0, saturate: 0, crystallize: 0 };
  w.solutions.onDissolve = () => events.dissolve++;
  w.solutions.onSaturate = () => events.saturate++;
  w.solutions.onCrystallize = () => events.crystallize++;
  const holdTemp = (t: number) => { for (const p of w.particles) if (p.symbolOrId === 'H2O') p.temperature = t; };
  const run = (frames: number, t: number) => { for (let f = 0; f < frames; f++) { holdTemp(t); w.update(); } };
  const solutes = () => w.particles.filter(p => p.symbolOrId === solute);
  return { w, events, run, solutes };
};

const hot = makeSolution('KNO3', 24, 6, 60);
const massBefore = hot.w.particles.reduce((m, p) => m + p.molarMass, 0);
hot.run(500, 60);
const hotDissolved = hot.solutes().filter(p => p.dissolved).length;
console.log(`KNO3 in 60°C water: ${hotDissolved}/6 dissolved`);
assert(hotDissolved >= 5 && hot.events.dissolve >= 5, 'KNO3 dissolves in hot water');
const waterInfo = hot.w.solutions.getSolution(hot.w.particles.find(p => p.symbolOrId === 'H2O' && p.state === 'liquid')!);
assert(!!waterInfo && waterInfo.solutes[0].compoundId === 'KNO3', 'Water reports the dissolved solute');
assert(hot.w.getConductivity(hot.solutes().find(p => p.dissolved)!) === 'electrolyte', 'Dissolved KNO3 conducts electricity');
assert(hot.w.particles.filter(p => p.symbolOrId === 'H2O' && hot.w.solutions.getSolution(p)?.solutes.length).every(p => hot.w.getConductivity(p) === 'ionic_water'), 'Every water particle of a KNO3 solution conducts');
hot.w.ambientTemp = 5;
hot.run(400, 5);
const coldDissolved = hot.solutes().filter(p => p.dissolved);
const coldInfo = hot.w.solutions.getSolution(coldDissolved[0] ?? hot.w.particles.find(p => p.symbolOrId === 'H2O')!)!;
const coldCap = coldInfo.solutes.find(s => s.compoundId === 'KNO3')?.capacity ?? 0;
console.log(`KNO3 after cooling to 5°C: ${coldDissolved.length} dissolved (capacity ${coldCap.toFixed(2)}), ${hot.events.crystallize} crystallized`);
assert(hot.events.crystallize >= 2 && coldDissolved.length <= coldCap, 'Cooling KNO3 solution brings crystals out (recrystallization)');
assert(hot.solutes().filter(p => !p.dissolved).every(p => p.state === 'solid'), 'Crystals come out as solids');
const massAfter = hot.w.particles.reduce((m, p) => m + p.molarMass, 0);
assert(hot.w.particles.length === 30 && Math.abs(massAfter - massBefore) < 1e-9, 'Dissolving and crystallizing conserve mass');

const little = makeSolution('NaCl', 6, 6, 25);
little.run(400, 25);
const saltDissolved = little.solutes().filter(p => p.dissolved).length;
console.log(`NaCl in 6 water particles: ${saltDissolved}/6 dissolved, saturate events ${little.events.saturate}`);
assert(saltDissolved >= 1 && saltDissolved <= soluteCapacity('NaCl', 58.44, 6, 25), 'Only a limited amount of salt dissolves in a little water');
assert(little.events.saturate > 0, 'Leftover salt marks the solution as saturated');

const sugar = makeSolution('Sucrose', 24, 3, 25);
sugar.run(400, 25);
const dissolvedSugar = sugar.solutes().find(p => p.dissolved);
assert(!!dissolvedSugar && sugar.w.getConductivity(dissolvedSugar) === 'insulator', 'Sugar dissolves but sugar water does not conduct (non-electrolyte)');
assert(sugar.w.particles.filter(p => p.symbolOrId === 'H2O' && p.state === 'liquid').every(p => sugar.w.getConductivity(p) === 'pure_water'), 'Sugar water is not ionic water');

// 水がすべて蒸発すると、溶けていた物質が結晶として残る
sugar.w.particles = sugar.w.particles.filter(p => p.symbolOrId !== 'H2O');
const crystBefore = sugar.events.crystallize;
sugar.run(60, 25);
assert(sugar.solutes().every(p => !p.dissolved) && sugar.events.crystallize > crystBefore, 'Evaporating all the water leaves the solute as crystals');

// クエストと発見記録
const solEngine = new ReactionEngine(new PhysicsWorld(800, 600));
const q15 = QUESTS_DATA.find(q => q.id === 'quest_dissolve_salt')!;
const q16 = QUESTS_DATA.find(q => q.id === 'quest_recrystallize')!;
assert(!q15.checkCompletion(solEngine.stats) && !q16.checkCompletion(solEngine.stats), 'Dissolving quests start incomplete');
assert(solEngine.recordDissolved('NaCl') && !solEngine.recordDissolved('NaCl'), 'First dissolving is reported only once');
assert(!q15.checkCompletion(solEngine.stats), 'Salt quest also needs a saturated solution');
solEngine.recordSaturated('NaCl');
assert(q15.checkCompletion(solEngine.stats), 'Salt quest completes after dissolving until saturated');
solEngine.recordCrystallized('NaCl');
assert(!q16.checkCompletion(solEngine.stats), 'Recrystallization quest needs KNO3 or alum');
solEngine.recordCrystallized('Alum');
assert(q16.checkCompletion(solEngine.stats), 'Recrystallization quest completes with alum crystals');
for (const type of ['dissolve', 'saturate', 'crystallize'] as const) {
  for (const id of Object.keys(SOLUBILITY_TABLES)) {
    for (const lang of ['ja', 'en'] as const) {
      const line = selectProfessorLine({ type, compoundId: id }, lang);
      assert(!!line && (lang === 'ja' || englishOk(line.text)), `Professor has a ${lang} ${type} line for ${id}`);
    }
  }
}

console.log('\n=== Test: Common Organic Compounds ===');
for (const id of ['C2H4', 'C2H5OH', 'CH3COOH', 'C6H12O6', 'CH3COONa']) {
  assert(!!COMPOUNDS_DATA[id] && COMPOUND_CATEGORY_LIST.find(c => c.id === 'organic')!.compoundIds.includes(id), `${id} must be in the Organic tab`);
  assert(!!getStructure(id), `${id} must have a 3D structure`);
}
assert(COMPOUNDS_DATA['C2H5OH'].stateAtRoomTemp === 'liquid' && COMPOUNDS_DATA['C2H4'].stateAtRoomTemp === 'gas' && COMPOUNDS_DATA['C6H12O6'].stateAtRoomTemp === 'solid', 'Organic compounds have the right states at room temperature');
assert(getStructure('C2H5OH')!.atoms.length === 9 && getStructure('C6H12O6')!.atoms.length === 24 && getStructure('C2H4')!.atoms.length === 6, 'Organic structures include every atom');
const acetate = getStructure('CH3COONa')!;
assert(acetate.kind === 'ions' && acetate.atoms.filter(a => a.charge).reduce((sum, a) => sum + a.charge!, 0) === 0, 'Sodium acetate is drawn as Na+ and acetate ions with no net charge');
assert(classifyPh(COMPOUND_PH['CH3COOH']) === 'acid' && classifyPh(COMPOUND_PH['CH3COONa']) === 'alkaline' && COMPOUND_PH['C2H5OH'] === undefined, 'Acetic acid is acidic, sodium acetate weakly alkaline, ethanol neutral');

// 反応を起こす: 粒をまとめて置き、温度をそろえて数フレーム進める
const runOrganic = (items: [string, number][], temp: number, frames = 40) => {
  const w = new PhysicsWorld(800, 600);
  w.ambientTemp = temp;
  const eng = new ReactionEngine(w);
  let k = 0;
  for (const [id, count] of items) {
    for (let i = 0; i < count; i++, k++) {
      const kind = ELEMENTS_DATA[id] ? 'element' : 'compound';
      w.addParticle(new Particle(`org${k}`, kind, id, 400 + (k % 4) * 9, 300 + Math.floor(k / 4) * 9, temp));
    }
  }
  for (let f = 0; f < frames; f++) {
    for (const p of w.particles) p.temperature = temp;
    w.update();
    eng.checkReactions();
  }
  const count = (id: string) => w.particles.filter(p => p.symbolOrId === id).length;
  return { eng, count };
};
const ferment = runOrganic([['C6H12O6', 1], ['H2O', 1]], 35);
assert(ferment.count('C2H5OH') === 2 && ferment.count('CO2') === 2 && ferment.count('C6H12O6') === 0, 'Glucose ferments into 2 ethanol + 2 CO2 in warm water');
const coldSugar = runOrganic([['C6H12O6', 1], ['H2O', 1]], 20);
assert(coldSugar.count('C6H12O6') === 1, 'Fermentation does not happen in cold water');
const lamp = runOrganic([['C2H5OH', 1], ['O2', 3]], 400);
assert(lamp.count('CO2') === 2 && lamp.count('H2O') === 3 && (lamp.eng.stats.triggeredReactions['ethanol_combustion'] || 0) === 1, 'Ethanol burns into 2 CO2 + 3 H2O');
assert(QUESTS_DATA.find(q => q.id === 'quest_ethanol_combustion')!.checkCompletion(lamp.eng.stats), 'Burning ethanol completes Mission 17');
const coolLamp = runOrganic([['C2H5OH', 1], ['O2', 3]], 25);
assert(coolLamp.count('C2H5OH') === 1, 'Ethanol and oxygen alone do not react at room temperature');
const vinegar = runOrganic([['CH3COOH', 1], ['NaHCO3', 1]], 25);
assert(vinegar.count('CH3COONa') === 1 && vinegar.count('CO2') === 1, 'Vinegar and baking soda fizz out CO2');
const sour = runOrganic([['C2H5OH', 1], ['O2', 1], ['H2O', 1]], 25);
assert(sour.count('CH3COOH') === 1, 'Ethanol with oxygen in water turns into acetic acid');
const dehydrate = runOrganic([['C2H5OH', 1], ['H2SO4', 1]], 170);
assert(dehydrate.count('C2H4') === 1 && dehydrate.count('H2SO4') === 1, 'Hot sulfuric acid dehydrates ethanol into ethylene and is not used up');
const hydrogenate = runOrganic([['C2H2', 1], ['H2', 1], ['Ni', 1]], 200);
assert(hydrogenate.count('C2H4') === 1 && hydrogenate.count('Ni') === 1, 'Nickel catalyst adds hydrogen to acetylene');
const neutral = runOrganic([['CH3COOH', 1], ['NaOH', 1]], 25);
assert(neutral.count('CH3COONa') === 1, 'Acetic acid is neutralized by sodium hydroxide');
const ethanolWorld = new PhysicsWorld(800, 600);
const ethanolP = new Particle('eth', 'compound', 'C2H5OH', 100, 100, 25);
ethanolWorld.addParticle(ethanolP);
assert(ethanolWorld.getConductivity(ethanolP) === 'insulator', 'Ethanol is a nonelectrolyte');
for (const id of ['glucose_fermentation', 'ethanol_combustion', 'ethanol_to_acetic_acid', 'acetic_acid_baking_soda', 'ethanol_dehydration']) {
  assert(englishOk(REACTION_LINES[id].en), `Professor has an English line for ${id}`);
}

console.log('\n=== Test: Junior High Key Experiments ===');
const silver = runOrganic([['Ag2O', 2]], 300);
assert(silver.count('Ag') === 4 && silver.count('O2') === 1 && silver.count('Ag2O') === 0, 'Heating silver oxide gives 4 Ag + O2');
assert(QUESTS_DATA.find(q => q.id === 'quest_silver_oxide')!.checkCompletion(silver.eng.stats), 'Decomposing silver oxide completes Mission 18');
assert(runOrganic([['Ag2O', 2]], 25).count('Ag2O') === 2, 'Silver oxide does not decompose at room temperature');
const ammonia = runOrganic([['NH4Cl', 2], ['CaOH2', 1]], 150);
assert(ammonia.count('NH3') === 2 && ammonia.count('CaCl2') === 1 && ammonia.count('H2O') === 2, 'Heating NH4Cl with Ca(OH)2 gives off ammonia');
assert(runOrganic([['NH4Cl', 2], ['CaOH2', 1]], 25).count('NH3') === 0, 'The ammonia mixture needs heating');
const mgAcid = runOrganic([['Mg', 1], ['HCl', 2]], 25);
assert(mgAcid.count('MgCl2') === 1 && mgAcid.count('H2') === 1, 'Magnesium and hydrochloric acid give MgCl2 + H2');
const precipitate = runOrganic([['H2SO4', 1], ['BaOH2', 1]], 25);
assert(precipitate.count('BaSO4') === 1 && precipitate.count('H2O') === 2, 'Sulfuric acid and barium hydroxide give a BaSO4 precipitate');
assert(QUESTS_DATA.find(q => q.id === 'quest_barium_sulfate_precipitate')!.checkCompletion(precipitate.eng.stats), 'The precipitate completes Mission 19');
assert(REACTIONS_DATA.find(r => r.id === 'sulfuric_acid_barium_hydroxide')!.visualHint === 'cloudy', 'The BaSO4 precipitate turns the solution cloudy');
const bariumWater = runOrganic([['Ba', 1], ['H2O', 2]], 25);
assert(bariumWater.count('BaOH2') === 1 && bariumWater.count('H2') === 1, 'Barium and water give barium hydroxide');
const cuS = runOrganic([['Cu', 1], ['S', 1]], 250);
assert(cuS.count('CuS') === 1, 'Heated copper and sulfur combine into copper sulfide');
assert(runOrganic([['Cu', 1], ['S', 1]], 25).count('CuS') === 0, 'Copper and sulfur need heating to combine');
assert(classifyPh(COMPOUND_PH['BaOH2']) === 'alkaline' && COMPOUND_PH['MgCl2'] === undefined, 'Barium hydroxide is alkaline, magnesium chloride neutral');
for (const id of ['Ag2O', 'MgCl2', 'BaOH2', 'CuS']) {
  assert(getStructure(id)?.kind === 'ions', `${id} is drawn as ions`);
}
for (const id of ['silver_oxide_decomposition', 'ammonia_generation', 'magnesium_hcl_reaction', 'sulfuric_acid_barium_hydroxide', 'copper_sulfur_combination']) {
  assert(englishOk(REACTION_LINES[id].en), `Professor has an English line for ${id}`);
}

console.log('\n=== Test: Ion Visualization ===');
// どの電解質にもイオンの分かれ方があり、電荷の合計は0、原子の数も化学式と同じ
assert(Object.keys(ION_FORMS).sort().join() === [...ELECTROLYTES].sort().join(), 'Every electrolyte has an ion form, and only electrolytes do');
const SUB: Record<string, string> = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
const ionAtoms = (label: string) => {
  const formula = label.replace(/[₀-₉]/g, ch => SUB[ch]).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/g, '');
  const atoms: Record<string, number> = {};
  for (const m of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) atoms[m[1]] = (atoms[m[1]] || 0) + Number(m[2] || 1);
  return atoms;
};
for (const [id, form] of Object.entries(ION_FORMS)) {
  assert(form.ions.reduce((sum, ion) => sum + ion.charge, 0) === 0, `${id} splits into ions whose charges add up to zero`);
  const atoms: Record<string, number> = {};
  for (const ion of form.ions) for (const [el, n] of Object.entries(ionAtoms(ion.label))) atoms[el] = (atoms[el] || 0) + n;
  // ミョウバンの結晶水 (12H₂O) はイオンにならず、水にもどる
  if (id === 'Alum') { atoms.H = (atoms.H || 0) + 24; atoms.O = (atoms.O || 0) + 12; }
  const expected = COMPOUNDS_DATA[id].elements;
  const same = Object.keys({ ...atoms, ...expected }).every(el => (atoms[el] || 0) === (expected[el] || 0));
  assert(same, `${id} ions (${ionEquationProducts(form)}) have the same atoms as its formula`);
}
for (const [id, form] of Object.entries(ION_FORMS)) {
  const sign = form.ions.map(ion => ion.label.endsWith('⁺') ? 1 : -1);
  assert(form.ions.every((ion, i) => Math.sign(ion.charge) === sign[i]), `${id} ion labels show the right sign`);
}
assert(ionEquationProducts(ION_FORMS['CuCl2']) === 'Cu²⁺ + 2Cl⁻', 'CuCl2 ionizes as Cu²⁺ + 2Cl⁻');

// イオンに分かれるのは、水に溶けた・融けたときだけ
function ionWorld(specs: [string, number][], withWater: boolean) {
  const w = new PhysicsWorld(800, 600);
  w.gravity = 0;
  const ps = specs.map(([id, temp], i) => {
    const p = new Particle(`ion_${id}_${i}`, 'compound', id, 300 + i * 60, 300, temp);
    w.addParticle(p);
    return p;
  });
  if (withWater) ps.forEach((p, i) => w.addParticle(new Particle(`ion_w${i}`, 'compound', 'H2O', p.x + 18, 300, 25)));
  for (let f = 0; f < 12; f++) w.update();
  return ps;
}
const [drySaltP] = ionWorld([['NaCl', 25]], false);
assert(!drySaltP.ionized, 'Dry solid salt is not split into ions');
const [wetSaltP] = ionWorld([['NaCl', 25]], true);
assert(wetSaltP.ionized, 'Salt touching water is drawn as Na⁺ and Cl⁻');
const [moltenSaltP] = ionWorld([['NaCl', 900]], false);
assert(moltenSaltP.state === 'liquid' && moltenSaltP.ionized, 'Molten salt is split into ions');
const [pureAcetic] = ionWorld([['CH3COOH', 25]], false);
const aceticWorld = new PhysicsWorld(800, 600);
aceticWorld.addParticle(pureAcetic);
assert(!pureAcetic.ionized && aceticWorld.getConductivity(pureAcetic) === 'electrolyte_dry', 'Pure liquid acetic acid is not split into ions and does not conduct');
const [hclGasIon] = ionWorld([['HCl', 25]], true);
assert(hclGasIon.state === 'gas' && !hclGasIon.ionized, 'Hydrogen chloride gas is not drawn as ions');
const [wetSugar] = ionWorld([['Sucrose', 25]], true);
assert(!wetSugar.ionized, 'Sugar dissolves without splitting into ions');
const weakIds = Array.from({ length: 50 }, (_, i) => `weak_${i}`);
const weakShare = weakIds.filter(isDissociatedWeakAcid).length / weakIds.length;
assert(weakShare > 0.05 && weakShare < 0.4, 'Only some weak acid particles are shown split into ions');

console.log('\n=== Test: Electrodes Move Ions and Electrolyze ===');
function electrodeBeaker(solute: [string, number][], waterCount: number) {
  const w = new PhysicsWorld(800, 600);
  const e = new ReactionEngine(w);
  const c = w.spawnFlask(400, w.chamber.maxY, 'beaker')!;
  const added: Particle[] = [];
  for (let i = 0; i < waterCount; i++) {
    const p = new Particle(`eb_w${i}`, 'compound', 'H2O', 372 + (i % 6) * 11, c.cy - 12 - Math.floor(i / 6) * 11, 25);
    w.addParticle(p);
  }
  solute.forEach(([id, n]) => {
    for (let i = 0; i < n; i++) {
      const p = new Particle(`eb_${id}${i}`, 'compound', id, 385 + i * 14, c.cy - 40, 25);
      w.addParticle(p);
      added.push(p);
    }
  });
  const electrode: string[] = [];
  w.onElectrodeElectrolysis = (res, x, y) => {
    e.recordElectricResult(res, x, y);
    for (const id of res.triggeredReactionIds) {
      e.recordElectrodeElectrolysis(id);
      electrode.push(id);
    }
  };
  const run = (frames: number) => {
    for (let f = 0; f < frames; f++) {
      e.checkReactions();
      w.update();
    }
  };
  run(60);
  return { w, e, c, added, electrode, run };
}
const ebErl = new PhysicsWorld(800, 600);
const erl = ebErl.spawnFlask(400, ebErl.chamber.maxY, 'erlenmeyer')!;
assert(ebErl.toggleElectrodesAt(erl.cx, erl.cy - 30) === 'not_beaker', 'Electrodes only go into a beaker');
assert(ebErl.toggleElectrodesAt(100, 100) === null, 'Tapping empty space does not connect electrodes');

const cuEb = electrodeBeaker([['CuCl2', 2]], 18);
assert(cuEb.added.every(p => p.ionized), 'Copper chloride in the beaker water is shown as Cu²⁺ and Cl⁻');
const toggled = cuEb.w.toggleElectrodesAt(cuEb.c.cx, cuEb.c.cy - 40);
assert(typeof toggled === 'object' && toggled !== null && toggled.on && cuEb.c.electrodes, 'Tapping a beaker connects the electrodes');
cuEb.run(40);
const movingIon = cuEb.added.find(p => p.ionized)!;
assert(movingIon.ionDrift > 0 && movingIon.ionDrift < 1 && movingIon.ionPoles !== null, 'Ions start moving toward the electrodes once the current is on');
assert(movingIon.ionPoles!.cathodeX < movingIon.ionPoles!.anodeX, 'The cathode is on the left and the anode on the right');
assert(cuEb.c.electrodeCurrent, 'Current flows when there are ions between the electrodes');
const atomsOf = (w: PhysicsWorld) => {
  const atoms: Record<string, number> = {};
  for (const p of w.particles) {
    const els = p.kind === 'element' ? { [p.symbolOrId]: 1 } : COMPOUNDS_DATA[p.symbolOrId]?.elements ?? {};
    for (const [el, n] of Object.entries(els)) atoms[el] = (atoms[el] || 0) + n;
  }
  return JSON.stringify(Object.entries(atoms).sort());
};
const cuAtomsBefore = atomsOf(cuEb.w);
cuEb.run(300);
const poles = cuEb.w.getElectrodePoles(cuEb.c);
const copper = cuEb.w.particles.filter(p => p.symbolOrId === 'Cu');
const chlorine = cuEb.w.particles.filter(p => p.symbolOrId === 'Cl2');
assert(cuEb.electrode.includes('copper_chloride_electrolysis') && copper.length === 2 && chlorine.length === 2, 'Copper chloride is electrolyzed at the electrodes: CuCl2 → Cu + Cl2');
assert(copper.every(p => Math.abs(p.x - poles.cathodeX) < Math.abs(p.x - poles.anodeX)), 'Copper appears at the cathode');
assert(cuEb.w.particles.filter(p => p.symbolOrId === 'Cl2').length === 2 && atomsOf(cuEb.w) === cuAtomsBefore, 'Electrode electrolysis conserves atoms');
assert(QUESTS_DATA.find(q => q.id === 'quest_ion_migration')!.checkCompletion(cuEb.e.stats), 'Electrolyzing copper chloride with electrodes completes Mission 20');
assert(cuEb.e.stats.triggeredReactions['copper_chloride_electrolysis'] >= 1, 'Electrode electrolysis is recorded in the reaction list');
// 電流を止めると、イオンは水の中に散らばる
const saltEb = electrodeBeaker([['NaCl', 1]], 18);
saltEb.w.toggleElectrodesAt(saltEb.c.cx, saltEb.c.cy - 40);
saltEb.run(100);
const saltIon = saltEb.added[0];
assert(saltIon.ionized && saltIon.ionDrift === 1, 'Salt ions reach the electrodes');
assert(saltEb.electrode.length === 0 && saltEb.w.particles.some(p => p.symbolOrId === 'NaCl'), 'A single salt particle is not split (brine electrolysis needs 2NaCl + 2H2O)');
saltEb.w.toggleElectrodesAt(saltEb.c.cx, saltEb.c.cy - 40);
saltEb.run(60);
assert(!saltEb.c.electrodes && saltIon.ionDrift === 0 && saltIon.ionPoles === null, 'Ions scatter back into the water when the electrodes are removed');
// 純水は電流がほとんど流れず、何も起きない
const pureEb = electrodeBeaker([], 18);
pureEb.w.toggleElectrodesAt(pureEb.c.cx, pureEb.c.cy - 40);
pureEb.run(200);
assert(!pureEb.c.electrodeCurrent && pureEb.electrode.length === 0 && !pureEb.w.particles.some(p => p.symbolOrId === 'H2'), 'Pure water with electrodes carries no current and is not electrolyzed');
// 水酸化ナトリウムを溶かした水: 陰極に水素、陽極に酸素
const naohEb = electrodeBeaker([['NaOH', 1]], 18);
const naohAtoms = atomsOf(naohEb.w);
naohEb.w.toggleElectrodesAt(naohEb.c.cx, naohEb.c.cy - 40);
naohEb.run(130);
assert(naohEb.electrode.includes('water_electrolysis'), 'Water with NaOH is electrolyzed at the electrodes');
const ebH2 = naohEb.w.particles.filter(p => p.symbolOrId === 'H2');
const o2 = naohEb.w.particles.filter(p => p.symbolOrId === 'O2');
assert(ebH2.length === 2 * o2.length && naohEb.w.particles.some(p => p.symbolOrId === 'NaOH'), 'Hydrogen and oxygen form in a 2 : 1 ratio and NaOH is not used up');
assert(atomsOf(naohEb.w) === naohAtoms, 'Water electrolysis at the electrodes conserves atoms');
assert(o2.every(p => p.x > naohEb.c.cx) || o2.some(p => p.vy < 0), 'Oxygen bubbles up from the anode side');
// 博士のセリフ
for (const [id, line] of Object.entries(ELECTRODE_LINES)) assert(englishOk(line.en), `Professor explains ${id} at the electrodes in English`);
for (const lang of ['ja', 'en'] as const) {
  assert(!!selectProfessorLine({ type: 'ionize', compoundId: 'CuCl2', molten: false }, lang)?.text.includes('Cu²⁺'), `Professor shows the ionization equation (${lang})`);
  assert(!!selectProfessorLine({ type: 'electrodesOn' }, lang), `Professor explains ion movement when the current is switched on (${lang})`);
}
assert(englishOk(selectProfessorLine({ type: 'ionize', compoundId: 'CH3COOH', molten: false }, 'en')?.text), 'The weak acid ionization line is in English');

console.log('\n=== Test: Law of Conservation of Mass ===');
// 化合物の粒の質量は原子量の合計なので、どの反応でも前後の質量がぴったり同じ
const massOfSide = (side: { type: 'element' | 'compound'; id: string; count: number }[]) =>
  side.reduce((m, s) => m + new Particle('mass_probe', s.type, s.id, 0, 0, 25).molarMass * s.count, 0);
const unbalanced = REACTIONS_DATA.filter(r => Math.abs(massOfSide(r.reactants) - massOfSide(r.products)) > 1e-9);
assert(unbalanced.length === 0, `Every reaction keeps the total mass exactly (${unbalanced.map(r => r.id).join(', ') || 'all balanced'})`);

function massCheckRun(type: 'beaker' | 'erlenmeyer' | 'testtube', lid: 'open' | 'sealed' | 'sealedThenOpen' | 'lidAfter', water = 0, onBalance = true) {
  const w = new PhysicsWorld(800, 600);
  const e = new ReactionEngine(w);
  const results: string[] = [];
  e.massCheck.onResult = (r) => {
    results.push(r);
    e.recordMassCheck(r);
  };
  const b = w.spawnBalance(400);
  const c = onBalance ? w.spawnFlask(b.leftPan.cx, b.leftPan.cy, type)! : w.spawnFlask(150, w.chamber.maxY, type)!;
  for (let f = 0; f < 30; f++) w.update();
  for (let i = 0; i < water; i++) w.addParticle(new Particle(`mc_w${i}`, 'compound', 'H2O', c.cx - 20 + (i % 4) * 12, c.cy - 12 - Math.floor(i / 4) * 11, 25));
  w.addParticle(new Particle('mc_ca', 'compound', 'CaCO3', c.cx, c.cy - 15, 25));
  if (lid === 'sealed' || lid === 'sealedThenOpen') w.setFlaskCap(c, true);
  for (let f = 0; f < 20; f++) w.update();
  w.addParticle(new Particle('mc_h1', 'compound', 'HCl', c.cx - 10, c.cy - 30, 25));
  w.addParticle(new Particle('mc_h2', 'compound', 'HCl', c.cx + 10, c.cy - 30, 25));
  const run = (frames: number) => { for (let f = 0; f < frames; f++) { e.checkReactions(); w.update(); } };
  run(20);
  if (lid === 'lidAfter') w.setFlaskCap(c, true);
  run(380);
  if (lid === 'sealedThenOpen') w.setFlaskCap(c, false);
  run(400);
  const co2Inside = w.particles.some(p => p.symbolOrId === 'CO2' && p.containerId === c.id);
  return { w, e, b, c, results, co2Inside, reacted: (e.stats.triggeredReactions['limestone_acid_reaction'] || 0) > 0 };
}
const openRun = massCheckRun('beaker', 'open');
assert(openRun.reacted && !openRun.co2Inside, 'In an open beaker the carbon dioxide bubbles out of the container');
assert(openRun.results.join() === 'open_lighter', 'An open beaker on the balance gets lighter');
const sealedRun = massCheckRun('beaker', 'sealed');
assert(sealedRun.reacted && sealedRun.co2Inside, 'In a sealed beaker the carbon dioxide stays inside');
assert(sealedRun.results.join() === 'sealed_same', 'A sealed beaker keeps the same mass');
const reopenRun = massCheckRun('beaker', 'sealedThenOpen');
assert(reopenRun.results.join() === 'sealed_same,open_lighter' && !reopenRun.co2Inside, 'Taking off the lid lets the gas out and the beaker gets lighter');
const mission21 = QUESTS_DATA.find(q => q.id === 'quest_mass_conservation')!;
assert(mission21.checkCompletion(reopenRun.e.stats), 'Seeing both results completes Mission 21');
assert(!mission21.checkCompletion(sealedRun.e.stats) && !mission21.checkCompletion(openRun.e.stats), 'Mission 21 needs both the sealed and the open result');
for (const type of ['erlenmeyer', 'testtube'] as const) {
  const r = massCheckRun(type, 'sealedThenOpen');
  assert(r.results.join() === 'sealed_same,open_lighter', `The ${type} also keeps its mass when sealed and gets lighter when opened`);
}
const wetRun = massCheckRun('beaker', 'open', 8);
assert(wetRun.reacted && wetRun.results.join() === 'open_lighter', 'The gas bubbles up through water and escapes');
const lateLid = massCheckRun('beaker', 'lidAfter');
assert(!lateLid.results.includes('sealed_same'), 'Putting the lid on after the reaction does not count as a sealed experiment');
const floorRun = massCheckRun('beaker', 'open', 0, false);
assert(floorRun.reacted && floorRun.results.length === 0, 'Only containers on a balance are weighed');
// 反応でできたのではない CO₂ は、空気より重いのでこれまでどおりビーカーにたまる (下方置換)
const pourWorld = new PhysicsWorld(800, 600);
const pourBeaker = pourWorld.spawnFlask(400, pourWorld.chamber.maxY, 'beaker')!;
for (let f = 0; f < 20; f++) pourWorld.update();
const pourCo2 = new Particle('pour_co2', 'compound', 'CO2', pourBeaker.cx, pourBeaker.cy - 20, 25);
pourWorld.addParticle(pourCo2);
for (let f = 0; f < 300; f++) pourWorld.update();
assert(pourCo2.containerId === pourBeaker.id, 'Carbon dioxide that is not bubbling stays at the bottom of an open beaker');
for (const [id, line] of Object.entries(MASS_CHECK_LINES)) assert(englishOk(line.en), `Professor explains the ${id} result in English`);

console.log('\n=== Test: Metal Ionization Tendency & Daniell Cell ===');
// 金属を、水に溶かした塩の水溶液に入れる (water = 0 なら水なし)
function metalInSolution(metal: string, salt: string, water: number, saltCount = 1) {
  const w = new PhysicsWorld(800, 600);
  const e = new ReactionEngine(w);
  const c = w.spawnFlask(400, w.chamber.maxY, 'beaker')!;
  for (let i = 0; i < water; i++) w.addParticle(new Particle(`ms_w${i}`, 'compound', 'H2O', 372 + (i % 6) * 11, c.cy - 12 - Math.floor(i / 6) * 11, 25));
  for (let i = 0; i < saltCount; i++) w.addParticle(new Particle(`ms_salt${i}`, 'compound', salt, 395 - i * 12, c.cy - 20, 25));
  w.addParticle(new Particle('ms_metal', 'element', metal, 405, c.cy - 20, 25));
  for (let f = 0; f < 400; f++) {
    e.checkReactions();
    w.update();
  }
  return { w, e };
}
const dryZn = metalInSolution('Zn', 'CuSO4', 0);
assert(!dryZn.e.stats.triggeredReactions['zinc_copper_sulfate'], 'Zinc does not react with dry copper sulfate crystals');
const wetZn = metalInSolution('Zn', 'CuSO4', 18);
assert((wetZn.e.stats.triggeredReactions['zinc_copper_sulfate'] || 0) === 1 && wetZn.w.particles.some(p => p.symbolOrId === 'Cu') && wetZn.w.particles.some(p => p.symbolOrId === 'ZnSO4'),
  'Zinc in copper sulfate solution: Zn + CuSO4 → ZnSO4 + Cu');
assert(!wetZn.e.stats.triggeredReactions['daniell_cell'], 'Zinc touching copper sulfate solution is not counted as a battery');
const cuInZn = metalInSolution('Cu', 'ZnSO4', 18);
assert(Object.keys(cuInZn.e.stats.triggeredReactions).length === 0 && cuInZn.w.particles.some(p => p.symbolOrId === 'Cu'), 'Copper in zinc sulfate solution does not change');
const mgInZn = metalInSolution('Mg', 'ZnSO4', 18);
assert((mgInZn.e.stats.triggeredReactions['magnesium_zinc_sulfate'] || 0) === 1 && mgInZn.w.particles.some(p => p.symbolOrId === 'Zn'), 'Magnesium in zinc sulfate solution: zinc comes out');
const znInMg = metalInSolution('Zn', 'MgSO4', 18);
assert(Object.keys(znInMg.e.stats.triggeredReactions).length === 0, 'Zinc in magnesium sulfate solution does not change');
for (const [metal, salt, rule, n] of [['Mg', 'CuSO4', 'magnesium_copper_sulfate', 1], ['Fe', 'CuSO4', 'iron_copper_sulfate', 1], ['Cu', 'AgNO3', 'copper_silver_nitrate', 2]] as const) {
  const r = metalInSolution(metal, salt, 18, n);
  assert((r.e.stats.triggeredReactions[rule] || 0) >= 1, `${metal} in ${salt} solution makes the less reactive metal come out (${rule})`);
}
const ag = metalInSolution('Ag', 'CuSO4', 18);
assert(Object.keys(ag.e.stats.triggeredReactions).length === 0, 'Silver in copper sulfate solution does not change');
const mission22 = QUESTS_DATA.find(q => q.id === 'quest_ionization_tendency')!;
const tendencyStats: GameStats = { ...wetZn.e.stats, triggeredReactions: { ...wetZn.e.stats.triggeredReactions, ...mgInZn.e.stats.triggeredReactions } };
assert(mission22.checkCompletion(tendencyStats) && !mission22.checkCompletion(wetZn.e.stats), 'Mission 22 needs both zinc → copper and magnesium → zinc');

// ダニエル電池: セロハンの左 (亜鉛板) と右 (銅板) に水溶液を入れる
function cellBeaker(left: string[], right: string[], onBalance = false) {
  const w = new PhysicsWorld(800, 600);
  const e = new ReactionEngine(w);
  const b = onBalance ? w.spawnBalance(400) : null;
  const c = b ? w.spawnFlask(b.leftPan.cx, b.leftPan.cy, 'beaker')! : w.spawnFlask(400, w.chamber.maxY, 'beaker')!;
  for (let f = 0; f < 30; f++) w.update();
  const on = w.toggleCellAt(c.cx, c.cy - 40);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) w.addParticle(new Particle(`cb_w${side}_${i}`, 'compound', 'H2O', c.cx + side * (12 + (i % 3) * 12), c.cy - 12 - Math.floor(i / 3) * 11, 25));
  }
  left.forEach((id, i) => w.addParticle(new Particle(`cb_l${i}`, 'compound', id, c.cx - 20 - i * 6, c.cy - 50, 25)));
  right.forEach((id, i) => w.addParticle(new Particle(`cb_r${i}`, 'compound', id, c.cx + 20 + i * 6, c.cy - 50, 25)));
  const events: string[] = [];
  w.onCellReaction = (res, kind, x, y) => {
    e.recordElectricResult(res, x, y);
    events.push(kind);
  };
  const seen = { current: false };
  const run = (frames: number) => {
    for (let f = 0; f < frames; f++) {
      e.checkReactions();
      w.update();
      if (c.cell?.current) seen.current = true;
    }
  };
  return { w, e, c, on, events, run, seen };
}
const cellErl = new PhysicsWorld(800, 600);
const cellFlask = cellErl.spawnFlask(400, cellErl.chamber.maxY, 'erlenmeyer')!;
assert(cellErl.toggleCellAt(cellFlask.cx, cellFlask.cy - 30) === 'not_beaker' && cellErl.toggleCellAt(100, 100) === null, 'The battery is made only in a beaker');

const daniell = cellBeaker(['ZnSO4'], ['CuSO4', 'CuSO4']);
assert(typeof daniell.on === 'object' && daniell.on !== null && daniell.on.on && daniell.c.cell?.zinc === CELL_ZINC_PLATE, 'Tapping a beaker in battery mode puts in the zinc and copper plates');
assert(daniell.c.segments.some(s => s.x1 === daniell.c.cx && s.x2 === daniell.c.cx), 'The cellophane divides the beaker');
const plateAtoms = () => {
  const atoms = JSON.parse(atomsOf(daniell.w)) as [string, number][];
  const map = Object.fromEntries(atoms);
  map['Zn'] = (map['Zn'] || 0) + (daniell.c.cell?.zinc ?? 0);
  return JSON.stringify(Object.entries(map).filter(([, n]) => n > 0).sort());
};
const daniellAtoms = plateAtoms();
daniell.run(60);
assert(daniell.seen.current, 'Current flows with zinc sulfate on the zinc side and copper sulfate on the copper side');
daniell.run(400);
const cellPlates = daniell.w.getCellPlates(daniell.c);
const cellCopper = daniell.w.particles.filter(p => p.symbolOrId === 'Cu');
assert(daniell.events.every(k => k === 'current') && cellCopper.length === 2, 'Both copper sulfate particles turn into copper');
assert(cellCopper.every(p => p.stuckToElectrode === daniell.c.id && Math.abs(p.x - cellPlates.copperX) < 16), 'Copper forms on the copper plate (+)');
assert(daniell.w.particles.filter(p => p.symbolOrId === 'ZnSO4' && p.x < cellPlates.divider).length === 3 && daniell.c.cell!.zinc === CELL_ZINC_PLATE - 2, 'Zinc dissolves from the zinc plate (−) as Zn²⁺');
assert(plateAtoms() === daniellAtoms, 'The Daniell cell conserves atoms (counting the zinc plate)');
assert(!daniell.c.cell!.current, 'Current stops when the copper sulfate is used up');
assert((daniell.e.stats.triggeredReactions['daniell_cell'] || 0) === 2 && !daniell.e.stats.triggeredReactions['zinc_copper_sulfate'], 'The battery reaction is recorded');
assert(QUESTS_DATA.find(q => q.id === 'quest_daniell_cell')!.checkCompletion(daniell.e.stats), 'Running the Daniell cell completes Mission 23');
const noCopper = cellBeaker(['ZnSO4'], []);
noCopper.run(300);
assert(!noCopper.seen.current && noCopper.events.length === 0, 'No current without copper sulfate on the copper side');
const pureLeft = cellBeaker([], ['CuSO4']);
pureLeft.run(300);
assert(!pureLeft.seen.current && pureLeft.events.length === 0, 'No current without an electrolyte on the zinc side');
const swapped = cellBeaker(['CuSO4'], ['ZnSO4']);
swapped.run(300);
assert(swapped.events.join() === 'direct' && !swapped.seen.current && !swapped.e.stats.triggeredReactions['daniell_cell'], 'Copper sulfate on the zinc side plates copper straight onto the zinc, with no current');
assert(swapped.w.particles.some(p => p.symbolOrId === 'Cu' && p.x < swapped.c.cx), 'That copper is on the zinc plate');
// 天秤にのせても、電池の反応の前後で質量は変わらない (亜鉛板の亜鉛が硫酸亜鉛になるだけ)
const balCell = cellBeaker(['ZnSO4'], ['CuSO4'], true);
const cellMass = () => balCell.w.containerTareMass(balCell.c) + balCell.w.particles.reduce((m, p) => m + p.molarMass, 0);
const cellMassBefore = cellMass();
balCell.run(300);
assert(balCell.events.length === 1 && Math.abs(cellMass() - cellMassBefore) < 1e-9, 'The Daniell cell keeps its total mass');
// 電極と電池は同じビーカーに同時に入れない
balCell.w.toggleElectrodesAt(balCell.c.cx, balCell.c.cy - 40);
assert(balCell.c.electrodes && balCell.c.cell === null && !balCell.c.segments.some(s => s.x1 === balCell.c.cx && s.x2 === balCell.c.cx), 'Connecting electrodes removes the battery plates');
balCell.w.toggleCellAt(balCell.c.cx, balCell.c.cy - 40);
assert(!balCell.c.electrodes && balCell.c.cell !== null, 'Making a battery removes the electrodes');
for (const id of ['zinc_copper_sulfate', 'magnesium_copper_sulfate', 'magnesium_zinc_sulfate', 'iron_copper_sulfate', 'copper_silver_nitrate', 'daniell_cell']) {
  assert(englishOk(REACTION_LINES[id]?.en), `Professor explains ${id} in English`);
}
for (const lang of ['ja', 'en'] as const) assert(!!selectProfessorLine({ type: 'cellOn' }, lang), `Professor explains the Daniell cell setup (${lang})`);

console.log('\n=== Test: The biggest atoms fit through the mouth of the flask and the test tube ===');
// 半径がいちばん大きい原子 (Fr) を口の真上から落とすと、口に詰まらず底のほうまで入る
for (const [type, height] of [['erlenmeyer', ERLENMEYER.height], ['testtube', TESTTUBE.height]] as const) {
  const mouthWorld = new PhysicsWorld(800, 600);
  const vessel = mouthWorld.spawnFlask(400, mouthWorld.chamber.maxY, type)!;
  const fr = new Particle(`fr_${type}`, 'element', 'Fr', vessel.cx, vessel.cy - height - 40, 25);
  assert(fr.radius === 26, 'Fr is drawn at the largest atom size');
  mouthWorld.addParticle(fr);
  for (let f = 0; f < 180; f++) mouthWorld.update();
  assert(fr.y > vessel.cy - height / 2, `Fr must drop into the ${type} instead of sticking in its mouth (y=${fr.y.toFixed(1)}, bottom=${vessel.cy})`);
}

console.log('\n=== Test: Clear Menu Targets ===');
// 元素・化合物・壁・フラスコ (中に水素)・天秤を置いた実験室を作る
const clearLab = () => {
  const w = new PhysicsWorld(800, 600);
  w.addParticle(new Particle('cl_h', 'element', 'H', 200, 200, 25));
  w.addParticle(new Particle('cl_w', 'compound', 'H2O', 240, 200, 25));
  w.addParticle(new Particle('cl_wall1', 'wall', 'wall', 100, 300, 25));
  w.addParticle(new Particle('cl_wall2', 'wall', 'wall', 124, 300, 25));
  const flask = w.spawnFlask(600, w.chamber.maxY, 'erlenmeyer')!;
  const inside = new Particle('cl_in', 'element', 'H', flask.cx, flask.cy - 20, 25);
  inside.containerId = flask.id;
  w.addParticle(inside);
  const bal = w.spawnBalance(380)!;
  return { w, flask, inside, bal };
};
const kinds = (w: PhysicsWorld) => w.particles.map(p => p.kind).sort().join(',');
const chem = clearLab();
assert(chem.w.clearTargets('chemicals') === 3 && kinds(chem.w) === 'wall,wall' && chem.w.containers.length === 1 && chem.w.balances.length === 1, 'Clearing chemicals keeps walls, glassware and balances');
const walls = clearLab();
assert(walls.w.clearTargets('walls') === 2 && kinds(walls.w) === 'compound,element,element' && walls.w.containers.length === 1 && walls.w.balances.length === 1, 'Clearing walls keeps everything else');
const app = clearLab();
assert(app.w.clearTargets('apparatus') === 2 && app.w.containers.length === 0 && app.w.balances.length === 0 && app.w.particles.length === 5, 'Clearing apparatus removes glassware and balances only');
assert(app.inside.containerId === null, 'Particles that were inside a flask are let out when the flask is cleared');
const everything = clearLab();
assert(everything.w.clearTargets('all') === 7 && everything.w.particles.length === 0 && everything.w.containers.length === 0 && everything.w.balances.length === 0, 'Clearing everything empties the lab');
assert(everything.w.clearTargets('walls') === 0 && everything.w.clearTargets('apparatus') === 0, 'Clearing an empty lab clears nothing');

console.log('\n=== Test: Eraser Sizes ===');
assert(testToolbar.eraserSize === 'medium' && ERASER_RADIUS.medium === 35, 'The eraser starts at the old size (medium, 35px)');
assert(ERASER_SIZES.filter(eraserErasesGlassware).join() === 'medium,large', 'Only medium and large erase glassware and balances');
// 1つずつ: くっついた水素のうち、指の下の1つだけを消す
const eraseWorld = new PhysicsWorld(800, 600);
const hs = [0, 1, 2].map(i => new Particle(`er_h${i}`, 'element', 'H', 300 + i * 12, 300, 25));
hs.forEach(p => eraseWorld.addParticle(p));
assert(eraseWorld.eraseOneAt(312, 300) === 1 && eraseWorld.particles.length === 2 && !eraseWorld.particles.includes(hs[1]), 'Erasing one removes only the particle under the pointer');
assert(eraseWorld.eraseOneAt(500, 500) === 0 && eraseWorld.particles.length === 2, 'Erasing one in empty space removes nothing');
// 小 (粒子だけ): フラスコの中の水素を消しても、フラスコは残る
const eraseFlask = eraseWorld.spawnFlask(600, eraseWorld.chamber.maxY, 'erlenmeyer')!;
const hInFlask = new Particle('er_hf', 'element', 'H', eraseFlask.cx, eraseFlask.cy - 20, 25);
eraseWorld.addParticle(hInFlask);
assert(eraseWorld.eraseAt(hInFlask.x, hInFlask.y, ERASER_RADIUS.small, { particlesOnly: true }) === 1 && eraseWorld.containers.includes(eraseFlask), 'A small eraser removes the hydrogen but keeps the flask');
// 天秤の皿の上の粒子を消しても、天秤は残る
const eraseBal = eraseWorld.spawnBalance(250)!;
const hOnPan = new Particle('er_hp', 'element', 'H', eraseBal.leftPan.cx, eraseBal.leftPan.cy - 10, 25);
eraseWorld.addParticle(hOnPan);
eraseWorld.eraseAt(hOnPan.x, hOnPan.y, ERASER_RADIUS.small, { particlesOnly: true });
assert(!eraseWorld.particles.includes(hOnPan) && eraseWorld.balances.includes(eraseBal), 'A small eraser keeps the balance');
assert(eraseWorld.eraseOneAt(eraseBal.cx, eraseBal.cy - 60) === 0 && eraseWorld.balances.includes(eraseBal), 'Erasing one never removes a balance');
// 中 (今までどおり): フラスコも消える
eraseWorld.eraseAt(eraseFlask.cx, eraseFlask.cy - 20, ERASER_RADIUS.medium);
assert(!eraseWorld.containers.includes(eraseFlask), 'A medium eraser still removes glassware');

console.log('\n=== Test: Temperature Graph ===');
function graphRun(start: number, action: 'heat' | 'cool', frames: number) {
  const w = new PhysicsWorld(800, 600);
  const c = w.spawnFlask(400, w.chamber.maxY, 'beaker')!;
  const ps: Particle[] = [];
  for (let i = 0; i < 6; i++) {
    const p = new Particle(`tg_w${i}`, 'compound', 'H2O', 380 + i * 8, c.cy - 15, start);
    w.addParticle(p);
    ps.push(p);
  }
  const log = new TemperatureLog();
  const seen: string[] = [];
  log.onPlateau = (pl) => seen.push(`${pl.change}@${pl.temperature}`);
  const target = ps[2];
  log.start(target);
  for (let f = 0; f < frames; f++) {
    if (f % 4 === 0) {
      if (action === 'heat') w.applyHeat(target.x, target.y + 10, 40, 25);
      else w.applyCool(target.x, target.y + 10, 40, 25);
    }
    w.update();
    log.update(w);
  }
  return { w, log, seen, target };
}
const iceRun = graphRun(-20, 'heat', 200);
assert(iceRun.seen.join() === 'melting@0,boiling@100', `Heating ice shows flat parts at 0°C (melting) and 100°C (boiling) (${iceRun.seen.join()})`);
const meltSamples = iceRun.log.samples.filter(s => s.change === 'melting');
const boilSamples = iceRun.log.samples.filter(s => s.change === 'boiling');
assert(meltSamples.length >= 3 && meltSamples.every(s => s.temperature === 0), 'The graph stays exactly at 0°C while the ice melts');
assert(boilSamples.length > meltSamples.length && boilSamples.every(s => s.temperature === 100), 'The graph stays exactly at 100°C while the water boils, longer than melting');
assert(iceRun.log.samples[iceRun.log.samples.length - 1].state === 'gas' && iceRun.log.samples[0].state === 'solid', 'The graph records the states from solid to gas');
assert(iceRun.log.samples.every((s, i, arr) => i === 0 || s.frame - arr[i - 1].frame === TEMPERATURE_SAMPLE_INTERVAL), 'Samples are taken at a fixed interval');
const coolRun = graphRun(60, 'cool', 300);
assert(coolRun.seen.includes('freezing@0'), `Cooling water shows a flat part at 0°C while it freezes (${coolRun.seen.join()})`);
// 状態変化の途中は、画面に出す温度が融点・沸点ちょうど
const boilingProbe = new Particle('tg_probe', 'compound', 'H2O', 0, 0, 99);
boilingProbe.temperature = 104;
boilingProbe.updateStateByTemperature();
assert(boilingProbe.phaseChange === 'boiling' && boilingProbe.displayTemperature === 100, 'A boiling particle shows its boiling point');
boilingProbe.temperature = 101.5;
assert(boilingProbe.displayTemperature === 100, 'Small overshoots during boiling are not shown on the graph');
// 粒がなくなったら記録を止める
const goneRun = graphRun(25, 'heat', 10);
goneRun.w.removeParticle(goneRun.target);
const goneCount = goneRun.log.samples.length;
goneRun.w.update();
goneRun.log.update(goneRun.w);
for (let f = 0; f < 20; f++) goneRun.log.update(goneRun.w);
assert(goneRun.log.vanished && goneRun.log.samples.length === goneCount && !goneRun.log.isTracking(goneRun.target), 'Recording stops when the particle is gone');
// 長く記録しても、おぼえておく点の数は決まっている
const longLog = new TemperatureLog();
const longWorld = new PhysicsWorld(800, 600);
const longP = new Particle('tg_long', 'element', 'Fe', 400, 300, 25);
longWorld.addParticle(longP);
longLog.start(longP);
for (let f = 0; f < TEMPERATURE_SAMPLE_INTERVAL * (TEMPERATURE_MAX_SAMPLES + 50); f++) longLog.update(longWorld);
assert(longLog.samples.length === TEMPERATURE_MAX_SAMPLES, 'The graph keeps a fixed number of samples');
// ミッション24・記録・博士のセリフ
const tgEngine = new ReactionEngine(new PhysicsWorld(800, 600));
const mission24 = QUESTS_DATA.find(q => q.id === 'quest_temperature_graph')!;
assert(tgEngine.recordTemperaturePlateau('H2O', 'boiling') && !tgEngine.recordTemperaturePlateau('H2O', 'boiling'), 'A plateau is new only the first time');
assert(!mission24.checkCompletion(tgEngine.stats), 'Mission 24 needs both melting and boiling');
tgEngine.recordTemperaturePlateau('H2O', 'melting');
assert(mission24.checkCompletion(tgEngine.stats), 'Seeing ice melt and water boil on the graph completes Mission 24');
for (const change of ['melting', 'boiling', 'freezing', 'condensing', 'sublimating', 'depositing'] as const) {
  const en = selectProfessorLine({ type: 'temperaturePlateau', substanceId: 'H2O', change, temperature: 100 }, 'en')?.text;
  const ja = selectProfessorLine({ type: 'temperaturePlateau', substanceId: 'H2O', change, temperature: 100 }, 'ja')?.text;
  assert(englishOk(en) && !!ja && ja.includes('100℃'), `Professor explains the ${change} plateau in Japanese and English`);
}
assert(!!selectProfessorLine({ type: 'temperaturePlateau', substanceId: 'H2O', change: 'melting', temperature: 0 }, 'ja')?.text.startsWith('氷がとけている'), 'Melting water is called ice');

console.log('\n=== Test: High School Periodic Table Data ===');
const allEls = Object.values(ELEMENTS_DATA);
assert(Object.keys(ELEMENT_PROPERTIES).length === 118 && allEls.every(el => ELEMENT_PROPERTIES[el.symbol]), 'Every element has high school data');
for (const el of allEls) {
  const pr = ELEMENT_PROPERTIES[el.symbol];
  if (pr.shells.reduce((a, b) => a + b, 0) !== el.number) assert(false, `${el.symbol}: the shells hold as many electrons as the atomic number`);
  if (pr.shells.some((n, i) => n > 2 * (i + 1) ** 2)) assert(false, `${el.symbol}: no shell holds more than 2n² electrons`);
  if (pr.shells.length !== el.period) assert(false, `${el.symbol}: the number of shells equals the period`);
}
assert(shellNotation('Na') === 'K2 L8 M1' && shellNotation('Cl') === 'K2 L8 M7' && shellNotation('K') === 'K2 L8 M8 N1' && shellNotation('Ca') === 'K2 L8 M8 N2', 'Textbook electron configurations (Na, Cl, K, Ca)');
const elOf = (sym: string) => ELEMENTS_DATA[sym];
assert(valenceElectrons(elOf('H')) === 1 && valenceElectrons(elOf('C')) === 4 && valenceElectrons(elOf('Cl')) === 7 && valenceElectrons(elOf('Mg')) === 2 && valenceElectrons(elOf('Al')) === 3, 'Valence electrons of main-group elements match the group');
assert(valenceElectrons(elOf('He')) === 0 && valenceElectrons(elOf('Ne')) === 0 && valenceElectrons(elOf('Ar')) === 0 && outermostElectrons('He') === 2 && outermostElectrons('Ar') === 8, 'Noble gases have 0 valence electrons (2 or 8 outermost electrons)');
assert(valenceElectrons(elOf('Fe')) === null && valenceElectrons(elOf('Cu')) === null && valenceElectrons(elOf('La')) === null && valenceElectrons(elOf('Zn')) === 2, 'Transition elements have no fixed valence count (group 12 is main-group)');
for (const el of allEls) {
  const v = valenceElectrons(el);
  if (v !== null && el.group >= 13 && el.group <= 17 && el.number < 113 && v !== el.group - 10) assert(false, `${el.symbol}: valence electrons = last digit of the group`);
}
const withValue = (key: 'electronegativity' | 'ionizationEnergy' | 'density') => allEls.filter(el => ELEMENT_PROPERTIES[el.symbol][key] !== null);
const maxBy = (list: typeof allEls, f: (el: typeof allEls[number]) => number) => list.reduce((a, b) => (f(b) > f(a) ? b : a));
const minBy = (list: typeof allEls, f: (el: typeof allEls[number]) => number) => list.reduce((a, b) => (f(b) < f(a) ? b : a));
const en = (el: typeof allEls[number]) => ELEMENT_PROPERTIES[el.symbol].electronegativity!;
const ie = (el: typeof allEls[number]) => ELEMENT_PROPERTIES[el.symbol].ionizationEnergy!;
const rho = (el: typeof allEls[number]) => ELEMENT_PROPERTIES[el.symbol].density!;
assert(maxBy(withValue('electronegativity'), en).symbol === 'F' && en(elOf('F')) === 3.98 && en(elOf('O')) === 3.44 && en(elOf('Cl')) === 3.16, 'Fluorine has the largest electronegativity (Pauling values)');
assert(maxBy(withValue('ionizationEnergy'), ie).symbol === 'He' && minBy(withValue('ionizationEnergy'), ie).symbol === 'Cs', 'Helium has the largest and caesium the smallest first ionization energy');
assert(ie(elOf('H')) === 1312 && ie(elOf('Na')) === 496 && ie(elOf('Ne')) === 2081, 'Ionization energies are in kJ/mol');
assert(['Li', 'Na', 'K', 'Rb', 'Cs'].every((s2, i, arr) => i === 0 || ie(elOf(s2)) < ie(elOf(arr[i - 1]))), 'Ionization energy falls down group 1');
assert(ie(elOf('Ne')) > ie(elOf('F')) && ie(elOf('F')) > ie(elOf('C')) && ie(elOf('C')) > ie(elOf('Li')) && ie(elOf('B')) < ie(elOf('Be')) && ie(elOf('O')) < ie(elOf('N')), 'Ionization energy rises across period 2 (with the B and O dips)');
assert(['Os', 'Ir'].includes(maxBy(withValue('density'), rho).symbol) && rho(elOf('Fe')) === 7.87 && rho(elOf('H')) < 0.001, 'Osmium/iridium are the densest; hydrogen gas is very light');
assert(ELEMENT_PROPERTIES['Og'].predicted && !ELEMENT_PROPERTIES['Fe'].predicted && ELEMENT_PROPERTIES['Og'].ionizationEnergy === null, 'Superheavy elements are marked as predicted and have no measured values');
for (const mode of TREND_MODES.filter(m => m !== 'category')) {
  const range = trendRange(allEls, mode)!;
  assert(range && range.max > range.min, `The ${mode} color scale has a range`);
  const positions = allEls.map(el => trendValue(el, mode)).filter((v): v is number => v !== null).map(v => trendPosition(v, range, mode));
  assert(positions.every(p => p >= 0 && p <= 1) && positions.some(p => p === 0) && positions.some(p => p === 1), `${mode} colors span the whole scale`);
}
assert(trendColor(0) === 'rgb(30, 58, 138)' && trendColor(1) === 'rgb(253, 224, 71)', 'The color scale runs from dark blue to yellow');
const ptEngine = new ReactionEngine(new PhysicsWorld(800, 600));
const mission25 = QUESTS_DATA.find(q => q.id === 'quest_periodic_trends')!;
assert(ptEngine.recordPeriodicTrend('electronegativity') && !mission25.checkCompletion(ptEngine.stats), 'Mission 25 needs both electronegativity and ionization energy');
ptEngine.recordPeriodicTrend('ionizationEnergy');
assert(mission25.checkCompletion(ptEngine.stats), 'Viewing both trends completes Mission 25');
for (const lang of ['ja', 'en'] as const) {
  const ptr = TRANSLATIONS[lang].periodicTable;
  for (const mode of TREND_MODES) assert(!!ptr.trendModes[mode], `Trend mode ${mode} has a ${lang} label`);
}
for (const mode of TREND_MODES.filter(m => m !== 'category')) assert(englishOk(TRANSLATIONS.en.periodicTable.trendNotes[mode]), `The ${mode} note is in English`);

console.log('\n=== Test: Neutralization Titration ===');
const tset = (analyte: typeof TITRATION_ANALYTES[number], concentration = 0.1) => ({ analyte, concentration });
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
// 25℃、0.100 mol/L の教科書の値
assert(near(titrationPh(tset('HCl'), 0), 1.0, 0.01) && near(titrationPh(tset('NaOH'), 0), 13.0, 0.01), '0.100 mol/L HCl is pH 1 and NaOH is pH 13');
assert(near(titrationPh(tset('CH3COOH'), 0), 2.88, 0.02) && near(titrationPh(tset('NH3'), 0), 11.12, 0.02), '0.100 mol/L acetic acid is about pH 2.9 and ammonia about pH 11.1');
assert(near(titrationPh(tset('CH3COOH'), 5), 4.74, 0.02) && near(titrationPh(tset('NH3'), 5), 9.26, 0.02), 'At half-neutralization pH = pKa (buffer region)');
assert(near(equivalencePh(tset('HCl')), 7, 0.01) && near(equivalencePh(tset('CH3COOH')), 8.72, 0.03) && near(equivalencePh(tset('NH3')), 5.28, 0.03), 'Equivalence point: neutral, basic (CH3COONa) and acidic (NH4Cl)');
assert(near(titrationPh(tset('HCl'), 9.9), 3.3, 0.02) && near(titrationPh(tset('HCl'), 10.1), 10.7, 0.02), 'Strong acid–strong base has a large pH jump (3.3 → 10.7 within ±0.1 mL)');
assert(near(titrationPh(tset('HCl'), 20), 12.52, 0.02), 'Excess NaOH sets the pH after the equivalence point');
for (const a of TITRATION_ANALYTES) {
  let last = titrationPh(tset(a), 0);
  for (let v = 0.25; v <= BURETTE_CAPACITY; v += 0.25) {
    const ph = titrationPh(tset(a), v);
    assert(a === 'HCl' || a === 'CH3COOH' ? ph > last : ph < last, `${a}: pH changes in one direction as titrant is added`);
    last = ph;
  }
}
assert(equivalenceVolume(tset('HCl')) === 10 && near(equivalenceVolume(tset('NH3', 0.125)), 12.5, 1e-9), 'c × V = c\' × V\' gives the equivalence volume');
for (const c of MYSTERY_CONCENTRATIONS) assert(equivalenceVolume(tset('HCl', c)) > 5 && equivalenceVolume(tset('HCl', c)) < BURETTE_CAPACITY, `Mystery concentration ${c} fits in the burette`);
// 指示薬の向き・不向き: 終点と中和点のずれ
const offBy = (a: typeof TITRATION_ANALYTES[number], i: typeof TITRATION_INDICATORS[number]) => endpointVolume(tset(a), i) - equivalenceVolume(tset(a));
for (const i of TITRATION_INDICATORS) {
  assert(Math.abs(offBy('HCl', i)) < ENDPOINT_TOLERANCE && Math.abs(offBy('NaOH', i)) < ENDPOINT_TOLERANCE, `${i} works for strong acid–strong base`);
}
assert(Math.abs(offBy('CH3COOH', 'Phenolphthalein')) < ENDPOINT_TOLERANCE && offBy('CH3COOH', 'MethylOrange') < -5, 'Acetic acid needs phenolphthalein; methyl orange changes far too early');
assert(Math.abs(offBy('NH3', 'MethylOrange')) < ENDPOINT_TOLERANCE && offBy('NH3', 'Phenolphthalein') < -2, 'Ammonia needs methyl orange; phenolphthalein changes far too early');
assert(judgeEndpoint(tset('HCl'), 10.05) === 'good' && judgeEndpoint(tset('HCl'), 9) === 'early' && judgeEndpoint(tset('HCl'), 15) === 'late', 'End points are judged against the equivalence point');
assert(indicatorColor('MethylOrange', 1) === '#dc2626' || indicatorColor('MethylOrange', 1).toUpperCase() === '#DC2626', 'Methyl orange is red in strong acid');
assert(indicatorColor('MethylOrange', 7).toUpperCase() === '#FBBF24' && indicatorColor('Phenolphthalein', 12).toUpperCase() === '#DB2777', 'Methyl orange is yellow above pH 4.4; phenolphthalein is red in base');
// 実験室のメチルオレンジ (指示薬の目安の pH で色が変わる)
assert(indicatorAfter('MethylOrange', [['HCl', 1]]).color.toUpperCase() === '#DC2626', 'Methyl orange turns red with hydrochloric acid in the lab');
assert(indicatorAfter('MethylOrange', [['NaOH', 1]]).color.toUpperCase() === '#FBBF24' && indicatorAfter('MethylOrange', []).color.toUpperCase() === '#FBBF24', 'Methyl orange stays yellow in neutral and basic solutions');
assert(COMPOUND_CATEGORY_LIST.find(c => c.id === 'indicator')!.compoundIds.includes('MethylOrange') && isStarterCompound(COMPOUNDS_DATA['MethylOrange']), 'Methyl orange is in the indicator palette from the start');
const tiEngine = new ReactionEngine(new PhysicsWorld(800, 600));
const mission26 = QUESTS_DATA.find(q => q.id === 'quest_titration')!;
assert(tiEngine.recordTitration('CH3COOH', 'Phenolphthalein') && !mission26.checkCompletion(tiEngine.stats), 'Mission 26 needs both titrations');
tiEngine.recordTitration('NH3', 'MethylOrange');
assert(mission26.checkCompletion(tiEngine.stats), 'Acetic acid with phenolphthalein and ammonia with methyl orange complete Mission 26');
for (const lang of ['ja', 'en'] as const) {
  const ttr = TRANSLATIONS[lang].titration;
  for (const a of TITRATION_ANALYTES) assert(!!ttr.analytes[a] && !!ttr.strength[a], `Analyte ${a} has a ${lang} label`);
  for (const i of TITRATION_INDICATORS) assert(!!ttr.indicators[i], `Indicator ${i} has a ${lang} label`);
}
assert(englishOk(TRANSLATIONS.en.titration.verdictEarly('10.00', '8.7')) && englishOk(TRANSLATIONS.en.titration.subtitle), 'Titration texts are in English');

console.log('\n=== Test: Limewater Clears with Excess CO2 ===');
const lwWorld = new PhysicsWorld(800, 600);
const lwEngine = new ReactionEngine(lwWorld);
const lwRun = (items: [string, number, number, number][]) => {
  lwWorld.clear();
  items.forEach(([id, x, y, temp], i) => lwWorld.addParticle(new Particle(`lw${i}`, 'compound', id, x, y, temp)));
  lwEngine.checkReactions();
  const count = (id: string) => lwWorld.particles.filter(p => p.symbolOrId === id).length;
  return count;
};
let lwCount = lwRun([['CaCO3', 300, 300, 25], ['CO2', 304, 300, 25], ['H2O', 300, 305, 25]]);
assert(lwCount('CaHCO32') === 1 && lwCount('CaCO3') === 0, 'CaCO3 + CO2 + H2O → Ca(HCO3)2 (the milky limewater turns clear)');
lwCount = lwRun([['CaCO3', 300, 300, 25], ['CO2', 304, 300, 25]]);
assert(lwCount('CaHCO32') === 0, 'Without water, calcium carbonate does not dissolve');
lwCount = lwRun([['CaCO3', 300, 300, 25], ['CO2', 304, 300, 25], ['H2O', 300, 305, 25], ['CaOH2', 296, 300, 25]]);
assert(lwCount('CaHCO32') === 0 && lwCount('CaCO3') === 2, 'While limewater is left, CO2 reacts with Ca(OH)2 first');
lwCount = lwRun([['CaCO3', 300, 300, 25], ['CO2', 304, 300, 25], ['H2O', 300, 305, 25], ['HCl', 296, 304, 25]]);
assert(lwCount('CaHCO32') === 0, 'With acid nearby, calcium carbonate reacts with the acid instead');
lwCount = lwRun([['CaCO3', 300, 300, 75], ['CO2', 304, 300, 75], ['H2O', 300, 305, 75]]);
assert(lwCount('CaHCO32') === 0, 'Hot water does not dissolve calcium carbonate this way');
lwCount = lwRun([['CaHCO32', 300, 300, 90]]);
assert(lwCount('CaHCO32') === 0 && lwCount('CaCO3') === 1 && lwCount('CO2') === 1 && lwCount('H2O') === 1, 'Heating Ca(HCO3)2 turns it milky again (CaCO3 + CO2 + H2O)');
lwCount = lwRun([['CaHCO32', 300, 300, 40]]);
assert(lwCount('CaHCO32') === 1, 'Ca(HCO3)2 stays dissolved when not heated');
const lwRule = REACTIONS_DATA.find(r => r.id === 'limewater_excess_co2')!;
const lwMass = (list: { id: string; count: number }[]) => list.reduce((t, x) => t + COMPOUNDS_DATA[x.id].molarMass * x.count, 0);
assert(Math.abs(lwMass(lwRule.reactants) - lwMass(lwRule.products)) < 0.05, 'The clearing reaction keeps mass (CaCO3 + CO2 + H2O = Ca(HCO3)2)');
assert(ionEquationProducts(ION_FORMS['CaHCO32']) === 'Ca²⁺ + 2HCO₃⁻', 'Ca(HCO3)2 splits into Ca²⁺ and 2HCO₃⁻');
assert(ELECTROLYTES.includes('CaHCO32'), 'Calcium hydrogen carbonate solution conducts electricity');
const lwStats = lwEngine.stats;
const mission27 = QUESTS_DATA.find(q => q.id === 'quest_limewater_clears')!;
assert(mission27.checkCompletion(lwStats), 'Clearing and re-clouding the limewater completes Mission 27');
const freshLw = new ReactionEngine(new PhysicsWorld(800, 600));
assert(!mission27.checkCompletion(freshLw.stats), 'Mission 27 is not complete before the reactions');

console.log('\n=== Test: Gas Laws, Equilibrium and Reaction Rate ===');
// 気体の法則
assert(Math.abs(airPressure(25, 25) - ATMOSPHERIC_PRESSURE) < 1e-9, 'Sealed air starts at atmospheric pressure');
assert(Math.abs(airPressure(323, 25) / ATMOSPHERIC_PRESSURE - 596.15 / 298.15) < 1e-9, 'At constant volume, pressure is proportional to absolute temperature');
assert(Math.abs(particlePressure([25], 250) - 9.91) < 0.02, 'One gas particle (1 mmol) in 250 mL at 25°C adds about 9.9 kPa (PV = nRT)');
assert(Math.abs(particlePressure([25, 25], 250) - 2 * particlePressure([25], 250)) < 1e-9 && Math.abs(particlePressure([25], 50) - 5 * particlePressure([25], 250)) < 1e-9, 'Pressure is proportional to the amount of gas and inversely proportional to volume');
assert(Math.abs(sealedPressure(25, 25, [25], 250) - (ATMOSPHERIC_PRESSURE + particlePressure([25], 250))) < 1e-9, 'Partial pressures add up (Dalton\'s law)');
const gw = new PhysicsWorld(800, 600);
const gEngine = new ReactionEngine(gw);
const gFlask = gw.spawnFlask(400, gw.chamber.maxY, 'erlenmeyer')!;
for (let f = 0; f < 30; f++) gw.update();
assert(gFlask.pressure === 101.3, 'An open flask is at atmospheric pressure');
for (let i = 0; i < 5; i++) gw.addParticle(new Particle(`gp${i}`, 'compound', 'CO2', gFlask.cx - 20 + i * 10, gFlask.cy - 40, 25));
gw.setFlaskCap(gFlask, true);
for (let f = 0; f < 30; f++) gw.update();
gw.updatePressures();
const p25 = gFlask.pressure;
assert(p25 > 101.3 && p25 < 160, `Sealing gas in raises the pressure (${p25.toFixed(0)} kPa)`);
gFlask.temperature = 200;
gw.particles.filter(p => p.containerId === gFlask.id).forEach(p => { p.temperature = 200; });
gw.updatePressures();
assert(gFlask.pressure > p25 * 1.5, 'Heating a sealed flask raises its pressure');
const gasMission = QUESTS_DATA.find(q => q.id === 'quest_gas_law')!;
assert(!gasMission.checkCompletion(gEngine.stats), 'Mission 28 is not complete at first');
gEngine.recordSealedPressure(gFlask.pressure);
assert(gasMission.checkCompletion(gEngine.stats), 'Reaching 150 kPa in a sealed container completes Mission 28');
gw.setFlaskCap(gFlask, false);
gw.updatePressures();
assert(gFlask.pressure === 101.3, 'Opening the flask brings it back to atmospheric pressure');
// 反応速度と化学平衡 (H₂ + I₂ ⇄ 2HI)
assert(Math.abs(equilibriumConstant(425) - 54) < 3, `K is about 54 at 425°C (${equilibriumConstant(425).toFixed(1)})`);
assert(equilibriumConstant(500) < equilibriumConstant(400), 'The reaction is exothermic, so K falls as temperature rises');
const kRatio = forwardRateConstant(425) / forwardRateConstant(400);
assert(kRatio > 2 && kRatio < 4, 'Raising the temperature by 25°C makes the reaction about 3 times faster');
const eqFromReactants = equilibriumState(initialState('reactants', 0.05), 425);
assert(Math.abs(eqFromReactants.hi / 0.1 - 0.785) < 0.01, 'Starting from 1:1 H2 and I2, about 78% becomes HI at 425°C');
let simState = initialState('reactants', 0.05);
for (let i = 0; i < 7200; i++) simState = stepEquilibrium(simState, 425, 1);
assert(Math.abs(simState.hi - eqFromReactants.hi) < 0.0005 && isAtEquilibrium(simState, 425), 'The rate law simulation reaches the equilibrium concentrations');
let fromHi = initialState('product', 0.05);
for (let i = 0; i < 7200; i++) fromHi = stepEquilibrium(fromHi, 425, 1);
assert(Math.abs(fromHi.hi - simState.hi) < 0.0005, 'Starting from HI reaches the same equilibrium');
assert(Math.abs(forwardRate(simState, 425) - reverseRate(simState, 425)) < forwardRate(simState, 425) * 0.01, 'At equilibrium v1 = v2');
assert(Math.abs(simState.h2 + simState.i2 + simState.hi - 0.1) < 1e-9 && Math.abs(totalPressure(simState, 425) - totalPressure(initialState('reactants', 0.05), 425)) < 1e-6, 'Gas moles (and pressure) stay constant: 1 + 1 = 2');
let early = initialState('reactants', 0.05);
for (let i = 0; i < 60; i++) early = stepEquilibrium(early, 425, 1);
let earlyDilute = initialState('reactants', 0.02);
for (let i = 0; i < 60; i++) earlyDilute = stepEquilibrium(earlyDilute, 425, 1);
assert(0.05 - early.h2 > 0.02 - earlyDilute.h2, 'Higher concentration makes the reaction go faster');
let shifted = simState;
for (let i = 0; i < 7200; i++) shifted = stepEquilibrium(shifted, 500, 1);
assert(shifted.hi < simState.hi, 'Heating shifts the equilibrium to the left (Le Chatelier)');
const eqEngine = new ReactionEngine(new PhysicsWorld(800, 600));
const eqMission = QUESTS_DATA.find(q => q.id === 'quest_equilibrium')!;
assert(eqEngine.recordEquilibrium('reactants') && !eqMission.checkCompletion(eqEngine.stats), 'Mission 29 needs both starting points');
eqEngine.recordEquilibrium('product');
assert(eqMission.checkCompletion(eqEngine.stats), 'Reaching equilibrium from both sides completes Mission 29');
// 実験室でも H₂ + I₂ ⇄ 2HI は両向きに進む
const hiBack = runPair([...many('hb', 'compound', 'HI', 2, 400)], 3000);
assert((hiBack.e.stats.triggeredReactions['hi_decomposition'] || 0) >= 1 && hiBack.has('HI') + hiBack.has('H2') >= 1, 'Hot HI partly turns back into H2 and I2 in the lab');
const hiCold = runPair([...many('hc', 'compound', 'HI', 2, 25)], 500);
assert(hiCold.has('HI') === 2, 'HI does not break down at room temperature');
for (const lang of ['ja', 'en'] as const) {
  const etr = TRANSLATIONS[lang].equilibrium;
  assert(!!etr.starts.reactants && !!etr.starts.product && etr.kLabel('425').includes('425'), `Equilibrium lab has ${lang} labels`);
}
assert(englishOk(TRANSLATIONS.en.equilibrium.statusEquilibrium) && englishOk(TRANSLATIONS.en.equilibrium.shiftNote), 'Equilibrium texts are in English');

console.log('\n=== Test: Grade Modes (Elementary / Middle / High) ===');
assert(getGrade() === 'junior' && !hasChosenGrade(), 'Without a saved choice the app shows middle school mode');
assert(addFurigana('石灰水に二酸化炭素を吹きこむと白く濁る') === '<ruby>石灰水<rt>せっかいすい</rt></ruby>に<ruby>二酸化炭素<rt>にさんかたんそ</rt></ruby>を<ruby>吹<rt>ふ</rt></ruby>きこむと白く<ruby>濁<rt>にご</rt></ruby>る', 'Furigana uses the longest word first and keeps okurigana outside');
assert(addFurigana('<span title="酸素">酸素</span>') === '<span title="酸素"><ruby>酸素<rt>さんそ</rt></ruby></span>', 'Furigana never touches HTML tags or attributes');
assert(addFurigana('<ruby>酸素<rt>さんそ</rt></ruby>') === '<ruby>酸素<rt>さんそ</rt></ruby>', 'Existing furigana is left alone');
assert(addFurigana('鉛筆と冷凍庫') === '鉛筆と冷凍庫', 'Words whose reading depends on context get no furigana');
assert(kidText('酸素') === '酸素', 'Middle school mode shows no furigana');
setLanguage('ja');
setGrade('elementary');
assert(getGrade() === 'elementary' && hasChosenGrade() && kidText('酸素') === '<ruby>酸素<rt>さんそ</rt></ruby>', 'Elementary mode adds furigana in Japanese');
setLanguage('en');
assert(kidText('酸素') === '酸素', 'No furigana in English');
setLanguage('ja');
setGrade('junior');
for (const el of Object.values(ELEMENTS_DATA)) {
  assert(getElementKidHint(el, 'ja').length > 5 && getElementKidHint(el, 'en').length > 5, `${el.symbol} has a kid-friendly explanation`);
}
assert(ELEMENT_KID_HINT_SYMBOLS.length >= 25 && ['H', 'O', 'C', 'Fe', 'Cu', 'Na'].every(s2 => ELEMENT_KID_HINT_SYMBOLS.includes(s2)), 'Common elements have their own kid explanations');
for (const q of QUESTS_DATA) assert(['elementary', 'junior', 'high'].includes(q.grade), `${q.id} belongs to a grade`);
const byGrade = (g: string) => QUESTS_DATA.filter(q => q.grade === g).map(q => q.id);
assert(byGrade('elementary').includes('quest_btb_three_colors') && byGrade('elementary').includes('quest_dissolve_salt') && byGrade('elementary').length >= 5, 'Elementary quests come from elementary science');
assert(byGrade('junior').includes('quest_silver_oxide') && byGrade('junior').includes('quest_daniell_cell'), 'Middle school quests include the key junior-high experiments');
assert(['quest_titration', 'quest_equilibrium', 'quest_periodic_trends', 'quest_gas_law'].every(id => byGrade('high').includes(id)), 'High school quests include titration, equilibrium, periodic law and gas laws');
for (const lang of ['ja', 'en'] as const) {
  const gtr = TRANSLATIONS[lang].grade;
  for (const g of ['elementary', 'junior', 'high'] as const) assert(!!gtr.names[g] && !!gtr.descriptions[g], `Grade ${g} has a ${lang} label`);
}

console.log('\n=== Test: Save, Share and Undo ===');
{
  let nid = 1;
  const newId = () => `r_${nid++}`;
  const src = new PhysicsWorld(1000, 700);
  const floor = src.chamber.maxY;
  const midX = (src.chamber.minX + src.chamber.maxX) / 2;
  const beaker = src.placeFlask(midX - 150, floor, 'beaker');
  src.setCell(beaker, true);
  beaker.cell!.zinc = 7;
  const flask = src.placeFlask(midX + 150, floor, 'erlenmeyer');
  src.setFlaskCap(flask, true);
  flask.capTemperature = 40;
  const tube = src.placeFlask(midX, floor, 'testtube');
  tube.temperature = 80;
  const bal = src.spawnBalance(midX - 330);
  bal.isLocked = true;
  src.placeWallBrush(midX + 300, floor - 100, 2, 2, 'wall_brick');
  src.particles.find(p => p.kind === 'wall')!.cracked = true;
  const water = new Particle('w1', 'compound', 'H2O', midX + 150, floor - 20, 25);
  const salt = new Particle('s1', 'compound', 'NaCl', midX + 152, floor - 25, 25);
  salt.dissolved = true;
  const iron = new Particle('f1', 'element', 'Fe', midX - 40, floor - 10, 300);
  iron.rustProgress = 0.5;
  const steam = new Particle('v1', 'compound', 'H2O', midX + 40, floor - 300, 120);
  for (const p of [water, salt, iron, steam]) src.addParticle(p);
  const snap = captureLab(src);
  assert(snap.p.length === 8 && snap.c.length === 3 && snap.b.length === 1, 'Capture records particles, walls, glassware and balances');

  const dst = new PhysicsWorld(1000, 700);
  dst.addParticle(new Particle('old', 'element', 'He', 100, 100, 25));
  const { dropped } = restoreLab(dst, snap, newId);
  assert(dropped === 0 && !dst.particles.some(p => p.id === 'old'), 'Restoring replaces what was in the lab');
  assert(dst.particles.length === 8 && dst.containers.length === 3 && dst.balances.length === 1, 'Restoring brings back every item');
  const near = (a: number, b: number) => Math.abs(a - b) <= 0.5;
  assert(dst.particles.every((p, i) => near(p.x, src.particles[i].x) && near(p.y, src.particles[i].y) && p.symbolOrId === src.particles[i].symbolOrId), 'Particles come back in the same place');
  assert(dst.containers.map(c => c.type).join(',') === 'beaker,erlenmeyer,testtube' && near(dst.containers[2].temperature, 80), 'Glassware comes back with its type and temperature');
  assert(dst.containers[0].cell?.zinc === 7 && dst.containers[1].hasCap && dst.containers[1].capTemperature === 40, 'Daniell cell zinc and stoppers are kept');
  assert(dst.balances[0].isLocked && near(dst.balances[0].cx, bal.cx), 'Balances keep their place and lock');
  const restored = (id: string) => dst.particles[src.particles.findIndex(p => p.id === id)];
  assert(restored('s1').dissolved && restored('f1').rustProgress === 0.5 && near(restored('f1').temperature, 300), 'Dissolved salt, rust and temperature are kept');
  assert(restored('v1').state === 'gas' && dst.particles.filter(p => p.kind === 'wall').some(p => p.cracked), 'Steam stays a gas and cracked walls stay cracked');
  assert(new Set(dst.particles.map(p => p.id)).size === dst.particles.length, 'Restored particles get new unique ids');

  // せまい画面: 全体が入れば横にずらし、入らなければ真ん中にそろえて、はみ出したものだけ数える
  const small = new PhysicsWorld(420, 700);
  const r2 = restoreLab(small, snap, newId);
  assert(r2.dropped > 0 && r2.dropped < 12 && small.containers.length + small.balances.length + small.particles.length + r2.dropped === 12, 'A narrow screen keeps what fits and reports the rest');
  assert(small.particles.every(p => p.x >= small.chamber.minX && p.x <= small.chamber.maxX), 'Everything restored on a narrow screen is inside the chamber');
  const offset = new PhysicsWorld(1000, 700);
  offset.addParticle(new Particle('edge', 'element', 'C', offset.chamber.maxX - 5, offset.chamber.maxY - 10, 25));
  offset.addParticle(new Particle('edge2', 'element', 'C', offset.chamber.maxX - 205, offset.chamber.maxY - 10, 25));
  const shifted = new PhysicsWorld(700, 700);
  const r3 = restoreLab(shifted, captureLab(offset), newId);
  assert(r3.dropped === 0 && shifted.particles.length === 2 && near(shifted.particles[0].x - shifted.particles[1].x, 200), 'A layout that fits is slid inside without changing its spacing');

  // 小さな画面: 実験室を小さく表示すれば、大きな画面で作った実験が全部入る
  const ext = snapshotExtent(snap);
  assert(ext.width > 700 && ext.height >= 300, `The extent covers the balance, flasks and steam (${ext.width} x ${ext.height})`);
  assert(fitLabZoom(snap, 1000, 700) === 1, 'An experiment made on the same screen is shown at full size');
  assert(fitLabZoom({ v: 1, w: 0, h: 0, p: [], c: [], b: [] }, 390, 630) === 1, 'An empty lab is shown at full size');
  for (const [w, h] of [[390, 630], [420, 700], [700, 500]]) {
    const zoom = fitLabZoom(snap, w, h);
    const phone = new PhysicsWorld(w / zoom, h / zoom);
    const r = restoreLab(phone, snap, newId);
    assert(zoom < 1 && zoom >= MIN_LAB_ZOOM && r.dropped === 0 && phone.particles.length === 8 && phone.containers.length === 3 && phone.balances.length === 1,
      `A ${w}x${h} screen shows the lab at ${Math.round(zoom * 100)}% and loses nothing`);
    assert(fitLabZoom(snap, w, h) === zoom && zoom >= fitLabZoom(snap, w, h - 1), 'The zoom is stable and shrinks with the screen');
  }
  const huge = new PhysicsWorld(6000, 700);
  huge.placeFlask(huge.chamber.minX + 100, huge.chamber.maxY, 'beaker');
  huge.placeFlask(huge.chamber.maxX - 100, huge.chamber.maxY, 'beaker');
  assert(fitLabZoom(captureLab(huge), 390, 630) === MIN_LAB_ZOOM, 'An experiment too wide for any zoom stops at the smallest zoom');

  // 共有 URL
  const code = await encodeSnapshot(snap);
  assert(/^[A-Za-z0-9_-]+$/.test(code), 'Share code uses only URL-safe characters');
  const decoded = await decodeSnapshot(code);
  assert(!!decoded && JSON.stringify(decoded) === JSON.stringify(snap), 'Share code decodes to the same experiment');
  const crowd = new PhysicsWorld(1000, 700);
  for (let i = 0; i < 600; i++) crowd.addParticle(new Particle(`c${i}`, 'compound', i % 2 ? 'H2O' : 'NaCl', 100 + (i * 37) % 800, 100 + (i * 53) % 500, 25 + (i % 50)));
  const bigCode = await encodeSnapshot(captureLab(crowd));
  assert(bigCode.length < 12000, `600 particles fit in a share URL (${bigCode.length} characters)`);
  // QR コード: ふつうの大きさの実験は QR コードになり、長すぎる URL は null
  const shareUrl = `https://c1t0d0s0.y8n.org/element-lab/#lab=${code}`;
  const qr = makeQrMatrix(shareUrl);
  assert(!!qr && qr.size >= 21 && qr.size <= 177 && (qr.size - 17) % 4 === 0, `A share URL becomes a QR code (${qr?.size} modules for ${shareUrl.length} characters)`);
  const smallQr = makeQrMatrix('https://c1t0d0s0.y8n.org/element-lab/#lab=abc')!;
  assert(smallQr.size < qr!.size && smallQr.isDark(0, 0) && smallQr.isDark(6, 6) && !smallQr.isDark(1, 1), 'Short URLs make smaller QR codes with the corner finder patterns');
  assert(makeQrMatrix('x'.repeat(2900)) !== null && makeQrMatrix('x'.repeat(3000)) === null, 'URLs longer than the largest QR code are refused');
  assert(await decodeSnapshot('not a code!') === null && await decodeSnapshot('AAAA') === null, 'Broken share codes are rejected');
  const bomb = await encodeSnapshot({ v: 1, w: 0, h: 0, p: [], c: [], b: [], pad: 'x'.repeat(3_000_000) } as unknown as Parameters<typeof encodeSnapshot>[0]);
  assert(await decodeSnapshot(bomb) === null, 'Share codes that expand too much are rejected');

  // 共有された記録の中身をそのまま信じない
  assert(sanitizeSnapshot(null) === null && sanitizeSnapshot({ v: 2, p: [], c: [], b: [] }) === null && sanitizeSnapshot({ v: 1, p: 'x', c: [], b: [] }) === null, 'Records in the wrong shape are rejected');
  const dirty = sanitizeSnapshot({
    v: 1, w: 800, h: 500,
    p: [[0, 'H', 0, -10, 25, 0, 0, 0], [0, 'Xx', 0, 0, 25, 0, 0, 0], [1, '__proto__', 0, 0, 25, 0, 0, 0], [2, 'wall_brick', 0, 0, 25, 0, 4, 0], [0, 'O', NaN, 0, 25, 0, 0, 0], [0, 'O', 0, 0, 25, 9, 0, 0], [0, '<img>', 0, 0, 25, 0, 0, 0]],
    c: [[1, 0, 0, 25, 0, 25, 1, -1], [5, 0, 0, 25, 0, 25, 0, -1], [0, 0, 0, 25, 2, 25, 0, -1]],
    b: [[0, 0, 1], [0, 0, 'yes']]
  })!;
  assert(dirty.p.length === 2 && dirty.c.length === 1 && dirty.b.length === 1, 'Unknown substances, bad numbers and bad flags are dropped');
  const many = sanitizeSnapshot({ v: 1, w: 0, h: 0, p: Array.from({ length: 700 }, () => [0, 'H', 0, 0, 25, 0, 0, 0]), c: [], b: [] })!;
  assert(many.p.length === MAX_CHEMICAL_PARTICLES, 'Shared records are capped at the particle limit');
  assert(isEmptySnapshot(captureLab(new PhysicsWorld(800, 600))) && !isEmptySnapshot(snap), 'An empty lab is recognized');

  // 元に戻す
  const hist = new UndoHistory();
  for (let i = 0; i < 40; i++) hist.push({ ...snap, w: i });
  assert(hist.size === 30 && hist.pop()!.w === 39, 'Undo keeps the last 30 steps, newest first');

  // このブラウザへの保存
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Pick<Storage, 'getItem' | 'setItem'> }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); }
  };
  assert(loadSavedLabs().length === 0, 'No saved experiments at first');
  assert(saveLab('  電気分解の準備  ', snap, 1000), 'Saving to the browser succeeds');
  saveLab('B', snap, 2000);
  saveLab('電気分解の準備', captureLab(crowd), 3000);
  const labs = loadSavedLabs();
  assert(labs.length === 2 && labs[0].name === '電気分解の準備' && labs[0].snapshot.p.length === 600, 'Saving with the same name replaces it and moves it to the top');
  for (let i = 0; i < 15; i++) saveLab(`L${i}`, snap, 4000 + i);
  assert(loadSavedLabs().length === MAX_SAVED_LABS && loadSavedLabs()[0].name === 'L14', `Only the newest ${MAX_SAVED_LABS} experiments are kept`);
  deleteSavedLab(0);
  assert(loadSavedLabs()[0].name === 'L13' && loadSavedLabs().length === MAX_SAVED_LABS - 1, 'Deleting removes a saved experiment');
  store.set('element_lab_saved_experiments', '{broken');
  assert(loadSavedLabs().length === 0, 'Broken saved data is ignored');
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
  assert(!saveLab('x', snap), 'Saving reports failure when storage is unavailable');
}

console.log('\n=== Test: Fixed Simulation Step (same speed on 60Hz / 120Hz / 144Hz screens) ===');
{
  // 画面の書きかえの間隔 (ms) で1秒分まわしたとき、シミュレーションを進めた回数
  const stepsInOneSecond = (frameMs: number, jitter = 0) => {
    const clock = new FixedStepClock();
    let total = 0;
    let now = 1000;
    clock.steps(now);
    for (let i = 0; i < Math.round(1000 / frameMs); i++) {
      now += frameMs + (i % 2 === 0 ? jitter : -jitter);
      total += clock.steps(now);
    }
    return total;
  };
  for (const hz of [30, 60, 90, 120, 144, 240]) {
    const steps = stepsInOneSecond(1000 / hz);
    assert(Math.abs(steps - 60) <= 1, `A ${hz}Hz screen advances the lab about 60 times per second (got ${steps})`);
  }

  // 60Hz の画面で描画の間隔が少しゆれても、毎回1回ずつ進む (0回と2回が交互にならない)
  const clock = new FixedStepClock();
  let now = 0;
  clock.steps(now);
  const perFrame: number[] = [];
  for (let i = 0; i < 120; i++) {
    now += SIM_STEP_MS + (i % 2 === 0 ? 0.8 : -0.8);
    perFrame.push(clock.steps(now));
  }
  assert(perFrame.every(n => n === 1), 'A jittery 60Hz screen still advances exactly one step per frame');

  // タブを裏にしていた後などは、たまった時間を一気に取りもどさない
  const resumed = new FixedStepClock();
  resumed.steps(0);
  assert(resumed.steps(5000) === MAX_STEPS_PER_FRAME, `A long pause advances at most ${MAX_STEPS_PER_FRAME} steps in one frame`);
  assert(resumed.steps(5000 + SIM_STEP_MS) === 1, 'After a long pause the lab goes back to one step per frame');

  // 一時停止から再開したとき、止めていた時間の分を進めない
  const paused = new FixedStepClock();
  paused.steps(0);
  paused.steps(SIM_STEP_MS);
  paused.reset();
  assert(paused.steps(60000) === 1, 'Resuming after a pause does not catch up the paused time');
}

console.log('\n=== Test: Resizing, Snapshot Flags and Temperature Graph after Undo ===');
{
  // 画面の大きさが変わっても、中身は床の中央を基準に動いてチャンバーの中に残る
  const w = new PhysicsWorld(1200, 700);
  const floor = w.chamber.maxY;
  const mid = (w.chamber.minX + w.chamber.maxX) / 2;
  const beaker = w.placeFlask(mid + 200, floor, 'beaker');
  const bal = w.spawnBalance(mid - 300);
  w.placeWallBrush(mid, floor - 200, 1, 1, 'wall_brick');
  const fe = new Particle('fe', 'element', 'Fe', mid + 200, floor - 20, 25);
  w.addParticle(fe);
  const glassBelow = beaker.bounds.maxY - beaker.cy;
  const before = { beaker: beaker.cx - mid, bal: bal.cx - mid, fe: fe.x - mid, feUp: floor - fe.y, wall: w.particles[0].x - mid };
  w.setSize(1000, 500);
  const mid2 = (w.chamber.minX + w.chamber.maxX) / 2;
  const floor2 = w.chamber.maxY;
  assert(Math.abs(beaker.cx - mid2 - before.beaker) < 0.01 && beaker.cy === floor2 && Math.abs(beaker.bounds.maxY - beaker.cy - glassBelow) < 0.01, 'A resize moves glassware with the floor and rebuilds its walls');
  assert(Math.abs(bal.cx - mid2 - before.bal) < 0.01 && Math.abs(bal.leftPan.cx - (bal.cx - bal.armLength)) < 0.01, 'A resize moves balances and their pans');
  assert(Math.abs(fe.x - mid2 - before.fe) < 0.01 && Math.abs(floor2 - fe.y - before.feUp) < 0.01, 'A resize keeps particles at the same place relative to the floor');
  assert(Math.abs(w.particles[0].x - mid2 - before.wall) < 0.01, 'A resize moves pinned walls too');
  assert([beaker.bounds.minX, beaker.bounds.maxX, bal.bounds.minX, bal.bounds.maxX].every(x => x >= w.chamber.minX && x <= w.chamber.maxX), 'After a resize everything is still inside the chamber');
  // 回転してせまくなったときは、表示を小さくすると全部入る
  const portrait = fitLabZoom(captureLab(w), 390, 700);
  const turned = new PhysicsWorld(1000, 500);
  restoreLab(turned, captureLab(w), () => `t_${Math.random()}`);
  turned.setSize(390 / portrait, 700 / portrait);
  assert(portrait < 1 && [...turned.containers, ...turned.balances].every(c => c.bounds.minX >= turned.chamber.minX - 0.5 && c.bounds.maxX <= turned.chamber.maxX + 0.5), `Turning to portrait shows the lab at ${Math.round(portrait * 100)}% with everything inside`);

  // 溶解熱を出した粒・極板についた銅は、戻しても同じようすになる
  const lab = new PhysicsWorld(1000, 700);
  const lf = lab.chamber.maxY;
  const lm = (lab.chamber.minX + lab.chamber.maxX) / 2;
  const cellBeaker = lab.placeFlask(lm, lf, 'beaker');
  lab.setCell(cellBeaker, true);
  const plates = lab.getCellPlates(cellBeaker);
  const cu = new Particle('cu', 'element', 'Cu', plates.copperX - 6, plates.bottom - 10, 25);
  cu.stuckToElectrode = cellBeaker.id;
  const naoh = new Particle('naoh', 'compound', 'NaOH', lm - 200, lf - 10, 25);
  naoh.heatOfSolutionReleased = true;
  lab.addParticle(cu);
  lab.addParticle(naoh);
  const snap2 = captureLab(lab);
  const back = new PhysicsWorld(1000, 700);
  restoreLab(back, snap2, () => `b_${Math.random()}`);
  const backCu = back.particles.find(p => p.symbolOrId === 'Cu')!;
  const backNaoh = back.particles.find(p => p.symbolOrId === 'NaOH')!;
  assert(backNaoh.heatOfSolutionReleased, 'Undo keeps that a solute already gave off its heat of solution');
  assert(backCu.stuckToElectrode === back.containers[0].id, 'Undo keeps copper stuck to the cell plate (on the new beaker)');
  const cuY = backCu.y;
  for (let i = 0; i < 30; i++) back.update();
  assert(Math.abs(backCu.y - cuY) < 12 && backCu.stuckToElectrode !== null, 'Restored copper stays on the plate instead of falling');
  assert(sanitizeSnapshot({ v: 1, w: 0, h: 0, p: [[0, 'Cu', 0, -10, 25, 0, 24, 0]], c: [], b: [] })!.p.length === 1 && sanitizeSnapshot({ v: 1, w: 0, h: 0, p: [[0, 'Cu', 0, -10, 25, 0, 32, 0]], c: [], b: [] })!.p.length === 0, 'Shared records accept the new flags and reject unknown ones');

  // 元に戻したときの温度グラフは「反応したか消えた」ではなく、戻したので止めたと出す
  const log = new TemperatureLog();
  log.start(fe);
  log.endByRestore();
  assert(log.vanished && log.restored && !log.isTracking(fe), 'Undo stops the temperature graph and says why');
  log.start(fe);
  assert(!log.vanished && !log.restored, 'Starting a new graph clears the undo note');
}

console.log('\n=== Test: Elementary Missions and Grade-Locked Quests ===');
{
  const elementaryQuests = QUESTS_DATA.filter(q => q.grade === 'elementary');
  assert(elementaryQuests.length >= 9, `Elementary mode has at least 9 missions (got ${elementaryQuests.length})`);
  for (const id of ['quest_water_states', 'quest_metal_in_acid', 'quest_burning_and_air']) {
    assert(quest(id)?.grade === 'elementary', `${id} is an elementary mission`);
  }
  // 滴定・平衡・周期表の色分けは高校生モードでしか出ないので、そのミッションには印がある
  for (const id of ['quest_periodic_trends', 'quest_titration', 'quest_equilibrium']) {
    assert(quest(id).requiresGrade === 'high', `${id} says it needs high school mode`);
  }
  assert(QUESTS_DATA.filter(q => q.requiresGrade).every(q => q.requiresGrade === q.grade), 'A grade-locked mission is listed under that grade');

  // ミッション30: 水を冷やして氷、温めて水蒸気にする
  const wWorld = new PhysicsWorld(800, 600);
  const wEngine = new ReactionEngine(wWorld);
  const seen: string[] = [];
  wEngine.onWaterStateSeen = (state) => seen.push(state);
  const q30 = quest('quest_water_states');
  const ice = new Particle('ice30', 'compound', 'H2O', 200, 300, -20);
  wWorld.addParticle(ice);
  wEngine.checkReactions();
  assert(ice.state === 'solid' && wEngine.stats.waterStatesSeen!['solid'] === 1, 'Ice is recorded as a water state');
  wEngine.checkReactions();
  assert(wEngine.stats.waterStatesSeen!['solid'] === 1 && seen.length === 1, 'Each water state is reported only the first time');
  assert(!q30.checkCompletion(wEngine.stats), 'Ice alone does not clear the water states mission');
  const steam = new Particle('steam30', 'compound', 'H2O', 400, 300, 120);
  wWorld.addParticle(steam);
  wEngine.checkReactions();
  assert(steam.state === 'gas' && q30.checkCompletion(wEngine.stats) && seen.includes('gas'), 'Ice and steam clear the water states mission');
  const otherIce = questStats();
  otherIce.minTemperatureReached = -50;
  otherIce.maxTemperatureReached = 500;
  assert(!q30.checkCompletion(otherIce), 'Cooling or heating something other than water does not clear mission 30');

  // ミッション31: 鉄に塩酸をふれさせる (実際に反応させて確かめる)
  const aWorld = new PhysicsWorld(800, 600);
  const aEngine = new ReactionEngine(aWorld);
  aWorld.addParticle(new Particle('fe31', 'element', 'Fe', 300, 300, 25));
  aWorld.addParticle(new Particle('hcl31a', 'compound', 'HCl', 310, 300, 25));
  aWorld.addParticle(new Particle('hcl31b', 'compound', 'HCl', 300, 310, 25));
  const q31 = quest('quest_metal_in_acid');
  assert(!q31.checkCompletion(aEngine.stats), 'Metal in acid mission starts incomplete');
  for (let i = 0; i < 120 && !aEngine.stats.triggeredReactions['iron_acid_reaction']; i++) aEngine.checkReactions();
  assert(q31.checkCompletion(aEngine.stats), 'Iron and hydrochloric acid clear the metal in acid mission');
  const alOnly = questStats();
  alOnly.triggeredReactions['aluminium_hcl_reaction'] = 1;
  assert(q31.checkCompletion(alOnly), 'Aluminium and hydrochloric acid also clear mission 31');
  const mgOnly = questStats();
  mgOnly.triggeredReactions['magnesium_hcl_reaction'] = 1;
  assert(!q31.checkCompletion(mgOnly), 'Mission 31 asks for the metals used in elementary school (Al or Fe)');

  // ミッション32: 炭を燃やして、石灰水で二酸化炭素を確かめる (どちらか片方ではクリアしない)
  const q32 = quest('quest_burning_and_air');
  const burnOnly = questStats();
  burnOnly.triggeredReactions['carbon_complete_combustion'] = 1;
  assert(!q32.checkCompletion(burnOnly), 'Burning charcoal alone does not clear mission 32');
  const limeOnly = questStats();
  limeOnly.triggeredReactions['limewater_co2_turbidity'] = 1;
  assert(!q32.checkCompletion(limeOnly), 'Limewater with bottled CO2 alone does not clear mission 32');
  burnOnly.triggeredReactions['limewater_co2_turbidity'] = 1;
  assert(q32.checkCompletion(burnOnly), 'Burning charcoal and testing with limewater clear mission 32');
  for (const r of ['aluminium_hcl_reaction', 'iron_acid_reaction', 'carbon_complete_combustion', 'limewater_co2_turbidity']) {
    assert(REACTIONS_DATA.some(rule => rule.id === r), `Mission reaction exists: ${r}`);
  }

  // 学年外のミッションの案内と、ふりがな
  assert(t().quests.needsGrade(t().grade.names.high).includes(t().grade.names.high), 'The grade-lock note names the needed mode');
  assert(addFurigana('水蒸気').includes('<rt>すいじょうき</rt>'), 'Steam gets furigana as one word');

  // 前回までに見た水のすがたは、読みこみ直しても残る
  const store: Record<string, string> = {};
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; }
  };
  const sWorld = new PhysicsWorld(800, 600);
  const sEngine = new ReactionEngine(sWorld);
  sWorld.addParticle(new Particle('ice30s', 'compound', 'H2O', 200, 300, -20));
  sEngine.checkReactions();
  const reloadedWater = new ReactionEngine(new PhysicsWorld(800, 600));
  assert(reloadedWater.stats.waterStatesSeen!['solid'] === 1 && !reloadedWater.stats.waterStatesSeen!['gas'], 'Seen water states are saved and restored');
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
}

console.log('\n=== Test: Reduced Motion ===');
{
  const shakeOf = (w: PhysicsWorld) => (w as unknown as { shakeTime: number }).shakeTime;
  reducedMotionQuery.matches = false;
  assert(flashScale() === 1, 'Flashes keep full brightness by default');
  const normal = new PhysicsWorld(800, 600);
  normal.shake(10, 20);
  assert(shakeOf(normal) === 20, 'Explosions shake the lab by default');
  const strobeStar = { life: 5, strobe: { period: 10, phase: 0 } };
  assert(!isStarLit(strobeStar), 'Strobe stars blink by default');

  reducedMotionQuery.matches = true;
  const calm = new PhysicsWorld(800, 600);
  calm.shake(10, 20);
  assert(shakeOf(calm) === 0, 'With reduced motion, explosions do not shake the lab');
  assert(isStarLit(strobeStar), 'With reduced motion, strobe stars stay lit instead of blinking');
  assert(flashScale() === REDUCED_FLASH_ALPHA && REDUCED_FLASH_ALPHA < 0.5, 'With reduced motion, flashes and explosions are dimmed');
  reducedMotionQuery.matches = false;
}

console.log('\n=== Test: Fire Goes Out in a Sealed Container (Mission 33) ===');
{
  const q33 = QUESTS_DATA.find(q => q.id === 'quest_fire_goes_out')!;
  assert(q33.grade === 'elementary', 'Mission 33 is an elementary mission');
  // 栓をしたフラスコに炭3つと酸素1つを入れて温めつづける
  const burnSealed = (capped: boolean, oxygen: number) => {
    const w = new PhysicsWorld(800, 600);
    const e = new ReactionEngine(w);
    w.spawnFlask(400, w.chamber.maxY, 'erlenmeyer');
    const c = w.containers[0];
    if (capped) w.setFlaskCap(c, true);
    const ids = ['C', 'C', 'C', ...Array(oxygen).fill('O2')];
    ids.forEach((id, i) => w.addParticle(new Particle(`fire_${i}`, id === 'C' ? 'element' : 'compound', id, 392 + (i % 4) * 6, c.cy - 10 - Math.floor(i / 4) * 6, 25)));
    const events: boolean[] = [];
    e.onFireWentOut = (_c, first) => events.push(first);
    for (let f = 0; f < 60; f++) { e.checkReactions(); w.update(); }
    for (let f = 0; f < 2000 && events.length === 0; f++) {
      w.applyHeat(400, c.cy, 60, 25);
      e.checkReactions();
      w.update();
    }
    for (let f = 0; f < 60; f++) { w.applyHeat(400, c.cy, 60, 25); e.checkReactions(); w.update(); }
    return { e, w, events };
  };
  const sealed = burnSealed(true, 1);
  const burned = (sealed.e.stats.triggeredReactions['carbon_complete_combustion'] || 0) + (sealed.e.stats.triggeredReactions['carbon_incomplete_combustion'] || 0);
  assert(burned >= 1, 'Charcoal burns in a sealed flask while it still has oxygen');
  assert(sealed.events.length === 1 && sealed.events[0], 'The fire goes out once the oxygen in the sealed flask is used up (reported once)');
  assert(sealed.w.particles.some(p => p.symbolOrId === 'C' && p.temperature >= 200) && !sealed.w.particles.some(p => p.symbolOrId === 'O2'), 'Hot charcoal is left over with no oxygen');
  assert(q33.checkCompletion(sealed.e.stats), 'Seeing the fire go out clears mission 33');

  // 栓をしていなければ、記録しない (酸素は外から入ってくる、という場面なので)
  const open = burnSealed(false, 1);
  assert(open.events.length === 0 && !q33.checkCompletion(open.e.stats), 'An open flask does not count as the fire going out');
  // まだ酸素が残っているうちは、火は消えていない
  const plenty = new ReactionEngine(new PhysicsWorld(800, 600));
  assert(!q33.checkCompletion(plenty.stats), 'Mission 33 starts incomplete');
}

console.log('\n=== All Simulation Verification Tests Passed Successfully! ===\n');

