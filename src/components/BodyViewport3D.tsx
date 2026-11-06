import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildProceduralAnatomy } from '../three/proceduralAnatomy';
import { loadRealZAnatomyAtlas } from '../three/zAnatomyLoader';
import { ANATOMY_PARTS, LayerId } from '../data/anatomyCatalog';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { computePhysiologyMetrics } from '../sim/physiologyMath';

// Pre-allocated math helpers outside the render loop (Zero-GC discipline)
const _vec3 = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();
const _color = new THREE.Color();

const LAYER_EXPLODE_OFFSETS: Record<LayerId, [number, number, number]> = {
  skin: [-0.55, 0, 0.15],
  fat: [-0.35, 0, 0.1],
  muscle: [-0.18, 0, 0.05],
  skeleton: [0, 0, 0],
  organs: [0.18, 0, 0.08],
  vessels: [0.36, 0, 0.05],
  nerves: [0.52, 0, 0],
  lymph: [0.68, 0, -0.05],
};

export const BodyViewport3D: React.FC = () => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const storeRef = useRef(useSimulatorStore.getState());

  // Subscribe store updates into ref so WebGL loop never tears down canvas
  useEffect(() => {
    const unsub = useSimulatorStore.subscribe((state) => {
      storeRef.current = state;
    });
    return unsub;
  }, []);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software WebGL detection from GPU renderer string
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = Math.max(320, container.clientWidth || Math.floor(window.innerWidth * 0.65));
    const height = Math.max(320, container.clientHeight || Math.floor(window.innerHeight * 0.85));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.045);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 30);
    camera.position.set(0.0, 0.08, 2.38);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Mandatory RoomEnvironment Studio Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Balanced 3-Point Warm/Cool Studio Lighting Rig (Bright Clinical Daylight)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 1.25);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf0, 1.85);
    keyLight.position.set(1.8, 2.4, 2.4);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.95);
    fillLight.position.set(-2.0, 0.8, 1.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xbae6fd, 0.9);
    rimLight.position.set(0.0, 1.8, -2.0);
    scene.add(rimLight);

    // 4. Anatomical Pedestal & Contact Shadow Disc
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, -0.84, 0);
    const pedestalBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.52, 0.04, 36),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.15 }),
    );
    const pedestalRing = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.445, 48),
      new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide }),
    );
    pedestalRing.rotation.x = -Math.PI / 2;
    pedestalRing.position.y = 0.022;

    const shadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.36, 32),
      new THREE.MeshBasicMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.024;
    pedestalGroup.add(pedestalBase, pedestalRing, shadowDisc);
    scene.add(pedestalGroup);

    // 5. Build Procedural Layered Human Anatomy
    // Note: Three.js discards fragments where dot(vClipPosition, plane.xyz) > plane.w.
    // With normal (0, -1, 0), constant = 5.0 ensures nothing is clipped when sliceAxis === 'none'.
    const clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 5.0);
    const anatomy = buildProceduralAnatomy(clippingPlane);
    scene.add(anatomy.rootGroup);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 6. OrbitControls with user interaction tracking
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.45;
    controls.maxDistance = 4.2;
    controls.target.set(0, 0.12, 0);
    controls.update();

    let cameraTransitionActive = false;
    let lastSelectedPartId = storeRef.current.selectedPartId;

    controls.addEventListener('start', () => {
      cameraTransitionActive = false;
    });

    // 7. Raycasting Click-to-Select
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const visibleMeshes = anatomy.pickableMeshes.filter((m) => {
        const lid = m.userData.layerId as LayerId;
        return anatomy.layerGroups[lid]?.visible && m.visible;
      });

      const hits = raycaster.intersectObjects(visibleMeshes, false);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const partId = hitObj.userData.partId as string | undefined;
        let sub: { nameEn: string; nameLatin: string } | null = null;
        const substructures = hitObj.userData.substructures as
          | { nameEn: string; nameLatin: string }[]
          | undefined;
        if (substructures && hits[0].faceIndex != null && hitObj instanceof THREE.Mesh) {
          const vertIdx = hits[0].faceIndex * 3;
          const grp = hitObj.geometry.groups.find(
            (g: { start: number; count: number; materialIndex?: number }) =>
              vertIdx >= g.start && vertIdx < g.start + g.count,
          );
          if (grp && grp.materialIndex != null && substructures[grp.materialIndex]) {
            sub = substructures[grp.materialIndex];
          }
        }
        if (partId) {
          useSimulatorStore.getState().selectPart(partId, sub);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    let frameId = 0;
    let lastTime = performance.now();
    let cardiacPhase = 0;
    let respPhase = 0;
    let gaitPhase = 0;

    function updateSceneAndRender(rawDt: number) {
      const st = storeRef.current;
      const dt = st.isPlaying && !st.reducedMotion ? rawDt : 0;

      if (dt > 0) {
        st.advanceSimulationTime(dt);
      }

      const metrics = computePhysiologyMetrics(st.params);

      // Update pixel ratio if quality changed
      if (!isSoftwareGl) {
        const targetPr =
          st.quality === 'low'
            ? 1
            : st.quality === 'medium'
              ? Math.min(window.devicePixelRatio, 1.5)
              : Math.min(window.devicePixelRatio, 2);
        if (renderer.getPixelRatio() !== targetPr) {
          renderer.setPixelRatio(targetPr);
        }
      }

      // Update Clipping Plane
      if (st.sliceAxis === 'none') {
        clippingPlane.normal.set(0, -1, 0);
        clippingPlane.constant = 5.0;
      } else if (st.sliceAxis === 'axial') {
        clippingPlane.normal.set(0, -1, 0);
        clippingPlane.constant = st.slicePosition * 0.85;
      } else if (st.sliceAxis === 'sagittal') {
        clippingPlane.normal.set(-1, 0, 0);
        clippingPlane.constant = st.slicePosition * 0.35;
      } else if (st.sliceAxis === 'coronal') {
        clippingPlane.normal.set(0, 0, -1);
        clippingPlane.constant = st.slicePosition * 0.25;
      }

      // Life-stage and body composition scaling
      const hScale = metrics.ageProportionScale.heightScale;
      const wScale = metrics.ageProportionScale.torsoWidthScale;
      anatomy.rootGroup.scale.set(hScale * wScale, hScale, hScale * wScale);
      anatomy.rootGroup.position.y = (1 - hScale) * -0.82;

      // Update Layers Visibility, Opacity, X-Ray, and Exploded Offsets
      for (const [lid, lState] of Object.entries(st.layers) as [
        LayerId,
        { visible: boolean; opacity: number },
      ][]) {
        const group = anatomy.layerGroups[lid];
        group.visible = lState.visible;
        const offset = LAYER_EXPLODE_OFFSETS[lid];
        group.position.x = THREE.MathUtils.damp(
          group.position.x,
          offset[0] * st.explodedFactor,
          8,
          Math.max(0.016, rawDt),
        );
        group.position.z = THREE.MathUtils.damp(
          group.position.z,
          offset[2] * st.explodedFactor,
          8,
          Math.max(0.016, rawDt),
        );
      }

      // Highlight selected part & apply Isolate Mode / X-Ray Mode
      for (const mesh of anatomy.pickableMeshes) {
        const partId = mesh.userData.partId as string;
        const lid = mesh.userData.layerId as LayerId;
        const layerCfg = st.layers[lid];
        const isSelected = partId === st.selectedPartId;
        const isExactSubstructure =
          isSelected &&
          st.selectedSubstructure &&
          mesh.userData.anatomicalNameEn === st.selectedSubstructure.nameEn;

        if (st.isolateSelectedPart) {
          mesh.visible = isSelected;
        } else {
          mesh.visible = true;
        }

        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        const intrinsicOpacity = (mesh.userData.intrinsicOpacity as number | undefined) ?? 1.0;
        const rawLayerOpacity =
          lid === 'muscle' && layerCfg.opacity < 0.75 && mesh.userData.isZAnatomy
            ? layerCfg.opacity * 0.38
            : layerCfg.opacity;

        const targetOpacity = st.xrayMode
          ? 0.2
          : rawLayerOpacity * intrinsicOpacity;

        mat.opacity = targetOpacity;
        mat.transparent = targetOpacity < 0.96 || st.xrayMode;
        mat.side =
          st.sliceAxis !== 'none' || targetOpacity >= 0.8
            ? THREE.DoubleSide
            : THREE.FrontSide;
        // Solid layers write to depth buffer; translucent outer layers allow inner anatomy to remain visible
        mat.depthWrite = layerCfg.opacity >= 0.75 && intrinsicOpacity >= 0.8 && !st.xrayMode;

        if (isExactSubstructure) {
          mat.emissive.setHex(st.colorBlindSafe ? 0x0284c7 : 0x0ea5e9);
          mat.emissiveIntensity = 0.52;
        } else if (isSelected) {
          mat.emissive.setHex(st.colorBlindSafe ? 0x0284c7 : 0x0ea5e9);
          mat.emissiveIntensity = st.selectedSubstructure ? 0.16 : 0.28;
        } else {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      }

      // Color-code muscle activation in Musculoskeletal mode
      const act = metrics.muscleActivations;
      const applyMuscleGlow = (meshes: THREE.Mesh[], pct: number) => {
        const ratio = pct / 100;
        for (const m of meshes) {
          if (m.userData.partId === st.selectedPartId) continue;
          const mat = m.material as THREE.MeshPhysicalMaterial;
          mat.emissive.setHex(st.colorBlindSafe ? 0xf59e0b : 0xef4444);
          mat.emissiveIntensity = ratio * 0.45;
        }
      };
      applyMuscleGlow(anatomy.muscleMeshesByRegion.pectorals, act.pectorals);
      applyMuscleGlow(anatomy.muscleMeshesByRegion.biceps, act.biceps);
      applyMuscleGlow(anatomy.muscleMeshesByRegion.coreAbdominals, act.coreAbdominals);
      applyMuscleGlow(anatomy.muscleMeshesByRegion.quadriceps, act.quadriceps);
      applyMuscleGlow(anatomy.muscleMeshesByRegion.hamstringsCalves, act.hamstringsCalves);

      // Smooth Camera Focus on Part Selection Change
      if (st.selectedPartId !== lastSelectedPartId) {
        lastSelectedPartId = st.selectedPartId;
        cameraTransitionActive = true;
      }
      if (cameraTransitionActive) {
        const part = ANATOMY_PARTS.find((p) => p.id === st.selectedPartId);
        if (part) {
          _targetLook.set(...part.focusPosition);
          _targetPos.set(
            part.focusPosition[0] + part.cameraOffset[0],
            part.focusPosition[1] + part.cameraOffset[1] * 0.35,
            part.cameraOffset[2] + 0.55,
          );
          const stepAlpha = 1 - Math.exp(-6 * Math.max(0.016, rawDt));
          controls.target.lerp(_targetLook, stepAlpha);
          camera.position.lerp(_targetPos, stepAlpha);
          if (camera.position.distanceTo(_targetPos) < 0.03) {
            cameraTransitionActive = false;
          }
        }
      }

      // 9. Physiological Animations
      // A. 4-Chamber Cardiac Cycle
      cardiacPhase = (cardiacPhase + dt * (metrics.heartRateBpm / 60)) % 1;
      const atrialCont = Math.exp(-Math.pow((cardiacPhase - 0.16) / 0.06, 2));
      const ventCont = Math.exp(-Math.pow((cardiacPhase - 0.34) / 0.08, 2));
      const aScale = 1 - atrialCont * 0.16;
      const vScale = 1 - ventCont * 0.22;
      anatomy.heartAtriaGroup.scale.set(aScale, aScale, aScale);
      anatomy.heartVentriclesGroup.scale.set(vScale, 1 - ventCont * 0.12, vScale);

      // B. Respiratory Lung Inflation & Diaphragm Excursion
      respPhase = (respPhase + dt * (metrics.respiratoryRateBpm / 60)) % 1;
      const breathWave = 0.5 - 0.5 * Math.cos(respPhase * Math.PI * 2);
      const tvFactor = (metrics.tidalVolumeMl / 500) * 0.14;
      const lungScaleXZ = 1 + breathWave * tvFactor;
      const lungScaleY = 1 + breathWave * tvFactor * 0.85;
      anatomy.leftLungGroup.scale.set(lungScaleXZ, lungScaleY, lungScaleXZ);
      anatomy.rightLungGroup.scale.set(lungScaleXZ, lungScaleY, lungScaleXZ);
      anatomy.diaphragmMesh.position.y = 0.255 - breathWave * 0.028;

      // C. Digestive Bolus Progression & Gastric Peristalsis
      const giCurve = anatomy.bolusMesh.userData.giCurve as THREE.CatmullRomCurve3;
      if (giCurve) {
        giCurve.getPointAt(metrics.bolusProgress01, _vec3);
        anatomy.bolusMesh.position.copy(_vec3);
      }
      const churnPulse = 1 + Math.sin(performance.now() * 0.004) * 0.06;
      anatomy.stomachMesh.scale.set(churnPulse, 1 / churnPulse, churnPulse);

      // D. Urinary Bladder Fill Level
      const bScale = 0.7 + (metrics.bladderFillPercent / 100) * 0.55;
      anatomy.bladderMesh.scale.set(bScale, bScale, bScale);

      // E. GPU Blood Cell Particles
      const flowSpeed = 0.22 * (metrics.cardiacOutputLMin / 5.0) * metrics.relativeVesselFlow;
      const artHex = st.colorBlindSafe ? 0xf97316 : 0xef4444;
      const venHex = st.colorBlindSafe ? 0x38bdf8 : 0x3b82f6;

      for (let i = 0; i < anatomy.bloodCellPaths.length; i++) {
        const item = anatomy.bloodCellPaths[i];
        item.offset = (item.offset + dt * flowSpeed) % 1;
        item.curve.getPointAt(item.offset, _vec3);
        _dummyObj.position.copy(_vec3);
        _dummyObj.scale.set(1, 1, 1);
        _dummyObj.updateMatrix();
        anatomy.bloodCellsInstanced.setMatrixAt(i, _dummyObj.matrix);
        _color.setHex(item.isArterial ? artHex : venHex);
        anatomy.bloodCellsInstanced.setColorAt(i, _color);
      }
      anatomy.bloodCellsInstanced.instanceMatrix.needsUpdate = true;
      if (anatomy.bloodCellsInstanced.instanceColor) {
        anatomy.bloodCellsInstanced.instanceColor.needsUpdate = true;
      }

      // F. Neural Action Potential Impulses & Patellar Knee-Jerk Reflex Kick
      const reflexElapsedMs = st.params.reflexTriggerTime
        ? Date.now() - st.params.reflexTriggerTime
        : 99999;
      const isReflexActive = reflexElapsedMs < 1400;
      const nerveSpeed =
        (0.35 + (metrics.neuralFiringHz / 60) * 0.4) * (isReflexActive ? 2.2 : 1.0);

      for (let i = 0; i < anatomy.nervePaths.length; i++) {
        const np = anatomy.nervePaths[i];
        np.offset = (np.offset + dt * nerveSpeed) % 1;
        np.curve.getPointAt(np.offset, _vec3);
        _dummyObj.position.copy(_vec3);
        const s = np.isReflexArc && isReflexActive ? 1.65 : 1.0;
        _dummyObj.scale.set(s, s, s);
        _dummyObj.updateMatrix();
        anatomy.nerveImpulsesInstanced.setMatrixAt(i, _dummyObj.matrix);
      }
      anatomy.nerveImpulsesInstanced.instanceMatrix.needsUpdate = true;

      // Knee-jerk leg extension or gait pose
      gaitPhase += dt * (st.params.activePose === 'run_sprint' ? 6 : 3);
      if (isReflexActive) {
        const kickAngle = Math.sin(Math.min(1, reflexElapsedMs / 650) * Math.PI) * 0.58;
        anatomy.rightLowerLegGroup.rotation.x = -kickAngle;
      } else if (
        st.params.activePose === 'walk_gait' ||
        st.params.activePose === 'run_sprint'
      ) {
        anatomy.rightLowerLegGroup.rotation.x = Math.sin(gaitPhase) * 0.35;
      } else if (st.params.activePose === 'squat_load') {
        anatomy.rightLowerLegGroup.rotation.x = 0.42;
      } else {
        anatomy.rightLowerLegGroup.rotation.x = THREE.MathUtils.damp(
          anatomy.rightLowerLegGroup.rotation.x,
          0,
          8,
          Math.max(0.016, rawDt),
        );
      }

      controls.update();
      renderer.render(scene, camera);
    }

    // ResizeObserver + Window resize handler that re-renders immediately
    const handleResize = () => {
      if (!container) return;
      const w = Math.max(320, container.clientWidth || Math.floor(window.innerWidth * 0.65));
      const h = Math.max(320, container.clientHeight || Math.floor(window.innerHeight * 0.85));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      updateSceneAndRender(0.016);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // 8. Paced Render Loop (`afterDraw` on software WebGL, `requestAnimationFrame` on GPU)
    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (!sync) {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const now = performance.now();
      const rawDt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      updateSceneAndRender(rawDt);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    let disposed = false;

    const unsubImmediateRender = useSimulatorStore.subscribe((next, prev) => {
      if (disposed) return;
      if (
        next.layers !== prev.layers ||
        next.xrayMode !== prev.xrayMode ||
        next.isolateSelectedPart !== prev.isolateSelectedPart ||
        next.sliceAxis !== prev.sliceAxis ||
        next.slicePosition !== prev.slicePosition ||
        next.explodedFactor !== prev.explodedFactor ||
        next.selectedPartId !== prev.selectedPartId ||
        next.atlasLoadedCount !== prev.atlasLoadedCount
      ) {
        updateSceneAndRender(0.016);
      }
    });

    // Stream in the real 3,400+ mesh Z-Anatomy / BodyParts3D Draco GLB human atlas
    loadRealZAnatomyAtlas(
      anatomy,
      (loadedCount) => {
        if (disposed) return;
        useSimulatorStore.getState().setAtlasLoadedCount(loadedCount);
      },
      () => disposed,
    );

    // Perform an immediate synchronous initial render so the canvas is never blank on first paint
    updateSceneAndRender(0.016);
    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      unsubImmediateRender();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={canvasMountRef}
      data-testid="anatomy-3d-viewport"
      aria-label="Interactive 3D Human Body Anatomical Viewport"
      className="w-full h-full relative overflow-hidden bg-[#f1f5f9]"
    />
  );
};
