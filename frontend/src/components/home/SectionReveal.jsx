import { useEffect, useRef, useState } from "react";

// Subtiele scroll-reveal: voegt .is-in toe zodra het blok de viewport nadert.
// De verbergende beginstijl staat in CSS uitsluitend binnen
// @media (prefers-reduced-motion: no-preference), dus zonder JS of met
// reduced-motion is alles gewoon direct zichtbaar — geen content-gijzeling.
export default function SectionReveal({ as: Tag = "div", className = "", children, ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          setVisible(true);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`hp2-reveal${visible ? " is-in" : ""} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
