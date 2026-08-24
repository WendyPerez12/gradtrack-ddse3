"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

const controlClass =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint disabled:bg-surface-muted";

export function Field({
  label,
  error,
  hint,
  required,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required ? <span className="ml-0.5 text-risk">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-ink-faint">{hint}</p> : null}
      {error ? (
        <p className="text-xs font-medium text-risk" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  label,
  error,
  hint,
  required,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={props.id ?? id}>
      <input
        id={props.id ?? id}
        aria-invalid={Boolean(error)}
        className={cn(controlClass, error && "border-risk", className)}
        {...props}
      />
    </Field>
  );
}

export function TextareaInput({
  label,
  error,
  hint,
  required,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={props.id ?? id}>
      <textarea
        id={props.id ?? id}
        aria-invalid={Boolean(error)}
        className={cn(controlClass, "min-h-20 resize-y", error && "border-risk", className)}
        {...props}
      />
    </Field>
  );
}

export function SelectInput({
  label,
  error,
  hint,
  required,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; hint?: string }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={props.id ?? id}>
      <select
        id={props.id ?? id}
        aria-invalid={Boolean(error)}
        className={cn(controlClass, error && "border-risk", className)}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
}

export function CheckboxInput({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <input
        id={props.id ?? id}
        type="checkbox"
        className={cn("size-4 rounded border-border-strong accent-[var(--color-brand)]", className)}
        {...props}
      />
      <label htmlFor={props.id ?? id} className="text-sm text-ink">
        {label}
      </label>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md bg-risk-soft px-3 py-2 text-sm text-risk" role="alert">
      {message}
    </p>
  );
}
