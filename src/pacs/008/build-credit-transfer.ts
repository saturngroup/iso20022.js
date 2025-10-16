export type BuildPacs008Input = {
  msgId: string; // GrpHdr.MsgId
  creDtTm?: Date; // default new Date()
  // Payment Ids
  instrId?: string;
  endToEndId: string;
  txId?: string;

  // Amount (major units as decimal string, ex.: "1000.00")
  amount: { ccy: string; value: string };

  // Creditor
  creditorName: string;
  creditorIban: string;

  // Optional parties/agents
  chargeBearer?: 'CHQB' | 'CRED' | 'DEBT' | 'SHAR' | 'SLEV';
  instgAgtBIC?: string;
  instdAgtBIC?: string;

  // Optional remittance (unstructured)
  remittanceInformation?: string;
};

export function buildPacs008SingleTx(input: BuildPacs008Input): string {
  const now = (input.creDtTm ?? new Date()).toISOString();

  // Basic checks
  if (!/^\d+(\.\d{1,6})?$/.test(input.amount.value)) {
    throw new Error('Amount value must be a decimal string (e.g., "1000.00")');
  }
  if (!/^[A-Z]{3}$/.test(input.amount.ccy)) {
    throw new Error('Amount currency must be a 3-letter code');
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${x(input.msgId)}</MsgId>
      <CreDtTm>${now}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        ${input.instrId ? `<InstrId>${x(input.instrId)}</InstrId>` : ''}
        <EndToEndId>${x(input.endToEndId)}</EndToEndId>
        ${input.txId ? `<TxId>${x(input.txId)}</TxId>` : ''}
      </PmtId>
      <IntrBkSttlmAmt Ccy="${x(input.amount.ccy)}">${x(input.amount.value)}</IntrBkSttlmAmt>
      ${input.chargeBearer ? `<ChrgBr>${x(input.chargeBearer)}</ChrgBr>` : ''}

      <Cdtr><Nm>${x(input.creditorName)}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${x(input.creditorIban)}</IBAN></Id></CdtrAcct>

      ${input.remittanceInformation ? `<RmtInf><Ustrd>${x(input.remittanceInformation)}</Ustrd></RmtInf>` : ''}

      ${input.instgAgtBIC ? `<InstgAgt><FinInstnId><BICFI>${x(input.instgAgtBIC)}</BICFI></FinInstnId></InstgAgt>` : ''}
      ${input.instdAgtBIC ? `<InstdAgt><FinInstnId><BICFI>${x(input.instdAgtBIC)}</BICFI></FinInstnId></InstdAgt>` : ''}
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
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
