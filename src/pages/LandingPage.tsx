import { useState } from "react";
import { LandingHeader } from "../components/landing/LandingHeader";
import { LandingHero } from "../components/landing/LandingHero";
import { FeatureSection } from "../components/landing/FeatureSection";
import { CriteriaSection } from "../components/landing/CriteriaSection";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import "../components/landing/landing.css";
export function LandingPage() {
  const [notice, setNotice] = useState("");
  return (
    <div className="landing-page">
      <LandingHeader onNotice={setNotice} />
      <main>
        <LandingHero />
        <FeatureSection />
        <CriteriaSection />
      </main>
      {notice && (
        <Modal
          title={notice}
          onClose={() => setNotice("")}
          actions={<Button onClick={() => setNotice("")}>확인</Button>}
        >
          {notice === "설정" && <p>설정할 항목이 없습니다.</p>}
        </Modal>
      )}
    </div>
  );
}
