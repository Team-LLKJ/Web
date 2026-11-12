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

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sections = Array.from(
      page.querySelectorAll<HTMLElement>("main > section, .landing-footer"),
    );
    const sectionTops = () => {
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      return sections.map((section) =>
        Math.min(
          maxScroll,
          section.getBoundingClientRect().top + window.scrollY,
        ),
      );
    };

    let frame: number | null = null;
    const resetKeyboardScroll = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      delete page.dataset.keyboardScrolling;
    };

    const moveSection = (direction: -1 | 1) => {
      const start = window.scrollY;
      const tops = sectionTops();
      const target =
        direction === -1
          ? tops.reverse().find((top) => top < start - 2)
          : tops.find((top) => top > start + 2);
      if (target === undefined) return;
      if (reducedMotion.matches) {
        window.scrollTo({ top: target, behavior: "instant" });
        return;
      }

      // CSS 스냅이 중간 프레임을 다른 섹션으로 끌어당기지 않게 합니다.
      page.dataset.keyboardScrolling = "";
      const duration = 440;
      let startedAt: number | undefined;
      const animate = (time: number) => {
        startedAt ??= time;
        const progress = Math.min((time - startedAt) / duration, 1);
        const eased = 1 - (1 - progress) ** 3;
        window.scrollTo({
          top: start + (target - start) * eased,
          behavior: "instant",
        });
        if (progress < 1) {
          frame = window.requestAnimationFrame(animate);
        } else {
          resetKeyboardScroll();
        }
      };
      frame = window.requestAnimationFrame(animate);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        if (
          [
            "ArrowUp",
            "ArrowDown",
            "PageUp",
            "PageDown",
            "Home",
            "End",
          ].includes(event.code)
        ) {
          resetKeyboardScroll();
        }
        return;
      }
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        document.querySelector("dialog[open]") ||
        (event.target instanceof Element &&
          event.target.closest(
            'button, a, input, textarea, select, [contenteditable], [role="button"]',
          ))
      ) {
        return;
      }
      event.preventDefault();
      if (event.repeat || frame !== null) return;
      moveSection(event.shiftKey ? -1 : 1);
    };

    // 트랙패드가 섹션 경계 근처에서 멈추면 같은 기준으로 위치를 맞춥니다.
    let timer = 0;
    const settle = () => {
      const scrollY = window.scrollY;
      if (frame !== null || reducedMotion.matches) return;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollY >= maxScroll - 2) return;
      const nearest = sectionTops().reduce(
        (closest, top) =>
          Math.abs(top - scrollY) < Math.abs(closest - scrollY) ? top : closest,
        Infinity,
      );
      const gap = Math.abs(nearest - scrollY);
      if (gap > 2 && gap < window.innerHeight * 0.3) {
        window.scrollTo({ top: nearest, behavior: "smooth" });
      }
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 160);
    };
    const supportsScrollEnd = "onscrollend" in window;
    const interruptEvents = [
      "wheel",
      "touchstart",
      "pointerdown",
      "resize",
    ] as const;
    window.addEventListener("keydown", onKeyDown);
    for (const name of interruptEvents) {
      window.addEventListener(name, resetKeyboardScroll, { passive: true });
    }
    if (supportsScrollEnd) window.addEventListener("scrollend", settle);
    else window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      resetKeyboardScroll();
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      for (const name of interruptEvents) {
        window.removeEventListener(name, resetKeyboardScroll);
      }
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
