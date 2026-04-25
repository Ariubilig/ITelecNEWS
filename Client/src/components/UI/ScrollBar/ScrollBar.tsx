import "./ScrollBar.css";
import { useEffect, useRef, useCallback } from "react";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";


interface ScrollBar {
  thumbHeight?: number;
}

export default function ScrollBar({ thumbHeight = 40 }: ScrollBar) {


  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartTop = useRef(0);

  const getTrackHeight = useCallback(() => {
    if (!trackRef.current || !thumbRef.current) return 0;
    return trackRef.current.clientHeight - thumbRef.current.clientHeight;
  }, []);

  /** Total scrollable distance (works with or without ScrollSmoother) */
  const getMaxScroll = useCallback(() => {
    const smoother = ScrollSmoother.get();
    if (smoother) {
      // ScrollSmoother.content() gives us the transformed content element
      const content = smoother.content() as HTMLElement;
      return content.scrollHeight - window.innerHeight;
    }
    return document.documentElement.scrollHeight - window.innerHeight;
  }, []);

  /** Current scroll position (works with or without ScrollSmoother) */
  const getScrollY = useCallback(() => {
    const smoother = ScrollSmoother.get();
    if (smoother) {
      return smoother.scrollTop();
    }
    return window.scrollY;
  }, []);

  const updateThumb = useCallback(() => {
    if (!thumbRef.current) return;
    const max = getMaxScroll();
    if (max <= 0) return;
    const pct = getScrollY() / max;
    thumbRef.current.style.top = `${pct * getTrackHeight()}px`;
  }, [getMaxScroll, getScrollY, getTrackHeight]);

  const scrollToPercent = useCallback(
    (pct: number) => {
      const clamped = Math.max(0, Math.min(1, pct));
      const target = clamped * getMaxScroll();
      const smoother = ScrollSmoother.get();
      if (smoother) {
        smoother.scrollTo(target, true);
      } else {
        window.scrollTo({ top: target, behavior: "smooth" });
      }
    },
    [getMaxScroll]
  );

  useEffect(() => {
    // Use ScrollTrigger's update event — fires on every tick regardless of
    // whether native scroll or ScrollSmoother is driving the position.
    const onUpdate = () => updateThumb();

    ScrollTrigger.addEventListener("refresh", onUpdate);
    // Also listen to native scroll as fallback (touch devices without smoother)
    window.addEventListener("scroll", onUpdate, { passive: true });

    // Poll via GSAP ticker for smoother-driven scrolls
    const tickHandler = () => updateThumb();
    import("gsap").then(({ gsap }) => gsap.ticker.add(tickHandler));

    updateThumb();

    return () => {
      ScrollTrigger.removeEventListener("refresh", onUpdate);
      window.removeEventListener("scroll", onUpdate);
      import("gsap").then(({ gsap }) => gsap.ticker.remove(tickHandler));
    };
  }, [updateThumb]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientY - dragStartY.current;
      const pct = (dragStartTop.current + delta) / getTrackHeight();
      scrollToPercent(pct);
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [getTrackHeight, scrollToPercent]);

  const onThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartTop.current = parseFloat(thumbRef.current?.style.top ?? "0") || 0;
  };

  const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === thumbRef.current) return;
    const rect = trackRef.current!.getBoundingClientRect();
    const pct = (e.clientY - rect.top - thumbHeight / 2) / getTrackHeight();
    scrollToPercent(pct);
  };

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