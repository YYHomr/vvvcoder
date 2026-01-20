document.addEventListener('DOMContentLoaded', () => {
    const userProfile = document.getElementById('userProfile');
    if (userProfile) {
        userProfile.addEventListener('click', () => {
            window.location.href = '/api/google-auth?action=login';
        });
    }

    const toggleHistory = () => {
        const sidebar = document.getElementById('historySidebar');
        if (sidebar) sidebar.classList.toggle('open');
    };

    const toggleBtn = document.getElementById('toggleHistoryBtn');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleHistory);

    const closeBtn = document.getElementById('closeHistoryBtn');
    if (closeBtn) closeBtn.addEventListener('click', toggleHistory);

    const startBuilding = () => {
        const promptInput = document.getElementById('promptInput');
        const prompt = promptInput ? promptInput.value.trim() : '';
        if (!prompt) return;
        sessionStorage.setItem('initialPrompt', prompt);
        window.location.href = '/workspace.html';
    };

    const startBtn = document.getElementById('startBuildingBtn');
    if (startBtn) startBtn.addEventListener('click', startBuilding);

    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
        promptInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') startBuilding();
        });
    }

    // Check for user data in URL hash
    const hash = window.location.hash;
    if (hash.includes('user=')) {
        try {
            const userData = JSON.parse(decodeURIComponent(hash.split('user=')[1]));
            localStorage.setItem('user', JSON.stringify(userData));
            window.location.hash = '';
            updateUI(userData);
        } catch (e) {
            console.error("Error parsing user data", e);
        }
    } else {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                updateUI(JSON.parse(savedUser));
            } catch (e) {
                console.error("Error parsing saved user", e);
            }
        }
    }
    loadHistory();
});

function updateUI(user) {
    const profile = document.getElementById('userProfile');
    if (profile) {
        profile.innerHTML = `<img src="${user.picture}" alt="Profile" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #444;"><span>${user.name}</span>`;
    }
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const list = document.getElementById('historyList');
    if (list) {
        list.innerHTML = history.map((item, index) => `
            <div class="history-item" data-index="${index}" style="padding: 12px; border-radius: 8px; background: #1b1b1b; margin-bottom: 10px; cursor: pointer; font-size: 14px; border: 1px solid #333;">
                ${item.title || 'Untitled App'}
            </div>
        `).join('');

        // Add click listeners to history items
        list.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = item.getAttribute('data-index');
                sessionStorage.setItem('loadHistoryIndex', index);
                window.location.href = '/workspace.html';
            });
        });
    }
}
