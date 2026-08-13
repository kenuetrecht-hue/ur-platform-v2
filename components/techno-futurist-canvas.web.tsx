/**
 * Web-only canvas: perspective grid, particles, cursor glow.
 */

import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

type Particle = { x: number; y: number; vx: number; vy: number; size: number; alpha: number };

export function TechnoFuturistCanvas() {
  const hostRef = useRef<View>(null);

  useEffect(() => {
    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host || typeof document === "undefined") return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    });
    host.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let frame = 0;
    let raf = 0;
    const mouse = { x: 0.5, y: 0.35, active: false };
    const particles: Particle[] = [];

    const resize = () => {
      const rect = host.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seedParticles = () => {
      particles.length = 0;
      const count = Math.min(80, Math.floor((w * h) / 18000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          size: 1 + Math.random() * 2,
          alpha: 0.15 + Math.random() * 0.5,
        });
      }
    };

    const onMove = (e: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / rect.width;
      mouse.y = (e.clientY - rect.top) / rect.height;
      mouse.active = true;
    };

    const onLeave = () => {
      mouse.active = false;
    };

    const drawGrid = (t: number) => {
      const horizon = h * 0.38;
      const vanishX = w * (0.5 + (mouse.active ? (mouse.x - 0.5) * 0.08 : 0));
      ctx.strokeStyle = "rgba(129, 140, 248, 0.12)";
      ctx.lineWidth = 1;

      const lines = 18;
      for (let i = 0; i <= lines; i++) {
        const p = i / lines;
        const y = horizon + (h - horizon) * p * p;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      for (let i = -lines; i <= lines; i++) {
        const xBase = vanishX + i * (w / lines) * 0.35;
        ctx.beginPath();
        ctx.moveTo(vanishX, horizon);
        ctx.lineTo(xBase + Math.sin(t * 0.001 + i) * 6, h + 20);
        ctx.stroke();
      }

      const glow = ctx.createRadialGradient(vanishX, horizon, 10, vanishX, horizon, w * 0.55);
      glow.addColorStop(0, "rgba(79, 70, 229, 0.18)");
      glow.addColorStop(0.45, "rgba(124, 58, 237, 0.06)");
      glow.addColorStop(1, "rgba(15, 15, 20, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    };

    const drawParticles = () => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.fillStyle = `rgba(129, 210, 255, ${p.alpha})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawCursorGlow = () => {
      if (!mouse.active) return;
      const cx = mouse.x * w;
      const cy = mouse.y * h;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140);
      g.addColorStop(0, "rgba(129, 140, 248, 0.22)");
      g.addColorStop(1, "rgba(129, 140, 248, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - 140, cy - 140, 280, 280);
    };

    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);
      drawGrid(frame);
      drawParticles();
      drawCursorGlow();
      raf = requestAnimationFrame(tick);
    };

    resize();
    seedParticles();
    window.addEventListener("resize", () => {
      resize();
      seedParticles();
    });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      canvas.remove();
    };
  }, []);

  return <View ref={hostRef} style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]} />;
}
