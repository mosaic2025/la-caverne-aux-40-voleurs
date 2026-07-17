export interface Expert {
  id: string; name: string; description?: string; category?: string; lobe?: string; provider: string; model: string;
  capabilities?: string[]; routingPolicy?: Record<string, unknown>; cascadeConfig?: Record<string, unknown>;
  cacheConfig?: Record<string, unknown>; guards?: unknown[]; synthesis?: Record<string, unknown>;
}
export interface SubMoe {
  id: string; name: string; description?: string; experts: Expert[]; categories?: string[]; lobes?: string[]; providerFamily: string;
  routingPolicy?: Record<string, unknown>; cascadeConfig?: Record<string, unknown>; cacheConfig?: Record<string, unknown>;
  guards?: unknown[]; synthesis?: Record<string, unknown>;
}
export interface ContractManifest {
  id: string; name: string; description?: string; version: string; status: string; subMoes: SubMoe[]; categories?: string[];
  systems?: Record<string, unknown>; modelBindings?: Record<string, unknown>; kbConfig?: Record<string, unknown>;
  indexConfig?: Record<string, unknown>; routingPolicy?: Record<string, unknown>; cascadeConfig?: Record<string, unknown>;
  cacheConfig?: Record<string, unknown>; guards?: unknown[]; synthesis?: Record<string, unknown>; createdAt: string; updatedAt: string;
}
export interface AssistantMessage { id: string; content: string; role: "user" | "assistant"; timestamp: Date; }
export interface AssistantContext { tabId: string; tabLabel: string; sessionId: string; provider?: string; model?: string; visibleData?: unknown; onGotoTab?: (tabId: string) => void; }
export interface PreviewResult {
  id: string; intention: string; assistantMessage?: string; assumptions: string[]; warnings: string[]; manifest: ContractManifest;
  status: "ready" | "needs_input" | "invalid"; preview: string; diff?: { added: string[]; modified: string[]; removed: string[] };
}
export interface ApplyResult { id: string; revision: number; hash: string; status: "applied"; appliedAt: string; contract: ContractManifest; }
export interface AssistantState { messages: AssistantMessage[]; isExpanded: boolean; isProcessing: boolean; error?: string; previewResult?: PreviewResult; applyResult?: ApplyResult; }
export interface PreviewRequest { naturalPrompt: string; currentManifest?: ContractManifest; context?: AssistantContext; }
export interface ApplyRequest { id: string; content: string; manifest: ContractManifest; expectedVersion: string; }

