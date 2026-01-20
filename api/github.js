import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Iv23liAJGTT9vE0LGM1o';
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

export default async function handler(req, res) {
    const { action } = req.query;

    if (action === 'login') {
        const redirectUri = `https://${req.headers.host}/api/github?action=callback`;
        const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo,user&redirect_uri=${encodeURIComponent(redirectUri)}`;
        return res.redirect(url);
    }

    if (action === 'callback') {
        const { code } = req.query;
        try {
            const response = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    code
                })
            });
            const data = await response.json();
            // In a real app, you'd set a cookie. For this demo, we'll redirect with the token in the hash.
            return res.redirect(`/#access_token=${data.access_token}`);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'POST') {
        const { token, repoName, files, commitMessage } = req.body;
        
        if (action === 'push') {
            try {
                // 1. Get user info
                const userRes = await fetch('https://api.github.com/user', {
                    headers: { 'Authorization': `token ${token}` }
                });
                const user = await userRes.json();
                const owner = user.login;

                // 2. Create repo if not exists (simplified)
                await fetch('https://api.github.com/user/repos', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `token ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: repoName, auto_init: true })
                });

                // 3. Push files (this is a simplified version using the content API)
                for (const file of files) {
                    // Get file SHA if exists
                    const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`, {
                        headers: { 'Authorization': `token ${token}` }
                    });
                    const fileData = await fileRes.json();
                    const sha = fileData.sha;

                    await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`, {
                        method: 'PUT',
                        headers: { 
                            'Authorization': `token ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: commitMessage || 'Update from VOCoder',
                            content: Buffer.from(file.content).toString('base64'),
                            sha: sha
                        })
                    });
                }

                return res.status(200).json({ success: true, url: `https://github.com/${owner}/${repoName}` });
            } catch (err) {
                return res.status(500).json({ error: err.message });
            }
        }
    }

    return res.status(400).json({ error: 'Invalid action' });
}
