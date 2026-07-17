/**
 * Point d'entrée principal du contrat dynamique Maxi LLM
 * Exporte les fonctionnalités principales en tant que modules ESM réutilisables
 */

import { ContractRegistry } from './registry.mjs';
import { validateContract } from './validate.mjs';
import { 
  createContractManifest, 
  createSubMoe, 
  createExpert, 
  CONTRACT_STATUS, 
  PROVIDER_FAMILIES 
} from './manifest.mjs';

// Création d'une instance de registre par défaut
const defaultRegistry = new ContractRegistry();

// Exporter les classes et fonctions principales
export {
  // Classes
  ContractRegistry,
  
  // Fonctions utilitaires
  validateContract,
  createContractManifest,
  createSubMoe,
  createExpert,
  
  // Constantes
  CONTRACT_STATUS,
  PROVIDER_FAMILIES,
  
  // Instance par défaut
  defaultRegistry
};

// Fonctions utilitaires supplémentaires
export const createRegistry = (initialContracts = []) => {
  return new ContractRegistry(initialContracts);
};

// Fonction pour créer et valider un contrat en une seule opération
export const createValidatedContract = async (contractData) => {
  const contract = createContractManifest({
    ...contractData,
    id: contractData.id || generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  const validation = validateContract(contract);
  if (!validation.isValid) {
    throw new Error(`Validation échouée: ${validation.errors.join(', ')}`);
  }
  
  return contract;
};

// Fonction pour ajouter un contrat à un registre
export const addContractToRegistry = async (registry, contractData) => {
  return await registry.create(contractData);
};

// Générateur d'ID simple
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Exporter la fonction principale du module
export default {
  ContractRegistry,
  validateContract,
  createContractManifest,
  createSubMoe,
  createExpert,
  CONTRACT_STATUS,
  PROVIDER_FAMILIES,
  defaultRegistry,
  createRegistry,
  createValidatedContract,
  addContractToRegistry
};