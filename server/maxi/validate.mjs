/**
 * Système de validation du contrat dynamique Maxi LLM
 * Vérifie la syntaxe, la structure et les relations entre les éléments
 */

import { CONTRACT_STATUS, PROVIDER_FAMILIES } from './manifest.mjs';

// Fonction de validation principale
export const validateContract = (contract) => {
  const errors = [];
  
  // Vérification de la structure de base
  if (!contract.id) {
    errors.push('Le contrat doit avoir un ID unique');
  }
  
  if (!contract.name) {
    errors.push('Le contrat doit avoir un nom');
  }
  
  if (!contract.version) {
    errors.push('Le contrat doit avoir une version');
  }
  
  if (!Object.values(CONTRACT_STATUS).includes(contract.status)) {
    errors.push(`Statut invalide: ${contract.status}. Valeurs acceptées: ${Object.values(CONTRACT_STATUS).join(', ')}`);
  }
  
  // Vérification des sous-MoE
  if (!Array.isArray(contract.subMoes) || contract.subMoes.length === 0) {
    if (contract.status !== CONTRACT_STATUS.DRAFT) errors.push('Le contrat doit contenir au moins un sous-MoE');
  } else {
    contract.subMoes.forEach((subMoe, index) => {
      const subMoeErrors = validateSubMoe(subMoe, `sous-MoE[${index}]`);
      errors.push(...subMoeErrors);
    });
  }
  
  // Vérification des références valides
  const referenceErrors = validateReferences(contract);
  errors.push(...referenceErrors);
  
  // Vérification des politiques de fournisseur
  const policyErrors = validateProviderPolicies(contract);
  errors.push(...policyErrors);
  
  // Vérification des cycles non autorisés
  const cycleErrors = validateCycles(contract);
  errors.push(...cycleErrors);
  
  // Vérification des limites de profondeur/branches
  const limitErrors = validateLimits(contract);
  errors.push(...limitErrors);
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validation d'un sous-MoE
const validateSubMoe = (subMoe, prefix = '') => {
  const errors = [];
  
  if (!subMoe.id) {
    errors.push(`${prefix} doit avoir un ID unique`);
  }
  
  if (!subMoe.name) {
    errors.push(`${prefix} doit avoir un nom`);
  }
  
  if (!Array.isArray(subMoe.experts) || subMoe.experts.length === 0) {
    errors.push(`${prefix} doit contenir au moins un expert`);
  } else {
    subMoe.experts.forEach((expert, index) => {
      const expertErrors = validateExpert(expert, `${prefix}.experts[${index}]`);
      errors.push(...expertErrors);
    });
  }
  
  // Vérification de la famille de fournisseur
  if (!Object.values(PROVIDER_FAMILIES).includes(subMoe.providerFamily)) {
    errors.push(`${prefix} a une famille de fournisseur invalide: ${subMoe.providerFamily}`);
  }
  
  return errors;
};

// Validation d'un expert
const validateExpert = (expert, prefix = '') => {
  const errors = [];
  
  if (!expert.id) {
    errors.push(`${prefix} doit avoir un ID unique`);
  }
  
  if (!expert.name) {
    errors.push(`${prefix} doit avoir un nom`);
  }
  
  if (!expert.provider) {
    errors.push(`${prefix} doit spécifier un fournisseur`);
  }
  
  if (!expert.model) {
    errors.push(`${prefix} doit spécifier un modèle`);
  }
  
  return errors;
};

// Vérification des références valides
const validateReferences = (contract) => {
  const errors = [];
  const allIds = new Set();
  
  // Collecte de tous les IDs pour vérifier l'unicité
  if (contract.id) {
    if (allIds.has(contract.id)) {
      errors.push(`ID dupliqué trouvé: ${contract.id}`);
    }
    allIds.add(contract.id);
  }
  
  // Vérification des sous-MoE
  contract.subMoes?.forEach(subMoe => {
    if (allIds.has(subMoe.id)) {
      errors.push(`ID dupliqué trouvé: ${subMoe.id}`);
    }
    allIds.add(subMoe.id);
    
    // Vérification des experts
    subMoe.experts?.forEach(expert => {
      if (allIds.has(expert.id)) {
        errors.push(`ID dupliqué trouvé: ${expert.id}`);
      }
      allIds.add(expert.id);
    });
  });
  
  return errors;
};

// Vérification des politiques de fournisseur
const validateProviderPolicies = (contract) => {
  const errors = [];
  
  contract.subMoes?.forEach(subMoe => {
    if (subMoe.providerFamily === PROVIDER_FAMILIES.QWEN) {
      // Vérifier que tous les experts utilisent des fournisseurs compatibles avec Qwen
      subMoe.experts?.forEach(expert => {
        if (!expert.provider.toLowerCase().includes('qwen') && !expert.provider.toLowerCase().includes('dashscope')) {
          errors.push(`L'expert ${expert.id} dans le sous-MoE ${subMoe.id} utilise un fournisseur incompatible avec la famille Qwen: ${expert.provider}`);
        }
      });
    }
  });
  
  return errors;
};

// Vérification des cycles non autorisés
const validateCycles = (contract) => {
  // Pour l'instant, on suppose qu'il n'y a pas de références cycliques possibles
  // dans la structure actuelle du contrat. Cette fonction peut être étendue
  // si des relations plus complexes sont ajoutées à l'avenir.
  return [];
};

// Vérification des limites de profondeur/branches
const validateLimits = (contract) => {
  const errors = [];
  
  // Limite de profondeur - pour l'instant, on suppose une profondeur maximale de 5 niveaux
  // (contrat -> sous-MoE -> expert -> capabilities -> détails)
  const depth = calculateDepth(contract);
  if (depth > 8) {
    errors.push(`La profondeur du contrat dépasse la limite autorisée: ${depth} > 8`);
  }
  
  // Limite de nombre de branches (sous-MoE)
  const branchCount = contract.subMoes ? contract.subMoes.length : 0;
  if (branchCount > 50) { // Arbitraire, peut être ajusté
    errors.push(`Le nombre de sous-MoE dépasse la limite autorisée: ${branchCount} > 50`);
  }
  
  return errors;
};

// Calcul de la profondeur d'un objet
const calculateDepth = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return 0;
  }
  
  let maxDepth = 0;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const depth = calculateDepth(obj[key]);
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    }
  }
  
  return 1 + maxDepth;
};