import * as THREE from 'three';

const BRASS = 0xC9A87A;
const INK = 0x25252A;
const FABRIC = 0x30343A;

export function mountAtelierPreview(container) {
  if (!container || !window.WebGLRenderingContext) return () => {};

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xF7F4EF, 7, 15);

  const camera = new THREE.PerspectiveCamera(27, 1, 0.1, 100);
  camera.position.set(0, 0.15, 7.4);
  camera.lookAt(0, 0.35, 0);

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

  const fabric = new THREE.MeshStandardMaterial({ color: FABRIC, roughness: 0.78, metalness: 0.02 });
  const darkFabric = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.72, metalness: 0.04 });
  const brass = new THREE.MeshStandardMaterial({ color: BRASS, roughness: 0.36, metalness: 0.72 });
  const lining = new THREE.MeshStandardMaterial({ color: 0x8B6F47, roughness: 0.62, metalness: 0.1 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.28, 1.75, 8, 20), fabric);
  torso.scale.set(1, 1, 0.52);
  torso.position.y = 0.08;
  torso.castShadow = true;
  torso.receiveShadow = true;
  stage.add(torso);

  const shoulderGeometry = new THREE.BoxGeometry(3.2, 0.22, 0.62);
  const shoulders = new THREE.Mesh(shoulderGeometry, fabric);
  shoulders.position.y = 1.05;
  shoulders.castShadow = true;
  stage.add(shoulders);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 24, Math.PI), darkFabric);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 1.32, 0.26);
  stage.add(collar);

  const lapelShape = new THREE.Shape();
  lapelShape.moveTo(0, 0.72);
  lapelShape.lineTo(-0.68, 0.2);
  lapelShape.lineTo(-0.37, -0.04);
  lapelShape.lineTo(0, -0.62);
  lapelShape.lineTo(0.16, -0.48);
  lapelShape.lineTo(-0.2, 0.08);
  lapelShape.closePath();
  const lapelGeometry = new THREE.ExtrudeGeometry(lapelShape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.02 });
  const leftLapel = new THREE.Mesh(lapelGeometry, darkFabric);
  leftLapel.position.set(-0.03, 0.56, 0.39);
  leftLapel.rotation.y = Math.PI;
  leftLapel.castShadow = true;
  stage.add(leftLapel);

  const rightLapel = leftLapel.clone();
  rightLapel.position.x = 0.03;
  rightLapel.rotation.y = 0;
  stage.add(rightLapel);

  for (const y of [0.42, 0.03, -0.36]) {
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), brass);
    button.position.set(0, y, 0.46);
    button.scale.z = 0.35;
    stage.add(button);
  }

  const pocketGeometry = new THREE.BoxGeometry(0.62, 0.035, 0.04);
  for (const x of [-0.82, 0.82]) {
    const pocket = new THREE.Mesh(pocketGeometry, lining);
    pocket.position.set(x, -0.15, 0.4);
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
