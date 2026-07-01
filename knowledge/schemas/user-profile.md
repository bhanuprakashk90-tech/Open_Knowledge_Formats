---
type: schema
title: User Profile Schema
description: JSON schema definition for the customer registration profile and billing information.
resource: schema://user-profile
tags:
  - database
  - schema
  - auth
timestamp: 2026-07-01T02:07:00Z
---

# User Profile Schema

Defines the payload structure for customer account creation and billing updates.

## Schema Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | String (UUIDv4) | Yes | Unique customer identifier |
| `email` | String (Email format) | Yes | Customer contact email |
| `billing_address` | Object | Yes | Must contain `street`, `city`, `zip`, and `country` |
| `created_at` | String (ISO-8601) | Yes | Registration timestamp |

## Referenced By

This schema is used for payload validation by the [Checkout Service](../concepts/checkout-service.md) to check payment eligibility.
