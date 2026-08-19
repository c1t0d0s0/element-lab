import { PhysicsWorld } from '../src/engine/PhysicsWorld';
import { ReactionEngine } from '../src/engine/ReactionEngine';
import { Particle } from '../src/engine/Particle';
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

console.log('\n=== Test 8: Full 118 Elements Completeness & Integrity ===');
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

console.log('\n=== All Simulation Verification Tests Passed Successfully! ===\n');

