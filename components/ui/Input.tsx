import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-2.5 bg-[#0A0A0F] border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200 text-white placeholder:text-[#52525B] ${
            error
              ? "border-red-600/50 focus:ring-red-500 focus:border-red-500"
              : "border-[#27272A] focus:ring-red-600 focus:border-red-600 hover:border-[#3F3F46]"
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-[#52525B]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
