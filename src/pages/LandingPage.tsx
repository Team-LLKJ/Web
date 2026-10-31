import { useEffect, useRef, useState } from "react";
import { LandingHeader } from "../components/landing/LandingHeader";
import { LandingHero } from "../components/landing/LandingHero";
import { FeatureSection } from "../components/landing/FeatureSection";
import { StepsSection } from "../components/landing/StepsSection";
import { CriteriaSection } from "../components/landing/CriteriaSection";
import { LandingFooter } from "../components/landing/LandingFooter";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import "../components/landing/landing.css";
export function LandingPage() {
  const [notice, setNotice] = useState("");
  const pageRef = useRef<HTMLDivElement>(null);

  // Content fades up as it scrolls into view.
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const targets = page.querySelectorAll("[data-reveal]");
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return;
    }
    page.classList.add("reveal-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 },
    );
    targets.forEach((target) => observer.observe(target));
    return () => {
      observer.disconnect();
      page.classList.remove("reveal-ready");
    };
  }, []);

  return (
    <div className="landing-page" ref={pageRef}>
      <LandingHeader onNotice={setNotice} />
      <main>
        <LandingHero />
        <FeatureSection />
        <StepsSection />
        <CriteriaSection />
      </main>
      <LandingFooter />
      {notice && (
        <Modal
          title={notice}
          onClose={() => setNotice("")}
          actions={<Button onClick={() => setNotice("")}>확인</Button>}
        >
        </Modal>
      )}
    </div>
  );
}
