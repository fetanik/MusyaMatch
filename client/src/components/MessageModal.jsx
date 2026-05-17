import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, Info, HelpCircle } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  confirm: HelpCircle,
};

function MessageModal({ state, onClose, onAcknowledge, onConfirm }) {
  const { t } = useI18n();
  const { type, mode, title, text, confirmText, cancelText } = state;
  const Icon = ICONS[type] || ICONS.info;

  const defaultTitle =
    type === 'success'
      ? t('msg.successTitle')
      : type === 'error'
        ? t('msg.errorTitle')
        : type === 'confirm'
          ? t('msg.confirmTitle')
          : t('msg.infoTitle');

  const effectiveTitle = title || defaultTitle;
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

  if (typeof document === 'undefined') return null;

  return createPortal(
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
                <p className="mm-subtitle">{t('msg.confirmSubtitle')}</p>
              )}
            </div>
          </div>

          <button type="button" className="mm-close-btn" onClick={onClose} aria-label={t('msg.close')}>
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
                {cancelText || t('msg.cancel')}
              </button>
              <button
                type="button"
                className={`mm-btn mm-btn--primary mm-btn--${type}`}
                onClick={() => onConfirm(true)}
              >
                {confirmText || t('msg.ok')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`mm-btn mm-btn--primary mm-btn--${type}`}
              onClick={onAcknowledge}
            >
              {t('msg.ok')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default MessageModal;
