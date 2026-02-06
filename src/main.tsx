import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
// Ensure we ONLY import the CSS file that exists
import './App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);