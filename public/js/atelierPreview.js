import * as THREE from 'three';

const BRASS = 0xC9A87A;
const INK = 0x25252A;
const FABRIC = 0x30343A;

export function mountAtelierPreview(container) {
  if (!container || !window.WebGLRenderingContext) return () => {};

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xF7F4EF, 7, 15);

  const camera = new THREE.PerspectiveCamera(27, 1, 0.1, 100);
  camera.position.set(0, 0.45, 9.2);
  camera.lookAt(0, 0.45, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const stage = new THREE.Group();
  scene.add(stage);

  const ambient = new THREE.HemisphereLight(0xfffaf2, 0x8b6f47, 2.2);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(-3, 5, 5);
  key.castShadow = true;
  scene.add(key);

  const rim = new THREE.DirectionalLight(BRASS, 1.8);
  rim.position.set(4, 2, -2);
  scene.add(rim);

  const fabric = new THREE.MeshStandardMaterial({ color: FABRIC, roughness: 0.78, metalness: 0.02, side: THREE.DoubleSide });
  const darkFabric = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.72, metalness: 0.04, side: THREE.DoubleSide });
  const brass = new THREE.MeshStandardMaterial({ color: BRASS, roughness: 0.36, metalness: 0.72 });
  const lining = new THREE.MeshStandardMaterial({ color: 0x8B6F47, roughness: 0.62, metalness: 0.1 });

  const jacketShape = new THREE.Shape();
  jacketShape.moveTo(-1.38, -1.42);
  jacketShape.lineTo(-1.28, 0.42);
  jacketShape.lineTo(-0.86, 1.1);
  jacketShape.lineTo(-0.38, 1.42);
  jacketShape.lineTo(0.38, 1.42);
  jacketShape.lineTo(0.86, 1.1);
  jacketShape.lineTo(1.28, 0.42);
  jacketShape.lineTo(1.38, -1.42);
  jacketShape.quadraticCurveTo(0, -1.62, -1.38, -1.42);
  const jacket = new THREE.Mesh(
    new THREE.ExtrudeGeometry(jacketShape, { depth: 0.7, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.08 }),
    fabric
  );
  jacket.position.z = -0.35;
  jacket.castShadow = true;
  jacket.receiveShadow = true;
  stage.add(jacket);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.46, 20), lining);
  neck.position.set(0, 1.58, 0.02);
  stage.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 24, 18), new THREE.MeshStandardMaterial({ color: 0xB98262, roughness: 0.82 }));
  head.scale.set(0.88, 1.08, 0.82);
  head.position.set(0, 2.18, 0.02);
  head.castShadow = true;
  stage.add(head);

  for (const side of [-1, 1]) {
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 1.52, 8, 16), fabric);
    sleeve.position.set(side * 1.43, 0.05, -0.02);
    sleeve.rotation.z = side * -0.12;
    sleeve.castShadow = true;
    stage.add(sleeve);
  }

  const flatDetail = (shape, material, z) => {
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
    mesh.position.z = z;
    mesh.castShadow = true;
    stage.add(mesh);
    return mesh;
  };

  const shirtShape = new THREE.Shape();
  shirtShape.moveTo(-0.34, 1.4);
  shirtShape.lineTo(0, 1.1);
  shirtShape.lineTo(0.34, 1.4);
  shirtShape.lineTo(0.18, 0.72);
  shirtShape.lineTo(-0.18, 0.72);
  shirtShape.closePath();
  flatDetail(shirtShape, new THREE.MeshStandardMaterial({ color: 0xE8E2D8, roughness: 0.68, side: THREE.DoubleSide }), 0.39);

  const tieShape = new THREE.Shape();
  tieShape.moveTo(-0.08, 1.12);
  tieShape.lineTo(0.08, 1.12);
  tieShape.lineTo(0.15, 0.82);
  tieShape.lineTo(0, 0.66);
  tieShape.lineTo(-0.15, 0.82);
  tieShape.closePath();
  flatDetail(tieShape, darkFabric, 0.46);

  const leftLapelShape = new THREE.Shape();
  leftLapelShape.moveTo(-0.36, 1.42);
  leftLapelShape.lineTo(-0.92, 0.96);
  leftLapelShape.lineTo(-0.2, 0.18);
  leftLapelShape.lineTo(-0.06, 0.72);
  leftLapelShape.closePath();
  flatDetail(leftLapelShape, darkFabric, 0.42);

  const rightLapelShape = new THREE.Shape();
  rightLapelShape.moveTo(0.36, 1.42);
  rightLapelShape.lineTo(0.92, 0.96);
  rightLapelShape.lineTo(0.2, 0.18);
  rightLapelShape.lineTo(0.06, 0.72);
  rightLapelShape.closePath();
  flatDetail(rightLapelShape, darkFabric, 0.42);

  const seamMaterial = new THREE.LineBasicMaterial({ color: BRASS, transparent: true, opacity: 0.85 });
  const seam = (points) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, y]) => new THREE.Vector3(x, y, 0.53)));
    stage.add(new THREE.Line(geometry, seamMaterial));
  };
  seam([[-0.36, 1.42], [-0.92, 0.96], [-0.2, 0.18], [-0.06, 0.72]]);
  seam([[0.36, 1.42], [0.92, 0.96], [0.2, 0.18], [0.06, 0.72]]);

  for (const y of [0.42, 0.03, -0.36]) {
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), brass);
    button.position.set(0, y, 0.47);
    button.scale.z = 0.35;
    stage.add(button);
  }

  const pocketGeometry = new THREE.BoxGeometry(0.62, 0.05, 0.04);
  for (const x of [-0.82, 0.82]) {
    const pocket = new THREE.Mesh(pocketGeometry, lining);
    pocket.position.set(x, -0.15, 0.47);
    pocket.rotation.z = x < 0 ? -0.08 : 0.08;
    stage.add(pocket);
  }

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 1.9, 0.14, 64),
    new THREE.MeshStandardMaterial({ color: 0xE5DED3, roughness: 0.9 })
  );
  plinth.position.y = -1.62;
  plinth.receiveShadow = true;
  stage.add(plinth);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(5, 64),
    new THREE.ShadowMaterial({ opacity: 0.14 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.7;
  floor.receiveShadow = true;
  scene.add(floor);

  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frameId = 0;
  let disposed = false;

  function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function onPointerMove(event) {
    const rect = container.getBoundingClientRect();
    target.x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.18;
    target.y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.12;
  }

  function animate() {
    if (disposed) return;
    pointer.x += (target.x - pointer.x) * 0.055;
    pointer.y += (target.y - pointer.y) * 0.055;
    stage.rotation.y = reducedMotion ? 0 : pointer.x;
    stage.rotation.x = reducedMotion ? 0 : -pointer.y;
    stage.position.y = Math.sin(performance.now() * 0.0007) * (reducedMotion ? 0 : 0.025);
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  }

  container.addEventListener('pointermove', onPointerMove);
  window.addEventListener('resize', resize);
  resize();
  animate();

  return () => {
    disposed = true;
    cancelAnimationFrame(frameId);
    container.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('resize', resize);
    renderer.dispose();
    container.replaceChildren();
  };
}
