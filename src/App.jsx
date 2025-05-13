import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [displayedAnswer, setDisplayedAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [copied, setCopied] = useState(false);
  const [useTypingEffect, setUseTypingEffect] = useState(true);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("chatHistory");
    return saved ? JSON.parse(saved) : [];
  });
  const [pinned, setPinned] = useState(() => {
    const saved = localStorage.getItem("pinnedChats");
    return saved ? JSON.parse(saved) : [];
  });
  const [showPinned, setShowPinned] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const typingTimeoutRef = useRef(null);
  const [showImagePromptBox, setShowImagePromptBox] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [generatedImages, setGeneratedImages] = useState(() => {
    try {
      const saved = localStorage.getItem("generatedImages");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showGeneratedImages, setShowGeneratedImages] = useState(false);
  const [selectedGeneratedImage, setSelectedGeneratedImage] = useState(null);

  const previewRef = useRef(null);
  const containerRef = useRef(null);


  // Persist settings
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("pinnedChats", JSON.stringify(pinned));
  }, [pinned]);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);



  useEffect(() => {
    const el = document.getElementById("response-box");
    if (el) el.scrollTop = el.scrollHeight;
  }, [displayedAnswer]);

  useEffect(() => {
    if (!useTypingEffect && answer) {
      setDisplayedAnswer(answer);
      clearTimeout(typingTimeoutRef.current);
    }
  }, [useTypingEffect, answer]);

  const handleVoiceInput = () => {
    const recognition =
      new window.webkitSpeechRecognition() || new window.SpeechRecognition();
    recognition.lang = "en-US";
    recognition.start();

    recognition.onresult = (event) => {
      setQuestion(event.results[0][0].transcript);
    };
  };

  useEffect(() => {
    localStorage.setItem("generatedImages", JSON.stringify(generatedImages));
  }, [generatedImages]);

  const handleGenerateImage = () => {
    if (!imagePrompt.trim()) return;

    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}`;
    const newEntry = { prompt: imagePrompt, imageUrl: url };

    setGeneratedImages((prev) => {
      const updated = [newEntry, ...prev];
      localStorage.setItem("generatedImages", JSON.stringify(updated.slice(0, 10)));
      return updated.slice(0, 10);
    });
    setImageUrl(url);
    setImagePrompt("");
    setShowImagePromptBox(false);
  };

  const handleDeleteImage = (index) => {
    const updatedImages = [...generatedImages];
    updatedImages.splice(index, 1);
    setGeneratedImages(updatedImages);
    localStorage.setItem("generatedImages", JSON.stringify(updatedImages));
  };


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        selectedGeneratedImage &&
        previewRef.current &&
        !previewRef.current.contains(event.target)
      ) {
        setSelectedGeneratedImage(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedGeneratedImage]);


  async function generateAnswer() {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");
    setDisplayedAnswer("");
    clearTimeout(typingTimeoutRef.current);

    try {
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyB2V-oRkeNmyVHgl_H6AQMvorzKRVrZn_k",
        {
          contents: [{ parts: [{ text: question }] }],
        }
      );

      const result = response.data.candidates[0].content.parts[0].text;
      setAnswer(result);
      setHistory((prev) => [...prev, { question, answer: result }]);

      if (useTypingEffect) {
        animateTyping(result);
      } else {
        setDisplayedAnswer(result);
      }
    } catch {
      const errorMsg = "Oops! Something went wrong.";
      setAnswer(errorMsg);
      setDisplayedAnswer(errorMsg);
    }

    setLoading(false);
  }

  const animateTyping = (text) => {
    let i = 0;
    const speed = 2;
    setDisplayedAnswer("");

    const type = () => {
      if (!useTypingEffect) {
        setDisplayedAnswer(text);
        return;
      }

      if (i < text.length) {
        setDisplayedAnswer((prev) => prev + text.charAt(i));
        i++;
        typingTimeoutRef.current = setTimeout(type, speed);
      }
    };

    type();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      generateAnswer();
    }
  };

  const handleNewChat = () => {
    setQuestion("");
    setAnswer("");
    setDisplayedAnswer("");
  };

  const restoreChat = (item) => {
    setQuestion(item.question);
    setAnswer(item.answer);
    setDisplayedAnswer(useTypingEffect ? "" : item.answer);
    if (useTypingEffect) animateTyping(item.answer);
  };

  const togglePin = (chat) => {
    const exists = pinned.find(
      (p) => p.question === chat.question && p.answer === chat.answer
    );
    if (exists) {
      setPinned((prev) =>
        prev.filter(
          (p) => p.question !== chat.question || p.answer !== chat.answer
        )
      );
    } else {
      setPinned((prev) => [...prev, chat]);
    }
  };

  const deleteChat = (chat) => {
    const confirmed = window.confirm("Are you sure you want to delete this chat?");
    if (confirmed) {
      setHistory((prev) =>
        prev.filter(
          (item) =>
            item.question !== chat.question || item.answer !== chat.answer
        )
      );
    }
  };

  const isPinned = (chat) => {
    return pinned.some(
      (p) => p.question === chat.question && p.answer === chat.answer
    );
  };

  return (
    <div className={`flex h-screen w-screen ${darkMode ? "dark-mode" : ""}`}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div
          className={`w-64 p-4 transition-all duration-300 overflow-y-auto 
      ${darkMode ? "bg-[#1f2937] text-white border-r border-gray-700" : "bg-white text-black border-r border-gray-200"} 
      shadow-md relative`}
        >
          <div className="flex justify-end">
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray text-xl hover:text-blue-600 transition"
              title="Close Sidebar"
            >
              X
            </button>
          </div>

          <h2 className="text-lg font-semibold mb-4">💬 Your Chats</h2>

          <button
            onClick={handleNewChat}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg shadow hover:shadow-lg transition-all font-semibold mb-2"
          >
            ➕ New Chat
          </button>

          <button
            onClick={() => setShowPinned(!showPinned)}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg shadow hover:shadow-lg transition-all font-semibold mb-2"
          >
            📌 {showPinned ? "Hide" : "Pinned"}
          </button>

          <button
            onClick={() => setShowGeneratedImages(prev => !prev)}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg shadow hover:shadow-lg transition-all font-semibold mb-2"
          >
            🖼️ Generated Images
          </button>

          {showGeneratedImages && (
            <div className="mt-4 space-y-2">
              {generatedImages.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No generated images yet.</p>
              ) : (
                <ul className="space-y-2 overflow-y-auto max-h-[200px] pr-1">
                  {generatedImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white dark:bg-gray-800 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <div
                        className="flex items-center"
                        onClick={() => setSelectedGeneratedImage(img)}
                      >
                        <img
                          src={img.imageUrl}
                          alt={img.prompt}
                          className="w-10 h-10 rounded object-cover mr-2"
                        />
                        <span className="text-sm truncate max-w-[120px] text-gray-800 dark:text-gray-200">{img.prompt}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent opening preview
                          handleDeleteImage(idx); // Call the new delete function
                        }}
                        className="text-red-500 hover:text-red-700"
                        title="Delete Image"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </ul>
              )}
            </div>
          )}

          <ul className="space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
            {(showPinned ? pinned : history).map((item, index) => (
              <li
                key={index}
                onClick={() => restoreChat(item)}
                className="cursor-pointer bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-600 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg transition flex justify-between items-center group"
              >
                <span className="truncate w-[70%]">{item.question.slice(0, 40)}...</span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(item);
                    }}
                    title={isPinned(item) ? "Unpin" : "Pin"}
                    className="text-yellow-500 hover:text-yellow-400"
                  >
                    📌
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(item);
                    }}
                    title="Delete"
                    className="text-red-500 hover:text-red-400"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 dark-card">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-2xl font-bold text-blue-500 dark:text-blue-300 focus:outline-none"
              >
                ☰
              </button>
            )}
            <h1 className="text-3xl font-extrabold text-center dark-heading">
              💬 AskVerse AI
            </h1>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="ml-4 px-3 py-2 rounded-lg dark-toggle text-sm font-medium"
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <textarea
            className="flex-1 p-4 border-2 border-blue-300 rounded-lg resize-none min-h-[120px] focus:outline-none focus:ring-4 focus:ring-blue-200 dark-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
          ></textarea>
          <button
            onClick={generateAnswer}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all font-semibold"
          >
            Ask AI
          </button>
          <button
            onClick={handleVoiceInput}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all font-semibold dark-mic"
          >
            🎤 Speak
          </button>
          <button
            onClick={() => setShowImagePromptBox(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all font-semibold dark-mic"
          >
            🖼️ Generate Image
          </button>
        </div>

        <div className="flex items-center space-x-2 text-sm">
          <input
            type="checkbox"
            checked={useTypingEffect}
            onChange={(e) => setUseTypingEffect(e.target.checked)}
            id="typingToggle"
          />
          <label htmlFor="typingToggle" className="text-gray-700 dark:text-gray-300">
            Typing effect
          </label>
        </div>

        <div className="relative w-full p-4 rounded-xl shadow-inner dark-answer border-2 border-gray-300 dark:border-gray-600">
          {loading ? (
            <p className="text-center text-gray-500">Generating response...</p>
          ) : answer ? (
            <>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 text-sm text-blue-600 hover:underline bg-white bg-opacity-70 px-2 py-1 rounded dark:bg-gray-800 dark:text-blue-400"
              >
                📋 Copy
              </button>
              {copied && (
                <span className="absolute top-2 right-20 text-green-600 text-sm font-medium animate-pulse">
                  ✅ Copied!
                </span>
              )}

              <div className="mb-4 flex gap-2 items-start">
                <span className="text-blue-600">👤</span>
                <div className="bg-blue-100 text-gray-900 p-3 rounded-xl w-full dark-bubble">
                  {question}
                </div>
              </div>

              <div className="flex gap-2 items-start">
                <span className="text-green-600">🤖</span>
                <div
                  className="p-4 bg-green-50 text-gray-900 rounded-xl border-2 w-full max-h-[400px] overflow-y-auto shadow-md animate-fade-in prose"
                  style={{
                    backgroundColor: darkMode ? "#1e1e2e" : "#f0fdf4",
                    color: darkMode ? "#f3f4f6" : "#111827",
                    borderColor: darkMode ? "#4ade80" : "#86efac",
                    boxShadow: darkMode
                      ? "0 0 10px rgba(74, 222, 128, 0.3)"
                      : "0 0 6px rgba(74, 222, 128, 0.2)",
                  }}
                >
                  <ReactMarkdown>{displayedAnswer}</ReactMarkdown>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-center">
              Your answer will appear here...
            </p>
          )}
        </div>

        {/* Image Prompt Input */}
        {showImagePromptBox && (
          <div className="mt-4 p-4 border-2 border-blue-300 dark:border-blue-700 rounded-lg">
            <input
              type="text"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Enter image prompt..."
              className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleGenerateImage}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                🎨 Generate
              </button>
              <button
                onClick={() => setShowImagePromptBox(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        )}

        {/* Generated Image */}
        {imageUrl && (
          <div className="flex flex-col items-center spacing-top">
            <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">🖼️ Generated Image:</h3>
            <div className="border-2 rounded-xl overflow-hidden shadow-lg max-w-md">
              <img
                src={imageUrl}
                alt="Generated"
                className="max-w-full h-auto rounded object-cover"
                onError={(e) => (e.target.style.display = "none")}
              />
            </div>
            <button
              onClick={async () => {
                try {
                  const response = await fetch(imageUrl);
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "generated-image.png";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  console.error("Image download failed:", err);
                }
              }}
              className="mt-2 text-lg text-blue-600 hover:text-blue-800"
            >
              ⬇️ Download
            </button>
          </div>
        )}

        {selectedGeneratedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div
              ref={previewRef}
              className="relative bg-white dark:bg-[#1f2937] p-6 rounded-xl shadow-lg max-w-lg w-full"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedGeneratedImage(null)}
                className="absolute top-2 right-2 text-xl text-gray-600 dark:text-gray-300 hover:text-red-500"
                title="Close"
              >
                ❌
              </button>

              {/* Title */}
              <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300 text-center">
                🖼️ Generated Image
              </h3>

              {/* Image Display */}
              <div className="border-2 rounded-xl overflow-hidden shadow-md mb-4">
                <img
                  src={selectedGeneratedImage.imageUrl}
                  alt={selectedGeneratedImage.prompt}
                  className="max-w-full h-auto object-cover"
                />
              </div>

              {/* Download Button */}
              <div className="text-center">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(selectedGeneratedImage.imageUrl);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "generated-image.png";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error("Image download failed:", err);
                    }
                  }}
                  className="mt-2 text-lg text-blue-600 hover:text-blue-800"
                >
                  ⬇️ Download
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
