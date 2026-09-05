# Boomer & Kev Studio

A pre-launch virtual-production system for AI-assisted short-form media featuring Boomer and Kev — two Australian character personas designed for commentary and commercial concepts.

## What the system does

The studio turns a brief into a reviewable production package:

```text
Research / brief
    -> character and directorial plan
    -> structured script
    -> scene prompts and production manifest
    -> media generation and post-production
    -> human review and approval
```

The pipeline includes research inputs, character DNA, structured script generation, scene planning, prompt and manifest export, receipt capture, audio/video post-production and approval gates.

## Architecture

- **Direction:** brief, audience, tone, character balance and scene intent.
- **Content:** structured scripts and dialogue with explicit scene metadata.
- **Production:** image/video/audio generation adapters, local assets and render orchestration.
- **Proof:** source receipts and validation checks for claims used in commentary.
- **Governance:** human approval before paid generation or external publication.
- **Operations:** handoff records, cost boundaries, retries and failure-state documentation.

## Characters

- **Boomer:** an energetic Australian kangaroo persona.
- **Kev:** a dry, understated Australian koala persona.

Character consistency, scene balance, wardrobe and format are treated as production constraints rather than assumptions.

## Felipe's role

**Virtual-production architecture · creative direction · pipeline governance · quality gates**

I define the operating model, production stages, decision boundaries and acceptance criteria, and coordinate AI-assisted implementation and validation. This repository is not presented as evidence of a published media channel or a completed commercial audience business.

## Current status

This is an active pre-launch system.

- Structured script generation is verified.
- Eight scripts were approved during the latest documented validation cycle.
- Receipt capture and production evidence tooling are implemented and tested.
- Local assets and pipeline components are present.
- **Zero episodes have been published** as of the current handoff.
- Trend discovery, provider integrations, final rendering and publication remain staged or environment-dependent in specific parts of the pipeline.
- Read [HANDOFF.md](HANDOFF.md) for the authoritative current state before treating any feature as production-ready.

## Local development

### Project continuity and workspace recovery

Read only the current block at the start of [HANDOFF.md](HANDOFF.md), ending at
`CONTINUIDADE_ATUAL_FIM`, to resume work. It consolidates open tasks, updates and
findings. Older handoffs and session logs are historical references.

In Felipe's workspace, the outer `PROJETOBoomer and Kev/HANDOFF.md` links to this
same tracked file. The application remains at `BOOMER AND KEV/boomer-and-kev-studio`.
The dated [workspace entrypoints archive](docs/workspace-entrypoints-2026-09-05.tar.gz)
preserves the outer entry files and the handoff link. See the current handoff for
its inventory, checksum and recovery procedure. It contains no application copy
or media; the pending local connection-checking tool is not part of this save.

The project uses Next.js and requires the environment described in the local configuration and handoff records.

```bash
npm install
npm run dev
```

Paid generation and external effects require explicit credentials, idempotency keys and fresh human approval. Keep all credentials in local environment configuration; never commit them or paste them into issues and documentation.

## Evidence and limitations

The project contains real implementation, assets and validation records. It does not yet provide evidence of:

- published episodes;
- audience size, retention or revenue;
- autonomous trend discovery across every intended platform;
- a complete automated publication route;
- guaranteed viral performance.

Those are deliberately separate from the architecture claims.

## Related FGSS work

- [FGSS Portfolio](https://fgss.io)
- [FGSS Workflows](https://workflows.fgss.io)
- [Felipe Gouveia](https://github.com/fbgouveia)

## Licence and use

No open-source licence is declared. Treat this repository as FGSS portfolio/source material unless Felipe explicitly adds a licence.
