import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { LandingHeader } from "../components/landing/LandingHeader";
import { LandingHero } from "../components/landing/LandingHero";
import { FeatureSection } from "../components/landing/FeatureSection";
import { StepsSection } from "../components/landing/StepsSection";
import { CriteriaSection } from "../components/landing/CriteriaSection";
import { LandingMobileActions } from "../components/landing/LandingMobileActions";
import { LandingFooter } from "../components/landing/LandingFooter";
import { ResumeEvaluationPrompt } from "../components/student/ResumeEvaluationPrompt";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import "../components/landing/landing.css";
import "../components/landing/landing-responsive.css";
export function LandingPage() {
  const location = useLocation();
  // 학생이 답안을 제출하고 돌아왔을 때 같은 안내를 보여 줍니다.
  const [notice, setNotice] = useState(
    (location.state as { notice?: string } | null)?.notice ?? "",
  );
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

  // 스크롤이 멈췄을 때 섹션 맨 위에서 조금 어긋나 있으면(위 섹션이 헤더 아래로 비쳐 보이면)
  // 가장 가까운 섹션 맨 위로 맞춥니다. CSS 스냅만으로는 트랙패드 관성 스크롤에서 어긋날 때가 있습니다.
  useEffect(() => {
    const page = pageRef.current;
    if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    const settle = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      // 맨 아래(푸터)에서는 맞추지 않습니다.
      if (window.scrollY >= maxScroll - 2) return;
      const tops = Array.from(
        page.querySelectorAll<HTMLElement>(".landing-hero, .landing-features, .landing-steps, .landing-criteria"),
      ).map((section) => section.getBoundingClientRect().top + window.scrollY);
      let nearest = tops[0] ?? 0;
      for (const top of tops) if (Math.abs(top - window.scrollY) < Math.abs(nearest - window.scrollY)) nearest = top;
      const gap = Math.abs(nearest - window.scrollY);
      if (gap > 1 && gap < window.innerHeight * 0.3) window.scrollTo({ top: nearest, behavior: "smooth" });
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 160);
    };
    const supportsScrollEnd = "onscrollend" in window;
    if (supportsScrollEnd) window.addEventListener("scrollend", settle);
    else window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scrollend", settle);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="landing-page" ref={pageRef}>
      <LandingHeader />
      <main>
        <LandingHero />
        <FeatureSection />
        <StepsSection />
        <CriteriaSection />
      </main>
      <LandingFooter />
      <LandingMobileActions />
      <ResumeEvaluationPrompt />
      {notice && (
        <Modal
          title={notice}
          onClose={() => setNotice("")}
          actions={<Button onClick={() => setNotice("")}>확인</Button>}
        ></Modal>
      )}
    </div>
  );
}
