"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-right"
      visibleToasts={3}
      gap={10}
      duration={3200}
      closeButton
      expand={false}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="size-4" strokeWidth={2} />,
        info: <Info className="size-4" strokeWidth={2} />,
        warning: <AlertTriangle className="size-4" strokeWidth={2} />,
        error: <XCircle className="size-4" strokeWidth={2} />,
        loading: <Loader2 className="size-4 animate-spin" strokeWidth={2} />,
      }}
      toastOptions={{
        classNames: {
          toast: "sp-toast",
          title: "sp-toast-title",
          description: "sp-toast-desc",
          actionButton: "sp-toast-action",
          cancelButton: "sp-toast-cancel",
          closeButton: "sp-toast-close",
          success: "sp-toast-success",
          error: "sp-toast-error",
          warning: "sp-toast-warning",
          info: "sp-toast-info",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
