// 비밀번호 규칙. 서버는 10~128자를 요구하고, 새 비밀번호는 여기에 더해 영문·숫자를 함께 쓰도록 합니다.
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

/** 로그인·가입·변경 모두에 쓰는 기본 형식(길이·공백). 문제가 없으면 빈 문자열. */
export function checkPasswordFormat(password: string) {
  if (/\s/.test(password)) return "비밀번호에는 공백을 쓸 수 없어요.";
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자로 입력해주세요.`;
  }
  return "";
}

/** 새로 정하는 비밀번호(회원가입·변경)용. 기본 형식에 영문과 숫자 포함을 더합니다. */
export function checkNewPassword(password: string) {
  const format = checkPasswordFormat(password);
  if (format) return format;
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "비밀번호에는 영문과 숫자를 함께 넣어주세요.";
  }
  return "";
}
