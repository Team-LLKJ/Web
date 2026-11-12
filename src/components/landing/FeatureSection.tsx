import { features } from "../../data/landing";
export function FeatureSection() {
  return (
    <section className="landing-features">
      <div className="landing-section-heading" data-reveal>
        <p className="landing-eyebrow">WHY LIT</p>
        <h2>
          AI가 문제가 아니라,
          <br />
          <span>어떻게 썼는지</span>가 문제입니다.
        </h2>
        <p>수행평가 답안을 보면 학생이 쓴 걸까, AI가 써준 걸까 의문이 듭니다.</p>
      </div>
      <div className="landing-feature-grid">
        {features.map((feature) => (
          <article
            className="landing-feature-card"
            key={feature.title}
            data-reveal
          >
            <div className="landing-icon-tile">
              <img src={feature.icon} alt="" loading="lazy" decoding="async" />
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
