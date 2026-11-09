import { Link } from "react-router-dom";
import { paths } from "../../router/paths";
export function LandingHero() {
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
          <div className="landing-actions" id="landing-primary-actions">
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
      </div>
    </section>
  );
}
