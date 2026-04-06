import {
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
} from 'postprocessing';
import { useEffect, useRef, type CSSProperties } from 'react';
import * as THREE from 'three';

type GridScanProps = {
  sensitivity?: number;
  lineThickness?: number;
  linesColor?: string;
  gridScale?: number;
  scanColor?: string;
  scanOpacity?: number;
  enablePost?: boolean;
  bloomIntensity?: number;
  chromaticAberration?: number;
  noiseIntensity?: number;
  className?: string;
  style?: CSSProperties;
};

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uPointer;
uniform float uSensitivity;
uniform float uLineThickness;
uniform float uGridScale;
uniform float uScanOpacity;
uniform float uNoiseIntensity;
uniform vec3 uLinesColor;
uniform vec3 uScanColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float lineMask(vec2 gridUv, float thickness) {
  vec2 cell = abs(fract(gridUv - 0.5) - 0.5) / max(fwidth(gridUv), vec2(0.0001));
  return 1.0 - min(min(cell.x, cell.y) / max(thickness, 0.5), 1.0);
}

void main() {
  vec2 p = (2.0 * (vUv * uResolution) - uResolution.xy) / max(uResolution.y, 1.0);
  vec2 drift = uPointer * vec2(0.1, 0.08) * uSensitivity;

  vec3 ro = vec3(0.0, 0.0, -0.45);
  vec3 rd = normalize(vec3(p + drift, 2.25));

  float yaw = drift.x * 0.18;
  float tilt = drift.y * 0.12;
  float cy = cos(yaw);
  float sy = sin(yaw);
  float ct = cos(tilt);
  float st = sin(tilt);
  rd.xz = mat2(cy, -sy, sy, cy) * rd.xz;
  rd.yz = mat2(ct, -st, st, ct) * rd.yz;

  float tunnelHalfWidth = 0.98;
  float tunnelHalfHeight = 0.52;
  float nearestT = 1e9;
  vec3 hit = vec3(0.0);
  vec2 gridUv = vec2(0.0);
  float wallMask = 0.0;
  float surfaceKind = 0.0;

  float tx1 = (-tunnelHalfWidth - ro.x) / rd.x;
  if (tx1 > 0.0) {
    vec3 hp = ro + rd * tx1;
    if (abs(hp.y) <= tunnelHalfHeight && tx1 < nearestT) {
      nearestT = tx1;
      hit = hp;
      gridUv = hp.zy;
      wallMask = 1.0;
      surfaceKind = 1.0;
    }
  }

  float tx2 = (tunnelHalfWidth - ro.x) / rd.x;
  if (tx2 > 0.0) {
    vec3 hp = ro + rd * tx2;
    if (abs(hp.y) <= tunnelHalfHeight && tx2 < nearestT) {
      nearestT = tx2;
      hit = hp;
      gridUv = hp.zy;
      wallMask = 1.0;
      surfaceKind = 1.0;
    }
  }

  float ty1 = (-tunnelHalfHeight - ro.y) / rd.y;
  if (ty1 > 0.0) {
    vec3 hp = ro + rd * ty1;
    if (abs(hp.x) <= tunnelHalfWidth && ty1 < nearestT) {
      nearestT = ty1;
      hit = hp;
      gridUv = hp.xz;
      wallMask = 1.0;
      surfaceKind = 2.0;
    }
  }

  float ty2 = (tunnelHalfHeight - ro.y) / rd.y;
  if (ty2 > 0.0) {
    vec3 hp = ro + rd * ty2;
    if (abs(hp.x) <= tunnelHalfWidth && ty2 < nearestT) {
      nearestT = ty2;
      hit = hp;
      gridUv = hp.xz;
      wallMask = 1.0;
      surfaceKind = 2.0;
    }
  }

  if (wallMask < 0.5) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float scale = max(uGridScale, 0.001);
  vec2 grid = gridUv / scale;
  float minorLine = lineMask(grid, uLineThickness);
  float majorLine = lineMask(grid * 0.5, uLineThickness * 1.6);
  float line = max(minorLine, majorLine * 0.55);

  float pulse = 0.5 + 0.5 * sin(uTime * 0.32);
  float scanCenter = mix(1.1, 8.2, pulse);
  float scanBand = exp(-13.0 * abs(hit.z - scanCenter));
  float scanGlow = exp(-2.5 * abs(hit.z - scanCenter));
  float horizonBand = exp(-28.0 * abs(hit.y + 0.015));

  float depthFade = exp(-0.08 * max(hit.z, 0.0));
  float farFade = 1.0 - smoothstep(8.5, 14.0, hit.z);
  float edgeX = smoothstep(0.38, tunnelHalfWidth, abs(hit.x));
  float edgeY = smoothstep(0.2, tunnelHalfHeight, abs(hit.y));
  float edgeGlow = max(edgeX, edgeY);
  float centerVoid = 1.0 - smoothstep(0.0, 0.34, length(p));
  float vignette = smoothstep(2.1, 0.08, length(p));
  float depthGlow = smoothstep(0.0, 3.2, hit.z);
  float noise = (hash(gl_FragCoord.xy + uTime * 120.0) - 0.5) * uNoiseIntensity;

  float floorBoost = surfaceKind > 1.5 ? 1.15 : 0.96;
  vec3 gridBase = uLinesColor * line * (0.78 + 0.5 * edgeGlow + 0.22 * depthGlow) * depthFade * floorBoost;
  vec3 ambient = uLinesColor * (0.06 + 0.08 * edgeGlow) * vignette * farFade;
  vec3 sweep = uScanColor * (scanBand * (uScanOpacity + line * 0.55) + scanGlow * 0.08 + horizonBand * 0.08) * vignette;
  vec3 color = gridBase + ambient + sweep;
  color += uLinesColor * 0.08 * edgeGlow * vignette;
  color -= vec3(centerVoid * farFade * 0.14);
  color += noise;

  float alpha = clamp((line * depthFade * farFade + scanGlow * 0.2) * vignette, 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}
`;

function toLinearColor(hex: string) {
  return new THREE.Color(hex).convertSRGBToLinear();
}

export default function GridScan({
  sensitivity = 0.4,
  lineThickness = 1.1,
  linesColor = '#3558ff',
  gridScale = 0.12,
  scanColor = '#ff5ce1',
  scanOpacity = 0.34,
  enablePost = true,
  bloomIntensity = 0.9,
  chromaticAberration = 0.0014,
  noiseIntensity = 0.004,
  className,
  style,
}: GridScanProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerTargetRef = useRef(new THREE.Vector2(0, 0));
  const pointerCurrentRef = useRef(new THREE.Vector2(0, 0));
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uResolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uSensitivity: { value: sensitivity },
      uLineThickness: { value: lineThickness },
      uGridScale: { value: gridScale },
      uScanOpacity: { value: scanOpacity },
      uNoiseIntensity: { value: noiseIntensity },
      uLinesColor: { value: toLinearColor(linesColor) },
      uScanColor: { value: toLinearColor(scanColor) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    let composer: EffectComposer | null = null;
    if (enablePost) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));

      const bloom = new BloomEffect({ intensity: bloomIntensity });
      const chroma = new ChromaticAberrationEffect({
        offset: new THREE.Vector2(chromaticAberration, chromaticAberration),
        radialModulation: true,
        modulationOffset: 0,
      });
      const effectPass = new EffectPass(camera, bloom, chroma);
      effectPass.renderToScreen = true;
      composer.addPass(effectPass);
    }

    const handlePointerMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      pointerTargetRef.current.set(x, y);
    };

    const handlePointerLeave = () => {
      pointerTargetRef.current.set(0, 0);
    };

    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      material.uniforms.uResolution.value.set(width, height);
      composer?.setSize(width, height);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    const renderFrame = () => {
      const elapsed = clock.getElapsedTime();
      pointerCurrentRef.current.lerp(pointerTargetRef.current, 0.06);
      material.uniforms.uTime.value = elapsed;
      material.uniforms.uPointer.value.copy(pointerCurrentRef.current);

      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      animationFrameRef.current = window.requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('resize', handleResize);
      composer?.dispose();
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      container.removeChild(renderer.domElement);
    };
  }, [
    bloomIntensity,
    chromaticAberration,
    enablePost,
    gridScale,
    lineThickness,
    linesColor,
    noiseIntensity,
    scanColor,
    scanOpacity,
    sensitivity,
  ]);

  return <div ref={containerRef} className={className} style={style} />;
}
