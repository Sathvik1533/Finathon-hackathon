# Nova API Usage Guide

## 1. What Is the Aczen Nova API?
The Aczen Nova API is a real financial data API providing actual merchant payment records. It allows our system to ingest authentic data structures that closely mimic what enterprise accounting systems see in production.

## 2. Our Configuration:
- Base URL: https://www.aczen.in/nova-api/v1
- 4 endpoints we call: /payments, /gateway-transactions, /bank-transactions, /settlements
- API key: configured via NOVA_API_KEY environment variable
- Fallback: if key not set, the system uses J.P. Morgan-style synthetic data automatically

## 3. What Each Endpoint Gives Us:
- /payments: merchant's internal order records — order IDs, customer references, amounts in paise, timestamps
- /gateway-transactions: payment processor captures — gateway payment IDs, MDR fee (2%), GST (18%), captured amounts, settlement IDs, refund references
- /bank-transactions: bank clearing entries — UTR codes, credit amounts, settlement reference codes in narration text (e.g. CMS/NACH/SETTL/...)
- /settlements: lump-sum payout bundles — settlement IDs grouping multiple gateway transactions into one bank credit

## 4. How We Use the Nova Data in Our Engine:
- Nova data flows through all 7 reconciliation stages
- The UTR codes from /bank-transactions are critical for Stage 2 (Reference Match)
- The MDR fee from /gateway-transactions is critical for Stage 4 (Fee Calculation)
- The settlement IDs from /settlements are critical for Stage 6 (Settlement Match)

## 5. The Unfair Advantage:
Most hackathon teams generate random CSV files with made-up numbers. LedgerSense uses the Aczen Nova API — a real digital commerce accounting platform used in production. This gives us real-world financial structures: actual MDR fee schedules used by Indian payment processors, real T+2 settlement windows, authentic UTR narration formats that Indian banks generate, and realistic refund-to-capture linkages. Our reconciliation engine is tested against data that behaves exactly like a real Razorpay or PayU integration — not a spreadsheet someone made up at 2 AM.

## 6. What Happens Without Nova API:
- The NOVA_API_KEY env variable is not set → system automatically falls back to J.P. Morgan synthetic data
- The reconciliation engine still runs correctly with 4 orders (ORD-101 to ORD-104)
- But fee structures are simpler, UTR formats are generic, and settlement bundles are smaller
- For production: always configure NOVA_API_KEY for real-world accuracy

## 7. Sample Nova Endpoint Response Structure:
A sample response for `/payments`:
```json
[
  {
    "order_id": "ORD-101",
    "customer_ref": "CUST-A",
    "amount_paise": 100000,
    "timestamp": "2023-10-01T10:00:00Z"
  }
]
```

A sample response for `/gateway-transactions`:
```json
[
  {
    "gateway_id": "PAY-101",
    "order_ref": "ORD-101",
    "captured_amount_paise": 100000,
    "fee_paise": 2000,
    "tax_paise": 360,
    "settlement_id": "SET-1",
    "refund_ref": null
  }
]
```
