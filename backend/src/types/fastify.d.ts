declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    tripMember?: { memberId: string; role: 'owner' | 'member' };
  }
}
