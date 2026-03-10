import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
// DIAGNOSTIC: Dynamically import App to catch "Module Not Found" errors
const App = React.lazy(() => import('./App'));
const BootLoader = () => (_jsx("div", { style: {
        height: '100vh',
        background: '#050505',
        color: '#00f0ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace'
    }, children: "INITIALIZING CIFAD CORE..." }));
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (_jsxs("div", { style: { padding: '40px', background: '#111', color: '#ff2a2a', height: '100vh', fontFamily: 'monospace', overflow: 'auto' }, children: [_jsx("h1", { style: { borderBottom: '1px solid #333', paddingBottom: '10px' }, children: "\u26A0\uFE0F SYSTEM FAILURE" }), _jsxs("h3", { style: { color: '#fff' }, children: ["ERROR: ", this.state.error?.message] }), _jsxs("div", { style: { background: '#000', padding: '20px', marginTop: '20px', border: '1px solid #333' }, children: [_jsx("p", { style: { color: '#aaa', marginBottom: '10px' }, children: "POSSIBLE CAUSES:" }), _jsxs("ul", { style: { color: '#ccc', lineHeight: '1.6' }, children: [_jsxs("li", { children: ["Missing Dependencies (Run ", _jsx("code", { children: "npm install react-resizable-panels lucide-react" }), ")"] }), _jsxs("li", { children: ["Missing Component Files (Check ", _jsx("code", { children: "src/components/" }), ")"] }), _jsx("li", { children: "Import Path Errors" })] })] }), _jsx("pre", { style: { marginTop: '20px', fontSize: '12px', opacity: 0.7 }, children: this.state.error?.stack })] }));
        }
        return this.props.children;
    }
}
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(ErrorBoundary, { children: _jsx(Suspense, { fallback: _jsx(BootLoader, {}), children: _jsx(App, {}) }) }) }));
//# sourceMappingURL=main.js.map