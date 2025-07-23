// Note: The callback server must be started separately using "pnpm run dev:callback"
// This is because Express.js needs to run in a Node.js environment, not in the browser

export async function checkCallbackServerHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3000/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function ensureCallbackServerRunning(): Promise<void> {
  const isRunning = await checkCallbackServerHealth();
  
  if (!isRunning) {
    throw new Error(
      'Callback server is not running. The server should start automatically with "pnpm run dev". If you see this error, please restart the development server.'
    );
  }
} 