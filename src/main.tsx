import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle and swallow benign Vite HMR WebSocket errors/rejections (expected behavior when HMR is disabled or dev server restarts)
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason?.message || String(event.reason);
  if (
    reason.includes("WebSocket") ||
    reason.includes("websocket") ||
    reason.includes("WebSocket closed without opened") ||
    reason.includes("closed without opened") ||
    reason.includes("failed to connect")
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    console.debug("Intercepted and muted benign HMR WebSocket rejection:", reason);
  }
});

window.addEventListener("error", (event) => {
  const msg = event.message || "";
  if (
    msg.includes("WebSocket") ||
    msg.includes("websocket") ||
    msg.includes("WebSocket closed without opened") ||
    msg.includes("failed to connect")
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    console.debug("Intercepted and muted benign HMR WebSocket error:", msg);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

