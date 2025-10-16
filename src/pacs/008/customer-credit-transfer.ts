import { XMLParser } from 'fast-xml-parser';
import { Account, Party } from '../../lib/types';
import {
  parseAccount,
  parseAmountToMinorUnits,
  parseParty,
  parseRecipient,
} from '../../parseUtils';
import {
  CreditTransferTransaction,
  FIToFICustomerCreditTransferConfig,
  FIToFICustomerCreditTransferProps,
} from './types';

/**
 * FIToFICustomerCreditTransfer (PACS.008) parser
 * Supports:
 *  - pacs.008.001.08/10 (lenient)
 *  - IntrBkSttlmAmt or Amt.InstdAmt
 *  - InstgAgt / InstdAgt BIC at transaction level
 */
export class FIToFICustomerCreditTransfer {
  private _messageId: string;
  private _creationDate: Date;
  private _settlementDate?: Date;
  private _numberOfTransactions?: number;
  private _transactions: CreditTransferTransaction[];

  constructor(config: FIToFICustomerCreditTransferConfig) {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
      isArray: name => ['CdtTrfTxInf', 'Ustrd'].includes(name),
    });

    const doc = parser.parse(config.xml);
    const msg = doc?.Document?.FIToFICstmrCdtTrf;
    if (!msg) {
      throw new Error(
        'Invalid PACS.008: root Document.FIToFICstmrCdtTrf not found',
      );
    }

    const grpHdr = msg.GrpHdr || {};
    this._messageId = grpHdr.MsgId;
    this._creationDate = grpHdr.CreDtTm
      ? new Date(grpHdr.CreDtTm)
      : (undefined as any);
    this._numberOfTransactions = grpHdr.NbOfTxs
      ? Number(grpHdr.NbOfTxs)
      : undefined;

    // Some implementations expose a global settlement date, otherwise derive from tx when needed
    const sttlmFromHdr = grpHdr?.IntrBkSttlmDt || msg?.SttlmInf?.SttlmDt;
    this._settlementDate = sttlmFromHdr ? new Date(sttlmFromHdr) : undefined;

    const txs = (msg.CdtTrfTxInf || []) as any[];
    this._transactions = txs.map(tx => {
      // Amount
      const amtNode =
        tx.IntrBkSttlmAmt || tx.Amt?.InstdAmt || tx.Amt?.EqvtAmt?.Amt;
      const currency: string = amtNode?.Ccy || tx?.Amt?.InstdAmt?.Ccy || 'USD';

      const rawAmount = Number(
        amtNode?.['#text'] ?? amtNode ?? tx?.Amt?.InstdAmt?.['#text'],
      );
      const amountMinor = parseAmountToMinorUnits(rawAmount, currency as any);

      // Parties/accounts
      const debtor: Party | undefined = tx.Dbtr
        ? parseParty(tx.Dbtr)
        : undefined;
      const debtorAccount: Account | undefined = tx.DbtrAcct
        ? parseAccount(tx.DbtrAcct)
        : undefined;
      const debtorAgentBIC: string | undefined =
        tx.DbtrAgt?.FinInstnId?.BICFI || tx.DbtrAgt?.FinInstnId?.BIC;

      const creditor: Party | undefined = tx.Cdtr
        ? parseRecipient(tx.Cdtr)
        : undefined;
      const creditorAccount: Account | undefined = tx.CdtrAcct
        ? parseAccount(tx.CdtrAcct)
        : undefined;
      const creditorAgentBIC: string | undefined =
        tx.CdtrAgt?.FinInstnId?.BICFI || tx.CdtrAgt?.FinInstnId?.BIC;

      // NEW: InstgAgt / InstdAgt (your gateway <> MCB example)
      const instgAgtBIC: string | undefined =
        tx.InstgAgt?.FinInstnId?.BICFI || tx.InstgAgt?.FinInstnId?.BIC;
      const instdAgtBIC: string | undefined =
        tx.InstdAgt?.FinInstnId?.BICFI || tx.InstdAgt?.FinInstnId?.BIC;

      // Remittance (unstructured)
      let ustrd: string | undefined;
      const remUstrd = tx?.RmtInf?.Ustrd;
      if (Array.isArray(remUstrd)) ustrd = remUstrd.join('\n');
      else if (typeof remUstrd === 'string') ustrd = remUstrd;

      const chargeBearer: string | undefined = tx?.ChrgBr;

      return {
        instructionId: tx?.PmtId?.InstrId,
        endToEndId: tx?.PmtId?.EndToEndId,
        transactionId: tx?.PmtId?.TxId,

        amount: amountMinor,
        currency,

        debtor,
        debtorAccount,
        debtorAgentBIC,

        creditor,
        creditorAccount,
        creditorAgentBIC,

        instgAgtBIC,
        instdAgtBIC,

        remittanceInformation: ustrd,
        chargeBearer,
      } as CreditTransferTransaction;
    });
  }

  get messageId() {
    return this._messageId;
  }
  get creationDate() {
    return this._creationDate;
  }
  get settlementDate() {
    return this._settlementDate;
  }
  get numberOfTransactions() {
    return this._numberOfTransactions;
  }
  get transactions() {
    return this._transactions;
  }

  toJSON(): FIToFICustomerCreditTransferProps {
    return {
      messageId: this._messageId,
      creationDate: this._creationDate,
      settlementDate: this._settlementDate,
      numberOfTransactions: this._numberOfTransactions,
      transactions: this._transactions,
    };
  }
}
