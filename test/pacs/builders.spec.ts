import { buildPacs008SingleTx } from '../../src/pacs/008/build-credit-transfer';
import { FIToFICustomerCreditTransfer } from '../../src/pacs/008/customer-credit-transfer';

import { buildPacs002Acsp } from '../../src/pacs/002/build-acsp';
import { FIToFIPaymentStatusReport } from '../../src/pacs/002/payment-status-report';

describe('ISO20022 builders → parsers round-trip', () => {
  it('builds a pacs.008 (single tx) and parses it back', () => {
    const xml = buildPacs008SingleTx({
      msgId: 'GW-2025-10-06-001',
      instrId: 'GW-REF-001',
      endToEndId: 'E2E-001',
      txId: 'TX-001',
      amount: { ccy: 'EUR', value: '1000.00' },
      creditorName: 'Ant',
      creditorIban: 'FR7612345678901234567890185',
      chargeBearer: 'SLEV',
      instgAgtBIC: 'GATEFRPPXXX',
      instdAgtBIC: 'MCBHKHKHXXX',
      remittanceInformation: 'Invoice 2025-0917',
    });

    const parsed = new FIToFICustomerCreditTransfer({ xml }).toJSON();

    expect(parsed.messageId).toBe('GW-2025-10-06-001');
    expect(parsed.numberOfTransactions).toBe(1);

    const t0 = parsed.transactions[0];
    expect(t0.instructionId).toBe('GW-REF-001');
    expect(t0.endToEndId).toBe('E2E-001');
    expect(t0.transactionId).toBe('TX-001');

    expect(t0.currency).toBe('EUR');
    expect(t0.amount).toBe(100000); // 1000.00 EUR → 100000 minor units (2 decimals)

    expect(t0.creditor?.name).toBe('Ant');
    expect(t0.creditorAccount?.iban).toBe('FR7612345678901234567890185');

    expect(t0.chargeBearer).toBe('SLEV');
    expect(t0.instgAgtBIC).toBe('GATEFRPPXXX');
    expect(t0.instdAgtBIC).toBe('MCBHKHKHXXX');
    expect(t0.remittanceInformation).toContain('Invoice 2025-0917');
  });

  it('builds a pacs.002 ACSP and parses it back', () => {
    const acspXml = buildPacs002Acsp({
      now: new Date('2025-10-06T10:15:10Z'),
      related: {
        orgnlMsgId: 'GW-2025-10-06-001',
        orgnlMsgNmId: 'pacs.008.001.08',
        orgnlInstrId: 'GW-REF-001',
        orgnlEndToEndId: 'E2E-001',
        orgnlTxId: 'TX-001',
      },
      reasonCode: 'G000',
      additionalInfo: 'Accepted for processing; funds hold placed',
    });

    const rpt = new FIToFIPaymentStatusReport({ xml: acspXml }).toJSON();

    // Group info
    expect(rpt.originalGroupInformation.originalMessageId).toBe(
      'GW-2025-10-06-001',
    );
    expect(rpt.originalGroupInformation.originalMessageNameId).toBe(
      'pacs.008.001.08',
    );

    // Group status entry (ACSP + reason)
    const group = rpt.statusInformations.find(
      (s: any) => s.type === 'group',
    ) as any;
    expect(group.status).toBe('ACSP');
    expect(group.reason?.code).toBe('G000');
    expect(group.reason?.additionalInformation).toContain(
      'Accepted for processing',
    );

    // Transaction status entry (root OrgnlTxInfAndSts)
    const tx = rpt.statusInformations.find(
      (s: any) => s.type === 'transaction',
    ) as any;
    expect(tx.status).toBe('ACSP');
    expect(tx.originalInstrId).toBe('GW-REF-001');
    expect(tx.originalEndToEndId).toBe('E2E-001');
    expect(tx.originalTxId).toBe('TX-001');
  });
});
