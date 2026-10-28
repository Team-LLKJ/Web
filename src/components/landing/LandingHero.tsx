import { Link } from "react-router-dom";
import { paths } from "../../router/paths";
export function LandingHero() {
  return (
    <section className="landing-hero">
      <div className="landing-hero-inner">
        <div className="hero-preview-back hero-preview-last" aria-hidden="true">
          <img src="/landing-assets/solving-preview.png" alt="" />
        </div>
        <div
          className="hero-preview-back hero-preview-middle"
          aria-hidden="true"
        >
          <img src="/landing-assets/solving-preview.png" alt="" />
        </div>
        <div className="landing-hero-copy">
          <div>
            <h1>
              <span>수행평가의 AI 활용을</span>
              <br />
              쉽고 정확하게 분석해요
            </h1>
            <p>
              LIT은 제출한 답안과 AI 대화 내용을 함께 분석하여
              <br />
              학생이 AI를 어떻게 활용했는지 객관적으로
              <br />
              평가할수 있는AI 분석 플랫폼 입니다.
            </p>
          </div>
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
        <div className="hero-preview-front">
          <img
            src="/landing-assets/solving-preview.png"
            width="448"
            height="291"
            alt="LIT 학생 풀이 화면 미리보기"
          />
        </div>
      </div>
    </section>
  );
}
