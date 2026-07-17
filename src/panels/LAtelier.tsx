import { useEffect, useRef, useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import { api } from "../lib/api";

// Self-hosting Monaco : loader charge depuis /monaco-editor/vs (public/ ou dist/), jamais CDN.
loader.config({ paths: { vs: "/monaco-editor/vs" } });

const SAMPLES: Record<string, string> = {
  js: `// Écris du JS ici. Sélectionne une action, ou lance (Run).
function fib(n){ return n < 2 ? n : fib(n-1)+fib(n-2); }
console.log(fib(10));`,
  python: `# Écris du Python ici. Sélectionne une action, ou lance (Run).
def fib(n):
    return n if n < 2 else fib(n-1)+fib(n-2)
print(fib(10))`,
};

type FileItem = {
  id: string; // unique id
  name: string;
  content: string;
  lang: "js" | "python";
};

const FILES_INIT: FileItem[] = [
  { id: "1", name: "index.js", content: SAMPLES.js, lang: "js" },
  { id: "2", name: "script.py", content: SAMPLES.python, lang: "python" },
];

export function LAtelier() {
  const [files, setFiles] = useState<FileItem[]>(FILES_INIT);
  const [activeId, setActiveId] = useState<string>(FILES_INIT[0].id);
  const [assist, setAssist] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [, setSandboxMode] = useState<string>("");
  const [, setHandleFileChange] = useState<(e: React.ChangeEvent<HTMLTextAreaElement>) => void>(() => {});
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const editorRef = useRef<any>(null);
  const [cursorPosition, setCursorPosition] = useState<{ line: number; column: number } | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<"js" | "python">("js");

  useEffect(() => {
    api.atelierHealth().then((r) => setSandboxMode(r.mode)).catch(() => setSandboxMode("unknown"));
    setHandleFileChange(() => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setFiles((files) =>
        files.map((f) =>
          f.id === activeId ? { ...f, content: newContent } : f
        )
      );
    });
  }, [activeId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        setCommandInput("");
        // focus the input after render
        setTimeout(() => {
          const input = document.getElementById("command-input") as HTMLInputElement | null;
          input?.focus();
        }, 0);
      }
      // Escape to close command palette
      if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen]);

  const getActiveFile = () => files.find((f) => f.id === activeId);
  const setActiveFileById = (id: string) => {
    setActiveId(id);
    // Update active language based on file
    const file = getActiveFile();
    if (file) {
      setActiveLanguage(file.lang as "js" | "python");
    }
  };

  const addFile = () => {
    const base = "Untitled";
    let name = base;
    let suffix = 1;
    while (files.some((f) => f.name === name)) {
      name = `${base} ${++suffix}`;
    }
    const newFile: FileItem = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      content: "// New file\n",
      lang: "js",
    };
    setFiles([...files, newFile]);
    setActiveId(newFile.id);
  };

  const deleteFile = () => {
    if (files.length <= 1) {
      alert("Cannot delete the last file");
      return;
    }
    const index = files.findIndex((f) => f.id === activeId);
    if (index === -1) return;
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    // Select previous or next
    const newActiveId = newFiles[Math.min(index, newFiles.length - 1)]?.id;
    setActiveId(newActiveId ?? "");
  };

  const renameFile = () => {
    const file = getActiveFile();
    if (!file) return;
    const newName = prompt("Enter new filename:", file.name);
    if (newName === null || newName.trim() === "") return;
    const trimmed = newName.trim();
    if (files.some((f) => f.id !== file.id && f.name === trimmed)) {
      alert("A file with that name already exists");
      return;
    }
    setFiles(
      files.map((f) =>
        f.id === file.id ? { ...f, name: trimmed } : f
      )
    );
  };

  const setFileLanguage = (lang: "js" | "python") => {
    setFiles(
      files.map((f) =>
        f.id === activeId ? { ...f, lang } : f
      )
    );
    setActiveLanguage(lang);
  };


  const doAssist = async (action: string) => {
    const file = getActiveFile();
    if (!file) return;
    setBusy(action);
    setErr("");
    setAssist("");
    try {
      const res = await api.atelierAssist(file.content, action);
      setAssist(res.result);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy("");
    }
  };

  const run = async () => {
    const file = getActiveFile();
    if (!file) return;
    setBusy("run");
    setErr("");
    setOutput("");
    try {
      const r = await api.atelierRun(file.content, file.lang);
      const parts = [r.output, r.stderr, r.error].filter(Boolean);
      const meta = [r.timedOut ? "⏱ timeout" : null, r.mode ? `mode: ${r.mode}` : null].filter(Boolean).join(" | ");
      setOutput((parts.join("\n") + (meta ? `\n— ${meta}` : "")).trim());
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy("");
    }
  };

  // Update cursor position from Monaco
  const handleEditorDidMount = (editor: any, _monaco: any) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });
    editor.onDidChangeModelContent(() => {
      // Update file content when editor changes (though we also have textarea fallback)
      if (editor.getModel()) {
        const content = editor.getValue();
        setFiles(
          files.map((f) =>
            f.id === activeId ? { ...f, content } : f
          )
        );
      }
    });
  };

  // Determine language display name
  const languageLabel = activeLanguage === "js" ? "JavaScript" : "Python";

  // Determine indent style (simple heuristic)
  const getIndentInfo = (text: string) => {
    const lines = text.split("\n");
    let spaces = 0,
      tabs = 0;
    for (const line of lines) {
      if (/^ /.test(line)) spaces++;
      if (/^\t/.test(line)) tabs++;
    }
    return spaces > tabs ? "spaces" : tabs > spaces ? "tabs" : "mixed";
  };
  const indentInfo = getIndentInfo(getActiveFile()?.content ?? "");

  return (
    <section>
      <h2>L'Atelier</h2>
      {err && <p style={{ color: "#e67" }}>{err}</p>}
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
        {/* File operations */}
        <button onClick={addFile} disabled={!!busy} title="Nouveau fichier">
          + File
        </button>
        <button onClick={deleteFile} disabled={!!busy || files.length <= 1} title="Supprimer le fichier actif">
          − File
        </button>
        <button onClick={renameFile} disabled={!!busy} title="Renommer le fichier actif">
          Rename
        </button>
        <select
          value={activeLanguage}
          onChange={(e) => setFileLanguage(e.target.value as "js" | "python")}
          disabled={!!busy}
          style={{ marginLeft: 8 }}
          title="Langue du fichier actif"
        >
          <option value="js">JavaScript</option>
          <option value="python">Python</option>
        </select>
        {/* Action buttons */}
        <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
          <button onClick={run} disabled={!!busy} title="Exécuter le fichier actif" className="tab active">▶ Run</button>
          <button onClick={() => doAssist("expliquer")} disabled={!!busy} title="Expliquer le code">? Explain</button>
          <button onClick={() => doAssist("refactorer")} disabled={!!busy} title="Refactorer">↻ Refactor</button>
          <button onClick={() => doAssist("corriger")} disabled={!!busy} title="Corriger">! Fix</button>
        </div>
        {/* Spacer */}
        <div style={{ flex: 1 }}></div>
        {/* Command placeholder */}
        {commandPaletteOpen ? (
          <div style={{ position: "relative", minWidth: 200 }}>
            <input
              id="command-input"
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Enter command..."
              style={{ width: "100%", padding: 4, fontSize: 13 }}
              autoFocus
            />
            {/* Simple command list */}
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                maxHeight: 200,
                overflowY: "auto",
                background: "#14110b",
                border: "1px solid #2a2216",
                borderRadius: 4,
                zIndex: 1000,
              }}
            >
              {[ "new file", "delete file", "rename file", "set language js", "set language python", "run", "explain", "refactor", "correct" ].map((cmd) => (
                <div
                  key={cmd}
                  style={{
                    padding: 6,
                    cursor: "pointer",
                    color: commandInput.trim().toLowerCase() === cmd ? "#ff0" : "#ccc",
                  }}
                  onMouseDown={() => {
                    // Execute command
                    switch (cmd) {
                      case "new file":
                        addFile();
                        break;
                      case "delete file":
                        deleteFile();
                        break;
                      case "rename file":
                        renameFile();
                        break;
                      case "set language js":
                        setFileLanguage("js");
                        break;
                      case "set language python":
                        setFileLanguage("python");
                        break;
                      case "run":
                        run();
                        break;
                      case "explain":
                        doAssist("expliquer");
                        break;
                      case "refactor":
                        doAssist("refactorer");
                        break;
                      case "correct":
                        doAssist("corriger");
                        break;
                    }
                    setCommandPaletteOpen(false);
                  }}
                >
                  {cmd}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <span style={{ opacity: .6, fontSize: 12 }}>
            Ctrl+Shift+P for command palette
          </span>
        )}
      </div>

      {/* Main split layout: activity bar | explorer | editor + panels */}
      <div style={{ display: "flex", height: "560px", border: "1px solid #2a2216", borderRadius: 8, overflow: "hidden" }}>
        {/* Activity bar (icon rail) */}
        <div style={{ width: 44, background: "#0c0a07", borderRight: "1px solid #2a2216", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8, gap: 14 }}>
          {[
            { icon: "📁", title: "Explorateur" },
            { icon: "🔍", title: "Rechercher" },
            { icon: "▶", title: "Exécuter" },
            { icon: "🤖", title: "Assistant IA" },
            { icon: "⚙", title: "Réglages" },
          ].map((a, i) => (
            <div key={i} title={a.title} style={{ fontSize: 18, opacity: i === 0 ? 1 : .5, cursor: "pointer", padding: "4px 0", borderLeft: i === 0 ? "2px solid #b8860b" : "2px solid transparent" }}>{a.icon}</div>
          ))}
        </div>

        {/* Sidebar: file explorer */}
        <div style={{ width: 200, background: "#14110b", borderRight: "1px solid #2a2216", overflowY: "auto" }}>
          <div style={{ padding: 10, fontSize: 11, opacity: .7, borderBottom: "1px solid #2a2216", letterSpacing: 1 }}>
            EXPLORATEUR
          </div>
          <div style={{ padding: "4px 0" }}>
            {files.map((f) => (
              <div
                key={f.id}
                onClick={() => setActiveFileById(f.id)}
                style={{
                  padding: "6px 10px",
                  background: f.id === activeId ? "#2a2216" : "transparent",
                  color: f.id === activeId ? "#fff" : "#ccc",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 13,
                  borderLeft: f.id === activeId ? "2px solid #b8860b" : "2px solid transparent",
                }}
              >
                <span>{f.lang === "python" ? "🐍" : "📄"} {f.name}</span>
                <span style={{ opacity: .4, fontSize: 10 }}>{f.lang}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: 10, fontSize: 11, opacity: .5, borderTop: "1px solid #2a2216", marginTop: 6 }}>
            {files.length} fichier(s) · <a onClick={addFile} style={{ color: "#b8860b", cursor: "pointer" }}>+ nouveau</a>
          </div>
        </div>

        {/* Main editor area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Open tabs bar */}
          <div style={{ display: "flex", background: "#0c0a07", borderBottom: "1px solid #2a2216", overflowX: "auto" }}>
            {files.map((f) => (
              <div
                key={f.id}
                onClick={() => setActiveFileById(f.id)}
                style={{
                  padding: "6px 12px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
                  background: f.id === activeId ? "#1a1711" : "transparent",
                  color: f.id === activeId ? "#fff" : "#aaa",
                  borderRight: "1px solid #2a2216",
                  borderBottom: f.id === activeId ? "2px solid #b8860b" : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <span>{f.lang === "python" ? "🐍" : "📄"}</span>
                <span>{f.name}</span>
                {files.length > 1 && (
                  <span onClick={(e) => { e.stopPropagation(); if (f.id === activeId) deleteFile(); }} style={{ opacity: .5, marginLeft: 4, fontSize: 14 }}>×</span>
                )}
              </div>
            ))}
          </div>

          {/* Editor */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            <Editor
              height="100%"
              width="100%"
              language={activeLanguage === "js" ? "javascript" : "python"}
              theme="vs-dark"
              value={getActiveFile()?.content ?? ""}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: true },
                fontSize: 13,
                scrollBeyondLastLine: false,
                readOnly: false,
                cursorBlinking: "solid",
                automaticLayout: true,
              }}
            />
          </div>

          {/* Bottom panels: Terminal/Output and Assistance */}
          <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid #2a2216", height: "200px" }}>
            {/* Terminal / Output */}
            <div style={{ flex: 1, overflow: "auto", background: "#0a0907", padding: 10, borderBottom: "1px solid #2a2216" }}>
              <div style={{ opacity: .5, fontSize: 11, marginBottom: 4, letterSpacing: 1 }}>TERMINAL — SORTIE</div>
              {output && <div style={{ whiteSpace: "pre-wrap", fontSize: 13, fontFamily: "monospace" }}>{output}</div>}
              {!output && !busy ? <span style={{ opacity: .4, fontSize: 12 }}>▶ Run pour exécuter — sortie apparaît ici</span> : null}
              {busy === "run" && <span style={{ opacity: .6, fontSize: 12 }}>exécution…</span>}
            </div>

            {/* Assistance IA */}
            <div style={{ flex: 1, overflow: "auto", background: "#14110b", padding: 12 }}>
              <div style={{ opacity: .5, fontSize: 11, marginBottom: 4, letterSpacing: 1 }}>ASSISTANT — QWEN-CODER-PLUS</div>
              {assist && <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{assist}</div>}
              {!assist && !busy ? <span style={{ opacity: .4, fontSize: 12 }}>? Explain / ↻ Refactor / ! Fix — l'aide apparaît ici</span> : null}
              {busy && busy !== "run" && <span style={{ opacity: .6, fontSize: 12 }}>{busy}…</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: .8, height: 20, alignItems: "center", background: "#1a1711", borderTop: "1px solid #2a2216", padding: "0 8px" }}>
        <div>
          {cursorPosition ? (
            <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
          ) : (
            <span>Ln 1, Col 1</span>
          )}
        </div>
        <div>
          <span>{languageLabel}</span> | <span>{indentInfo}</span>
        </div>
        <div>
          {busy ? <span>{busy}</span> : <span>Idle</span>}
        </div>
      </div>
    </section>
  );
}