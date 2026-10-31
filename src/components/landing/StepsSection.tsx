import { landingSteps } from "../../data/landing";
export function StepsSection() {
  return (
    <section className="landing-steps">
      <div className="landing-section-heading" data-reveal>
        <p className="landing-eyebrow">HOW IT WORKS</p>
        <h2>
          세 단계로 <span>간단하게</span> 시작해요
        </h2>
      </div>
      <ol className="landing-step-grid">
        {landingSteps.map((step, index) => (
          <li className="landing-step-card" key={step.title} data-reveal>
            <span className="landing-step-number">{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
