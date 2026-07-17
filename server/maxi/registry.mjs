/**
 * Système de registre pour le contrat dynamique Maxi LLM
 * Gère les opérations CRUD sur les contrats avec injection de dépendances
 */

import { createContractManifest, CONTRACT_STATUS } from './manifest.mjs';
import { validateContract } from './validate.mjs';

// Registre des contrats
export class ContractRegistry {
  constructor(initialContracts = []) {
    this.contracts = new Map();
    this.providers = new Map(); // Map pour les fournisseurs injectables
    
    // Initialiser avec les contrats fournis
    initialContracts.forEach(contract => {
      this.contracts.set(contract.id, contract);
    });
  }
  
  // Opération de création
  async create(contractData) {
    // Créer un nouveau contrat à partir des données
    const contract = createContractManifest({
      ...contractData,
      id: contractData.id || generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Valider le contrat
    const validation = validateContract(contract);
    if (!validation.isValid) {
      throw new Error(`Validation échouée: ${validation.errors.join(', ')}`);
    }
    
    // Vérifier qu'il n'existe pas déjà
    if (this.contracts.has(contract.id)) {
      throw new Error(`Le contrat avec l'ID ${contract.id} existe déjà. Aucun écrasement silencieux autorisé.`);
    }
    
    // Ajouter au registre
    this.contracts.set(contract.id, contract);
    
    return contract;
  }
  
  // Opération de mise à jour partielle
  async patch(contractId, updateData) {
    const existingContract = this.contracts.get(contractId);
    if (!existingContract) {
      throw new Error(`Contrat avec l'ID ${contractId} introuvable`);
    }
    
    // Mettre à jour les champs spécifiés
    const updatedContract = {
      ...existingContract,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // Valider le contrat mis à jour
    const validation = validateContract(updatedContract);
    if (!validation.isValid) {
      throw new Error(`Validation échouée après mise à jour: ${validation.errors.join(', ')}`);
    }
    
    // Mettre à jour dans le registre
    this.contracts.set(contractId, updatedContract);
    
    return updatedContract;
  }
  
  // Opération de validation
  async validate(contractId) {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      throw new Error(`Contrat avec l'ID ${contractId} introuvable`);
    }
    
    const validation = validateContract(contract);
    
    return {
      contractId,
      isValid: validation.isValid,
      errors: validation.errors
    };
  }
  
  // Opération de publication (changer le statut à 'active')
  async publish(contractId) {
    const existingContract = this.contracts.get(contractId);
    if (!existingContract) {
      throw new Error(`Contrat avec l'ID ${contractId} introuvable`);
    }
    
    // Mettre à jour le statut à 'active'
    const updatedContract = {
      ...existingContract,
      status: CONTRACT_STATUS.ACTIVE,
      updatedAt: new Date().toISOString()
    };
    
    // Valider avant de publier
    const validation = validateContract(updatedContract);
    if (!validation.isValid) {
      throw new Error(`Validation échouée avant publication: ${validation.errors.join(', ')}`);
    }
    
    // Mettre à jour dans le registre
    this.contracts.set(contractId, updatedContract);
    
    return updatedContract;
  }
  
  // Récupérer un contrat par ID
  get(contractId) {
    return this.contracts.get(contractId);
  }
  
  // Lister tous les contrats
  list() {
    return Array.from(this.contracts.values());
  }
  
  // Supprimer un contrat
  async delete(contractId) {
    const exists = this.contracts.has(contractId);
    if (!exists) {
      throw new Error(`Contrat avec l'ID ${contractId} introuvable`);
    }
    
    this.contracts.delete(contractId);
  }
  
  // Enregistrer un fournisseur injectable
  registerProvider(providerName, providerImplementation) {
    this.providers.set(providerName, providerImplementation);
  }
  
  // Obtenir un fournisseur injectable
  getProvider(providerName) {
    return this.providers.get(providerName);
  }
}

// Générateur d'ID simple
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};