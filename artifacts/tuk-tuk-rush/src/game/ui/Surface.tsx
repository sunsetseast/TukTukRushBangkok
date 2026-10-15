import { useEffect, useRef, type ReactNode } from "react";
/** A single input owner for menus. Map and inspection retain their gesture owners. */
export function Surface({
  children,
  label,
  onBack,
  className = "",
}: {
  children: ReactNode;
  label: string;
  onBack?: () => void;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null),
    back = useRef(onBack);
  back.current = onBack;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const all = () => [
      ...(root.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),a[href],input,select,[tabindex="0"]',
      ) ?? []),
    ];
    all()[0]?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        back.current?.();
      }
      if (e.key === "Tab") {
        const a = all(),
          first = a[0],
          last = a.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("keydown", key, true);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      className={`tt-modal ${className}`}
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {children}
    </div>
  );
}
