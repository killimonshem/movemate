import React, { useEffect, useId, useRef } from 'react';

export const CarIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-14 0a2 2 0 012-2h10a2 2 0 012 2m0 0v2m0-2a2 2 0 012 2v2m-2 2h.01M9 12h.01M9 16h.01M9 20h.01M15 12h.01M15 16h.01M15 20h.01"
    />
  </svg>
);

export const PhoneIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
);

export const ArrowRightIcon = ({ className = '' }) => (
  <svg
    className={className}
    style={{ width: '20px', height: '20px' }}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export const ArrowLeftIcon = ({ className = '' }) => (
  <svg
    className={className}
    style={{ width: '20px', height: '20px' }}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

export const CheckIcon = ({ className = '', style = {} }) => (
  <svg
    className={className}
    style={{ width: '20px', height: '20px', ...style }}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export const AlertIcon = ({ className = '' }) => (
  <svg
    className={className}
    style={{ width: '16px', height: '16px' }}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
    />
  </svg>
);

export const LockIcon = ({ className = '' }) => (
  <svg
    className={className}
    style={{ width: '16px', height: '16px' }}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

export const SearchIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

export const RefreshIcon = ({ className = '' }) => (
  <svg
    className={className}
    style={{ width: '16px', height: '16px' }}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

export const SendIcon = ({ className = '', style = {} }) => (
  <svg
    className={className}
    style={{ width: '16px', height: '16px', ...style }}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
    />
  </svg>
);

export const VenueIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

export const VanIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="7" width="13" height="10" rx="2" strokeWidth="1.5" />
    <path
      d="M16 11h2.5a1 1 0 01.95.684l1.1 3.3A1 1 0 0120.6 16H19"
      strokeWidth="1.5"
    />
    <circle cx="7.5" cy="17" r="1.5" strokeWidth="1.5" />
    <circle cx="17.5" cy="17" r="1.5" strokeWidth="1.5" />
  </svg>
);

export const SettingsIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

export const Toast = ({ message, type = 'success', onClose }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => {
      onCloseRef.current?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, [message, type]);

  return (
    <div className={`toast toast-${type}`} role="status" aria-live="polite">
      {type === 'success' ? <CheckIcon /> : <AlertIcon />}
      <span>{message}</span>
    </div>
  );
};

export const Modal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmDisabled = false,
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !confirmDisabled) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, confirmDisabled]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => !confirmDisabled && onClose()}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="modal-dialog-title" className="modal-title">
          {title}
        </h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button
            type="button"
            className="modal-button modal-button-secondary"
            onClick={onClose}
            disabled={confirmDisabled}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="modal-button modal-button-primary"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const BackButton = ({ onClick, text = 'Back', disabled = false }) => (
  <button type="button" className="back-button" onClick={onClick} disabled={disabled}>
    <ArrowLeftIcon />
    <span>{text}</span>
  </button>
);

export const InputField = ({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  success,
  maxLength,
  rightAdornment = null,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  const getInputClassName = () => {
    let className = 'input';
    if (error) className += ' input-error';
    else if (success) className += ' input-success';
    if (rightAdornment) className += ' input-with-right-adornment';
    else if (success) className += ' input-with-success-icon';
    return className;
  };

  return (
    <div className="input-container">
      <label className="label" htmlFor={inputId}>
        {label}
      </label>
      <div className="input-wrapper">
        <Icon className={`input-icon ${error ? 'error' : success ? 'success' : ''}`} />
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={getInputClassName()}
          maxLength={maxLength}
          {...props}
        />
        {rightAdornment ? (
          <div className="input-right-adornment">{rightAdornment}</div>
        ) : (
          success && <CheckIcon className="success-icon" />
        )}
      </div>
      {error && (
        <div className="error-message" role="alert" aria-live="assertive">
          <AlertIcon />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
