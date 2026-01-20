import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = '464589680294-rs3ar50upbh86crnmq5uhbanocrvo3rb.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export default async function handler(req, res) {
    const { action } = req.query;

    if (action === 'login') {
        const redirectUri = `https://${req.headers.host}/api/google-auth?action=callback`;
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile`;
        return res.redirect(url);
    }

    if (action === 'callback') {
        const { code } = req.query;
        const redirectUri = `https://${req.headers.host}/api/google-auth?action=callback`;
        
        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code'
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                return res.status(400).json({ error: data.error_description || data.error });
            }

            // Get user info
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            const user = await userRes.json();

            // Redirect back to home with user info (simplified for demo)
            const userData = encodeURIComponent(JSON.stringify({
                name: user.name,
                email: user.email,
                picture: user.picture,
                token: data.access_token
            }));
            
            return res.redirect(`/#user=${userData}`);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(400).json({ error: 'Invalid action' });
}
