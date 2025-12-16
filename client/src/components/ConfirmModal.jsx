import React from 'react';

const ConfirmModal = ({
  isOpen,
  title = 'Konfirmasi',
  description,
  children,
  onCancel,
  onConfirm,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  isBusy = false,
  // Use a neutral busy label by default; callers can override (e.g., 'Menghapus...')
  busyLabel = 'Memproses...',
  // Allow overriding confirm button classes if needed (default keeps 'danger' style)
  confirmClassName = 'btn btn-error'
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        {description && (
          <p className="py-2 text-sm text-gray-700">{description}</p>
        )}
        {children}
        <div className="modal-action mt-4">
          <button className="btn" onClick={onCancel} disabled={isBusy}>{cancelLabel}</button>
          <button className={confirmClassName} onClick={onConfirm} disabled={isBusy}>{isBusy ? busyLabel : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
