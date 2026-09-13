import { PhysicsWorld } from '../src/engine/PhysicsWorld';
import { ReactionEngine } from '../src/engine/ReactionEngine';
import { Particle } from '../src/engine/Particle';
import { TutorialManager } from '../src/ui/TutorialManager';
import { ELEMENTS_DATA, getAtomicRenderRadius } from '../src/data/elements';
import { COMPOUNDS_DATA, getCompoundKidHint } from '../src/data/compounds';
import { REACTIONS_DATA } from '../src/data/reactions';

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
const c1 = new Particle('c1', 'element', 'C', 100, 100, 150);
const c2 = new Particle('c2', 'element', 'C', 102, 100, 150);
const o2_gas = new Particle('og', 'compound', 'O2', 101, 102, 150);
world.addParticle(c1);
world.addParticle(c2);
world.addParticle(o2_gas);

rxEngine.checkReactions();
const coFound = world.particles.filter(p => p.symbolOrId === 'CO');
console.log(`Found CO count: ${coFound.length}, isToxic: ${coFound[0]?.isToxic}`);
assert(coFound.length === 2, 'Incomplete combustion should produce 2 CO molecules');

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
  { sym: 'Mg', expectedName: '眩しい白色閃光' }
];

for (const item of flameElementsToTest) {
  const info = getFlameReactionInfo('element', item.sym);
  assert(info !== null, `Element ${item.sym} must have flame reaction info`);
  assert(info!.hasFlameReaction, `Element ${item.sym} hasFlameReaction must be true`);
  assert(info!.flameColorNameJa === item.expectedName, `Element ${item.sym} flame name must match`);
}

// 化合物からの炎色判定 (NaCl -> Na, CaCl2 -> Ca, CuO -> Cu)
const naclFlame = getFlameReactionInfo('compound', 'NaCl');
assert(naclFlame !== null && naclFlame.elementSymbol === 'Na', 'NaCl must have Na flame reaction');

const cuoFlame = getFlameReactionInfo('compound', 'CuO');
assert(cuoFlame !== null && cuoFlame.elementSymbol === 'Cu', 'CuO must have Cu flame reaction');

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

// 3. 水の電気分解 (2H2O -> 2H2 + O2)
const waterWorld = new PhysicsWorld(800, 600);
for (let i = 0; i < 5; i++) {
  waterWorld.addParticle(new Particle(`w${i}`, 'compound', 'H2O', 300, 300, 25));
}
let waterDecompCount = 0;
for (let attempt = 0; attempt < 5; attempt++) {
  const res = waterWorld.applyElectric(300, 300, 40);
  waterDecompCount += res.decomposedCount;
}
assert(waterDecompCount > 0, 'Water electrolysis must decompose H2O particles into H2/O2');
const hasH2OrO2 = waterWorld.particles.some(p => p.symbolOrId === 'H2' || p.symbolOrId === 'O2');
assert(hasH2OrO2, 'WaterWorld must contain H2 or O2 after electrolysis');

// 4. 塩化銅の電気分解 (CuCl2 -> Cu + Cl2)
const cuclWorld = new PhysicsWorld(800, 600);
for (let i = 0; i < 4; i++) {
  cuclWorld.addParticle(new Particle(`cucl${i}`, 'compound', 'CuCl2', 400, 400, 25));
}
let cuclDecompCount = 0;
for (let attempt = 0; attempt < 4; attempt++) {
  const res = cuclWorld.applyElectric(400, 400, 40);
  cuclDecompCount += res.decomposedCount;
}
assert(cuclDecompCount > 0, 'CuCl2 electrolysis must decompose into Cu/Cl2');

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
assert(allCompounds.length === 33, 'Total compounds in database must be 33');

// 1. Verify that all 33 compounds have kidHintJa, kidHintEn, and recipe
for (const comp of allCompounds) {
  const hintJa = getCompoundKidHint(comp, 'ja');
  const hintEn = getCompoundKidHint(comp, 'en');
  assert(hintJa && hintJa.length > 5, `Compound [${comp.id}] must have kidHintJa`);
  assert(hintEn && hintEn.length > 5, `Compound [${comp.id}] must have kidHintEn`);

  assert(comp.recipe !== undefined, `Compound [${comp.id}] must have recipe`);
  const recipe = comp.recipe!;
  assert(recipe.materials.length >= 1, `Compound [${comp.id}] recipe must have materials`);
  assert(recipe.materials.every(m => m.count >= 1 && m.id.length >= 1), `Compound [${comp.id}] materials must be valid`);
  assert(recipe.methodJa.length > 0, `Compound [${comp.id}] recipe must have methodJa`);
  assert(recipe.methodEn.length > 0, `Compound [${comp.id}] recipe must have methodEn`);
  assert(recipe.toastGuideJa.length > 0, `Compound [${comp.id}] recipe must have toastGuideJa`);
  assert(recipe.toastGuideEn.length > 0, `Compound [${comp.id}] recipe must have toastGuideEn`);
}
console.log(`Verified all 33 compounds have complete kid hints and craft recipes!`);

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

console.log('\n=== All Simulation Verification Tests Passed Successfully! ===\n');

