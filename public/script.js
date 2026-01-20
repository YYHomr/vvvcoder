let currentFiles = [];
let chatHistory = [];

async function sendMessage() {
    const input = document.getElementById("userInput");
    const btn = document.getElementById("sendBtn");
    const chat = document.getElementById("chatContainer");
    const loader = document.getElementById("loadingOverlay");
    const message = input.value.trim();

    if (!message) return;

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    userMsg.innerText = message;
    chat.appendChild(userMsg);
    chat.scrollTop = chat.scrollHeight;

    input.value = "";
    input.disabled = true;
    btn.disabled = true;
    loader.style.display = 'flex';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message, 
                history: chatHistory,
                currentFiles: currentFiles 
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error (${response.status}): ${errorText.substring(0, 100)}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            throw new Error(`Expected JSON but got ${contentType || 'text'}: ${text.substring(0, 100)}`);
        }

        const data = await response.json();
        console.log("API Response:", data);

        // Update history
        chatHistory.push({ role: "user", content: message });
        chatHistory.push({ role: "assistant", content: data.explanation || JSON.stringify(data) });
        if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);
        
        // Save to persistent history
        saveToPersistentHistory();

        if (data.error) {
            const aiMsg = document.createElement('div');
            aiMsg.className = 'message ai';
            aiMsg.innerText = "Error: " + data.error;
            chat.appendChild(aiMsg);
            return;
        }
        if (data.files && data.files.length > 0) {
            // Merge or replace files
            data.files.forEach(newFile => {
                const index = currentFiles.findIndex(f => f.path === newFile.path);
                if (index !== -1) {
                    currentFiles[index] = newFile;
                } else {
                    currentFiles.push(newFile);
                }
            });
            renderFileTree(currentFiles);
            document.getElementById("downloadBtn").style.display = 'flex';
            document.getElementById("previewBtn").style.display = 'flex';

            const aiMsg = document.createElement('div');
            aiMsg.className = 'message ai';
            aiMsg.innerText = data.explanation || "I've generated the files for you.";
            chat.appendChild(aiMsg);
        } else {
            const aiMsg = document.createElement('div');
            aiMsg.className = 'message ai';
            aiMsg.innerText = data.explanation || "Sorry, I couldn't generate the files.";
            chat.appendChild(aiMsg);
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        const aiMsg = document.createElement('div');
        aiMsg.className = 'message ai';
        aiMsg.innerText = "Failed to connect to the server. Please check your internet and Vercel logs.";
        chat.appendChild(aiMsg);
    } finally {
        input.disabled = false;
        btn.disabled = false;
        loader.style.display = 'none';
        chat.scrollTop = chat.scrollHeight;
    }
}

function renderFileTree(files) {
    const list = document.getElementById("fileList");
    list.innerHTML = "";
    files.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `<i class="fa-regular fa-file-code"></i> ${file.path}`;
        item.onclick = () => {
            document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            document.getElementById("codeDisplay").innerText = file.content;
        };
        list.appendChild(item);
        if (index === 0) item.click();
    });
}

async function downloadZip() {
    if (currentFiles.length === 0) return;

    const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: currentFiles })
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-app.zip';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById("sendBtn");
    const downloadBtn = document.getElementById("downloadBtn");
    const userInput = document.getElementById("userInput");

    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadZip);
    }

    if (userInput) {
        userInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

// GitHub Integration
let githubToken = null;

function checkGithubToken() {
    const hash = window.location.hash;
    if (hash.includes('access_token=')) {
        githubToken = hash.split('access_token=')[1].split('&')[0];
        window.location.hash = '';
        document.getElementById('githubLoginBtn').style.display = 'none';
        document.getElementById('githubPushBtn').style.display = 'flex';
        localStorage.setItem('github_token', githubToken);
    } else {
        githubToken = localStorage.getItem('github_token');
        if (githubToken) {
            document.getElementById('githubLoginBtn').style.display = 'none';
            document.getElementById('githubPushBtn').style.display = 'flex';
        }
    }
}

async function pushToGithub() {
    if (!githubToken || currentFiles.length === 0) return;
    
    const repoName = prompt("Enter repository name:", "my-ai-app");
    if (!repoName) return;

    const loader = document.getElementById("loadingOverlay");
    loader.style.display = 'flex';

    try {
        const response = await fetch('/api/github?action=push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: githubToken,
                repoName,
                files: currentFiles,
                commitMessage: "Initial commit from VOCoder"
            })
        });
        const data = await response.json();
        if (data.success) {
            alert("Successfully pushed to GitHub: " + data.url);
            window.open(data.url, '_blank');
        } else {
            throw new Error(data.error || "Failed to push");
        }
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        loader.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkGithubToken();
    const loginBtn = document.getElementById('githubLoginBtn');
    const pushBtn = document.getElementById('githubPushBtn');
    
    if (loginBtn) {
        loginBtn.onclick = () => {
            window.location.href = '/api/github?action=login';
        };
    }
    
    if (pushBtn) {
        pushBtn.onclick = pushToGithub;
    }
});

// Inline Editing Logic
let selectedText = "";
let selectedRange = null;
let activeFilePath = "";

document.getElementById('codeDisplay').addEventListener('mouseup', () => {
    const selection = window.getSelection();
    selectedText = selection.toString().trim();
    if (selectedText) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editBtn = document.getElementById('editBtn');
        editBtn.style.display = 'block';
        editBtn.style.top = `${rect.top + window.scrollY - 40}px`;
        editBtn.style.left = `${rect.left + window.scrollX}px`;
        selectedRange = range;
    } else {
        document.getElementById('editBtn').style.display = 'none';
    }
});

document.getElementById('editBtn').onclick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const popup = document.getElementById('editPopup');
    popup.style.display = 'block';
    popup.style.top = `${rect.bottom + 5}px`;
    popup.style.left = `${rect.left}px`;
};

function closeEditPopup() {
    document.getElementById('editPopup').style.display = 'none';
    document.getElementById('editBtn').style.display = 'none';
}

async function applyInlineEdit() {
    const promptText = document.getElementById('editPrompt').value.trim();
    if (!promptText || !selectedText) return;

    const loader = document.getElementById("loadingOverlay");
    loader.style.display = 'flex';
    closeEditPopup();

    try {
        const activeFile = currentFiles.find(f => f.path === activeFilePath);
        const message = `In file "${activeFilePath}", change this code:\n\n\`\`\`\n${selectedText}\n\`\`\`\n\nBased on this request: ${promptText}`;
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message, 
                history: chatHistory,
                currentFiles: currentFiles 
            })
        });

        const data = await response.json();
        if (data.files && data.files.length > 0) {
            data.files.forEach(newFile => {
                const index = currentFiles.findIndex(f => f.path === newFile.path);
                if (index !== -1) {
                    currentFiles[index] = newFile;
                } else {
                    currentFiles.push(newFile);
                }
            });
            renderFileTree(currentFiles);
            // Re-select the active file to show changes
            const updatedFile = currentFiles.find(f => f.path === activeFilePath);
            if (updatedFile) {
                document.getElementById("codeDisplay").innerText = updatedFile.content;
            }
        }
        
        // Add to chat history
        const chat = document.getElementById("chatContainer");
        const aiMsg = document.createElement('div');
        aiMsg.className = 'message ai';
        aiMsg.innerText = data.explanation || "I've updated the code for you.";
        chat.appendChild(aiMsg);
        chat.scrollTop = chat.scrollHeight;

    } catch (err) {
        alert("Error applying edit: " + err.message);
    } finally {
        loader.style.display = 'none';
    }
}

// Update activeFilePath when a file is clicked
const originalRenderFileTree = renderFileTree;
renderFileTree = function(files) {
    const list = document.getElementById("fileList");
    list.innerHTML = "";
    files.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `<i class="fa-regular fa-file-code"></i> ${file.path}`;
        item.onclick = () => {
            activeFilePath = file.path;
            document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            document.getElementById("codeDisplay").innerText = file.content;
        };
        list.appendChild(item);
        if (index === 0) item.click();
    });
};

// Preview Logic
function openPreview() {
    if (currentFiles.length === 0) return;

    const modal = document.getElementById('previewModal');
    const frame = document.getElementById('previewFrame');
    
    // Find index.html or the first html file
    let mainFile = currentFiles.find(f => f.path === 'index.html' || f.path.endsWith('.html'));
    if (!mainFile) {
        alert("No HTML file found to preview.");
        return;
    }

    // Create a blob for each file and replace references (simplified for demo)
    // For a robust solution, we'd use a Service Worker, but here we'll inject the content
    let content = mainFile.content;

    // Inject "Made with VOCoder" label
    const labelHtml = `
        <div id="vocoder-label" style="position: fixed; bottom: 20px; right: 20px; background: rgba(0,0,0,0.8); color: white; padding: 8px 15px; border-radius: 20px; font-family: sans-serif; font-size: 12px; z-index: 9999; border: 1px solid #444; pointer-events: none; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
            <img src="/images/logo.png" style="height: 16px;" onerror="this.style.display='none'">
            <span>Made with <strong>VOCoder</strong></span>
        </div>
    `;
    
    if (content.includes('</body>')) {
        content = content.replace('</body>', labelHtml + '</body>');
    } else {
        content += labelHtml;
    }

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    frame.src = url;
    modal.style.display = 'flex';
}

function closePreview() {
    const modal = document.getElementById('previewModal');
    const frame = document.getElementById('previewFrame');
    modal.style.display = 'none';
    frame.src = 'about:blank';
}

function saveToPersistentHistory() {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const currentSession = {
        title: chatHistory[0]?.content.substring(0, 30) + '...',
        messages: chatHistory,
        files: currentFiles,
        timestamp: new Date().getTime()
    };
    
    // Update existing or add new
    const existingIndex = history.findIndex(h => h.messages[0]?.content === chatHistory[0]?.content);
    if (existingIndex !== -1) {
        history[existingIndex] = currentSession;
    } else {
        history.unshift(currentSession);
    }
    
    localStorage.setItem('chatHistory', JSON.stringify(history.slice(0, 20)));
}

document.addEventListener('DOMContentLoaded', () => {
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
        previewBtn.onclick = openPreview;
    }
});
