import { PhysicsWorld } from '../src/engine/PhysicsWorld';
import { ReactionEngine } from '../src/engine/ReactionEngine';
import { Particle } from '../src/engine/Particle';
import { TutorialManager } from '../src/ui/TutorialManager';
import { ELEMENTS_DATA, getAtomicRenderRadius } from '../src/data/elements';
import { COMPOUNDS_DATA } from '../src/data/compounds';
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

console.log(`Water Y after 30 frames: ${waterInFlask.y.toFixed(1)} (bottom is 300)`);
assert(waterInFlask.y <= 300 && waterInFlask.y >= 250, 'Water must be held cleanly inside the flask and not fall through');

// Beaker and test tube spawning
const beaker = world.spawnFlask(200, 300, 'beaker');
const tube = world.spawnFlask(600, 300, 'testtube');
assert(beaker.segments.length >= 4, 'Beaker must have walls and spout segments');
assert(tube.segments.length >= 10, 'Test tube must have walls and rounded bottom segments');
assert(world.containers.length === 3, 'All 3 glassware apparatuses must be in world');

// Thermal conductivity test: heat flask and verify water heats up
world.applyHeat(400, 300, 60, 100);
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

console.log('\n=== All Simulation Verification Tests Passed Successfully! ===\n');

