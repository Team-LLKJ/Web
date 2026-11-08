// 비밀번호 규칙. 새 비밀번호는 8~20자에 영문·숫자·특수문자를 모두 넣어야 합니다.
// 로그인은 이 규칙 이전에 만든 계정(10~128자)도 들어올 수 있게 길이 상한을 128자로 둡니다.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const NEW_PASSWORD_MAX = 20;
export const NEW_PASSWORD_HINT = "8~20자, 영문·숫자·특수문자 포함";

/** 로그인에 쓰는 기본 형식(길이·공백). 문제가 없으면 빈 문자열. */
export function checkPasswordFormat(password: string) {
  if (/\s/.test(password)) return "비밀번호에는 공백을 쓸 수 없어요.";
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자로 입력해주세요.`;
  }
  return "";
}

/** 새로 정하는 비밀번호(회원가입·변경·재설정)용. 문제가 없으면 빈 문자열. */
export function checkNewPassword(password: string) {
  if (/\s/.test(password)) return "비밀번호에는 공백을 쓸 수 없어요.";
  if (password.length < PASSWORD_MIN || password.length > NEW_PASSWORD_MAX) {
    return `비밀번호는 ${PASSWORD_MIN}~${NEW_PASSWORD_MAX}자로 입력해주세요.`;
  }
  // 특수문자는 키보드의 기호(!@#$ 등)만 인정하고, 한글 같은 다른 문자는 받지 않습니다.
  if (!/^[\x21-\x7e]+$/.test(password)) {
    return "영문, 숫자, 특수문자만 쓸 수 있어요.";
  }
  if (
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return "영문, 숫자, 특수문자를 모두 넣어주세요.";
  }
  return "";
}
