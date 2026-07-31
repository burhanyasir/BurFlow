# Universal customer journey engine

This package extends the conversation orchestrator with business-aware, multi-industry customer journey detection.

## Included capabilities

- Business profile modeling
- Universal intent detection
- Industry-specific journey stage detection
- AI module routing
- Dynamic button generation with business context
- Journey template management for admin configuration

## Architecture notes

The implementation is additive and backward compatible. Existing conversation orchestration remains intact; the new modules operate as extension points feeding profile, intent, stage, and route metadata into the current conversation pipeline.

## Default templates

The registry ships with templates for SaaS, Shopify, dental clinics, healthcare, legal, real estate, hotels, restaurants, agencies, education, manufacturing, consulting, and a generic fallback.
