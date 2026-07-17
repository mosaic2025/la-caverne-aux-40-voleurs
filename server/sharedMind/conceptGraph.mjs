// ============================================================
// L63 — Graphe de concepts extrait du savoir partagé
// ============================================================

const STOP = new Set("le la les de des du un une et à en que qui pour dans sur avec pas plus est sont ce cette ces son ses mon mes ton tes nos vos leur au aux par ou où si mais donc car".split(" "));

export function extractConcepts(text, n = 12) {
  const words = String(text).toLowerCase().match(/[a-zà-ÿ0-9]{4,}/g) || [];
  const counts = {};
  for (const w of words) {
    if (STOP.has(w)) continue;
    counts[w] = (counts[w] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, weight]) => ({ label, weight }));
}

export function buildGraph(store) {
  store.sharedKnowledge ||= { contributions: [], concepts: [], graph: {} };
  const nodes = new Map();
  const edges = [];
  for (const c of store.sharedKnowledge.contributions || []) {
    const concepts = extractConcepts(c.text);
    for (const n of concepts) {
      if (!nodes.has(n.label)) nodes.set(n.label, { id: n.label, weight: 0 });
      nodes.get(n.label).weight += n.weight;
    }
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        edges.push({ source: concepts[i].label, target: concepts[j].label, weight: Math.min(concepts[i].weight, concepts[j].weight) });
      }
    }
  }
  store.sharedKnowledge.graph = { nodes: Array.from(nodes.values()), edges };
  return store.sharedKnowledge.graph;
}

export function conceptStats(store) {
  const g = store.sharedKnowledge?.graph || { nodes: [], edges: [] };
  return { nodes: g.nodes.length, edges: g.edges.length };
}
