export type BuildPacs002AcspInput = {
  msgId?: string; // if not provided, generated
  now?: Date; // if not provided, new Date()
  related: {
    orgnlMsgId: string; // pacs.008 GrpHdr.MsgId
    orgnlMsgNmId?: string; // e.g. "pacs.008.001.08"
    orgnlInstrId?: string;
    orgnlEndToEndId?: string;
    orgnlTxId?: string;
  };
  reasonCode?: string; // default "G000"
  additionalInfo?: string; // default "Accepted for processing; funds hold placed"
};

export function buildPacs002Acsp(input: BuildPacs002AcspInput): string {
  const now = input.now ?? new Date();
  const isoNow = now.toISOString();
  const msgId =
    input.msgId ?? `MCB-${isoNow.replace(/[-:.TZ]/g, '').slice(0, 14)}-ACSP`;

  const reasonCode = input.reasonCode ?? 'G000';
  const addtl =
    input.additionalInfo ?? 'Accepted for processing; funds hold placed';

  const { orgnlMsgId, orgnlMsgNmId, orgnlInstrId, orgnlEndToEndId, orgnlTxId } =
    input.related;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10">
  <FIToFIPmtStsRpt>
    <GrpHdr>
      <MsgId>${x(msgId)}</MsgId>
      <CreDtTm>${isoNow}</CreDtTm>
    </GrpHdr>
    <OrgnlGrpInfAndSts>
      <OrgnlMsgId>${x(orgnlMsgId)}</OrgnlMsgId>
      ${orgnlMsgNmId ? `<OrgnlMsgNmId>${x(orgnlMsgNmId)}</OrgnlMsgNmId>` : ''}
      <GrpSts>ACSP</GrpSts>
      <StsRsnInf>
        <Rsn><Prtry>${x(reasonCode)}</Prtry></Rsn>
        <AddtlInf>${x(addtl)}</AddtlInf>
      </StsRsnInf>
    </OrgnlGrpInfAndSts>
    <OrgnlTxInfAndSts>
      ${orgnlInstrId ? `<OrgnlInstrId>${x(orgnlInstrId)}</OrgnlInstrId>` : ''}
      ${orgnlEndToEndId ? `<OrgnlEndToEndId>${x(orgnlEndToEndId)}</OrgnlEndToEndId>` : ''}
      ${orgnlTxId ? `<OrgnlTxId>${x(orgnlTxId)}</OrgnlTxId>` : ''}
      <TxSts>ACSP</TxSts>
    </OrgnlTxInfAndSts>
  </FIToFIPmtStsRpt>
</Document>`;
}

function x(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
