import React from "react";
import { FileText, LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ 
  icon: Icon = FileText, 
  title, 
  description, 
  className = "" 
}: EmptyStateProps) {
  return (
    <div className={`text-center py-16 ${className}`}>
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-foreground font-semibold">
        {title}
      </p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">
          {description}
        </p>
      )}
    </div>
  );
}
