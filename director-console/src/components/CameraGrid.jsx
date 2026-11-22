import { scene } from '../utils/scene';

export function CameraGrid({ cams, zone, onOpen }) {
  const list = cams
    .filter((c) => zone === 'All' || c.zone === zone)
    .map((c, i) => ({ ...c, wide: i === 0 }));

  return (
    <div className="camgrid" id="camgrid">
      {list.map((c) => (
        <div
          key={c.id}
          className={`cam ${c.wide ? 'wide' : ''}`}
          onClick={() => onOpen(c)}
        >
          {c.off ? (
            <div className="off">CAMERA OFFLINE</div>
          ) : (
            <>
              <div
                dangerouslySetInnerHTML={{
                  __html: scene(c.type, c.id + (c.wide ? 100 : 0)),
                }}
              />
              <span className="live">LIVE</span>
            </>
          )}
          <div className="meta">
            <div>
              <b>{c.name}</b>
              <small data-ts />
            </div>
            {!c.off && (
              <span
                className="count"
                style={
                  c.count === 'ALERT'
                    ? { background: '#E5484D', color: '#fff' }
                    : undefined
                }
              >
                {c.count}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
