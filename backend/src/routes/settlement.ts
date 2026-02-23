import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/db.js';
import { requireAuthOrGuest } from '../lib/auth-middleware.js';
import { requireTripMember } from '../lib/trip-member.js';

type MemberKey = { userId: string | null; guestId: string | null };
function memberKey(m: MemberKey): string {
  return `${m.userId ?? ''}:${m.guestId ?? ''}`;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/**
 * 정산 명세:
 * 1) 지출 목록으로 통화별 "누가 누구에게 얼마를 줘야 하는지" 누적 (debt[from][to][currency]).
 * 2) 각 통화를 KRW로 환산할 때: 결제자(채권자) A에 대해 A의 총 결제액(해당 통화)과 A의 총 환전액(해당 통화) 비교.
 *    - 환전액 < 결제액 → 오류, 잘못된 정산 결과 제공 안 함.
 *    - 환전액 >= 결제액 → 결제액을 채우는 첫 환전 구간까지의 평균 환율(결제액 초과분 제외, partial 적용).
 * 3) 원화로 합산 후 현재 양식으로 출력. 원화 소수점 2자리 반올림.
 */
export async function settlementRoutes(app: FastifyInstance) {
  app.get(
    '/settlement',
    { preHandler: [requireAuthOrGuest, requireTripMember] },
    async (req: FastifyRequest<{ Params: { tripId: string } }>, reply: FastifyReply) => {
      const { tripId } = req.params;
      const userId = (req as FastifyRequest & { userId?: string }).userId;
      const guestId = (req as FastifyRequest & { guestId?: string }).guestId;

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        select: { baseCurrency: true },
      });
      if (!trip) return reply.status(404).send({ error: '여행을 찾을 수 없습니다' });
      const baseCurrency = trip.baseCurrency;

      const members = await prisma.tripMember.findMany({
        where: { tripId },
        select: { id: true, displayName: true, userId: true, guestId: true },
      });
      const memberByKey = new Map<string, (typeof members)[0]>();
      for (const m of members) {
        memberByKey.set(memberKey(m), m);
      }
      const memberIds = members.map((m) => m.id);

      const entries = await prisma.settlementEntry.findMany({
        where: { tripId, deletedAt: null },
        include: { beneficiaries: true },
      });

      const exchanges = await prisma.exchangeRecord.findMany({
        where: { tripId },
        select: { userId: true, guestId: true, targetCurrency: true, targetAmount: true, rate: true, exchangedAt: true },
      });

      // debt[fromMemberId][toMemberId][currency] = from이 to에게 해당 통화로 줘야 하는 금액
      const debt: Record<string, Record<string, Record<string, number>>> = {};
      for (const fromId of memberIds) {
        debt[fromId] = {};
        for (const toId of memberIds) {
          debt[fromId][toId] = {};
        }
      }

      // paidTotal[memberId][currency] = 해당 멤버가 그 통화로 결제한 총액
      const paidTotal: Record<string, Record<string, number>> = {};
      for (const m of memberIds) {
        paidTotal[m] = {};
      }

      for (const entry of entries) {
        const payerKey: MemberKey = {
          userId: entry.paidByUserId ?? null,
          guestId: entry.paidByGuestId ?? null,
        };
        const payerMember = memberByKey.get(memberKey(payerKey));
        if (!payerMember) continue;

        const amount = Number(entry.amount);
        const currency = entry.currency;
        paidTotal[payerMember.id][currency] = (paidTotal[payerMember.id][currency] ?? 0) + amount;

        const beneficiaryList = entry.beneficiaries
          .map((b) => {
            const mem = b.userId
              ? members.find((m) => m.userId === b.userId)
              : members.find((m) => m.guestId === b.guestId);
            return mem?.id;
          })
          .filter(Boolean) as string[];
        const n = beneficiaryList.length;
        if (n === 0) continue;
        const share = amount / n;
        for (const bid of beneficiaryList) {
          debt[bid][payerMember.id][currency] = (debt[bid][payerMember.id][currency] ?? 0) + share;
        }
      }

      // exchangedTotal[memberId][currency] = 해당 멤버가 그 통화로 환전받은 총액 (targetAmount 합)
      const exchangedTotal: Record<string, Record<string, number>> = {};
      for (const m of memberIds) exchangedTotal[m] = {};
      for (const ex of exchanges) {
        const mem = ex.userId
          ? members.find((m) => m.userId === ex.userId)
          : members.find((m) => m.guestId === ex.guestId);
        if (!mem) continue;
        const c = ex.targetCurrency;
        exchangedTotal[mem.id][c] = (exchangedTotal[mem.id][c] ?? 0) + Number(ex.targetAmount);
      }

      // 오류: 어떤 결제자(채권자)라도 해당 통화에서 환전액 < 결제액이면 정산 결과 제공 안 함
      const settlementErrorMessages: string[] = [];
      for (const m of members) {
        for (const [currency, totalPaid] of Object.entries(paidTotal[m.id] ?? {})) {
          if (currency === baseCurrency) continue;
          const totalEx = exchangedTotal[m.id]?.[currency] ?? 0;
          if (totalEx < totalPaid - 1e-6) {
            settlementErrorMessages.push(
              `${m.displayName}님의 ${currency} 결제액(${totalPaid.toLocaleString()})이 환전액(${totalEx.toLocaleString()})보다 많습니다. 환전 탭에서 추가 환전을 등록해 주세요.`
            );
          }
        }
      }
      if (settlementErrorMessages.length > 0) {
        return reply.send({
          settlementError: true,
          settlementErrorMessage: settlementErrorMessages,
          exchangeWarning: true,
          excludedMessages: settlementErrorMessages,
          memberSummaries: [],
          transfers: [],
          myReceive: [],
          mySend: [],
          mySummary: null,
        });
      }

      // avgRate[memberId][currency] = 해당 멤버의 해당 통화 → KRW 환율 (결제액까지의 환전 구간 가중평균)
      const avgRate: Record<string, Record<string, number>> = {};
      for (const m of memberIds) avgRate[m] = {};

      for (const m of members) {
        for (const [currency, totalPaid] of Object.entries(paidTotal[m.id] ?? {})) {
          if (currency === baseCurrency) {
            avgRate[m.id][currency] = 1;
            continue;
          }
          const memberExchanges = exchanges
            .filter((ex) => {
              const mem = ex.userId
                ? members.find((x) => x.userId === ex.userId)
                : members.find((x) => x.guestId === ex.guestId);
              return mem?.id === m.id && ex.targetCurrency === currency;
            })
            .sort((a, b) => (a.exchangedAt as Date).getTime() - (b.exchangedAt as Date).getTime());

          let remaining = totalPaid;
          let weightedRateSum = 0;
          let weightSum = 0;
          for (const rec of memberExchanges) {
            if (remaining <= 0) break;
            const amt = Number(rec.targetAmount);
            const use = Math.min(amt, remaining);
            const rate = Number(rec.rate);
            weightedRateSum += rate * use;
            weightSum += use;
            remaining -= use;
          }
          if (weightSum > 0) {
            avgRate[m.id][currency] = weightedRateSum / weightSum;
          } else {
            avgRate[m.id][currency] = 1;
          }
        }
      }

      // debtKrw[fromId][toId] = from이 to에게 원화로 줘야 하는 금액 (소수 2자리 반올림)
      const debtKrw: Record<string, Record<string, number>> = {};
      for (const fromId of memberIds) {
        debtKrw[fromId] = {};
        for (const toId of memberIds) {
          let sum = 0;
          for (const [currency, amt] of Object.entries(debt[fromId]?.[toId] ?? {})) {
            if (amt <= 0) continue;
            const rate = currency === baseCurrency ? 1 : (avgRate[toId]?.[currency] ?? 1);
            sum += amt * rate;
          }
          debtKrw[fromId][toId] = round2(sum);
        }
      }

      // netKrw[memberId] = 받을 금액 - 줄 금액 (양수면 받기, 음수면 주기)
      const netKrw: Record<string, number> = {};
      for (const id of memberIds) {
        let receive = 0;
        let pay = 0;
        for (const toId of memberIds) receive += debtKrw[id]?.[toId] ?? 0;
        for (const fromId of memberIds) pay += debtKrw[fromId]?.[id] ?? 0;
        netKrw[id] = round2(receive - pay);
      }

      // paidKrw / usedKrw for display (현재 양식 호환)
      const paidKrwByMemberId = new Map<string, number>();
      const usedKrwByMemberId = new Map<string, number>();
      for (const m of members) {
        let paid = 0;
        for (const [currency, amt] of Object.entries(paidTotal[m.id] ?? {})) {
          const rate = currency === baseCurrency ? 1 : (avgRate[m.id]?.[currency] ?? 1);
          paid += amt * rate;
        }
        paidKrwByMemberId.set(m.id, round2(paid));

        let used = 0;
        for (const entry of entries) {
          const beneficiaryList = entry.beneficiaries
            .map((b) => {
              const mem = b.userId
                ? members.find((x) => x.userId === b.userId)
                : members.find((x) => x.guestId === b.guestId);
              return mem?.id;
            })
            .filter(Boolean) as string[];
          if (!beneficiaryList.includes(m.id)) continue;
          const payerKey: MemberKey = {
            userId: entry.paidByUserId ?? null,
            guestId: entry.paidByGuestId ?? null,
          };
          const payer = memberByKey.get(memberKey(payerKey));
          if (!payer) continue;
          const currency = entry.currency;
          const rate = currency === baseCurrency ? 1 : (avgRate[payer.id]?.[currency] ?? 1);
          used += (Number(entry.amount) / beneficiaryList.length) * rate;
        }
        usedKrwByMemberId.set(m.id, round2(used));
      }

      const memberSummaries = members.map((m) => {
        const paid = paidKrwByMemberId.get(m.id) ?? 0;
        const used = usedKrwByMemberId.get(m.id) ?? 0;
        const diff = netKrw[m.id] ?? 0;
        return {
          memberId: m.id,
          displayName: m.displayName,
          paidKrw: paid,
          usedKrw: used,
          diffKrw: diff,
        };
      });

      const receivers = memberSummaries.filter((s) => s.diffKrw > 0.01).sort((a, b) => b.diffKrw - a.diffKrw);
      const payers = memberSummaries.filter((s) => s.diffKrw < -0.01).sort((a, b) => a.diffKrw - b.diffKrw);
      const transfers: { fromMemberId: string; toMemberId: string; fromName: string; toName: string; amountKrw: number }[] = [];
      const recDiffs = new Map(receivers.map((r) => [r.memberId, r.diffKrw]));
      const payDiffs = new Map(payers.map((p) => [p.memberId, p.diffKrw]));

      let ri = 0;
      let pi = 0;
      while (ri < receivers.length && pi < payers.length) {
        const rec = receivers[ri];
        const pay = payers[pi];
        const recRemain = recDiffs.get(rec.memberId) ?? 0;
        const payRemain = Math.abs(payDiffs.get(pay.memberId) ?? 0);
        if (recRemain < 0.01) {
          ri++;
          continue;
        }
        if (payRemain < 0.01) {
          pi++;
          continue;
        }
        const amount = Math.min(recRemain, payRemain);
        const amountRounded = round2(amount);
        if (amountRounded < 0.01) break;
        transfers.push({
          fromMemberId: pay.memberId,
          toMemberId: rec.memberId,
          fromName: pay.displayName,
          toName: rec.displayName,
          amountKrw: amountRounded,
        });
        recDiffs.set(rec.memberId, recRemain - amountRounded);
        payDiffs.set(pay.memberId, -(payRemain - amountRounded));
        if (recRemain - amountRounded < 0.01) ri++;
        if (payRemain - amountRounded < 0.01) pi++;
      }

      const currentMemberId =
        userId != null
          ? members.find((m) => m.userId === userId)?.id
          : guestId != null
            ? members.find((m) => m.guestId === guestId)?.id
            : null;

      const myReceive = transfers
        .filter((t) => t.toMemberId === currentMemberId)
        .map((t) => ({ from: t.fromName, amountKrw: t.amountKrw }));
      const mySend = transfers
        .filter((t) => t.fromMemberId === currentMemberId)
        .map((t) => ({ to: t.toName, amountKrw: t.amountKrw }));

      const mySummary = currentMemberId
        ? memberSummaries.find((s) => s.memberId === currentMemberId)
        : null;

      return reply.send({
        settlementError: false,
        exchangeWarning: false,
        excludedMessages: [],
        memberSummaries,
        transfers,
        myReceive,
        mySend,
        mySummary,
      });
    }
  );
}
