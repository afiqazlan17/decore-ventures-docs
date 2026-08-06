"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export default function MoneyInput({ value, onChange, placeholder, className }: Props) {
  return (
    <div className={`flex items-center border border-terracotta/25 rounded-md bg-white overflow-hidden focus-within:border-terracotta ${className || ""}`}>
      <span className="px-2.5 text-sm font-semibold text-terracotta bg-terracotta/10 self-stretch flex items-center">RM</span>
      <input
        type="number"
        step="0.01"
        className="flex-1 min-w-0 px-2.5 py-2 text-sm outline-none"
        placeholder={placeholder || "0.00"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
