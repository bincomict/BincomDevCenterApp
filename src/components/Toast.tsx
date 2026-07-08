import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

type ToastListener = (toasts: ToastMessage[]) => void;
const listeners = new Set<ToastListener>();
let toastList: ToastMessage[] = [];

const notifyListeners = () => {
  listeners.forEach((listener) => listener([...toastList]));
};

export const toast = {
  success(message: string) {
    const id = Math.random().toString(36).substring(2, 9);
    toastList.push({ id, type: "success", message });
    notifyListeners();
    setTimeout(() => this.dismiss(id), 4000);
  },
  error(message: string) {
    const id = Math.random().toString(36).substring(2, 9);
    toastList.push({ id, type: "error", message });
    notifyListeners();
    setTimeout(() => this.dismiss(id), 5000);
  },
  info(message: string) {
    const id = Math.random().toString(36).substring(2, 9);
    toastList.push({ id, type: "info", message });
    notifyListeners();
    setTimeout(() => this.dismiss(id), 4000);
  },
  dismiss(id: string) {
    toastList = toastList.filter((t) => t.id !== id);
    notifyListeners();
  }
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleChange = (newToasts: ToastMessage[]) => {
      setToasts(newToasts);
    };
    listeners.add(handleChange);
    setToasts([...toastList]);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none" id="global-toast-container">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }}
            className={`pointer-events-auto p-4 rounded-xl border shadow-lg flex items-start gap-3 bg-white text-gray-800 ${
              t.type === "success"
                ? "border-emerald-200 bg-emerald-50/95"
                : t.type === "error"
                ? "border-rose-200 bg-rose-50/95"
                : "border-blue-200 bg-blue-50/95"
            }`}
            layout
          >
            {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {t.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            {t.type === "info" && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}

            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {t.message}
            </div>

            <button
              onClick={() => toast.dismiss(t.id)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
