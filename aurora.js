/* 첫 화면 오로라 배경 — React Bits "Aurora"를 일반 홈페이지용으로 옮김 (ogl 사용)
   색은 홈페이지 레드 계열, 밝은 바탕용(lightMode)으로 설정 */

const SETTINGS = {
  colorStops: ['#ff2d36', '#e10f1a', '#ff2d36'],
  amplitude: 1.0,
  blend: 0.5,
  lightMode: true,
  speed: 1.0
};

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform float uLightMode;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  vec3 auroraColor = intensity * rampColor;

  if (uLightMode > 0.5) {
    float energy = clamp(max(intensity, 0.0), 0.0, 1.0);
    float coverage = clamp(auroraAlpha * (0.55 + 0.45 * energy), 0.0, 0.86);
    vec3 chroma = pow(clamp(rampColor, 0.0, 1.0), vec3(1.2));
    float chromaPeak = max(chroma.r, max(chroma.g, chroma.b));
    chroma /= max(chromaPeak, 0.0001);
    fragColor = vec4(mix(vec3(1.0), chroma, min(coverage * 1.08, 0.94)), 1.0);
  } else {
    fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
  }
}
`;

/* 설치한 ogl(node_modules)을 먼저 쓰고, 없으면(예: 인터넷에 올렸을 때) 같은 버전을 CDN에서 불러옴 */
async function loadOgl() {
  try {
    return await import('./node_modules/ogl/src/index.js');
  } catch (e) {
    return await import('https://cdn.jsdelivr.net/npm/ogl@1.0.11/src/index.js');
  }
}

async function initAurora() {
  const ctn = document.getElementById('aurora');
  if (!ctn) return;

  let ogl;
  try { ogl = await loadOgl(); } catch (e) { return; } /* 불러오지 못하면 기존 배경 그대로 */
  const { Renderer, Program, Mesh, Color, Triangle } = ogl;

  let renderer;
  try {
    renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true });
  } catch (e) { return; } /* WebGL을 못 쓰는 기기 */
  const gl = renderer.gl;
  if (!gl) return;
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.canvas.style.backgroundColor = 'transparent';

  const toRgb = hex => { const c = new Color(hex); return [c.r, c.g, c.b]; };

  const geometry = new Triangle(gl);
  if (geometry.attributes.uv) delete geometry.attributes.uv;

  const program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uAmplitude: { value: SETTINGS.amplitude },
      uColorStops: { value: SETTINGS.colorStops.map(toRgb) },
      uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
      uBlend: { value: SETTINGS.blend },
      uLightMode: { value: SETTINGS.lightMode ? 1 : 0 }
    }
  });

  const mesh = new Mesh(gl, { geometry, program });
  ctn.appendChild(gl.canvas);

  function resize() {
    const w = ctn.offsetWidth, h = ctn.offsetHeight;
    renderer.setSize(w, h);
    program.uniforms.uResolution.value = [w, h];
  }
  window.addEventListener('resize', resize);
  resize();

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animateId = 0;
  let visible = true;

  const draw = t => {
    program.uniforms.uTime.value = t * 0.01 * SETTINGS.speed * 0.1;
    renderer.render({ scene: mesh });
  };
  const loop = t => {
    if (!visible) { animateId = 0; return; }
    animateId = requestAnimationFrame(loop);
    draw(t);
  };

  if (reduce) {
    draw(3000); /* 움직임 줄이기: 멈춘 한 장면만 */
  } else {
    animateId = requestAnimationFrame(loop);
    /* 첫 화면이 안 보일 때는 그리기를 멈춰 배터리 절약 */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible && !animateId) animateId = requestAnimationFrame(loop);
      }).observe(ctn);
    }
  }
  ctn.classList.add('is-on');
}

initAurora();
