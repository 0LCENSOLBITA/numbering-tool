import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { Check, X } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider duration={3500}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const isSuccess = typeof title === "string" && title.toLowerCase().includes("successfully");
        const isDestructive = props.variant === "destructive";

        return (
          <Toast key={id} {...props}>
            <div className="flex items-center gap-2">
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
              {isDestructive ? null : isSuccess ? (
                <div className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-green-500">
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </div>
              ) : null}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
