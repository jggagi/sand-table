import { useCallback, useState } from 'react';
import GardenCanvas from './scene/GardenCanvas';
import { VIEW_PRESETS, type ViewId } from './data/garden.views';
import { UI_CONTENT } from './data/garden.content';
import { getMapHref } from './navigation/mapLink';
import './styles.css';
import MusicPanel from './audio/MusicPanel';

type RenderStatus = 'loading' | 'ready' | 'error';

function ResetIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4.1 7.2a6.2 6.2 0 1 1-.25 4.8M4.1 7.2V3.7M4.1 7.2h3.6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OrbitIcon() {
  return (
    <svg viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <ellipse cx="11" cy="11" rx="8.5" ry="4.25" stroke="currentColor" strokeWidth="1.15" transform="rotate(-28 11 11)" />
      <path d="M11 2.5v17M4.5 16.5l-1.2-3.1 3.1.6" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function App() {
  const [viewId, setViewId] = useState<ViewId>('overview');
  const [activeId, setActiveId] = useState<ViewId | null>('overview');
  const [requestId, setRequestId] = useState(0);
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [hasRendered, setHasRendered] = useState(false);
  const [rendererVersion, setRendererVersion] = useState(0);

  const currentView = VIEW_PRESETS.find((view) => view.id === activeId);
  const selectView = useCallback((id: ViewId) => {
    setViewId(id);
    setActiveId(id);
    setRequestId((current) => current + 1);
  }, []);
  const onViewChange = useCallback((id: ViewId | null) => setActiveId(id), []);
  const onStatus = useCallback((status: RenderStatus, message?: string) => {
    setRenderStatus(status);
    setErrorMessage(message);
    if (status === 'ready') setHasRendered(true);
  }, []);

  const retry = () => {
    setHasRendered(false);
    setRenderStatus('loading');
    setErrorMessage(undefined);
    selectView('overview');
    setRendererVersion((current) => current + 1);
  };

  return (
    <main className="garden-app" data-render-status={renderStatus} data-current-view={activeId ?? 'free'}>
      <header className="masthead">
        <div className="identity">
          <div className="garden-seal" aria-hidden="true">{UI_CONTENT.seal[0]}<span>{UI_CONTENT.seal.slice(1)}</span></div>
          <div>
            <p className="english-title">{UI_CONTENT.englishTitle}</p>
            <h1>{UI_CONTENT.title}</h1>
          </div>
        </div>
        <div className="header-navigation"><a className="map-return" href={getMapHref(window.location.href)} data-testid="return-map"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 4.5 7 2l6 2.5L18 2v13.5L13 18l-6-2.5L2 18V4.5ZM7 2v13.5M13 4.5V18" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg><span>返回地图</span></a><div className="edition">
          <p className="edition-location">{UI_CONTENT.location}<span />{UI_CONTENT.milestone}</p>
          <p className="edition-introduction">{UI_CONTENT.introduction}</p>
        </div></div>
      </header>

      <section className="garden-stage" data-testid="garden-stage" aria-label={UI_CONTENT.stageLabel} aria-describedby="interaction-hint">
        <GardenCanvas key={rendererVersion} viewId={viewId} requestId={requestId} onViewChange={onViewChange} onStatus={onStatus} />
        <div className={`render-status render-status--${renderStatus}`} role="status" aria-live="polite">
          <span className="status-dot" />
          {renderStatus === 'error' ? UI_CONTENT.errorStatus : renderStatus === 'ready' ? UI_CONTENT.ready : UI_CONTENT.loading}
        </div>
        {renderStatus === 'loading' && !hasRendered && (
          <div className="stage-loading" aria-hidden="true"><span className="loading-ring" /><p>{UI_CONTENT.loading}</p></div>
        )}
        {renderStatus === 'error' && (
          <div className="stage-error" role="alert">
            <div className="error-card">
              <p className="error-kicker">{UI_CONTENT.romanName}</p>
              <h2>{UI_CONTENT.errorTitle}</h2>
              <p>{errorMessage || UI_CONTENT.errorDescription}</p>
              {errorMessage && <p>{UI_CONTENT.errorDescription}</p>}
              <button type="button" className="retry-button" onClick={retry}>{UI_CONTENT.retry}</button>
            </div>
          </div>
        )}
      </section>

      <section className="view-panel" aria-label={UI_CONTENT.presetHeading}>
        <div className="view-summary" aria-live="polite" aria-atomic="true">
          <p className="section-eyebrow">{UI_CONTENT.currentView}<span className="summary-line" /></p>
          <h2 data-testid="current-view-name">{currentView?.label ?? UI_CONTENT.freeView}</h2>
          <p className="view-description">{currentView?.description ?? UI_CONTENT.freeDescription}</p>
        </div>
        <div className="view-navigation">
          <div className="view-buttons">
            {VIEW_PRESETS.map((view, index) => (
              <button
                key={view.id}
                className={`view-button${activeId === view.id ? ' is-active' : ''}`}
                type="button"
                data-testid={`view-${view.id}`}
                aria-pressed={activeId === view.id}
                onClick={() => selectView(view.id)}
              >
                <span className="view-button-top"><span className="view-number">0{index + 1}</span></span>
                <span className="view-button-label">{view.label}</span>
                <span className="view-button-eyebrow">{view.eyebrow}</span>
              </button>
            ))}
          </div>
          <div className="interaction-bar">
            <p className="interaction-hint" id="interaction-hint"><OrbitIcon /><span className="desktop-hint">{UI_CONTENT.desktopHint}</span><span className="touch-hint">{UI_CONTENT.touchHint}</span></p>
            <button type="button" className="reset-button" data-testid="reset-view" onClick={() => selectView('overview')}><ResetIcon />{UI_CONTENT.reset}</button>
          </div>
        </div>
      </section>

      <MusicPanel />

      <footer className="art-notice">
        <p>{UI_CONTENT.artNotice}<span className="placeholder-notice">{UI_CONTENT.placeholderNotice}</span></p>
        <span className="edition-mark" aria-hidden="true">{UI_CONTENT.edition}</span>
      </footer>
    </main>
  );
}
