import type { AgentConfig } from "@opencode-ai/sdk"
import { sisyphusAgent } from "./sisyphus"
import { oracleAgent } from "./oracle"
import { librarianAgent } from "./librarian"
import { exploreAgent } from "./explore"
import { frontendUiUxEngineerAgent } from "./frontend-ui-ux-engineer"
import { documentWriterAgent } from "./document-writer"
import { multimodalLookerAgent } from "./multimodal-looker"
import { metisAgent } from "./metis"
import { orchestratorSisyphusAgent } from "./orchestrator-sisyphus"
import { momusAgent } from "./momus"

// Finances agents
import { financesOrchestratorAgent } from "./finances/orchestrator"
import { walletAgent } from "./finances/wallet-agent"
import { budgetAnalystAgent } from "./finances/budget-analyst"
import { investmentAgent } from "./finances/investment-agent"
import { taxSpecialistBRAgent } from "./finances/tax-specialist-br"
import { regulatoryAgent } from "./finances/regulatory-agent"

export const builtinAgents: Record<string, AgentConfig> = {
  Sisyphus: sisyphusAgent,
  oracle: oracleAgent,
  librarian: librarianAgent,
  explore: exploreAgent,
  "frontend-ui-ux-engineer": frontendUiUxEngineerAgent,
  "document-writer": documentWriterAgent,
  "multimodal-looker": multimodalLookerAgent,
  "Metis (Plan Consultant)": metisAgent,
  "Momus (Plan Reviewer)": momusAgent,
  "orchestrator-sisyphus": orchestratorSisyphusAgent,
  // Finances agents
  "finances-orchestrator": financesOrchestratorAgent,
  "wallet-agent": walletAgent,
  "budget-analyst": budgetAnalystAgent,
  "investment-agent": investmentAgent,
  "tax-specialist-br": taxSpecialistBRAgent,
  "regulatory-agent": regulatoryAgent,
}

export * from "./types"
export { createBuiltinAgents } from "./utils"
export type { AvailableAgent } from "./sisyphus-prompt-builder"
