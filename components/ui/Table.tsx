import { ReactNode } from "react";

interface TableProps {
  children: ReactNode;
  className?: string;
}

export default function Table({ children, className = "" }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-[#27272A] ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <thead className={`bg-[#0A0A0F]/60 ${className}`}>{children}</thead>;
}

export function TableBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tbody className={`divide-y divide-[#27272A] ${className}`}>
      {children}
    </tbody>
  );
}

export function TableRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={`hover:bg-white/[0.02] transition-colors ${className}`}>
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-6 py-3 text-left text-xs font-medium text-[#71717A] uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-6 py-4 whitespace-nowrap text-sm text-[#A1A1AA] ${className}`}>
      {children}
    </td>
  );
}
