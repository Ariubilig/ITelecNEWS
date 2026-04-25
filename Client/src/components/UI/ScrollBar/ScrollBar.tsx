import "./ScrollBar.css";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";


interface ScrollBarProps {
  thumbHeight?: number;
}

// ─── Scroll helpers ──────────────────────────────────────────────────────────
// Kept outside the component: these are pure, stateless, and never need
// to be recreated. Placing them in the module avoids useCallback overhead
// and keeps the component body focused on React lifecycle logic.

function getSmoother() {
  return ScrollSmoother.get();
}

function getScrollY(): number {
  return getSmoother()?.scrollTop() ?? window.scrollY;
}

function getMaxScroll(): number {
  const smoother = getSmoother();
  if (smoother) {
    return (smoother.content() as HTMLElement).scrollHeight - window.innerHeight;
  }
  return document.documentElement.scrollHeight - window.innerHeight;
}

function scrollToPercent(pct: number, maxScroll: number): void {
  const target = Math.max(0, Math.min(1, pct)) * maxScroll;
  getSmoother()?.scrollTo(target, true) ?? window.scrollTo({ top: target, behavior: "smooth" });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ScrollBar({ thumbHeight = 40 }: ScrollBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // Drag state kept in a single ref object — avoids three separate refs and
  // makes the shape of the drag state explicit at a glance.
  const drag = useRef({ active: false, startY: 0, startTop: 0 });

  // ── Thumb position sync ──────────────────────────────────────────────────

  useEffect(() => {
    const thumb = thumbRef.current;
    const track = trackRef.current;
    if (!thumb || !track) return;

    function updateThumb() {
      const max = getMaxScroll();
      if (max <= 0) return;
      const trackRange = track!.clientHeight - thumb!.clientHeight;
      thumb!.style.top = `${(getScrollY() / max) * trackRange}px`;
    }

    // A single GSAP ticker covers both smoother-driven and native scroll
    // updates at the display frame rate — no need for a redundant native
    // "scroll" listener or a ScrollTrigger "refresh" listener alongside it.
    gsap.ticker.add(updateThumb);
    updateThumb(); // paint immediately on mount

    return () => gsap.ticker.remove(updateThumb);
  }, [thumbHeight]);

  // ── Drag-to-scroll ───────────────────────────────────────────────────────

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!drag.current.active || !trackRef.current || !thumbRef.current) return;
      const trackRange = trackRef.current.clientHeight - thumbRef.current.clientHeight;
      const delta = e.clientY - drag.current.startY;
      scrollToPercent((drag.current.startTop + delta) / trackRange, getMaxScroll());
    }

    function onMouseUp() {
      drag.current.active = false;
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []); // no deps — reads live values through refs at event time

  // ── Event handlers ───────────────────────────────────────────────────────

  function onThumbMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    drag.current = {
      active: true,
      startY: e.clientY,
      startTop: parseFloat(thumbRef.current?.style.top ?? "0") || 0,
    };
  }

  function onTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === thumbRef.current || !trackRef.current) return;
    const trackRange = trackRef.current.clientHeight - thumbHeight;
    const pct = (e.clientY - trackRef.current.getBoundingClientRect().top - thumbHeight / 2) / trackRange;
    scrollToPercent(pct, getMaxScroll());
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="scrollbar"
      onClick={onTrackClick}
      role="scrollbar"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div ref={trackRef} className="scrollbar__track" />
      <div
        ref={thumbRef}
        className="scrollbar__thumb"
        style={{ height: thumbHeight }}
        onMouseDown={onThumbMouseDown}
      />
    </div>
  );
}