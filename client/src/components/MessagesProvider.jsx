import React, { useCallback, useMemo, useRef, useState } from 'react';
import MessageModal from './MessageModal';
import { MessagesContext } from './MessagesContext';
import '../styles/MessageModal.css';

function MessagesProvider({ children }) {
  const resolverRef = useRef(null);
  const messageResolverRef = useRef(null);
  const timerRef = useRef(null);

  const [state, setState] = useState({
    open: false,
    mode: 'message', // 'message' | 'confirm'
    type: 'info', // 'success' | 'error' | 'info'
    title: '',
    text: '',
    autoCloseMs: null,
    confirmText: '',
    cancelText: '',
  });

  const close = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (resolverRef.current) {
      // For confirm modal, a close without explicit action means "cancel".
      resolverRef.current(false);
      resolverRef.current = null;
    }

    if (messageResolverRef.current) {
      messageResolverRef.current();
      messageResolverRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      open: false,
    }));
  }, []);

  const confirm = useCallback((text, options = {}) => {
    const {
      type = 'confirm',
      title = '',
      confirmText = 'OK',
      cancelText = 'Cancel',
    } = options;

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setState({
      open: true,
      mode: 'confirm',
      type,
      title,
      text,
      autoCloseMs: null,
      confirmText,
      cancelText,
    });

    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const notify = useCallback((text, options = {}) => {
    const {
      type = 'info',
      title = '',
      autoCloseMs = null,
    } = options;

    if (resolverRef.current) {
      // If confirm is currently open, don't allow two dialogs at once.
      resolverRef.current(false);
      resolverRef.current = null;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setState({
      open: true,
      mode: 'message',
      type,
      title,
      text,
      autoCloseMs,
      confirmText: '',
      cancelText: '',
    });

    return new Promise((resolve) => {
      messageResolverRef.current = resolve;

      // Note: auto-close is supported; it will call close(), which resolves the message promise.
      if (autoCloseMs && typeof autoCloseMs === 'number') {
        timerRef.current = window.setTimeout(() => {
          close();
        }, autoCloseMs);
      }
    });
  }, [close]);

  const onConfirm = useCallback(
    (result) => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (resolverRef.current) {
        resolverRef.current(result);
        resolverRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        open: false,
      }));
    },
    [setState]
  );

  const value = useMemo(
    () => ({
      notify,
      confirm,
    }),
    [notify, confirm]
  );

  return (
    <MessagesContext.Provider value={value}>
      {children}
      <MessageModal state={state} onClose={close} onConfirm={onConfirm} />
    </MessagesContext.Provider>
  );
}

export default MessagesProvider;

