import { createContext, useContext, useState, useCallback } from 'react';

const PanelCtx = createContext(null);

export function PanelProvider({ children }) {
  const [stack, setStack] = useState([]);

  const push = useCallback((panel) => {
    // panel: { key, title, sub, body, act }
    setStack((s) => [...s, { id: Date.now() + Math.random(), ...panel }]);
  }, []);

  const pop = useCallback(() => {
    setStack((s) => s.slice(0, -1));
  }, []);

  const clear = useCallback(() => setStack([]), []);

  return (
    <PanelCtx.Provider value={{ stack, push, pop, clear }}>
      {children}
      {stack.map((p, i) => (
        <div
          key={p.id}
          className="panel on"
          style={{ zIndex: 25 + i }}
        >
          <div className="pnh">
            <div className="r1">
              <button className="iconbtn" onClick={pop} aria-label="Back">
                <svg viewBox="0 0 24 24">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div>
                <small>{p.key}</small>
                <b>{p.title}</b>
              </div>
              {p.act || <span style={{ width: 40 }} />}
            </div>
            {p.sub && <p className="psub">{p.sub}</p>}
          </div>
          <div className="pnb">{p.body}</div>
        </div>
      ))}
    </PanelCtx.Provider>
  );
}

export function usePanels() {
  return useContext(PanelCtx);
}
