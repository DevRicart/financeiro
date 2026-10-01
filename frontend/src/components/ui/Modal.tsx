import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg dark:bg-noite-clara">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-tinta dark:text-papel">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-cinza hover:bg-nevoa dark:text-papel/70 dark:hover:bg-noite-borda"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
