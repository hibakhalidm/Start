import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';

// DIAGNOSTIC: Dynamically import App to catch "Module Not Found" errors
const App = React.lazy(() => import('./App.tsx'));

const BootLoader = () => (
    <div style={{
        height: '100vh',
        background: '#050505',
        color: '#00f0ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace'
    }}>
        INITIALIZING CIFAD CORE...
    </div>
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', background: '#111', color: '#ff2a2a', height: '100vh', fontFamily: 'monospace', overflow: 'auto' }}>
                    <h1 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>⚠️ SYSTEM FAILURE</h1>
                    <h3 style={{ color: '#fff' }}>ERROR: {this.state.error?.message}</h3>

                    <div style={{ background: '#000', padding: '20px', marginTop: '20px', border: '1px solid #333' }}>
                        <p style={{ color: '#aaa', marginBottom: '10px' }}>POSSIBLE CAUSES:</p>
                        <ul style={{ color: '#ccc', lineHeight: '1.6' }}>
                            <li>Missing Dependencies (Run <code>npm install react-resizable-panels lucide-react</code>)</li>
                            <li>Missing Component Files (Check <code>src/components/</code>)</li>
                            <li>Import Path Errors</li>
                        </ul>
                    </div>

                    <pre style={{ marginTop: '20px', fontSize: '12px', opacity: 0.7 }}>
                        {this.state.error?.stack}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <Suspense fallback={<BootLoader />}>
                <App />
            </Suspense>
        </ErrorBoundary>
    </React.StrictMode>,
);