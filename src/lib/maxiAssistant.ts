import type { AssistantContext, ApplyResult, ApplyRequest, ContractManifest, PreviewRequest, PreviewResult } from "../types/maxi";

export async function fetchPreview(naturalPrompt: string, currentManifest: ContractManifest | undefined, context: AssistantContext): Promise<PreviewResult> {
  const body: PreviewRequest = { naturalPrompt, currentManifest, context };
  const response = await fetch("/api/maxi/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error("Erreur assistant: HTTP " + response.status);
  return response.json() as Promise<PreviewResult>;
}

export async function applyChanges(id: string, content: string, manifest: ContractManifest, expectedVersion: string, context?: AssistantContext): Promise<ApplyResult> {
  const body: ApplyRequest & { context?: AssistantContext } = { id, content, manifest, expectedVersion, ...(context ? { context } : {}) };
  const response = await fetch("/api/maxi/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error("Erreur application: HTTP " + response.status);
  return response.json() as Promise<ApplyResult>;
}

