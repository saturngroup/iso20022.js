import { FIToFICustomerCreditTransfer } from '../src/pacs/008/customer-credit-transfer';
import { FIToFIPaymentStatusReport } from '../src/pacs/002/payment-status-report';

// --- Inline example XMLs (you can replace with fs.readFileSync) ---

// 3.1 pacs.008 — FIToFICustomerCreditTransfer (transfer initiation)
// Version pacs.008.001.08 and includes InstgAgt/InstdAgt
const PACS008_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>GW-2025-10-06-001</MsgId>
      <CreDtTm>2025-10-06T10:15:00Z</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>GW-REF-001</InstrId>
        <EndToEndId>E2E-001</EndToEndId>
        <TxId>TX-001</TxId>
      </PmtId>
      <IntrBkSttlmAmt Ccy="EUR">1000.00</IntrBkSttlmAmt>
      <ChrgBr>SLEV</ChrgBr>
      <Cdtr><Nm>Ant</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>FR7612345678901234567890185</IBAN></Id></CdtrAcct>
      <RmtInf><Ustrd>Invoice 2025-0917</Ustrd></RmtInf>
      <InstgAgt><FinInstnId><BICFI>GATEFRPPXXX</BICFI></FinInstnId></InstgAgt>
      <InstdAgt><FinInstnId><BICFI>MCBHKHKHXXX</BICFI></FinInstnId></InstdAgt>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

// 3.2.1 pacs.002 — Provisional status (ACSP) with reason Prtry and root OrgnlTxInfAndSts
const PACS002_ACSP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10">
  <FIToFIPmtStsRpt>
    <GrpHdr>
      <MsgId>MCB-2025-10-06-9001</MsgId>
      <CreDtTm>2025-10-06T10:15:10Z</CreDtTm>
    </GrpHdr>
    <OrgnlGrpInfAndSts>
      <OrgnlMsgId>GW-2025-10-06-001</OrgnlMsgId>
      <OrgnlMsgNmId>pacs.008.001.08</OrgnlMsgNmId>
      <GrpSts>ACSP</GrpSts>
      <StsRsnInf>
        <Rsn><Prtry>G000</Prtry></Rsn>
        <AddtlInf>Accepted for processing; funds hold placed</AddtlInf>
      </StsRsnInf>
    </OrgnlGrpInfAndSts>
    <OrgnlTxInfAndSts>
      <OrgnlInstrId>GW-REF-001</OrgnlInstrId>
      <OrgnlEndToEndId>E2E-001</OrgnlEndToEndId>
      <OrgnlTxId>TX-001</OrgnlTxId>
      <TxSts>ACSP</TxSts>
    </OrgnlTxInfAndSts>
  </FIToFIPmtStsRpt>
</Document>`;

// 3.2.2 pacs.002 — Final status (ACSC) with acceptance and settlement
const PACS002_ACSC_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10">
  <FIToFIPmtStsRpt>
    <GrpHdr>
      <MsgId>MCB-2025-10-06-9002</MsgId>
      <CreDtTm>2025-10-06T10:15:40Z</CreDtTm>
    </GrpHdr>
    <OrgnlGrpInfAndSts>
      <OrgnlMsgId>GW-2025-10-06-001</OrgnlMsgId>
      <OrgnlMsgNmId>pacs.008.001.08</OrgnlMsgNmId>
      <GrpSts>ACSC</GrpSts>
    </OrgnlGrpInfAndSts>
    <OrgnlTxInfAndSts>
      <OrgnlInstrId>GW-REF-001</OrgnlInstrId>
      <OrgnlEndToEndId>E2E-001</OrgnlEndToEndId>
      <OrgnlTxId>TX-001</OrgnlTxId>
      <TxSts>ACSC</TxSts>
      <AccptncDtTm>2025-10-06T10:15:38Z</AccptncDtTm>
      <SttlmDt>2025-10-06</SttlmDt>
    </OrgnlTxInfAndSts>
  </FIToFIPmtStsRpt>
</Document>`;

// --- Example runner ---

async function main() {
  // PACS.008 (FIToFICustomerCreditTransfer)
  const pacs008 = new FIToFICustomerCreditTransfer({ xml: PACS008_XML });
  const p8 = pacs008.toJSON();

  console.log('=== PACS.008 (FIToFICustomerCreditTransfer) ===');
  console.log('Message ID:', p8.messageId);
  console.log('Creation Date:', p8.creationDate.toISOString());
  console.log('Number of Transactions:', p8.numberOfTransactions);
  const t0 = p8.transactions[0];
  console.log('Tx IDs:', {
    instructionId: t0.instructionId,
    endToEndId: t0.endToEndId,
    transactionId: t0.transactionId,
  });
  console.log('Amount:', `${t0.amount} (minor units) ${t0.currency}`);
  console.log('InstgAgt BIC:', t0.instgAgtBIC);
  console.log('InstdAgt BIC:', t0.instdAgtBIC);
  console.log('Creditor:', t0.creditor?.name);
  console.log('Remittance:', t0.remittanceInformation);
  console.log('ChargeBearer:', t0.chargeBearer);

  // PACS.002 (ACSP provisional)
  const pacs002Acsp = new FIToFIPaymentStatusReport({ xml: PACS002_ACSP_XML });
  const p2a = pacs002Acsp.toJSON();

  console.log('\n=== PACS.002 (FIToFIPaymentStatusReport) – ACSP ===');
  console.log('Message ID:', p2a.messageId);
  console.log('Creation Date:', p2a.creationDate.toISOString());
  console.log('Original Group:', {
    originalMessageId: p2a.originalGroupInformation.originalMessageId,
    originalMessageNameId: p2a.originalGroupInformation.originalMessageNameId,
  });
  const groupACSP = p2a.statusInformations.find(
    s => (s as any).type === 'group',
  ) as any;
  const txACSP = p2a.statusInformations.find(
    s => (s as any).type === 'transaction',
  ) as any;
  console.log('Group Status:', groupACSP?.status, groupACSP?.reason);
  console.log('Tx Status:', {
    status: txACSP?.status,
    originalInstrId: txACSP?.originalInstrId,
    originalEndToEndId: txACSP?.originalEndToEndId,
    originalTxId: txACSP?.originalTxId,
    acceptanceDateTime: txACSP?.acceptanceDateTime ?? 'N/A',
    settlementDate: txACSP?.settlementDate ?? 'N/A',
  });

  // PACS.002 (ACSC final)
  const pacs002Acsc = new FIToFIPaymentStatusReport({ xml: PACS002_ACSC_XML });
  const p2f = pacs002Acsc.toJSON();

  console.log('\n=== PACS.002 (FIToFIPaymentStatusReport) – ACSC ===');
  console.log('Message ID:', p2f.messageId);
  const txACSC = p2f.statusInformations.find(
    s => (s as any).type === 'transaction',
  ) as any;
  console.log('Tx Status:', {
    status: txACSC?.status,
    acceptanceDateTime: txACSC?.acceptanceDateTime?.toISOString(),
    settlementDate: txACSC?.settlementDate,
  });
}

main().catch(err => {
  console.error('[parse-pacs] Error:', err);
  process.exit(1);
});
