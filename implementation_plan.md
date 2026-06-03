# Implementation Plan

## Goal
Generate API code using the Gemini model (generationAgent) based on a sample API specification and open the generated files in the editor for the user to view.

## User Review Required
> [!IMPORTANT]
> The plan will invoke the Gemini model to generate code. This requires valid API keys (`GEMINI_API_KEY`) and internet access. Ensure your environment variables are set correctly.

## Proposed Changes
- **[MODIFY]** `server/src/config/ai.js` – ensure the Gemini model is correctly configured (use `gemini-1.5-pro` or fallback).
- **[NEW]** `tmp/sample_spec.json` – a sample API specification JSON that will be fed to the generation agent.
- **[NEW]** `tmp/generated_code.json` – will store the JSON file map returned by the generation agent.
- **[MODIFY]** `server/src/agents/generationAgent.js` – add a helper function `generateFromSpec(spec)` that can be called from a script.
- **[NEW]** `scripts/run_generation.js` – a Node script that loads the sample spec, calls the generation agent, writes the output to `tmp/generated_code.json`, and then opens each file in the editor using the `open_file` tool (simulated by creating files in the workspace for inspection).

## Open Questions
> [!WARNING]
> 1. Do you have a preferred sample API spec (e.g., a simple CRUD for `books`), or should we use a generic placeholder?
> 2. Where would you like the generated files to appear? We can create them under `generated/` in the project root for easy browsing.

## Verification Plan
- Run the `scripts/run_generation.js` script.
- Verify that `tmp/generated_code.json` contains a valid file map.
- Create the actual files in `generated/` and open one of them with `view_file` to confirm content.
- Ensure no errors are thrown during generation.

---
*Please approve or adjust the plan.*
