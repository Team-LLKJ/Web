import { evaluationCriteria } from "../../data/landing";
export function CriteriaSection() {
  return (
    <section className="landing-criteria">
      <div className="landing-section-heading" data-reveal>
        <p className="landing-eyebrow">CRITERIA</p>
        <h2>
          AI 활용 과정을
          <br />
          <span>4가지 기준</span>으로
          <br />
          평가해요
        </h2>
        <p>
          AI를 얼마나 사용했는지가 아니라, 어떤 목적으로 활용하고 자신의 생각을
          어떻게 발전시켰는지 살펴봅니다.
        </p>
      </div>
      <div className="landing-criteria-grid">
        {evaluationCriteria.map((criterion, index) => (
          <article
            className="landing-criterion-card"
            key={criterion.title}
            data-reveal
          >
            <span className="criterion-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3>{criterion.title}</h3>
            <p>{criterion.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
