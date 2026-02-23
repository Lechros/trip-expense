import { redirect } from "next/navigation";

/**
 * 회원가입 페이지 제거. Google 로그인만 사용하므로 로그인으로 리다이렉트.
 */
export default function RegisterPage() {
  redirect("/login");
}
