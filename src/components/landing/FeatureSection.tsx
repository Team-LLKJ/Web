import { features } from "../../data/landing";
export function FeatureSection() {
  return (
    <section className="landing-features">
      <div className="landing-section-heading">
        <h2>AI가 문제가 아니라, 어떻게 썼는지가 문제 입니다.</h2>
        <p>수행평가 답안을 보면 학생이 쓴걸까 AI가 써준걸까 의문이 듭니다.</p>
      </div>
      <div className="landing-feature-grid">
        {features.map((feature) => (
          <article className="landing-feature-card" key={feature.title}>
            <img
              src={feature.icon}
              width={feature.width}
              height={feature.height}
              alt=""
            />
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
