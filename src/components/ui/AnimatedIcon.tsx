"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import UseAnimations, { type Animation, type Interaction } from "react-useanimations";
import type { AnimationProps, EventProps } from "react-useanimations";

export type { Animation as AnimatedIconData } from "react-useanimations";

/**
 * Animated icon from react-useanimations (useanimations.com, MIT, Feather style like lucide).
 * Import one icon at a time so each adds ~2 kB:
 *   import thumbUp from "react-useanimations/lib/thumbUp";
 *   <Button icon={thumbUp}>Support</Button>          // Button / LinkButton accept it as `icon`
 *   <AnimatedIcon animation={notification} size={22} />
 *
 * - `size` is the glyph size, same as lucide's `size` (the Lottie frame has padding, so the
 *   box is drawn 4/3 larger with a negative margin to keep layout identical).
 * - Hover / focus / click on the nearest button or link plays it, not only the icon itself.
 * - Colour follows `currentColor`. Reduced motion is respected by the player.
 * Use for feedback and status only (support, RSVP, send, bell, loading). Keep SOS static.
 */
export function AnimatedIcon({
  animation,
  size = 20,
  active,
  interaction,
  label,
  className = "",
}: {
  animation: Animation;
  size?: number;
  /** For click-toggle icons (thumbUp, star…): true shows the end state. */
  active?: boolean;
  interaction?: Interaction;
  /** Only when the icon is the sole content; otherwise it stays hidden from screen readers. */
  label?: string;
  className?: string;
}) {
  const box = Math.round((size * 4) / 3);
  const inset = -Math.round((box - size) / 2);
  return (
    <UseAnimations
      animation={animation}
      size={box}
      active={active}
      interaction={interaction}
      aria-label={label}
      className={`flex-none ${className}`}
      style={{ margin: inset }}
      render={(eventProps, animationProps) => <Bridge eventProps={eventProps} animationProps={animationProps} />}
    />
  );
}

const EVENTS = [
  ["click", "onClick"],
  ["mouseenter", "onMouseEnter"],
  ["mouseleave", "onMouseLeave"],
  ["pointerenter", "onPointerEnter"],
  ["focus", "onFocus"],
  ["blur", "onBlur"],
] as const;

/** Wires the player's handlers to the closest interactive parent, or to the icon when there is none. */
function Bridge({ eventProps, animationProps }: { eventProps: EventProps; animationProps: AnimationProps }) {
  const latest = useRef(eventProps);
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [host, setHost] = useState<HTMLElement | null | undefined>(undefined);

  useEffect(() => {
    latest.current = eventProps;
  });

  useEffect(() => {
    if (!node) return;
    const parent = node.parentElement?.closest<HTMLElement>("button, a, [role='button'], label") ?? null;
    // Measured after mount; the effect runs once per node.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHost(parent);
    if (!parent) return;
    const handlers = EVENTS.map(([type, key]) => {
      const handler = (event: Event) => (latest.current[key] as unknown as (e: Event) => void)(event);
      parent.addEventListener(type, handler);
      return [type, handler] as const;
    });
    return () => handlers.forEach(([type, handler]) => parent.removeEventListener(type, handler));
  }, [node]);

  const { ref, ...rest } = animationProps;
  const attach = useCallback(
    (el: HTMLElement | null) => {
      ref(el);
      setNode(el);
    },
    [ref],
  );
  return <span {...rest} {...(host === null ? eventProps : {})} ref={attach} />;
}
