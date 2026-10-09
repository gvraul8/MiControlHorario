import { useCallback, useEffect, useRef, useState } from 'react';
import { isIos } from '../utils/platform';

interface ReportPreviewModalProps {
  title: string;
  html: string | null;
  loading: boolean;
  fileBaseName: string;
  onClose: () => void;
}

export default function ReportPreviewModal({
  title,
  html,
  loading,
  fileBaseName,
  onClose,
}: ReportPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [canShareFile, setCanShareFile] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!html) {
      setCanShareFile(false);
      return;
    }
    setShareError(null);
    const probe = new File([html], `${fileBaseName}.html`, { type: 'text/html;charset=utf-8' });
    const canShare =
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [probe] });
    setCanShareFile(canShare);
  }, [html, fileBaseName]);

  const handlePrint = useCallback(() => {
    const frameWindow = iframeRef.current?.contentWindow;
    if (!frameWindow) return;
    frameWindow.focus();
    frameWindow.print();
  }, []);

  const handleShare = useCallback(async () => {
    if (!html) return;
    setShareError(null);
    const file = new File([html], `${fileBaseName}.html`, { type: 'text/html;charset=utf-8' });
    try {
      await navigator.share({
        files: [file],
        title,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setShareError(err instanceof Error ? err.message : 'No se pudo compartir');
    }
  }, [html, fileBaseName, title]);

  return (
    <div className="report-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
      <header className="report-preview-toolbar">
        <h2 id="report-preview-title" className="report-preview-title">{title}</h2>
        <div className="report-preview-actions">
          {html && (
            <>
              <button type="button" className="btn btn-primary" onClick={handlePrint}>
                Guardar / Imprimir PDF
              </button>
              {canShareFile && (
                <button type="button" className="btn btn-secondary" onClick={handleShare}>
                  Compartir
                </button>
              )}
            </>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </header>

      {isIos() && html && (
        <p className="report-preview-hint">
          En iPhone: pulsa «Guardar / Imprimir PDF» y elige «Guardar en Archivos» en el menú de impresión.
        </p>
      )}

      {shareError && <p className="report-preview-share-error">{shareError}</p>}

      <div className="report-preview-body">
        {loading && (
          <div className="report-preview-loading">
            <div className="spinner" aria-hidden="true" />
            <p>Generando informe…</p>
          </div>
        )}
        {html && (
          <iframe
            ref={iframeRef}
            className="report-preview-frame"
            title={title}
            srcDoc={html}
          />
        )}
      </div>
    </div>
  );
}
