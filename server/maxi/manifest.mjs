/**
 * Manifeste du contrat dynamique Maxi LLM
 * Définit la structure des contrats MoE avec N sous-MoE et M experts variables
 */

export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  VALIDATED: 'validated',
  ACTIVE: 'active'
};

export const PROVIDER_FAMILIES = {
  QWEN: 'qwen',
  DASHSCOPE: 'dashscope'
};

// Structure de base d'un contrat Maxi LLM
export const createContractManifest = (params = {}) => {
  const {
    id,
    name,
    description = '',
    version = '1.0.0',
    status = CONTRACT_STATUS.DRAFT,
    subMoes = [],
    categories = [],
    systems = {},
    modelBindings = {},
    kbConfig = null,
    indexConfig = null,
    routingPolicy = {},
    cascadeConfig = {},
    cacheConfig = {},
    guards = [],
    synthesis = {},
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  } = params;

  return {
    id,
    name,
    description,
    version,
    status,
    subMoes,
    categories,
    systems,
    modelBindings,
    kbConfig,
    indexConfig,
    routingPolicy,
    cascadeConfig,
    cacheConfig,
    guards,
    synthesis,
    createdAt,
    updatedAt
  };
};

// Structure d'un sous-MoE
export const createSubMoe = (params = {}) => {
  const {
    id,
    name,
    description = '',
    experts = [],
    categories = [],
    lobes = [],
    providerFamily = PROVIDER_FAMILIES.QWEN,
    routingPolicy = {},
    cascadeConfig = {},
    cacheConfig = {},
    guards = [],
    synthesis = {}
  } = params;

  return {
    id,
    name,
    description,
    experts,
    categories,
    lobes,
    providerFamily,
    routingPolicy,
    cascadeConfig,
    cacheConfig,
    guards,
    synthesis
  };
};

// Structure d'un expert
export const createExpert = (params = {}) => {
  const {
    id,
    name,
    description = '',
    category = '',
    lobe = '',
    provider = '',
    model = '',
    capabilities = [],
    routingPolicy = {},
    cascadeConfig = {},
    cacheConfig = {},
    guards = [],
    synthesis = {}
  } = params;

  return {
    id,
    name,
    description,
    category,
    lobe,
    provider,
    model,
    capabilities,
    routingPolicy,
    cascadeConfig,
    cacheConfig,
    guards,
    synthesis
  };
};