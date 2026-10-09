import { useCallback, useEffect, useRef } from 'react';
import { isAndroid, isIos } from '../utils/platform';

interface ReportPreviewModalProps {
  title: string;
  html: string | null;
  loading: boolean;
  onClose: () => void;
}

export default function ReportPreviewModal({
  title,
  html,
  loading,
  onClose,
}: ReportPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  const handlePrint = useCallback(() => {
    const frameWindow = iframeRef.current?.contentWindow;
    if (!frameWindow) return;
    frameWindow.focus();
    frameWindow.print();
  }, []);

  const saveButtonLabel = isAndroid() ? 'Guardar como PDF' : 'Guardar / Imprimir PDF';

  return (
    <div className="report-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
      <header className="report-preview-toolbar">
        <h2 id="report-preview-title" className="report-preview-title">{title}</h2>
        <div className="report-preview-actions">
          {html && (
            <button type="button" className="btn btn-primary" onClick={handlePrint}>
              {saveButtonLabel}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </header>

      {isIos() && html && (
        <p className="report-preview-hint">
          En iPhone: pulsa el botón de guardar y usa «Guardar en Archivos» o «Compartir» en el menú de impresión.
        </p>
      )}
      {isAndroid() && html && (
        <p className="report-preview-hint">
          En Android: pulsa «Guardar como PDF», elige <strong>Guardar como PDF</strong> como impresora (arriba del
          diálogo), confirma con el icono de descargar. El archivo irá a <strong>Descargas</strong>; para compartirlo,
          ábrelo desde Archivos o Descargas y usa Compartir.
        </p>
      )}

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
