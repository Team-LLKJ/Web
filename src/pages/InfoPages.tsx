import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { LandingFooter } from "../components/landing/LandingFooter";
import { LandingHeader } from "../components/landing/LandingHeader";
import { Button } from "../components/ui/Button";
import { SwitchRow } from "../components/ui/HeaderDialogs";
import {
  SAMPLE_NOTIFICATIONS,
  readFlag,
  saveFlag,
} from "../components/ui/headerSettings";
import { paths } from "../router/paths";
import "../components/landing/landing.css";
import "../components/info/info.css";

function InfoLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="info-page">
      <LandingHeader onNotice={() => undefined} />
      <main className="info-main">
        <h1>{title}</h1>
        {description && <p className="info-description">{description}</p>}
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}

// 정식 문구가 정해지기 전까지 쓰는 임시 내용입니다.
const TERMS = [
  ["제1조 (목적)", "이 약관은 LIT가 제공하는 수행평가 AI 활용 분석 서비스의 이용 조건과 절차를 정합니다."],
  ["제2조 (서비스 내용)", "LIT는 학생이 AI와 나눈 대화와 작성한 답안을 함께 기록하고, 선생님이 AI 활용 과정을 평가할 수 있도록 돕습니다."],
  ["제3조 (이용자의 의무)", "이용자는 평가 운영 기준을 지키고, 다른 사람의 계정이나 평가 참여 정보를 도용하지 않아야 합니다."],
  ["제4조 (서비스 변경)", "서비스 내용은 운영상 필요에 따라 변경될 수 있으며, 중요한 변경은 사전에 안내합니다."],
];
const PRIVACY = [
  ["수집하는 정보", "이름, 이메일, 평가 참여 시 입력한 닉네임, 답안, AI 질문과 응답, 답안 수정 및 제출 기록을 수집합니다."],
  ["이용 목적", "수행평가 운영과 채점, AI 활용 과정 분석, 서비스 안정성 확인을 위해 사용합니다."],
  ["보관 기간", "평가 기록은 선생님이 삭제하거나 서비스 운영 기준에 따라 보관 기간이 끝날 때까지 보관합니다."],
  ["문의", "개인정보와 관련한 문의는 서비스 제작팀 Team-LLKJ로 연락해 주세요."],
];

function Sections({ items }: { items: string[][] }) {
  return (
    <div className="info-sections">
      {items.map(([heading, body]) => (
        <section key={heading} className="info-card">
          <h2>{heading}</h2>
          <p>{body}</p>
        </section>
      ))}
    </div>
  );
}

export function TermsPage() {
  return (
    <InfoLayout title="이용약관" description="LIT 서비스를 이용하기 전에 확인해 주세요.">
      <Sections items={TERMS} />
    </InfoLayout>
  );
}

export function PrivacyPage() {
  return (
    <InfoLayout title="개인정보 처리방침" description="LIT가 어떤 정보를 어떻게 다루는지 안내합니다.">
      <Sections items={PRIVACY} />
    </InfoLayout>
  );
}

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notify, setNotify] = useState(() => readFlag("lit:setting:notify", true));
  const [sound, setSound] = useState(() => readFlag("lit:setting:sound", false));
  return (
    <InfoLayout title="설정" description="계정과 알림 설정을 관리합니다.">
      <section className="info-card">
        <h2>계정</h2>
        {user ? (
          <dl className="info-list">
            <div><dt>이름</dt><dd>{user.name}</dd></div>
            <div><dt>구분</dt><dd>{user.role === "TEACHER" ? "선생님" : "학생"}</dd></div>
          </dl>
        ) : (
          <p>로그인하지 않았습니다.</p>
        )}
        <div className="info-actions">
          {user ? (
            <Button variant="secondary" onClick={() => void logout().then(() => navigate(paths.login))}>
              로그아웃
            </Button>
          ) : (
            <Link className="button primary" to={paths.login}>로그인</Link>
          )}
        </div>
      </section>
      <section className="info-card">
        <h2>알림</h2>
        <SwitchRow
          id="page-notify"
          label="알림 받기"
          description="평가 진행 소식을 알림으로 받습니다."
          checked={notify}
          onChange={(value) => {
            setNotify(value);
            saveFlag("lit:setting:notify", value);
          }}
        />
        <SwitchRow
          id="page-sound"
          label="알림 소리"
          description="새 알림이 오면 소리로 알려줍니다."
          checked={sound}
          onChange={(value) => {
            setSound(value);
            saveFlag("lit:setting:sound", value);
          }}
        />
      </section>
    </InfoLayout>
  );
}

export function NotificationsPage() {
  return (
    <InfoLayout title="알림" description="최근 평가 소식을 모아 볼 수 있습니다.">
      <ul className="notification-list info-notifications">
        {SAMPLE_NOTIFICATIONS.map((item, index) => (
          <li key={item.id} className="notification-item">
            <span
              className={`notification-dot${index < 2 ? " is-unread" : ""}`}
              aria-hidden="true"
            />
            <div>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              <time>{item.time}</time>
            </div>
          </li>
        ))}
      </ul>
    </InfoLayout>
  );
}
