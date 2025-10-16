import {
  PaymentStatus,
  GroupStatusInformation,
  PaymentStatusInformation,
  TransactionStatusInformation,
  PaymentStatusCode,
} from './types';

const first = <T>(v: T | T[] | undefined | null): T | undefined => {
  if (Array.isArray(v)) return v.find(Boolean) as T | undefined;
  return v ?? undefined;
};

const joinAddtlInf = (v: string | string[] | undefined): string | undefined => {
  if (!v) return undefined;
  return Array.isArray(v) ? v.filter(Boolean).join(' | ') : v;
};

const parseStatus = (status: string): PaymentStatus => {
  switch (status) {
    case PaymentStatusCode.Rejected:
    case PaymentStatusCode.PartiallyAccepted:
    case PaymentStatusCode.Pending:
    case PaymentStatusCode.Accepted:
    case PaymentStatusCode.AcceptedSettlementInProgress:
    case PaymentStatusCode.AcceptedCreditSettlementCompleted:
    case PaymentStatusCode.AcceptedSettlementCompleted:
    case PaymentStatusCode.AcceptedTechnicalValidation:
      return status as PaymentStatus;
    default:
      throw new Error(`Unknown status: ${status}`);
  }
};

const extractReason = (node: any) => {
  const rsnInf = first(node?.StsRsnInf);
  const rsn = first(rsnInf?.Rsn);
  const code: string | undefined =
    rsn?.Cd ?? rsn?.Prtry ?? rsnInf?.Rsn?.Cd ?? rsnInf?.Rsn?.Prtry ?? undefined;
  const additionalInformation = joinAddtlInf(rsnInf?.AddtlInf);
  return { code, additionalInformation };
};

export const parseGroupStatusInformation = (
  originalGroupInfAndStatus: any,
): GroupStatusInformation | null => {
  if (!originalGroupInfAndStatus?.GrpSts) return null;

  const reason = extractReason(originalGroupInfAndStatus);

  return {
    type: 'group',
    originalMessageId: originalGroupInfAndStatus.OrgnlMsgId,
    originalMessageNameId: originalGroupInfAndStatus.OrgnlMsgNmId,
    status: parseStatus(originalGroupInfAndStatus.GrpSts),
    reason,
  };
};

export const parsePaymentStatusInformations = (
  originalPaymentsAndStatuses: any[],
): PaymentStatusInformation[] => {
  if (!Array.isArray(originalPaymentsAndStatuses)) return [];

  return originalPaymentsAndStatuses
    .map((payment: any) => {
      if (!payment?.PmtInfSts) return null;

      const reason = extractReason(payment);

      return {
        type: 'payment' as const,
        originalPaymentId: payment.OrgnlPmtInfId,
        status: parseStatus(payment.PmtInfSts),
        reason,
      };
    })
    .filter(Boolean) as PaymentStatusInformation[];
};

export const parseTransactionStatusInformations = (
  txNodes: any[],
): TransactionStatusInformation[] => {
  if (!Array.isArray(txNodes)) return [];

  return txNodes.map((txn: any) => {
    const reason = extractReason(txn);
    return {
      type: 'transaction' as const,
      originalInstrId: txn.OrgnlInstrId,
      originalEndToEndId: txn.OrgnlEndToEndId,
      originalTxId: txn.OrgnlTxId,
      status: parseStatus(txn.TxSts),
      acceptanceDateTime: txn.AccptncDtTm
        ? new Date(txn.AccptncDtTm)
        : undefined,
      settlementDate: txn.SttlmDt,
      reason,
    };
  });
};
