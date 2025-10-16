import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FIToFIPaymentStatusReport } from '../../../src/pacs/002/payment-status-report';

const fx = (p: string) =>
  readFileSync(resolve(__dirname, '../fixtures/pacs002', p), 'utf-8');

describe('PACS.002 provisional (ACSP)', () => {
  it('parses group reason Prtry and root OrgnlTxInfAndSts', () => {
    const xml = fx('acsp-provisional.xml');
    const rpt = new FIToFIPaymentStatusReport({ xml }).toJSON();

    expect(rpt.messageId).toBe('MCB-2025-10-06-9001');
    expect(rpt.originalGroupInformation.originalMessageId).toBe(
      'GW-2025-10-06-001',
    );
    expect(rpt.originalGroupInformation.originalMessageNameId).toBe(
      'pacs.008.001.08',
    );

    const group = rpt.statusInformations.find(
      (s: any) => s.type === 'group',
    ) as any;
    expect(group.status).toBe('ACSP');
    expect(group.reason.code).toBe('G000');
    expect(group.reason.additionalInformation).toContain(
      'Accepted for processing',
    );

    const tx = rpt.statusInformations.find(
      (s: any) => s.type === 'transaction',
    ) as any;
    expect(tx.originalInstrId).toBe('GW-REF-001');
    expect(tx.originalEndToEndId).toBe('E2E-001');
    expect(tx.originalTxId).toBe('TX-001');
    expect(tx.status).toBe('ACSP');
    expect(tx.acceptanceDateTime).toBeUndefined();
    expect(tx.settlementDate).toBeUndefined();
  });
});

describe('PACS.002 final (ACSC)', () => {
  it('parses acceptance and settlement fields', () => {
    const xml = fx('acsc-final.xml');
    const rpt = new FIToFIPaymentStatusReport({ xml }).toJSON();

    expect(rpt.messageId).toBe('MCB-2025-10-06-9002');

    const tx = rpt.statusInformations.find(
      (s: any) => s.type === 'transaction',
    ) as any;
    expect(tx.status).toBe('ACSC');
    expect(tx.acceptanceDateTime?.toISOString()).toBe(
      '2025-10-06T10:15:38.000Z',
    );
    expect(tx.settlementDate).toBe('2025-10-06');
  });
});
