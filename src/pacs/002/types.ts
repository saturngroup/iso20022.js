import { Party } from '../../lib/types';

export interface OriginalGroupInformation {
  originalMessageId: string;
  originalMessageNameId?: string; // e.g. "pacs.008.001.08"
}

export type StatusType = 'group' | 'payment' | 'transaction';

export const PaymentStatusCode = {
  Rejected: 'RJCT',
  PartiallyAccepted: 'PART',
  Pending: 'PDNG',
  Accepted: 'ACCP',
  AcceptedSettlementInProgress: 'ACSP',
  AcceptedCreditSettlementCompleted: 'ACCC',
  AcceptedSettlementCompleted: 'ACSC',
  AcceptedTechnicalValidation: 'ACTC',
} as const;

export type PaymentStatus =
  (typeof PaymentStatusCode)[keyof typeof PaymentStatusCode];

export interface BaseStatusInformation {
  type: StatusType;
  status: PaymentStatus;
  reason?: {
    code?: string; // Can be Cd or Prtry
    additionalInformation?: string;
  };
}

export interface GroupStatusInformation extends BaseStatusInformation {
  type: 'group';
  originalMessageId: string;
  originalMessageNameId?: string;
}

export interface PaymentStatusInformation extends BaseStatusInformation {
  type: 'payment';
  originalPaymentId: string;
}

export interface TransactionStatusInformation extends BaseStatusInformation {
  type: 'transaction';
  originalInstrId?: string;
  originalEndToEndId?: string;
  originalTxId?: string;

  acceptanceDateTime?: Date; // AccptncDtTm
  settlementDate?: string; // SttlmDt (date-YYYY-MM-DD)
}

export type StatusInformation =
  | GroupStatusInformation
  | PaymentStatusInformation
  | TransactionStatusInformation;

export interface PaymentStatusReportConfig {
  xml: string;
}

export interface PaymentStatusReportProps {
  messageId: string;
  creationDate: Date;
  initatingParty: Party;
  originalGroupInformation: OriginalGroupInformation;
  statusInformations: StatusInformation[];
}
