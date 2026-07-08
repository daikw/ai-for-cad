# EasyEDA Agent Skills

This directory carries project-local copies of the EasyEDA agent skills found from
prior Claude Code history and current web/GitHub search.

## Installed Skills

| Skill | Source | Revision | Purpose |
|---|---|---:|---|
| `easyeda-api` | https://github.com/easyeda/easyeda-api-skill | `68ebe72` | EasyEDA API reference plus WebSocket bridge for live EasyEDA control |
| `extension-dev-skill` | https://github.com/easyeda/extension-dev-skill | `8252903` | Recipes and standards for building/debugging EasyEDA Pro extensions |
| `easyeda-pro` | https://github.com/v0id-byte/easyeda-pro-claude-skill | `3da4f2a` | Community netlist-first verification discipline for EasyEDA Pro schematic edits |

Each skill is copied into:

- `.codex/skills/<skill>/`
- `.claude/skills/<skill>/`
- `.agents/skills/<skill>/`

## Related Projects Not Installed As Skills

- `eext-run-api-gateway`: EasyEDA-side extension used by `easyeda-api`.
- `extension-dev-mcp-tools`: MCP debug tooling for extension import, dev, and logs.
- `pro-api-sdk`: EasyEDA Pro extension SDK.

These are part of the EasyEDA AI/tooling ecosystem, but they are not agent skill
folders in the same sense as the installed skills above.

## EasyEDA `eext-*` Extension Map

The `eext-*` repositories are EasyEDA Pro extensions, not agent skills. They run
inside EasyEDA Pro or bridge EasyEDA Pro to external tools.

High AI relevance:

- `eext-run-api-gateway`: EasyEDA-side WebSocket gateway used by `easyeda-api`.
- `eext-easyeda-api-agent`: in-app LLM assistant for invoking EasyEDA APIs.
- `eext-ai-library-builder`: AI-assisted symbol/footprint library builder.
- `eext-ai-symbol-builder`: AI symbol builder.
- `eext-ai-device-standardization`: AI component/symbol/footprint matching and batch binding.
- `eext-chat-with-ai-kimi`: Kimi assistant for component queries and netlist parsing.
- `eext-knowledge-base`: local embedding/RAG knowledge base.
- `eext-datasheet-helper`: local OCR-based datasheet helper.
- `eext-docs-generator`: LLM-based project documentation generator.

Engineering/tooling extensions worth tracking:

- `eext-netlist-explorer`: schematic netlist analysis and topology views.
- `eext-jlc-order-dfm-checker`: JLC order/DFM checks.
- `eext-freerouting-intergration` / `eext-kirouting-integration`: autorouting bridges.
- `mcad-integration-with-fusion360`, `eext-mcad-integration-with-freecad`,
  `eext-mcad-integration-with-solidworks`: MCAD integration.
- `eext-pcb-render-with-blender`: PCB rendering in Blender.
- `eext-generate-schematic-from-netlist`: schematic generation from imported netlists.
- `eext-batch-place-components`: batch component placement from coordinate files.

## Akira Sasaki / `@gclue_akira` Findings

Prior X-search logs and current web search point to `@gclue_akira` as the
highest-signal public practitioner for EasyEDA + AI hardware workflows.

Observed workflow:

- `Claude Code + EasyEDA Pro + JLCPCB` for Arduino-compatible board design,
  layout, PCBA order, and bring-up.
- Current posts also mention `Claude Code Fable5 + EasyEDA Pro` and
  `Claude Code Fable5 + Fusion360`.
- The skill package explicitly referenced in the public post is
  `easyeda/easyeda-api-skill`, copied into a folder and called from Claude Code
  or Codex.

No evidence found that Akira used `v0id-byte/easyeda-pro-claude-skill`; that one
is a separate community skill discovered during the same search.
