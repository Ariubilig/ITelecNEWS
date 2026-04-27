import "./ScrollBar.css";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";

const getSmoother = () => ScrollSmoother.get();
const getScrollY = () => getSmoother()?.scrollTop() ?? window.scrollY;
const getMaxScroll = () => {
  const s = getSmoother();
  return s
    ? (s.content() as HTMLElement).scrollHeight - window.innerHeight
    : document.documentElement.scrollHeight - window.innerHeight;
};
const scrollTo = (pct: number, max: number) => {
  const top = Math.max(0, Math.min(1, pct)) * max;
  getSmoother()?.scrollTo(top, true) ?? window.scrollTo({ top, behavior: "smooth" });
};

export default function ScrollBar() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startY: 0, startTop: 0 });

  useEffect(() => {
    const root = rootRef.current!;
    const track = trackRef.current!;
    const thumb = thumbRef.current!;

    function update() {
      const max = getMaxScroll();
      const visible = max > 0;
      root.style.opacity = visible ? "1" : "0";
      root.style.pointerEvents = visible ? "auto" : "none";
      if (!visible) return;

      const trackH = track.clientHeight;
      const thumbH = Math.max(20, (window.innerHeight / (max + window.innerHeight)) * trackH);
      thumb.style.height = `${thumbH}px`;
      thumb.style.top = `${(getScrollY() / max) * (trackH - thumbH)}px`;
    }

    gsap.ticker.add(update);
    update();
    return () => gsap.ticker.remove(update);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current.active) return;
      const trackRange = trackRef.current!.clientHeight - thumbRef.current!.clientHeight;
      const pct = (drag.current.startTop + e.clientY - drag.current.startY) / trackRange;
      scrollTo(pct, getMaxScroll());
    };
    const onUp = () => { drag.current.active = false; };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

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
    if (e.target === thumbRef.current || !trackRef.current || !thumbRef.current) return;
    const thumbH = thumbRef.current.clientHeight;
    const trackRange = trackRef.current.clientHeight - thumbH;
    const pct = (e.clientY - trackRef.current.getBoundingClientRect().top - thumbH / 2) / trackRange;
    scrollTo(pct, getMaxScroll());
  }

  return (
    <div ref={rootRef} className="scrollbar" onClick={onTrackClick}
      role="scrollbar" aria-orientation="vertical" aria-valuemin={0} aria-valuemax={100}
    >
      <div ref={trackRef} className="scrollbar__track" />
      <div ref={thumbRef} className="scrollbar__thumb" onMouseDown={onThumbMouseDown} />
    </div>
  );
}