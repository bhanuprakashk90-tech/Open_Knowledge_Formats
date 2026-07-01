---
type: playbook
title: Payment Outage Playbook
description: Step-by-step procedures to triage and resolve Stripe API timeouts and gateway connection failures.
resource: playbook://payment-outage
tags:
  - runbook
  - SRE
  - billing
timestamp: 2026-07-01T02:08:00Z
---

# Payment Outage Playbook

If checkout errors surge and logs indicate Stripe API connection issues, follow these recovery steps.

## Quick Diagnostic

Check status codes in Google Cloud Logging:
```sql
SELECT resource.type, jsonPayload.message
FROM `my-project.logs.payment_gateway`
WHERE jsonPayload.status = "TIMEOUT"
```

## Triage Procedure

1. **Verify Vendor Status**:
   Confirm Stripe Status to see if Stripe is experiencing a global outage.
2. **Switch Gateway**:
   If Stripe is down, run the switch CLI to route payments through Adyen:
   ```bash
   gcloud beta run services update payment-gateway --update-env-vars PROCESSOR_PRIMARY=ADYEN
   ```
3. **Notify SRE Team**:
   Ping the `#sre-alerts` Slack channel.

For system context, see [Payment Gateway Integration](../concepts/payment-gateway.md).
