import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  icon: LucideIcon;
  iconBgColor?: string;
  iconTextColor?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  cancelText?: string;
  confirmText: string;
  onConfirm: () => void;
  isConfirming?: boolean;
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  confirmDisabled?: boolean;
}

export function ActionModal({
  isOpen,
  onClose,
  icon: Icon,
  iconBgColor = "bg-emerald-50",
  iconTextColor = "text-emerald-600",
  title,
  subtitle,
  children,
  cancelText = "Batal",
  confirmText,
  onConfirm,
  isConfirming = false,
  confirmVariant = "default",
  confirmDisabled = false,
}: ActionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white border border-border rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBgColor}`}>
            <Icon className={`w-5 h-5 ${iconTextColor}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="mb-6">
          {children}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onClose}
            disabled={isConfirming}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            className="flex-1"
            onClick={onConfirm}
            disabled={isConfirming || confirmDisabled}
          >
            {isConfirming ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Memproses...</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
