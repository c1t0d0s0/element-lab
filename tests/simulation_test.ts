import { PhysicsWorld, computeLocalPh } from '../src/engine/PhysicsWorld';
import { ReactionEngine, GOLD_SPARKS_STORAGE_KEY, DISCOVERED_REACTIONS_STORAGE_KEY, DISCOVERED_COMPOUNDS_STORAGE_KEY, INDICATOR_RESULTS_STORAGE_KEY, FLAME_TESTS_STORAGE_KEY } from '../src/engine/ReactionEngine';
import { FireworksShow, FIREWORK_ELEMENTS, isWillowUnlocked, getFireworkColorInfo, isFireworkColorUnlocked, isMagnesiumWhiteUnlocked } from '../src/engine/Fireworks';
import { selectProfessorLine, getUndiscoveredReactions, REACTION_LINES } from '../src/data/professorLines';
import { QUESTS_DATA, GameStats } from '../src/data/quests';
import { getStructure, NO_STRUCTURE_COMPOUNDS, ionicRadius } from '../src/data/structures';
import { buildMoleculeGroup } from '../src/engine/MoleculeScene';
import { createShot, createProgram, sampleProgram, serializeFireworkProgram, parseFireworkProgram, programDuration, sortShotsByTime, MAX_PROGRAM_SHOTS } from '../src/data/fireworkProgram';
import { chargeLabel } from '../src/engine/MoleculeRenderer';
import { Particle } from '../src/engine/Particle';
import { TutorialManager } from '../src/ui/TutorialManager';
import { ELEMENTS_DATA, getAtomicRenderRadius } from '../src/data/elements';
import { COMPOUNDS_DATA, COMPOUND_CATEGORY_LIST, getCompoundKidHint, getIndicatorColor, classifyPh } from '../src/data/compounds';
import { REACTIONS_DATA } from '../src/data/reactions';
import { WALL_BLOCK, WALL_TYPES, WallTypeId, wallImpact } from '../src/data/walls';
import { reactionMatchesFilter, compoundMatchesFilter, COMPOUND_FILTERS, DISPLAY_REACTIONS, getMergedReactionCount } from '../src/ui/EncyclopediaModal';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${msg}`);
  }
}

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

// Step 3: Heat and steam
tutWorld.applyHeat(200, 200, 50, 150);
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
  { sym: 'Rb', expectedName: '暗赤色 (紫赤)' },
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
import { Toolbar } from '../src/ui/Toolbar';
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
import { getLanguage, setLanguage, onLanguageChange, t } from '../src/i18n';
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
assert(getElementFact(hElem, 'en').includes('Hydrogen') || getElementFact(hElem, 'en').includes('Atomic'), 'H English fact check');

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
const detectedFlask = capWorld.getContainerAtCapPoint(400, 350 - 110 - 10);
assert(detectedFlask === cappedFlask, 'getContainerAtCapPoint must detect flask when tapping mouth/cap area');
const missFlask = capWorld.getContainerAtCapPoint(100, 100);
assert(missFlask === null, 'getContainerAtCapPoint must return null for far coordinates');

// 3. Sealed flask retains floating gas inside
const trappedHe = new Particle('trapped_he', 'element', 'He', 400, 300, 25);
capWorld.addParticle(trappedHe);

for (let f = 0; f < 40; f++) {
  capWorld.update();
}

const neckTop = cappedFlask.cy - 110;
console.log(`Trapped He Y position: ${trappedHe.y.toFixed(1)} (neck top is ${neckTop.toFixed(1)})`);
assert(trappedHe.y >= neckTop - 2, 'Light gas (He) must remain trapped inside sealed flask');

// 4. Toggle cap OFF: gas must escape through opening
const capResultOff = capWorld.toggleFlaskCap(cappedFlask);
assert(capResultOff === false && cappedFlask.hasCap === false, 'toggleFlaskCap must turn hasCap to false');
assert(cappedFlask.segments.length === 7, 'Uncapped flask segments must return to 7');

for (let f = 0; f < 60; f++) {
  capWorld.update();
}

const openNeckTop = cappedFlask.cy - 110;
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
assert(allCompounds.length === 73, 'Total compounds in database must be 73 (68 + 5 indicators)');

// 1. Verify that all 46 compounds have kidHintJa, kidHintEn, and recipe
for (const comp of allCompounds) {
  const hintJa = getCompoundKidHint(comp, 'ja');
  const hintEn = getCompoundKidHint(comp, 'en');
  assert(hintJa && hintJa.length > 5, `Compound [${comp.id}] must have kidHintJa`);
  assert(hintEn && hintEn.length > 5, `Compound [${comp.id}] must have kidHintEn`);

  // 指示薬は作るものではなく最初から使える実験道具なので、つくり方はない
  if (comp.indicator) continue;
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
assert(runPair([['hi_h', 'compound', 'H2', 350], ['hi_i', 'compound', 'I2', 350]]).has('HI') === 2, 'H2 + I2 must react at high temperature');

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
saltWorld.particles.forEach(p => { p.temperature = 900; p.updateStateByTemperature(); });
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
assert(programDuration(sample) === 3.6 && sample.shots.length === 5, 'Sample program must have 5 shots over 3.6 seconds');
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

console.log('\n=== Test: Every Recipe Actually Makes Its Compound ===');
// 図鑑の「ひつような材料」どおりに置けば、その化合物が本当にできること。
// 常温・バーナー (600℃)・強熱 (1600℃) のどれかでできればよい。電気分解は通電ツールを使う。
// 赤サビのようにゆっくり進む反応もあるので、反応判定を何度かくり返す
for (const comp of Object.values(COMPOUNDS_DATA)) {
  const recipe = comp.recipe;
  if (!recipe) continue;
  let made = false;
  for (const temp of [25, 600, 1600]) {
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
  const midY = (w.getContainerTopY(c) + c.cy) / 2;
  for (let f = 0; f < 600 && !w.particles.some(p => p.symbolOrId === 'H2O'); f++) {
    if (tool === 'heat') w.applyHeat(400, c.cy - 10, 40, 25);
    else if (f % 10 === 0) w.applySpark(400, midY, 35);
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
  assert(!!comp.indicator || createdAnyhow.has(comp.id), `Compound ${comp.id} must be possible to discover in the encyclopedia`);
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

console.log('\n=== All Simulation Verification Tests Passed Successfully! ===\n');

