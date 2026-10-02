import { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

export default function App() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [charCount, setCharCount] = useState(0);
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isStreaming]);

  const handleUpload = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setUploadStatus({ type: "loading", msg: "Extracting document text..." });

    const formData = new FormData();
    formData.append("pdf", selected);

    try {
      const res = await axios.post("https://pdf-qa-backend-udoa.onrender.com/api/upload", formData);
      setCharCount(res.data.characterCount);
      setUploadStatus({
        type: "success",
        msg: `${selected.name} (${res.data.characterCount.toLocaleString()} characters)`,
      });
    } catch (err) {
      setUploadStatus({
        type: "error",
        msg: err.response?.data?.error || "Document upload failed.",
      });
    }
  };

  const handleReset = async () => {
    try {
     await axios.post("https://pdf-qa-backend-udoa.onrender.com/api/reset");
    } catch (err) {
      console.error(err);
    }
    setFile(null);
    setUploadStatus(null);
    setCharCount(0);
    setChatHistory([]);
    setQuestion("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAsk = async (e) => {
    e?.preventDefault();
    if (!question.trim() || isStreaming || charCount === 0) return;

    const userQ = question.trim();
    setQuestion("");

    setChatHistory((prev) => [
      ...prev,
      { role: "user", text: userQ },
      { role: "ai", text: "" },
    ]);

    setIsStreaming(true);

    try {
     const response = await fetch("https://pdf-qa-backend-udoa.onrender.com/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQ }),
      });

      if (!response.ok) throw new Error("Server communication error.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: rDone } = await reader.read();
        done = rDone;
        if (value) {
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "").trim();
              if (dataStr === "[DONE]") {
                setIsStreaming(false);
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  setChatHistory((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      text: updated[lastIndex].text + parsed.text,
                    };
                    return updated;
                  });
                }
              } catch {
                // Ignore incomplete JSON stream slices
              }
            }
          }
        }
      }
    } catch {
      setChatHistory((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          ...updated[lastIndex],
          text: "An error occurred while fetching the response from the server.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div style={ui.page}>
      {/* Top Navbar */}
      <nav style={ui.nav}>
        <div style={ui.navLeft}>
          <span style={ui.logoText}>pdf-qa</span>
          <span style={ui.versionBadge}>v1.0</span>
          {file && <span style={ui.currentFileBadge}>{file.name}</span>}
        </div>
        <div style={ui.navRight}>
          {file && (
            <button onClick={handleReset} style={ui.btnGhost}>
              Clear session
            </button>
          )}
        </div>
      </nav>

      {/* Main Container */}
      <div style={ui.container}>
        {charCount === 0 ? (
          <div style={ui.uploadWrapper}>
            <div style={ui.uploadBox} onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleUpload}
                style={{ display: "none" }}
              />
              <div style={ui.uploadTitle}>
                {uploadStatus?.type === "loading" ? "Parsing document text..." : "Choose or drop a PDF"}
              </div>
              <div style={ui.uploadSubtitle}>
                Text is parsed in-memory and passed as context to Gemini.
              </div>
            </div>
            {uploadStatus?.type === "error" && (
              <div style={ui.errorText}>{uploadStatus.msg}</div>
            )}
          </div>
        ) : (
          <div style={ui.chatLayout}>
            <div style={ui.messagesList}>
              {chatHistory.map((item, idx) => (
                <div key={idx} style={ui.messageRow}>
                  <div style={ui.senderLabel}>
                    {item.role === "user" ? "you" : "gemini"}
                  </div>
                  <div style={ui.messageBody}>
                    {item.role === "user" ? (
                      item.text
                    ) : (
                      <div style={ui.markdown}>
                        <ReactMarkdown>
                          {item.text || (isStreaming && idx === chatHistory.length - 1 ? "..." : "")}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleAsk} style={ui.inputForm}>
              <input
                type="text"
                placeholder="Ask about this document..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={isStreaming}
                style={ui.inputField}
                autoFocus
              />
              <button
                type="submit"
                disabled={isStreaming || !question.trim()}
                style={ui.sendButton}
              >
                {isStreaming ? "..." : "Send"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

const ui = {
  page: {
    backgroundColor: "#0d1117",
    color: "#c9d1d9",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 24px",
    borderBottom: "1px solid #21262d",
    backgroundColor: "#161b22",
  },
  navLeft: { display: "flex", alignItems: "center", gap: "10px" },
  logoText: { fontWeight: "600", fontSize: "14px", color: "#f0f6fc", letterSpacing: "-0.2px" },
  versionBadge: { fontSize: "11px", color: "#8b949e", border: "1px solid #30363d", borderRadius: "12px", padding: "1px 7px" },
  currentFileBadge: { fontSize: "12px", color: "#58a6ff", marginLeft: "10px", backgroundColor: "rgba(56, 139, 253, 0.1)", border: "1px solid rgba(56, 139, 253, 0.3)", padding: "2px 8px", borderRadius: "4px" },
  navRight: { display: "flex", alignItems: "center" },
  btnGhost: { background: "none", border: "1px solid #30363d", color: "#8b949e", padding: "4px 10px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" },
  container: { flex: 1, display: "flex", maxWidth: "860px", width: "100%", margin: "0 auto", padding: "24px 16px", boxSizing: "border-box" },
  uploadWrapper: { margin: "auto", width: "100%", maxWidth: "460px", textAlign: "center" },
  uploadBox: { border: "1px dashed #30363d", borderRadius: "8px", padding: "48px 24px", cursor: "pointer", backgroundColor: "#161b22" },
  uploadTitle: { fontSize: "14px", fontWeight: "500", color: "#f0f6fc", marginBottom: "6px" },
  uploadSubtitle: { fontSize: "12px", color: "#8b949e" },
  errorText: { marginTop: "12px", color: "#f85149", fontSize: "12px" },
  chatLayout: { display: "flex", flexDirection: "column", width: "100%", height: "calc(100vh - 120px)" },
  messagesList: { flex: 1, overflowY: "auto", paddingRight: "8px", display: "flex", flexDirection: "column", gap: "24px" },
  messageRow: { display: "flex", flexDirection: "column", gap: "6px" },
  senderLabel: { fontSize: "11px", fontWeight: "600", color: "#8b949e", textTransform: "uppercase" },
  messageBody: { fontSize: "14px", lineHeight: "1.6", color: "#e6edf3" },
  markdown: { fontSize: "14px", lineHeight: "1.6" },
  inputForm: { marginTop: "16px", display: "flex", gap: "8px", borderTop: "1px solid #21262d", paddingTop: "14px" },
  inputField: { flex: 1, backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "6px", padding: "10px 14px", fontSize: "14px", color: "#f0f6fc", outline: "none" },
  sendButton: { backgroundColor: "#238636", border: "none", borderRadius: "6px", color: "#ffffff", padding: "0 18px", fontSize: "13px", fontWeight: "500", cursor: "pointer" },
};