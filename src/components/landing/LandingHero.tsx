import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { paths } from "../../router/paths";
// Screens shown one after another in the hero preview. Add more captures here.
const PREVIEW_SLIDES = [
  { src: "/landing-assets/solving-preview.png", alt: "LIT 학생 풀이 화면 미리보기" },
  { src: "/landing-assets/solving-preview.png", alt: "LIT 학생 풀이 화면 미리보기" },
  { src: "/landing-assets/solving-preview.png", alt: "LIT 학생 풀이 화면 미리보기" },
];
const SLIDE_INTERVAL = 3500;

export function LandingHero() {
  const [active, setActive] = useState(0);
  const [rotated, setRotated] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => {
        setRotated(true);
        setActive((current) => (current + 1) % PREVIEW_SLIDES.length);
      },
      SLIDE_INTERVAL,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="landing-hero">
      <div className="landing-hero-inner">
        <div className="landing-hero-copy" data-reveal>
          <h1>
            <span>수행평가의 AI 활용을</span>
            <br />
            쉽고 정확하게
            <br />
            분석해요
          </h1>
          <p className="landing-lead">
            LIT은 제출한 답안과 AI 대화 내용을 함께 분석해, 학생이 AI를 어떻게
            활용했는지 객관적으로 평가할 수 있도록 돕습니다.
          </p>
          <div className="landing-actions">
            <Link to={paths.join} className="button button--large primary">
              수행평가 참여하기
            </Link>
            <Link
              to={paths.login}
              className="button button--large landing-outline"
            >
              수행평가 만들기
            </Link>
          </div>
        </div>
        <div
          className={`landing-preview${rotated ? " is-rotating" : ""}`}
          aria-label="LIT 화면 미리보기"
        >
          {PREVIEW_SLIDES.map((slide, index) => (
            <div
              className="landing-preview-slide"
              data-pos={(index - active + PREVIEW_SLIDES.length) % PREVIEW_SLIDES.length}
              key={slide.src + index}
            >
              <img
                src={slide.src}
                alt={index === active ? slide.alt : ""}
                aria-hidden={index === active ? undefined : true}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
