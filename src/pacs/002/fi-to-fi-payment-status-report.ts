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
import type { MessageHeader, OriginalGroupInformation } from "../../lib/types";
import {
  exportMessageHeader,
  parseMessageHeader,
  parseDate,
} from "../../parseUtils";

export type Pacs002StatusCode =
  | "ACSP"
  | "ACSC"
  | "RJCT"
  | "PDNG"
  | "RJCR"
  | "ACCP";

export interface StatusReason {
  code?: string;
  additionalInfo?: string;
}

export interface OriginalTransactionStatus {
  endToEndId?: string;
  txId?: string;
  instructionId?: string;
  status: Pacs002StatusCode;
  reasons?: StatusReason[];
  statusDate?: Date;
}

export interface FIToFIPaymentStatusReportData {
  header: MessageHeader;
  originalGroupInformation?: OriginalGroupInformation;
  groupStatus?: Pacs002StatusCode;
  transactions?: OriginalTransactionStatus[];
}

/** pacs.002 FIToFIPaymentStatusReport */
export class FIToFIPaymentStatusReport implements GenericISO20022Message {
  public static readonly NAMESPACE =
    "urn:iso:std:iso:20022:tech:xsd:pacs.002.001.12";
  public static readonly ROOT = "FIToFIPmtStsRpt";

  private _data: FIToFIPaymentStatusReportData;
  constructor(data: FIToFIPaymentStatusReportData) {
    this._data = data;
  }
  get data(): FIToFIPaymentStatusReportData {
    return this._data;
  }

  get type(): ISO20022MessageTypeName {
    return ISO20022Messages.PACS_002;
  }

  public toJSON(): any {
    const { header, originalGroupInformation, groupStatus, transactions } =
      this._data;

    const OrgnlGrpInfAndSts: any = originalGroupInformation
      ? {
          OrgnlMsgId: originalGroupInformation.originalMessageId,
          ...(originalGroupInformation.originalMessageNameId && {
            OrgnlMsgNmId: originalGroupInformation.originalMessageNameId,
          }),
          ...(originalGroupInformation.originalCreationDateTime && {
            OrgnlCreDtTm:
              originalGroupInformation.originalCreationDateTime.toISOString(),
          }),
          ...(groupStatus && { GrpSts: groupStatus }),
        }
      : undefined;

    const TxInfAndSts = (transactions || []).map((t) => ({
      ...(t.endToEndId || t.instructionId || t.txId
        ? {
            OrgnlPmtId: {
              ...(t.endToEndId && { EndToEndId: t.endToEndId }),
              ...(t.instructionId && { InstrId: t.instructionId }),
              ...(t.txId && { TxId: t.txId }),
            },
          }
        : {}),
      TxSts: t.status,
      ...(t.reasons && t.reasons.length > 0
        ? {
            StsRsnInf: t.reasons.map((r) => ({
              ...(r.code
                ? {
                    Rsn:
                      r.code.length === 4 ? { Cd: r.code } : { Prtry: r.code },
                  }
                : {}),
              ...(r.additionalInfo ? { AddtlInf: r.additionalInfo } : {}),
            })),
          }
        : {}),
      ...(t.statusDate ? { AccptncDtTm: t.statusDate.toISOString() } : {}),
    }));

    const Document: any = {
      "@_xmlns": FIToFIPaymentStatusReport.NAMESPACE,
      "@_xsi": "http://www.w3.org/2001/XMLSchema-instance",
      [FIToFIPaymentStatusReport.ROOT]: {
        GrpHdr: exportMessageHeader(header),
        ...(OrgnlGrpInfAndSts && { OrgnlGrpInfAndSts }),
        ...(TxInfAndSts.length > 0 && { TxInfAndSts }),
      },
    };

    return { Document };
  }

  public serialize(): string {
    return XML.getBuilder().build(this.toJSON());
  }

  public static parse(doc: any): FIToFIPaymentStatusReportData {
    const ns = doc?.Document?.["@_xmlns"];
    if (ns !== FIToFIPaymentStatusReport.NAMESPACE) {
      throw new InvalidXmlNamespaceError(
        `Invalid namespace for PACS.002. Expected ${FIToFIPaymentStatusReport.NAMESPACE}, got ${ns}`,
      );
    }

    const root = doc?.Document?.[FIToFIPaymentStatusReport.ROOT];
    if (!root)
      throw new InvalidStructureError(
        "Invalid PACS.002 document: missing FIToFIPmtStsRpt",
      );

    const header = parseMessageHeader(root.GrpHdr);

    const og = root.OrgnlGrpInfAndSts;
    const originalGroupInformation: OriginalGroupInformation | undefined = og
      ? {
          originalMessageId: og.OrgnlMsgId,
          originalMessageNameId: og.OrgnlMsgNmId,
          originalCreationDateTime: og.OrgnlCreDtTm
            ? parseDate(og.OrgnlCreDtTm)
            : undefined,
        }
      : undefined;

    const groupStatus: Pacs002StatusCode | undefined = og?.GrpSts;

    let txs = root.TxInfAndSts || [];
    if (!Array.isArray(txs)) txs = [txs];
    txs = txs.filter(Boolean);

    const transactions: OriginalTransactionStatus[] = txs.map((t: any) => {
      const reasonsRaw = t.StsRsnInf || [];
      const reasonsArr = Array.isArray(reasonsRaw) ? reasonsRaw : [reasonsRaw];

      const reasons: StatusReason[] = reasonsArr
        .filter(Boolean)
        .map((r: any) => ({
          code: r?.Rsn?.Cd || r?.Rsn?.Prtry,
          additionalInfo: r?.AddtlInf,
        }));

      return {
        endToEndId: t?.OrgnlPmtId?.EndToEndId,
        instructionId: t?.OrgnlPmtId?.InstrId,
        txId: t?.OrgnlPmtId?.TxId,
        status: t?.TxSts,
        reasons,
        statusDate: t?.AccptncDtTm ? parseDate(t.AccptncDtTm) : undefined,
      } as OriginalTransactionStatus;
    });

    return { header, originalGroupInformation, groupStatus, transactions };
  }

  static supportedMessages(): ISO20022MessageTypeName[] {
    return [ISO20022Messages.PACS_002];
  }

  static fromXML(xmlString: string): FIToFIPaymentStatusReport {
    const parser = XML.getParser();
    const xml = parser.parse(xmlString);
    if (!xml?.Document) throw new InvalidXmlError("Invalid XML format");
    const data = FIToFIPaymentStatusReport.parse(xml);
    return new FIToFIPaymentStatusReport(data);
  }

  static fromJSON(jsonString: string): FIToFIPaymentStatusReport {
    const obj = JSON.parse(jsonString);
    if (!obj?.Document) throw new InvalidXmlError("Invalid JSON format");
    const data = FIToFIPaymentStatusReport.parse(obj);
    return new FIToFIPaymentStatusReport(data);
  }
}

registerISO20022Implementation(FIToFIPaymentStatusReport);
