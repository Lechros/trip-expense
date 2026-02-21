import { JoinFlow } from "./join-flow";

type Props = { params: Promise<{ code: string }> };

/**
 * 초대 링크(/join/[code])로 접속 시 참여 플로우. 링크에 포함된 여행 id가 URL 세그먼트로 전달됨.
 */
export default async function JoinWithCodePage({ params }: Props) {
  const { code } = await params;
  return <JoinFlow tripId={code} />;
}
