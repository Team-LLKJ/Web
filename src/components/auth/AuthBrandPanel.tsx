export function AuthBrandPanel({ mode }: { mode: "login" | "signup" }) {
  return (
    <aside className="auth-brand" aria-label="LIT 소개">
      <h2>
        AI와 생각을 발전하는
        <br />
        <span>방법을 기록해요</span>
      </h2>
      <p>
        답을 대신 쓰는 AI가 아니라,
        <br />
        나의 질문과 판단이 쌓이는 작업실
      </p>
      <img
        src={`/auth-assets/${mode}-school.svg`}
        width="169"
        height="169"
        alt=""
      />
    </aside>
  );
}
