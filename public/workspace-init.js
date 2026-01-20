window.addEventListener("DOMContentLoaded", () => {
    // Handle initial prompt from landing page
    const initialPrompt = sessionStorage.getItem("initialPrompt");
    if (initialPrompt) {
        sessionStorage.removeItem("initialPrompt");
        const input = document.getElementById("userInput");
        if (input) {
            input.value = initialPrompt;
            // sendMessage is defined in script.js
            if (typeof sendMessage === 'function') sendMessage();
        }
    }
    
    const historyIndex = sessionStorage.getItem("loadHistoryIndex");
    if (historyIndex !== null) {
        sessionStorage.removeItem("loadHistoryIndex");
        if (typeof loadFromHistory === 'function') loadFromHistory(parseInt(historyIndex));
    }

    // Add event listeners for buttons that had inline handlers
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    if (closePreviewBtn) closePreviewBtn.addEventListener('click', closePreview);

    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditPopup);

    const applyEditBtn = document.getElementById('applyEditBtn');
    if (applyEditBtn) applyEditBtn.addEventListener('click', applyInlineEdit);
});

function loadFromHistory(index) {
    const history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    const session = history[index];
    if (session) {
        // These variables are expected to be global from script.js
        window.currentFiles = session.files;
        window.chatHistory = session.messages;
        
        if (typeof renderFileTree === 'function') renderFileTree(window.currentFiles);
        
        // Render messages in UI
        const chat = document.getElementById("chatContainer");
        if (chat) {
            chat.innerHTML = "";
            window.chatHistory.forEach(msg => {
                const msgDiv = document.createElement("div");
                msgDiv.className = `message ${msg.role === "user" ? "user" : "ai"}`;
                msgDiv.innerText = msg.content;
                chat.appendChild(msgDiv);
            });
            chat.scrollTop = chat.scrollHeight;
        }
    }
}
