import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { homePathFor } from "../router/paths";
import { LandingHeader } from "../components/landing/LandingHeader";
import { LandingHero } from "../components/landing/LandingHero";
import { FeatureSection } from "../components/landing/FeatureSection";
import { StepsSection } from "../components/landing/StepsSection";
import { CriteriaSection } from "../components/landing/CriteriaSection";
import { LandingFooter } from "../components/landing/LandingFooter";
import { ResumeEvaluationPrompt } from "../components/student/ResumeEvaluationPrompt";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import "../components/landing/landing.css";
export function LandingPage() {
  const { user, loading } = useAuth();
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

  // 이미 로그인되어 있으면 소개 화면 대신 기본 페이지로 바로 이동합니다.
  if (!loading && user) return <Navigate to={homePathFor(user.role)} replace />;

  return (
    <div className="landing-page" ref={pageRef}>
      <LandingHeader onNotice={setNotice} showUtilities={false} />
      <main>
        <LandingHero />
        <FeatureSection />
        <StepsSection />
        <CriteriaSection />
      </main>
      <LandingFooter />
      <ResumeEvaluationPrompt />
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
