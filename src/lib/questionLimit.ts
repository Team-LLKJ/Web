/** 글자 수 제한을 문항 끝에 붙일 문구로 만듭니다. 제한이 없으면 빈 문자열입니다. */
export function limitLabel(min?: number | null, max?: number | null) {
  const low = min && min > 0 ? `${min.toLocaleString()}자 이상` : "";
  const high = max && max > 0 ? `${max.toLocaleString()}자 이내` : "";
  const text = [low, high].filter(Boolean).join(" ");
  return text ? `(${text})` : "";
}

// 선생님이 문항 끝에 직접 적어 둔 "(400자 이상 600자 이내)" 같은 문구
const MANUAL_LIMIT = /\s*[（(]\s*\d[\d,]*\s*자\s*(이상|이내|이하|미만)[^)）\n]*[)）]\s*$/;

/** 문항 내용에 글자 수 제한을 자동으로 붙입니다. 직접 적은 같은 문구는 중복되지 않게 걷어 냅니다. */
export function questionText(content: string, min?: number | null, max?: number | null) {
  const label = limitLabel(min, max);
  if (!label) return content;
  return `${content.replace(MANUAL_LIMIT, "").trimEnd()} ${label}`;
}
