import React, { useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const typeToUi = {
  success: { icon: CheckCircle2, title: 'Успіх' },
  error: { icon: XCircle, title: 'Помилка' },
  info: { icon: Info, title: 'Інформація' },
};

function MessageModal({ state, onClose, onConfirm }) {
  const { type, mode, title, text, confirmText, cancelText } = state;
  const ui = typeToUi[type] || typeToUi.info;
  const Icon = ui.icon;

  const effectiveTitle = title || ui.title;
  const overlayRef = useRef(null);

  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    if (!state.open) return undefined;

    const onDocumentKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onDocumentKeyDown);
    overlayRef.current?.focus?.();

    return () => {
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [onClose, state.open]);

  if (!state.open) return null;

  return (
    <div
      className="mm-overlay"
      role="presentation"
      onMouseDown={onBackdropClick}
      ref={overlayRef}
      tabIndex={0}
    >
      <div
        className={`mm-card mm-card--${type}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mm-title"
      >
        <div className="mm-head">
          <div className="mm-head-left">
            <div className="mm-icon-wrap" aria-hidden="true">
              <Icon size={20} />
            </div>
            <div className="mm-titles">
              <h3 id="mm-title" className="mm-title">
                {effectiveTitle}
              </h3>
              {mode === 'message' ? null : (
                <p className="mm-subtitle">Підтвердіть дію</p>
              )}
            </div>
          </div>

          <button type="button" className="mm-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="mm-body">
          <p className="mm-text">{text}</p>
        </div>

        <div className="mm-actions">
          {mode === 'confirm' ? (
            <>
              <button type="button" className="mm-btn mm-btn--secondary" onClick={() => onConfirm(false)}>
                {cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                className={`mm-btn mm-btn--primary mm-btn--${type}`}
                onClick={() => onConfirm(true)}
              >
                {confirmText || 'OK'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`mm-btn mm-btn--primary mm-btn--${type}`}
              onClick={onClose}
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageModal;

