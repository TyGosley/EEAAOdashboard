import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const COLORS = {
  cyan: new THREE.Color('#27d4ff'),
  cyanSoft: new THREE.Color('#72e5ff'),
  orange: new THREE.Color('#ff8d3a'),
  deep: new THREE.Color('#050b15')
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const createLatticeVariant = () => {
  const root = new THREE.Group();

  const gridMain = new THREE.GridHelper(120, 34, COLORS.cyan, COLORS.cyan);
  const gridMainMaterial = Array.isArray(gridMain.material) ? gridMain.material : [gridMain.material];
  gridMainMaterial.forEach((material) => {
    material.transparent = true;
    material.opacity = 0.1;
  });
  gridMain.position.y = -10;
  root.add(gridMain);

  const gridTilt = new THREE.GridHelper(86, 24, COLORS.orange, COLORS.cyanSoft);
  const gridTiltMaterial = Array.isArray(gridTilt.material) ? gridTilt.material : [gridTilt.material];
  gridTiltMaterial.forEach((material) => {
    material.transparent = true;
    material.opacity = 0.11;
  });
  gridTilt.rotation.x = Math.PI / 2.8;
  gridTilt.position.z = -18;
  root.add(gridTilt);

  const pulseRings = [];
  for (let index = 0; index < 4; index += 1) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.55, 96),
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? COLORS.cyan : COLORS.orange,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );

    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -9.7;
    root.add(ring);
    pulseRings.push({ ring, phase: index * 1.27 });
  }

  root.position.z = -12;

  return {
    root,
    update: (elapsed) => {
      root.rotation.y = Math.sin(elapsed * 0.09) * 0.22;

      pulseRings.forEach(({ ring, phase }, index) => {
        const cycle = (elapsed * 0.58 + phase) % 4;
        const scale = 1 + cycle * 3.2;
        ring.scale.set(scale, scale, 1);
        ring.material.opacity = clamp(0.24 - cycle * 0.055 + Math.sin(elapsed + index) * 0.03, 0.02, 0.28);
      });
    }
  };
};

const disposeVariant = (variant) => {
  variant.root.traverse((object) => {
    if (object.geometry) {
      object.geometry.dispose();
    }

    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      } else {
        object.material.dispose();
      }
    }
  });
};

const JarvisScene = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.Fog(COLORS.deep, 30, 85);

    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 34);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const lattice = createLatticeVariant();
    scene.add(lattice.root);

    const target = new THREE.Vector3(0, -1, -11);
    const clock = new THREE.Clock();
    let frameId;

    const tick = () => {
      clock.getDelta();
      const elapsed = clock.elapsedTime;

      camera.position.x = Math.sin(elapsed * 0.12) * 0.78;
      camera.position.y = Math.cos(elapsed * 0.1) * 0.46;
      camera.position.z = 34 + Math.sin(elapsed * 0.22) * 0.45;
      camera.lookAt(target);

      lattice.update(elapsed);
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    tick();

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);

      disposeVariant(lattice);

      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div aria-hidden className="pointer-events-none absolute inset-0 opacity-75" ref={containerRef} />;
};

export default JarvisScene;
