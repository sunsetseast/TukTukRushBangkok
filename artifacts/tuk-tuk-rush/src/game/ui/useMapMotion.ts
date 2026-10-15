import { useLayoutEffect, useRef, type RefObject } from "react";
/** Button-driven map motion updates one SVG attribute, never per-frame React state. */
export function useMapMotion(
  svg: RefObject<SVGSVGElement | null>,
  box: number[],
  animate: RefObject<boolean>,
) {
  const previous = useRef(box);
  useLayoutEffect(() => {
    const element = svg.current,
      from = previous.current;

    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      element?.closest(".tt-reduced-motion");
    if (!element || !animate.current || reduced) {
      previous.current = box;
      animate.current = false;
      return;
    }
    animate.current = false;
    let frame = 0,
      started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - started) / 220)),
        eased = 1 - (1 - t) ** 3;
      const current = from.map((n, i) => n + (box[i]! - n) * eased);
      previous.current = current;
      element.setAttribute("viewBox", current.join(" "));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    element.setAttribute("viewBox", from.join(" "));
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, box);
}
