/**
 * Runs GSAP ScrollSmoother on `#smooth-wrapper`, which must contain a
 * `#smooth-content` child. Skipped on coarse-pointer devices, where the native
 * scroll is already smooth and the smoother fights the browser. Resets to the
 * top and refreshes ScrollTrigger on every route change.
 *
 * One call site: App.tsx.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";


const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches;

export const useScrollSmoother = (
  wrapperRef: React.RefObject<HTMLElement | null>,
) => {

  const location = useLocation();

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

    ScrollSmoother.get()?.kill();

    if (isTouchDevice()) return;

    const content = wrapper.querySelector("#smooth-content");
    if (!content) return;

    const smoother = ScrollSmoother.create({
      wrapper,
      content,
      smooth: 1,
      effects: true,
      normalizeScroll: true,
      ignoreMobileResize: true,
    });

    wrapper.style.overflow = "hidden";

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      smoother.kill();
      window.removeEventListener("resize", onResize);
      wrapper.style.overflow = "";
    };
  }, [wrapperRef]);

  useEffect(() => {
    if (isTouchDevice()) return;

    ScrollSmoother.get()?.scrollTop(0);
    ScrollTrigger.refresh();
  }, [location.pathname]);
};