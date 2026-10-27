import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MolecularStructure } from '../data/structures';
import { MoleculeDisplayMode, atomRadius, chargeLabel, elementColor, structureCentroid, structureExtent } from './MoleculeRenderer';

// three.js で分子構造を立体的に描く (光の反射・陰影つきの球棒モデル / 空間充填モデル)

const BOND_RADIUS = 0.12; // 単結合の太さ (Å)
const MULTI_BOND_RADIUS = 0.075; // 二重・三重結合の1本の太さ (Å)
const MULTI_BOND_GAP = 0.2; // 二重・三重結合の線の間隔 (Å)
const CAMERA_FOV = 35;
// 触るのをやめてから自動回転を再開するまでの時間 (ms)
const AUTO_ROTATE_RESUME_MS = 3000;

const sphereGeometry = new THREE.SphereGeometry(1, 40, 28);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 20, 1);
const materialCache = new Map<string, THREE.MeshStandardMaterial>();

function elementMaterial(el: string): THREE.MeshStandardMaterial {
  let m = materialCache.get(el);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: new THREE.Color(elementColor(el)), roughness: 0.38, metalness: 0.0 });
    materialCache.set(el, m);
  }
  return m;
}

export interface MoleculeModel {
  group: THREE.Group;
  atomMeshes: THREE.Mesh[];
  bondMeshes: THREE.Mesh[];
  contactLines: THREE.Line[];
}

// a から b への円柱 (結合の半分)
function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(cylinderGeometry, material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.scale.set(radius, dir.length(), radius);
  return mesh;
}

// 構造から three.js のモデルを組み立てる (DOM を使わないのでテストでも呼べる)。重心が原点にくる
export function buildMoleculeGroup(s: MolecularStructure, mode: MoleculeDisplayMode): MoleculeModel {
  const group = new THREE.Group();
  const c = structureCentroid(s);
  const positions = s.atoms.map(a => new THREE.Vector3(a.x - c[0], a.y - c[1], a.z - c[2]));
  const atomMeshes: THREE.Mesh[] = [];
  const bondMeshes: THREE.Mesh[] = [];
  const contactLines: THREE.Line[] = [];

  s.atoms.forEach((a, i) => {
    const mesh = new THREE.Mesh(sphereGeometry, elementMaterial(a.el));
    mesh.position.copy(positions[i]);
    mesh.scale.setScalar(atomRadius(a, mode));
    group.add(mesh);
    atomMeshes.push(mesh);
  });

  if (mode === 'ballStick') {
    const neighbors = s.atoms.map(() => [] as number[]);
    s.bonds.forEach(([i, j, order]) => {
      if (order > 0) {
        neighbors[i].push(j);
        neighbors[j].push(i);
      }
    });

    for (const [i, j, order] of s.bonds) {
      const a = positions[i], b = positions[j];
      if (order === 0) {
        // イオンどうしのとなり合い: 細い点線
        const geom = new THREE.BufferGeometry().setFromPoints([a, b]);
        const line = new THREE.Line(geom, new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.18, gapSize: 0.14, transparent: true, opacity: 0.7 }));
        line.computeLineDistances();
        group.add(line);
        contactLines.push(line);
        continue;
      }
      // 二重・三重結合は、となりの原子がある面に並べる (平面の分子では平面内に並ぶ)
      const dir = new THREE.Vector3().subVectors(b, a).normalize();
      const other = [...neighbors[i].filter(k => k !== j), ...neighbors[j].filter(k => k !== i)][0];
      let perp = other !== undefined
        ? new THREE.Vector3().subVectors(positions[other], a)
        : new THREE.Vector3(dir.y, -dir.x, 0.37);
      perp.addScaledVector(dir, -perp.dot(dir));
      if (perp.lengthSq() < 1e-6) perp = new THREE.Vector3(0, 0, 1).cross(dir);
      if (perp.lengthSq() < 1e-6) perp = new THREE.Vector3(1, 0, 0);
      perp.normalize();

      const radius = order > 1 ? MULTI_BOND_RADIUS : BOND_RADIUS;
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      for (let k = 0; k < order; k++) {
        const off = perp.clone().multiplyScalar((k - (order - 1) / 2) * MULTI_BOND_GAP);
        const pa = a.clone().add(off), pm = mid.clone().add(off), pb = b.clone().add(off);
        // 半分ずつ両端の原子の色
        for (const mesh of [cylinderBetween(pa, pm, radius, elementMaterial(s.atoms[i].el)), cylinderBetween(pm, pb, radius, elementMaterial(s.atoms[j].el))]) {
          group.add(mesh);
          bondMeshes.push(mesh);
        }
      }
    }
  }
  return { group, atomMeshes, bondMeshes, contactLines };
}

function makeLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.font = 'bold 72px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeText(text, 128, 66);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText(text, 128, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
}

interface AtomLabel {
  sprite: THREE.Sprite;
  center: THREE.Vector3;
  radius: number;
}

// ビューアの canvas に three.js の場面を用意して描き続ける
export class MoleculeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.05, 500);
  private controls: OrbitControls;
  private model: MoleculeModel | null = null;
  private labels: AtomLabel[] = [];
  private frameId: number | null = null;
  private autoRotate: boolean = true;
  private interacting: boolean = false;
  private lastInteractionEnd: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // 元素の色が白っぽくならないよう、色味を変えにくいトーンマッピングにする
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 部屋の照明を映り込ませて、つやのある立体感を出す
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();

    // カメラについていくライト (どの向きから見ても左上にハイライト)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(-3, 4, 5);
    this.camera.add(keyLight);
    this.scene.add(this.camera);
    this.scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.5));

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.autoRotateSpeed = 2.2;
    this.controls.addEventListener('start', () => { this.interacting = true; });
    this.controls.addEventListener('end', () => {
      this.interacting = false;
      this.lastInteractionEnd = performance.now();
    });
  }

  public setStructure(s: MolecularStructure, mode: MoleculeDisplayMode, showLabels: boolean, resetView: boolean) {
    this.clearModel();
    this.model = buildMoleculeGroup(s, mode);
    this.scene.add(this.model.group);

    if (showLabels) {
      s.atoms.forEach((a, i) => {
        const sprite = makeLabelSprite(a.el + chargeLabel(a.charge));
        const radius = atomRadius(a, mode);
        // ラベルの高さは球の大きさに合わせる (小さな H は小さく)
        const h = radius * 0.95;
        sprite.scale.set(h * 2, h, 1);
        this.scene.add(sprite);
        this.labels.push({ sprite, center: this.model!.atomMeshes[i].position.clone(), radius });
      });
    }

    // 構造全体がちょうど収まる距離にカメラを置く。最初は少し斜め上から見る
    const extent = structureExtent(s, mode);
    const distance = (extent / Math.sin(THREE.MathUtils.degToRad(CAMERA_FOV / 2))) * 1.05;
    this.controls.minDistance = distance * 0.35;
    this.controls.maxDistance = distance * 2.5;
    if (resetView) {
      this.camera.position.copy(new THREE.Vector3(0.35, 0.3, 1).normalize().multiplyScalar(distance));
      this.controls.target.set(0, 0, 0);
    } else {
      // 表示モードを変えた時は、見ている向きのまま全体が収まる距離に置き直す (空間充填で球の中に入らないように)
      this.camera.position.setLength(distance);
    }
    this.controls.update();
  }

  public setAutoRotate(enabled: boolean) {
    this.autoRotate = enabled;
    this.lastInteractionEnd = 0;
  }

  public resize(size: number) {
    this.renderer.setSize(size, size, false);
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
  }

  public start() {
    if (this.frameId !== null) return;
    const tick = () => {
      this.frameId = requestAnimationFrame(tick);
      this.controls.autoRotate = this.autoRotate && !this.interacting && performance.now() - this.lastInteractionEnd > AUTO_ROTATE_RESUME_MS;
      this.controls.update();
      this.updateLabels();
      this.renderer.render(this.scene, this.camera);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  public stop() {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }

  // ラベルを原子の手前側の表面に置く (奥の原子のラベルは手前の原子に隠れる)
  private updateLabels() {
    const toCamera = new THREE.Vector3();
    for (const l of this.labels) {
      toCamera.subVectors(this.camera.position, l.center).normalize();
      l.sprite.position.copy(l.center).addScaledVector(toCamera, l.radius * 1.02);
    }
  }

  private clearModel() {
    if (this.model) {
      this.scene.remove(this.model.group);
      // 球・円柱の形と元素の材質は使い回すので、点線と結合ごとに作ったものだけ片付ける
      this.model.contactLines.forEach(line => {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
      this.model = null;
    }
    for (const l of this.labels) {
      this.scene.remove(l.sprite);
      l.sprite.material.map?.dispose();
      l.sprite.material.dispose();
    }
    this.labels = [];
  }

  public dispose() {
    this.stop();
    this.clearModel();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
