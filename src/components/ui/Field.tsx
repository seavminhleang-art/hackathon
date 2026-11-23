"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Form fields with label, hint and error built in. Pass `error` from ApiError.field.
 * Inputs are 48px tall, 16px text (prevents iOS zoom), rounded 12px.
 */
const CONTROL =
  "w-full rounded-xl bg-surface px-3.5 text-base text-ink ring-1 ring-inset ring-line-strong placeholder:text-ink-muted focus:ring-2 focus:ring-primary focus:outline-none aria-invalid:ring-2 aria-invalid:ring-danger disabled:bg-sand-deep";

function Wrap({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body font-semibold text-ink">
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-muted">({optional})</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-meta font-medium text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-msg`} className="text-meta text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type FieldProps = { label: string; hint?: string; error?: string; optional?: string };

/** Only point aria-describedby at the message when one is rendered. */
const describedBy = (fid: string, hint?: string, error?: string) => (error || hint ? `${fid}-msg` : undefined);

/**
 * Text input. `prefix` shows fixed text inside the field (e.g. "+855");
 * `trailing` puts a control at the right edge (e.g. a Show password button).
 */
export function TextField({
  label,
  hint,
  error,
  optional,
  id,
  prefix,
  trailing,
  ...rest
}: FieldProps & { prefix?: string; trailing?: ReactNode } & ComponentProps<"input">) {
  const auto = useId();
  const fid = id ?? auto;
  const input = (
    <input
      id={fid}
      aria-invalid={!!error || undefined}
      aria-describedby={describedBy(fid, hint, error)}
      className={`${CONTROL} min-h-13 ${prefix ? "pl-[4.75rem]" : ""} ${trailing ? "pr-28" : ""}`}
      {...rest}
    />
  );
  return (
    <Wrap id={fid} label={label} hint={hint} error={error} optional={optional}>
      {prefix || trailing ? (
        <div className="relative">
          {prefix && (
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-3 pl-3.5 text-body font-semibold text-ink-muted">
              {prefix}
              <span className="h-6 w-px bg-line-strong" />
            </span>
          )}
          {input}
          {trailing && <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>}
        </div>
      ) : (
        input
      )}
    </Wrap>
  );
}

/** Password with a Show / Hide toggle (no "confirm password" needed). */
export function PasswordField(props: FieldProps & Omit<ComponentProps<"input">, "type">) {
  const { t } = useLocale();
  const [shown, setShown] = useState(false);
  return (
    <TextField
      {...props}
      type={shown ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-label={shown ? t.hidePassword : t.showPassword}
          className="flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-meta font-semibold text-primary hover:bg-primary-tint"
        >
          {shown ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
          {shown ? t.hidePasswordShort : t.showPasswordShort}
        </button>
      }
    />
  );
}

export function TextArea({ label, hint, error, optional, id, ...rest }: FieldProps & ComponentProps<"textarea">) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Wrap id={fid} label={label} hint={hint} error={error} optional={optional}>
      <textarea id={fid} rows={4} aria-invalid={!!error || undefined} aria-describedby={describedBy(fid, hint, error)} className={`${CONTROL} py-3`} {...rest} />
    </Wrap>
  );
}

export function SelectField({ label, hint, error, optional, id, children, ...rest }: FieldProps & ComponentProps<"select">) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Wrap id={fid} label={label} hint={hint} error={error} optional={optional}>
      <div className="relative">
        <select
          id={fid}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy(fid, hint, error)}
          className={`${CONTROL} min-h-13 appearance-none pr-10`}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown aria-hidden size={18} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-muted" />
      </div>
    </Wrap>
  );
}

/**
 * Big tappable choice (category pickers, incident type). Use in a grid.
 * Works as a radio: give all options the same `name`.
 */
export function ChoiceCard({
  label,
  description,
  icon,
  ...rest
}: { label: string; description?: string; icon?: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl bg-surface p-3 ring-1 ring-line-strong ring-inset has-checked:bg-primary-tint has-checked:ring-2 has-checked:ring-primary has-focus-visible:outline-3 has-focus-visible:outline-gold">
      <input type="radio" className="sr-only" {...rest} />
      {icon}
      <span className="min-w-0">
        <span className="block text-body font-semibold text-ink">{label}</span>
        {description && <span className="block text-meta text-ink-muted">{description}</span>}
      </span>
    </label>
  );
}
