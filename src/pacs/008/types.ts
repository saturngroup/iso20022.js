import { Account, Party } from '../../lib/types';

export interface CreditTransferTransaction {
  instructionId?: string;
  endToEndId?: string;
  transactionId?: string;

  amount: number; // minor units
  currency: string;

  debtor?: Party;
  debtorAccount?: Account;
  debtorAgentBIC?: string;

  creditor?: Party;
  creditorAccount?: Account;
  creditorAgentBIC?: string;

  // NEW: instructing/instructed agents (present in your example)
  instgAgtBIC?: string;
  instdAgtBIC?: string;

  remittanceInformation?: string; // Unstructured
  chargeBearer?: string; // CHQB, CRED, DEBT, SHAR, SLEV...
}

export interface FIToFICustomerCreditTransferProps {
  messageId: string;
  creationDate: Date;
  settlementDate?: Date;
  numberOfTransactions?: number;
  transactions: CreditTransferTransaction[];
}

export interface FIToFICustomerCreditTransferConfig {
  xml: string;
}
