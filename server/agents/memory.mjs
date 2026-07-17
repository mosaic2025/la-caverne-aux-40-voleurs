// ============================================================
// L48 — Agent Mémoire : indexation et rappel automatique
// ============================================================

const STOP = new Set("le la les de des du un une et à en que qui pour dans sur avec pas plus est sont ce cette ces son ses mon mes ton tes nos vos leur au aux par ou où si mais donc car".split(" "));

export class MemoryAgent {
  recall(store, query, k = 3) {
    const contributions = store.sharedKnowledge?.contributions || [];
    const q = String(query).toLowerCase();
    const qWords = this._words(q);
    const scored = contributions.map((c) => ({
      text: c.text,
      score: this._score(c, q, qWords),
    }));
    return scored.filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
  }

  _words(text) {
    return (String(text).toLowerCase().match(/[a-zà-ÿ0-9]{4,}/g) || []).filter((w) => !STOP.has(w));
  }

  _score(contribution, q, qWords) {
    let s = 0;
    const text = contribution.text.toLowerCase();
    if (text.includes(q)) s += 3;
    const kw = contribution.keywords || [];
    for (const w of qWords) {
      if (kw.includes(w)) s += 2;
      if (text.includes(w)) s += 1;
    }
    return s;
  }
}
