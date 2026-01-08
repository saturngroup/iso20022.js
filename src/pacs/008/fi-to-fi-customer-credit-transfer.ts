import { Currency } from "dinero.js";
import {
  InvalidStructureError,
  InvalidXmlError,
  InvalidXmlNamespaceError,
} from "../../errors";
import {
  ISO20022Messages,
  XML,
  registerISO20022Implementation,
  type GenericISO20022Message,
  type ISO20022MessageTypeName,
} from "../../iso20022";
import type {
  MessageHeader,
  Party,
  Agent,
  AccountIdentification,
} from "../../lib/types";
import {
  exportMessageHeader,
  parseMessageHeader,
  exportAccountIdentification,
  parseAccountIdentification,
  exportAgent,
  parseAgent,
  exportAmountToString,
  parseAmountToMinorUnits,
} from "../../parseUtils";

/** Data structure for a single FI-to-FI credit transfer. */
export interface Pacs008CreditTransfer {
  endToEndId?: string;
  instructionId?: string;
  txId?: string;

  amount: number;
  currency: string;

  debtor: Party;
  debtorAccount: AccountIdentification;
  debtorAgent: Agent;

  creditor: Party;
  creditorAccount: AccountIdentification;
  creditorAgent: Agent;

  remittanceInformation?: string;
  categoryPurposeCode?: string;
  requestedExecutionDate?: Date;
}

export interface FIToFICustomerCreditTransferData {
  header: MessageHeader;
  transfer: Pacs008CreditTransfer;
}

/** pacs.008 FIToFICustomerCreditTransfer */
export class FIToFICustomerCreditTransfer implements GenericISO20022Message {
  public static readonly NAMESPACE =
    "urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10";
  public static readonly ROOT = "FIToFICstmrCdtTrf";

  private _data: FIToFICustomerCreditTransferData;
  constructor(data: FIToFICustomerCreditTransferData) {
    this._data = data;
  }
  get data(): FIToFICustomerCreditTransferData {
    return this._data;
  }

  get type(): ISO20022MessageTypeName {
    return ISO20022Messages.PACS_008;
  }

  /** Export XML object tree compatible with XML.getBuilder(). */
  public toJSON(): any {
    const { header, transfer } = this._data;

    const Document: any = {
      "@_xmlns": FIToFICustomerCreditTransfer.NAMESPACE,
      "@_xsi": "http://www.w3.org/2001/XMLSchema-instance",
      [FIToFICustomerCreditTransfer.ROOT]: {
        GrpHdr: exportMessageHeader(header),
        CdtTrfTxInf: {
          PmtId: {
            ...(transfer.endToEndId && { EndToEndId: transfer.endToEndId }),
            ...(transfer.instructionId && { InstrId: transfer.instructionId }),
            ...(transfer.txId && { TxId: transfer.txId }),
          },
          IntrBkSttlmAmt: {
            "@_Ccy": transfer.currency,
            "#text": exportAmountToString(
              transfer.amount,
              transfer.currency as Currency,
            ),
          },
          ...(transfer.requestedExecutionDate && {
            IntrBkSttlmDt: transfer.requestedExecutionDate
              .toISOString()
              .slice(0, 10),
          }),
          Dbtr: {
            ...(transfer.debtor?.name && { Nm: transfer.debtor.name }),
            ...(transfer.debtor?.id && {
              Id: { OrgId: { Othr: { Id: transfer.debtor.id } } },
            }),
          },
          DbtrAcct: { Id: exportAccountIdentification(transfer.debtorAccount) },
          DbtrAgt: { FinInstnId: exportAgent(transfer.debtorAgent) },
          CdtrAgt: { FinInstnId: exportAgent(transfer.creditorAgent) },
          Cdtr: {
            ...(transfer.creditor?.name && { Nm: transfer.creditor.name }),
            ...(transfer.creditor?.id && {
              Id: { OrgId: { Othr: { Id: transfer.creditor.id } } },
            }),
          },
          CdtrAcct: {
            Id: exportAccountIdentification(transfer.creditorAccount),
          },
          ...(transfer.categoryPurposeCode && {
            Purp: { Cd: transfer.categoryPurposeCode },
          }),
          ...(transfer.remittanceInformation && {
            RmtInf: { Ustrd: transfer.remittanceInformation },
          }),
        },
      },
    };

    return { Document };
  }

  /** Serialize to XML string. */
  public serialize(): string {
    const builder = XML.getBuilder();
    return builder.build(this.toJSON());
  }

  /** Parse a pacs.008 XML object tree into a typed structure. */
  public static parse(doc: any): FIToFICustomerCreditTransferData {
    const ns = doc?.Document?.["@_xmlns"];
    if (ns !== FIToFICustomerCreditTransfer.NAMESPACE) {
      throw new InvalidXmlNamespaceError(
        `Invalid namespace for PACS.008. Expected ${FIToFICustomerCreditTransfer.NAMESPACE}, got ${ns}`,
      );
    }

    const root = doc?.Document?.[FIToFICustomerCreditTransfer.ROOT];
    if (!root)
      throw new InvalidStructureError(
        "Invalid PACS.008 document: missing FIToFICstmrCdtTrf",
      );

    const header = parseMessageHeader(root.GrpHdr);

    const tx = root.CdtTrfTxInf;
    if (!tx?.IntrBkSttlmAmt?.["@_Ccy"] || !tx?.IntrBkSttlmAmt?.["#text"]) {
      throw new InvalidStructureError(
        "Invalid PACS.008: missing IntrBkSttlmAmt",
      );
    }

    const amtNode = tx.IntrBkSttlmAmt;
    const currency = amtNode?.["@_Ccy"];
    const major = Number(amtNode?.["#text"]);
    const amountMinor = parseAmountToMinorUnits(major, currency);

    const debtor: Party = {
      id: tx.Dbtr?.Id?.OrgId?.Othr?.Id,
      name: tx.Dbtr?.Nm,
    };
    const creditor: Party = {
      id: tx.Cdtr?.Id?.OrgId?.Othr?.Id,
      name: tx.Cdtr?.Nm,
    };

    return {
      header,
      transfer: {
        endToEndId: tx.PmtId?.EndToEndId,
        instructionId: tx.PmtId?.InstrId,
        txId: tx.PmtId?.TxId,
        amount: amountMinor,
        currency,
        debtor,
        debtorAccount: parseAccountIdentification(tx?.DbtrAcct?.Id ?? {}),
        debtorAgent: parseAgent(tx?.DbtrAgt?.FinInstnId ?? {}),
        creditor,
        creditorAccount: parseAccountIdentification(tx?.CdtrAcct?.Id ?? {}),
        creditorAgent: parseAgent(tx?.CdtrAgt?.FinInstnId ?? {}),
        remittanceInformation: tx.RmtInf?.Ustrd,
        categoryPurposeCode: tx.Purp?.Cd,
        requestedExecutionDate: tx.IntrBkSttlmDt
          ? new Date(tx.IntrBkSttlmDt)
          : undefined,
      },
    };
  }

  // --- Factory API required by registerISO20022Implementation ---

  static supportedMessages(): ISO20022MessageTypeName[] {
    return [ISO20022Messages.PACS_008];
  }

  static fromXML(xmlString: string): FIToFICustomerCreditTransfer {
    const parser = XML.getParser();
    const xml = parser.parse(xmlString);
    if (!xml?.Document) throw new InvalidXmlError("Invalid XML format");
    const data = FIToFICustomerCreditTransfer.parse(xml);
    return new FIToFICustomerCreditTransfer(data);
  }

  static fromJSON(jsonString: string): FIToFICustomerCreditTransfer {
    const obj = JSON.parse(jsonString);
    if (!obj?.Document) throw new InvalidXmlError("Invalid JSON format");
    const data = FIToFICustomerCreditTransfer.parse(obj);
    return new FIToFICustomerCreditTransfer(data);
  }
}

registerISO20022Implementation(FIToFICustomerCreditTransfer);
