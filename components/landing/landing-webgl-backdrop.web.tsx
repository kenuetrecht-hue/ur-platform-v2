import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

float grid(vec2 uv, float scale) {
  vec2 g = abs(fract(uv * scale - 0.5) - 0.5) / fwidth(uv * scale);
  float line = min(g.x, g.y);
  return 1.0 - min(line, 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution.xy);
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / u_resolution.y;

  vec3 col = vec3(0.02, 0.03, 0.06);

  float t = u_time * 0.15;
  vec2 gp = vec2(p.x, p.y + t);
  float g = grid(gp + vec2(u_mouse.x * 0.08, u_mouse.y * 0.05), 6.0);
  col += vec3(0.0, 0.55, 0.85) * g * 0.08;

  float horizon = smoothstep(-0.1, 0.35, -p.y);
  col += vec3(0.05, 0.15, 0.35) * horizon * 0.35;

  float glow = exp(-length(p - vec2(u_mouse.x * 0.6, u_mouse.y * 0.4)) * 2.2);
  col += vec3(0.0, 0.75, 1.0) * glow * 0.12;

  for (float i = 0.0; i < 40.0; i++) {
    float fi = i / 40.0;
    vec2 star = vec2(fract(sin(i * 54.32) * 43758.5453), fract(cos(i * 91.17) * 23421.631));
    star = star * 2.0 - 1.0;
    float tw = 0.35 + 0.65 * sin(u_time * (1.0 + fi * 3.0) + i);
    float d = length(p - star * vec2(1.6, 0.9));
    col += vec3(0.4, 0.8, 1.0) * exp(-d * 18.0) * tw * 0.04;
  }

  gl_FragColor = vec4(col, 1.0);
}`;

export function LandingWebglBackdrop() {
  const hostRef = useRef<View>(null);

  useEffect(() => {
    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host || typeof document === "undefined") return;

    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
    host.appendChild(canvas);

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_resolution");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");
    const mouse = { x: 0, y: 0 };

    const onMove = (e: MouseEvent) => {
      const r = host.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = 1 - (e.clientY - r.top) / r.height;
    };

    let w = 1;
    let h = 1;
    let raf = 0;
    const resize = () => {
      const rect = host.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = (t: number) => {
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, t * 0.001);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      canvas.remove();
    };
  }, []);

  return <View ref={hostRef} style={StyleSheet.absoluteFill} pointerEvents="none" />;
}
