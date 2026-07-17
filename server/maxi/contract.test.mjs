/**
 * Tests unitaires pour le contrat dynamique Maxi LLM
 */

import {
  createContractManifest,
  createSubMoe,
  createExpert,
  CONTRACT_STATUS,
  PROVIDER_FAMILIES
} from './manifest.mjs';
import { validateContract } from './validate.mjs';
import { ContractRegistry } from './registry.mjs';
import { generateProposal, applyChanges } from './assistant.mjs';

// Test de création d'un contrat de base
console.log('Test 1: Création d\'un contrat de base');
try {
  const contract = createContractManifest({
    id: 'test-contract-1',
    name: 'Contrat de test',
    description: 'Un contrat pour les tests',
    version: '1.0.0',
    status: CONTRACT_STATUS.DRAFT
  });

  console.log('✓ Contrat créé avec succès:', contract.name);
} catch (error) {
  console.error('✗ Échec de la création du contrat:', error.message);
}

// Test de validation d'un contrat valide
console.log('\nTest 2: Validation d\'un contrat valide');
try {
  const validContract = createContractManifest({
    id: 'valid-contract',
    name: 'Contrat valide',
    version: '1.0.0',
    status: CONTRACT_STATUS.VALIDATED,
    subMoes: [
      createSubMoe({
        id: 'submoe-1',
        name: 'Sous-MoE 1',
        providerFamily: PROVIDER_FAMILIES.QWEN,
        experts: [
          createExpert({
            id: 'expert-1',
            name: 'Expert 1',
            provider: 'Qwen',
            model: 'Qwen-7B'
          })
        ]
      })
    ]
  });

  const validationResult = validateContract(validContract);
  if (validationResult.isValid) {
    console.log('✓ Contrat valide correctement validé');
  } else {
    console.error('✗ Contrat valide incorrectement invalidé:', validationResult.errors);
  }
} catch (error) {
  console.error('✗ Erreur lors de la validation:', error.message);
}

// Test de validation d'un contrat invalide
console.log('\nTest 3: Validation d\'un contrat invalide (sans experts)');
try {
  const invalidContract = createContractManifest({
    id: 'invalid-contract',
    name: 'Contrat invalide',
    version: '1.0.0',
    status: CONTRACT_STATUS.DRAFT,
    subMoes: [
      createSubMoe({
        id: 'submoe-2',
        name: 'Sous-MoE sans experts',
        providerFamily: PROVIDER_FAMILIES.QWEN,
        experts: [] // Aucun expert - invalide
      })
    ]
  });

  const validationResult = validateContract(invalidContract);
  if (!validationResult.isValid) {
    console.log('✓ Contrat invalide correctement détecté:', validationResult.errors[0]);
  } else {
    console.error('✗ Contrat invalide incorrectement validé');
  }
} catch (error) {
  console.error('✗ Erreur lors de la validation:', error.message);
}

// Test du registre
console.log('\nTest 4: Fonctionnalités du registre');
try {
  const registry = new ContractRegistry();

  // Créer un contrat
  const newContract = await registry.create({
    id: 'registry-test',
    name: 'Contrat du registre',
    version: '1.0.0',
    status: CONTRACT_STATUS.DRAFT,
    subMoes: [
      createSubMoe({
        id: 'submoe-reg',
        name: 'Sous-MoE du registre',
        providerFamily: PROVIDER_FAMILIES.QWEN,
        experts: [
          createExpert({
            id: 'expert-reg',
            name: 'Expert du registre',
            provider: 'Qwen',
            model: 'Qwen-7B'
          })
        ]
      })
    ]
  });

  console.log('✓ Contrat créé via le registre:', newContract.name);

  // Valider le contrat
  const validationStatus = await registry.validate('registry-test');
  console.log('✓ Validation du contrat via le registre:', validationStatus.isValid);

  // Publier le contrat
  const publishedContract = await registry.publish('registry-test');
  console.log('✓ Contrat publié via le registre:', publishedContract.status);

  // Récupérer le contrat
  const retrievedContract = registry.get('registry-test');
  console.log('✓ Contrat récupéré du registre:', retrievedContract.name);
} catch (error) {
  console.error('✗ Erreur lors des tests du registre:', error.message);
}

// Test de tentative de création d'un doublon
console.log('\nTest 5: Protection contre les doublons');
try {
  const registry = new ContractRegistry();

  // Créer un premier contrat
  await registry.create({
    id: 'duplicate-test',
    name: 'Premier contrat',
    version: '1.0.0',
    status: CONTRACT_STATUS.DRAFT
  });

  // Essayer de créer un deuxième contrat avec le même ID
  try {
    await registry.create({
      id: 'duplicate-test', // Même ID
      name: 'Deuxième contrat',
      version: '1.0.0',
      status: CONTRACT_STATUS.DRAFT
    });
    console.error('✗ La tentative de création d\'un doublon n\'a pas été bloquée');
  } catch (error) {
    console.log('✓ Tentative de création d\'un doublon correctement bloquée:', error.message);
  }
} catch (error) {
  console.error('✗ Erreur lors du test de protection contre les doublons:', error.message);
}

// Test de la fonction generateProposal
console.log('\nTest 6: Fonctionalité generateProposal');
try {
  const proposal = await generateProposal("Ajouter un nouveau sous-MoE avec un expert Qwen");
  console.log('✓ Proposition générée avec succès:', proposal.intention);
} catch (error) {
  console.error('✗ Erreur lors de la génération de la proposition:', error.message);
}

// Test de la fonction applyChanges
console.log('\nTest 7: Fonctionalité applyChanges');
try {
  const registry = new ContractRegistry();
  const testData = {
    id: 'apply-test',
    content: 'Test content',
    manifest: createContractManifest({
      id: 'apply-test',
      name: 'Contrat pour test apply',
      version: '1.0.0',
      status: CONTRACT_STATUS.DRAFT,
      subMoes: [createSubMoe({ id: 'apply-submoe', name: 'Apply', providerFamily: PROVIDER_FAMILIES.QWEN, experts: [createExpert({ id: 'apply-expert', name: 'Apply expert', provider: 'Qwen', model: 'qwen-plus' })] })]
    }),
    expectedVersion: '1.0.0'
  };

  const result = await applyChanges(testData, registry);
  console.log('✓ Changements appliqués avec succès:', result.status);
} catch (error) {
  console.error('✗ Erreur lors de l\'application des changements:', error.message);
}

console.log('\nTous les tests terminés.');