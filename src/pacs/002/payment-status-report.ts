import { XMLParser } from 'fast-xml-parser';
import { Party } from '../../lib/types';
import { parseParty } from '../../parseUtils';
import {
  parseGroupStatusInformation,
  parsePaymentStatusInformations,
  parseTransactionStatusInformations,
} from './utils';
import {
  StatusInformation,
  PaymentStatusReportConfig,
  PaymentStatusReportProps,
  OriginalGroupInformation,
} from './types';

/**
 * FIToFIPaymentStatusReport (PACS.002) parser
 * Supports:
 *  - Group-level status in OrgnlGrpInfAndSts (incl. OrgnlMsgNmId)
 *  - Payment-level in OrgnlPmtInfAndSts[]
 *  - Transaction-level in either OrgnlPmtInfAndSts[].TxInfAndSts[] or root OrgnlTxInfAndSts[]
 *  - Reason code in Rsn.Cd or Rsn.Prtry, AddtlInf as string|string[]
 *  - Acceptance/Settlement fields per transaction
 */
export class FIToFIPaymentStatusReport {
  private _messageId: string;
  private _creationDate: Date;
  private _initatingParty: Party;
  private _originalGroupInformation: OriginalGroupInformation;
  private _statusInformations: StatusInformation[];

  constructor(config: PaymentStatusReportConfig) {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
      isArray: name =>
        [
          'OrgnlPmtInfAndSts',
          'TxInfAndSts',
          'OrgnlTxInfAndSts',
          'StsRsnInf',
          'Rsn',
          'AddtlInf',
        ].includes(name),
    });

    const doc = parser.parse(config.xml);
    const rpt = doc?.Document?.FIToFIPmtStsRpt;
    if (!rpt) {
      throw new Error(
        'Invalid PACS.002: root Document.FIToFIPmtStsRpt not found',
      );
    }

    const grpHdr = rpt.GrpHdr || {};
    const orgnlGrp = rpt.OrgnlGrpInfAndSts || {};

    this._messageId = grpHdr.MsgId;
    this._creationDate = grpHdr.CreDtTm
      ? new Date(grpHdr.CreDtTm)
      : (undefined as any);
    this._initatingParty =
      (grpHdr.InitgPty && parseParty(grpHdr.InitgPty)) || ({} as Party);

    // Group status
    const groupStatus = parseGroupStatusInformation(orgnlGrp);

    // Payment-level statuses
    const paymentStatuses = parsePaymentStatusInformations(
      orgnlGrp?.OrgnlPmtInfAndSts || [],
    );

    // Transaction-level statuses:
    //   a) nested under OrgnlPmtInfAndSts[].TxInfAndSts[]
    const nestedTx = (orgnlGrp?.OrgnlPmtInfAndSts || []).flatMap(
      (p: any) => p?.TxInfAndSts || [],
    );
    //   b) root-level OrgnlTxInfAndSts[]
    const rootTx = rpt?.OrgnlTxInfAndSts || [];

    const txnStatusesParsed = parseTransactionStatusInformations([
      ...nestedTx,
      ...rootTx,
    ]);

    this._originalGroupInformation = {
      originalMessageId: orgnlGrp?.OrgnlMsgId,
      originalMessageNameId: orgnlGrp?.OrgnlMsgNmId,
    };

    this._statusInformations = [
      ...(groupStatus ? [groupStatus] : []),
      ...paymentStatuses,
      ...txnStatusesParsed,
    ];
  }

  get messageId() {
    return this._messageId;
  }
  get creationDate() {
    return this._creationDate;
  }
  get initatingParty() {
    return this._initatingParty;
  }
  get originalGroupInformation() {
    return this._originalGroupInformation;
  }
  get statusInformations() {
    return this._statusInformations;
  }

  toJSON(): PaymentStatusReportProps {
    return {
      messageId: this._messageId,
      creationDate: this._creationDate,
      initatingParty: this._initatingParty,
      originalGroupInformation: this._originalGroupInformation,
      statusInformations: this._statusInformations,
    };
  }
}
