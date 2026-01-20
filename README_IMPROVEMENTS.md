# VOCoder Improvements

I have implemented the following features as requested:

1.  **Multi-message Chat History**: The AI now remembers past messages and can read/edit files across multiple turns.
2.  **GitHub Integration**:
    *   **Connect GitHub**: Users can log in via OAuth.
    *   **Push to Repo**: Users can push the generated code directly to a new or existing GitHub repository.
3.  **Pre-creation Questions**: The AI is now instructed to ask clarifying questions before generating the app if the request is ambiguous.
4.  **Select to Edit**:
    *   Users can select any code in the editor.
    *   An "Edit" button appears near the selection.
    *   A pop-up allows the user to provide a prompt for the AI to fix or edit only that specific part of the code.

## GitHub Configuration

*   **Client ID**: `Iv23liAJGTT9vE0LGM1o`
*   **Callback URL**: `https://<your-vercel-domain>/api/github?action=callback`

> **Note**: You need to set `GITHUB_CLIENT_SECRET` and `OPENAI_API_KEY` in your Vercel environment variables for these features to work.

## How to use the Select to Edit feature:
1.  Generate some code.
2.  Click on a file in the file tree.
3.  Highlight a block of code in the editor.
4.  Click the blue "Edit" button that appears.
5.  Type your instruction (e.g., "change the color to red" or "add a validation check") and hit "Apply".
