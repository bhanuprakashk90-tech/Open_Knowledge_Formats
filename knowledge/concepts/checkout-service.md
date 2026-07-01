---
type: concept
title: Checkout Service
description: Core microservice that handles user shopping cart checkout transactions.
resource: microservice://checkout-service
tags:
  - backend
  - microservice
  - checkout
timestamp: 2026-07-01T02:05:00Z
---

# Checkout Service

The **Checkout Service** is responsible for converting a customer's shopping cart into a finalized order.

## Dependencies

This service relies on:
- [Payment Gateway Integration](../concepts/payment-gateway.md) - For processing credit card charges.
- [User Profile Schema](../schemas/user-profile.md) - To fetch customer billing/shipping details.

## API Specification

- `POST /v1/checkout`: Initiates checkout. Expects a payload matching user profiles.
