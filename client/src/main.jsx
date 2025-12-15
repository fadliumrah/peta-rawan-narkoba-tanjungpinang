import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { getActiveLogo } from './services/api'

async function applyFaviconFromLogo() {
  try {
    const res = await getActiveLogo();
    const logo = res?.data?.data;
    if (logo && logo.image) {
      const url = logo.image;
      const setLink = (rel, type) => {
        let el = document.querySelector(`link[rel="${rel}"]`);
        if (!el) {
          el = document.createElement('link');
          el.rel = rel;
          if (type) el.type = type;
          document.head.appendChild(el);
        }
        el.href = url;
      };

      setLink('icon', 'image/svg+xml');
      setLink('alternate icon');
      setLink('apple-touch-icon');
    }
  } catch (e) {
    // keep default favicon if request fails
  }
}

applyFaviconFromLogo();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
