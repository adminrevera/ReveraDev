"use client";

import { useFormStatus } from "react-dom";

export default function AdminSubmitButton({
  children,
  name,
  value,
  disabled = false,
  className,
}: {
  children: React.ReactNode;
  name?: string;
  value?: string;
  disabled?: boolean;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      name={name}
      value={value}
      disabled={disabled || pending}
    >
      {pending ? "En cours…" : children}
    </button>
  );
}
