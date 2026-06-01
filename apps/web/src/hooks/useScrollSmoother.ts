/**
 * Initializes GSAP ScrollSmoother on a wrapper element and manages its lifecycle.
 *
 * - Skips initialization on touch/coarse-pointer devices (phones, tablets)
 * - Applies `overflow: hidden` to the wrapper only while the smoother is active
 * - Resets scroll position and refreshes ScrollTrigger on every route change
 * - Refreshes ScrollTrigger on window resize to keep scroll-triggered elements in sync
 * - Cleans up the smoother and resize listener on unmount
 *
 * @param wrapperRef - Ref attached to the `#smooth-wrapper` element. Must contain
 *                     a child with id `#smooth-content` for ScrollSmoother to target.
 *
 * @example
 * const wrapperRef = useRef<HTMLDivElement>(null);
 * useScrollSmoother(wrapperRef);
 *
 * return (
 *   <div id="smooth-wrapper" ref={wrapperRef}>
 *     <div id="smooth-content">
 *       ...
 *     </div>
 *   </div>
 * );
 *
 * @requires react-router-dom - Uses `useLocation` to detect route changes.
 */


import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";


const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches;

export const useScrollSmoother = (
  wrapperRef: React.RefObject<HTMLElement | null>,
  ready = true,
) => {

  const location = useLocation();

  useEffect(() => {
    if (!ready || !wrapperRef.current) return;

    gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

    ScrollSmoother.get()?.kill();

    if (isTouchDevice()) return;

    const content = wrapperRef.current.querySelector("#smooth-content");
    if (!content) return;

    const smoother = ScrollSmoother.create({
      wrapper: wrapperRef.current,
      content,
      smooth: 1,
      effects: true,
      normalizeScroll: true,
      ignoreMobileResize: true,
    });

    wrapperRef.current.style.overflow = "hidden";

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      smoother.kill();
      window.removeEventListener("resize", onResize);
      if (wrapperRef.current) {
        wrapperRef.current.style.overflow = "";
      }
    };
  }, [ready]);

  useEffect(() => {
    if (isTouchDevice()) return;

    ScrollSmoother.get()?.scrollTop(0);
    ScrollTrigger.refresh();
  }, [location.pathname]);

  
};