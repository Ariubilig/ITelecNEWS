import { useEffect, useRef, useCallback } from "react";
import "./ScrollBar.css";

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

  const getMaxScroll = useCallback(() => {
    return document.documentElement.scrollHeight - window.innerHeight;
  }, []);

  const updateThumb = useCallback(() => {
    if (!thumbRef.current) return;
    const pct = window.scrollY / getMaxScroll();
    thumbRef.current.style.top = `${pct * getTrackHeight()}px`;
  }, [getMaxScroll, getTrackHeight]);

  const scrollToPercent = useCallback(
    (pct: number) => {
      const clamped = Math.max(0, Math.min(1, pct));
      window.scrollTo({ top: clamped * getMaxScroll(), behavior: "smooth" });
    },
    [getMaxScroll]
  );

  useEffect(() => {
    window.addEventListener("scroll", updateThumb, { passive: true });
    updateThumb();
    return () => window.removeEventListener("scroll", updateThumb);
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