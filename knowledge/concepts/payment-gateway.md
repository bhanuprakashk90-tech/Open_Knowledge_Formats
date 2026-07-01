---
type: concept
title: Payment Gateway Integration
description: Wrapper service managing connections with external payment processors (Stripe, Adyen).
resource: microservice://payment-gateway
tags:
  - backend
  - microservice
  - billing
timestamp: 2026-07-01T02:06:00Z
---

# Payment Gateway Integration

The **Payment Gateway Integration** service isolates the core e-commerce system from third-party vendor APIs.

## Architecture

This service acts as a router that forwards transactions to Stripe or Adyen based on geographical distribution.

## Error Handling

Any outage or network failure here will impact checkout completion. For troubleshooting details, consult the [Payment Outage Playbook](../playbooks/payment-outage.md).
