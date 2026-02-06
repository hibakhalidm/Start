import React, { useState } from 'react';
import { Network, Plus, Trash2, Play } from 'lucide-react';

interface Operation {
    id: string;
    type: 'XOR' | 'ROL' | 'ROR' | 'B64';
    param: string;
}

const TransformationPipeline: React.FC = () => {
    const [ops, setOps] = useState<Operation[]>([]);

    const addOp = () => {
        const newOp: Operation = {
            id: Date.now().toString(),
            type: 'XOR',
            param: '0x00'
        };
        setOps([...ops, newOp]);
    };

    const removeOp = (id: string) => {
        setOps(ops.filter(o => o.id !== id));
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ marginBottom: '10px' }}>PIPELINE</div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {ops.length === 0 && (
                    <div style={{ color: '#555', padding: '20px', textAlign: 'center', fontSize: '0.8rem' }}>
                        NO OPERATIONS<br />Add a step to transform signal.
                    </div>
                )}

                {ops.map((op, index) => (
                    <div key={op.id} style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid #333',
                        marginBottom: '8px',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ color: 'var(--accent-cyan)', marginRight: '8px', fontSize: '0.8rem', opacity: 0.5 }}>
                                {index + 1}.
                            </span>
                            <select
                                style={{ background: '#000', color: '#eee', border: '1px solid #333', fontSize: '0.8rem', marginRight: '8px' }}
                                value={op.type}
                                onChange={(e) => {
                                    const newOps = [...ops];
                                    newOps[index].type = e.target.value as any;
                                    setOps(newOps);
                                }}
                            >
                                <option value="XOR">XOR</option>
                                <option value="ROL">Rotate Left</option>
                                <option value="ROR">Rotate Right</option>
                                <option value="B64">Base64 Decode</option>
                            </select>

                            {op.type !== 'B64' && (
                                <input
                                    type="text"
                                    value={op.param}
                                    style={{ width: '60px', background: '#000', color: 'var(--accent-cyan)', border: '1px solid #333', fontSize: '0.8rem' }}
                                    onChange={(e) => {
                                        const newOps = [...ops];
                                        newOps[index].param = e.target.value;
                                        setOps(newOps);
                                    }}
                                />
                            )}
                        </div>

                        <button onClick={() => removeOp(op.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555' }}>
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <button
                    onClick={addOp}
                    style={{
                        flex: 1,
                        background: '#111',
                        border: '1px dashed #333',
                        color: '#aaa',
                        padding: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem'
                    }}
                >
                    <Plus size={12} style={{ marginRight: '5px' }} />
                    ADD STEP
                </button>

                <button
                    style={{
                        flex: 1,
                        background: 'var(--accent-cyan)',
                        border: 'none',
                        color: '#000',
                        padding: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem'
                    }}
                >
                    <Play size={12} style={{ marginRight: '5px' }} />
                    APPLY
                </button>
            </div>
        </div>
    );
};

export default TransformationPipeline;
