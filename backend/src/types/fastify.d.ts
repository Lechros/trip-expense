declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    /** 게스트 세션일 때 설정 (requireAuthOrGuest) */
    guestId?: string;
    tripId?: string;
    tripMemberId?: string;
    isGuest?: boolean;
    tripMember?: { memberId: string; role: 'owner' | 'member' };
  }
}
