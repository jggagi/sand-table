import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import { OrthographicCamera, Vector3, type WebGLRenderer } from 'three';
import GardenScene from './GardenScene';
import { SCENE_SEED } from '../data/liuyuan.layout';
import { CAMERA_LIMITS, getFittedZoom, getViewPreset, type ViewId } from '../data/liuyuan.views';

type RenderStatus = 'loading' | 'ready' | 'error';
interface GardenCanvasProps {
  viewId: ViewId;
  requestId: number;
  onViewChange: (id: ViewId | null) => void;
  onStatus: (status: RenderStatus, message?: string) => void;
}
export interface GardenDiagnostics {
  ready: boolean;
  view: ViewId | null;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  position: number[];
  target: number[];
  calls: number;
  triangles: number;
  renderer: string;
  frames: number;
  seed: number;
  objects: number;
}
declare global { interface Window { __LIUYUAN__?: GardenDiagnostics } }

function rendererName(renderer: WebGLRenderer): string {
  const context = renderer.getContext();
  const info = context.getExtension('WEBGL_debug_renderer_info');
  return String(info ? context.getParameter(info.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER));
}

function CameraRig(props: GardenCanvasProps) {
  const controls = useRef<CameraControlsImpl>(null);
  const callbacks = useRef(props);
  callbacks.current = props;
  const { camera, gl, size, scene, invalidate } = useThree();
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const lastRequest = useRef(-1);
  const settleFrame = useRef<number | null>(null);
  const fittedZoom = useRef(0);
  const stableFrames = useRef(0);
  const previous = useMemo(() => ({ position: new Vector3(Infinity, Infinity, Infinity), target: new Vector3(Infinity, Infinity, Infinity), zoom: -1 }), []);
  const target = useMemo(() => new Vector3(), []);
  const diagnostics = useMemo<GardenDiagnostics>(() => ({
    ready: false, view: 'overview', zoom: 1, minZoom: 1, maxZoom: 1,
    position: [0, 0, 0], target: [0, 0, 0], calls: 0, triangles: 0,
    renderer: rendererName(gl), frames: 0, seed: SCENE_SEED, objects: 0,
  }), [gl]);

  useEffect(() => {
    window.__LIUYUAN__ = diagnostics;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches);
    media.addEventListener('change', change);
    return () => {
      media.removeEventListener('change', change);
      if (window.__LIUYUAN__ === diagnostics) delete window.__LIUYUAN__;
    };
  }, [diagnostics]);

  const scheduleSettling = useCallback(() => {
    if (settleFrame.current !== null) cancelAnimationFrame(settleFrame.current);
    const tick = () => {
      settleFrame.current = null;
      if (diagnostics.ready) return;
      invalidate(2);
      settleFrame.current = requestAnimationFrame(tick);
    };
    settleFrame.current = requestAnimationFrame(tick);
  }, [diagnostics, invalidate]);

  useEffect(() => () => {
    if (settleFrame.current !== null) cancelAnimationFrame(settleFrame.current);
  }, []);

  // Apply an explicit request in the commit, before the next painted frame.
  useLayoutEffect(() => {
    const controller = controls.current;
    if (!controller) return;
    const view = getViewPreset(props.viewId);
    const nextZoom = getFittedZoom(size.width, size.height, view);
    const newRequest = lastRequest.current !== props.requestId;
    const zoomRatio = fittedZoom.current > 0 ? (camera as OrthographicCamera).zoom / fittedZoom.current : 1;
    controller.stop();
    controller.minZoom = nextZoom * CAMERA_LIMITS.minZoomRatio;
    controller.maxZoom = nextZoom * CAMERA_LIMITS.maxZoomRatio;
    controller.smoothTime = reducedMotion ? 0.001 : 0.38;
    controller.draggingSmoothTime = reducedMotion ? 0.001 : 0.12;
    // Restore the active preset and its fitted zoom when resize or a motion
    // preference interrupts a transition. Manual views keep their own framing.
    if (newRequest || diagnostics.view === props.viewId) {
      diagnostics.view = props.viewId;
      const animate = newRequest && lastRequest.current !== -1 && !reducedMotion;
      void controller.setLookAt(...view.position, ...view.target, animate);
      void controller.zoomTo(nextZoom, animate);
      if (!animate) {
        controller.update(0);
        // Observe the controller's actual transform immediately; rendering readiness
        // is still granted only after real, stable frames below.
        camera.position.toArray(diagnostics.position);
        controller.getTarget(target).toArray(diagnostics.target);
        diagnostics.zoom = (camera as OrthographicCamera).zoom;
      }
      lastRequest.current = props.requestId;
    } else {
      // Free observation keeps its orientation and relative zoom after resize.
      void controller.zoomTo(Math.min(controller.maxZoom, Math.max(controller.minZoom, nextZoom * zoomRatio)), false);
    }
    fittedZoom.current = nextZoom;
    stableFrames.current = 0;
    diagnostics.ready = false;
    callbacks.current.onStatus('loading');
    scheduleSettling();
    invalidate(2);
  }, [props.requestId, props.viewId, size.width, size.height, reducedMotion, camera, diagnostics, invalidate, scheduleSettling]);

  const markManual = useCallback(() => {
    if (diagnostics.view !== null) {
      diagnostics.view = null;
      callbacks.current.onViewChange(null);
    }
    if (diagnostics.ready) callbacks.current.onStatus('loading');
    diagnostics.ready = false;
    stableFrames.current = 0;
    scheduleSettling();
    invalidate(2);
  }, [diagnostics, invalidate, scheduleSettling]);

  useEffect(() => {
    const controller = controls.current;
    if (!controller) return;
    const wheelStart = () => { controller.stop(); markManual(); };
    controller.addEventListener('control', markManual);
    // Stop a preset before the controller applies the user's wheel delta.
    gl.domElement.addEventListener('wheel', wheelStart, { capture: true, passive: true });
    return () => {
      controller.removeEventListener('control', markManual);
      gl.domElement.removeEventListener('wheel', wheelStart, true);
    };
  }, [gl, markManual]);

  useFrame(() => {
    const controller = controls.current;
    if (!controller) return;
    controller.getTarget(target);
    const zoom = (camera as OrthographicCamera).zoom;
    const stationary = camera.position.distanceToSquared(previous.position) < 0.0000001
      && target.distanceToSquared(previous.target) < 0.0000001 && Math.abs(zoom - previous.zoom) < 0.0001;
    stableFrames.current = stationary ? stableFrames.current + 1 : 0;
    previous.position.copy(camera.position);
    previous.target.copy(target);
    previous.zoom = zoom;
    diagnostics.frames += 1;
    diagnostics.zoom = zoom;
    diagnostics.minZoom = controller.minZoom;
    diagnostics.maxZoom = controller.maxZoom;
    camera.position.toArray(diagnostics.position);
    target.toArray(diagnostics.target);
    diagnostics.calls = gl.info.render.calls;
    diagnostics.triangles = gl.info.render.triangles;
    if (!diagnostics.objects && scene.getObjectByName('liuyuan-artistic-miniature')) scene.traverse(object => { if (object.type === 'Mesh' || object.type === 'InstancedMesh') diagnostics.objects += 1; });
    if (stableFrames.current >= 5 && diagnostics.calls > 10 && diagnostics.triangles > 1000) {
      if (!diagnostics.ready) {
        diagnostics.ready = true;
        gl.domElement.dataset.renderReady = 'true';
        callbacks.current.onStatus('ready');
      }
    } else {
      gl.domElement.dataset.renderReady = 'false';
      invalidate();
    }
  });

  return <CameraControls ref={controls} makeDefault
    minPolarAngle={CAMERA_LIMITS.minPolarAngle} maxPolarAngle={CAMERA_LIMITS.maxPolarAngle}
    mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, middle: CameraControlsImpl.ACTION.NONE, right: CameraControlsImpl.ACTION.NONE, wheel: CameraControlsImpl.ACTION.ZOOM }}
    touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_ZOOM, three: CameraControlsImpl.ACTION.NONE }}
    onStart={() => { controls.current?.stop(); markManual(); }}
    onChange={() => invalidate()} />;
}

class SceneBoundary extends Component<{ children: ReactNode; onError: (message: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.onError(`场景初始化失败：${error.message}`); }
  render() { return this.state.failed ? null : this.props.children; }
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}

export default function GardenCanvas(props: GardenCanvasProps) {
  const [supported] = useState(hasWebGL);
  const [maxDpr] = useState(() => window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2);
  const callback = useRef(props.onStatus);
  callback.current = props.onStatus;
  useEffect(() => {
    if (!supported) callback.current('error', '此设备或浏览器无法使用 WebGL 2。请启用硬件加速，或换用支持 WebGL 的浏览器后刷新重试。');
  }, [supported]);
  if (!supported) return null;

  return <SceneBoundary onError={message => callback.current('error', message)}>
    <Canvas orthographic shadows="variance" frameloop="demand" dpr={[1, maxDpr]}
      camera={{ position: [34, 30, 40], zoom: 20, near: 0.1, far: 180 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.domElement.setAttribute('aria-label', '留园艺术化三维微缩景观，可拖动旋转与缩放');
        gl.domElement.addEventListener('webglcontextlost', event => {
          event.preventDefault();
          callback.current('error', '三维绘图连接已中断。请刷新页面重新加载场景。');
        }, { once: true });
      }}>
      <ambientLight intensity={0.42} />
      <hemisphereLight args={['#fff6e6', '#a0b2b0', 1.1]} />
      <directionalLight position={[-14, 32, 18]} intensity={2.35} color="#fff3e0" castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-25} shadow-camera-right={25}
        shadow-camera-top={25} shadow-camera-bottom={-25} shadow-camera-near={1} shadow-camera-far={90}
        shadow-bias={-0.0003} shadow-normalBias={0.035} shadow-radius={6} shadow-blurSamples={6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.92, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <shadowMaterial transparent opacity={0.13} />
      </mesh>
      <Suspense fallback={null}><GardenScene /></Suspense>
      <CameraRig {...props} />
    </Canvas>
  </SceneBoundary>;
}
