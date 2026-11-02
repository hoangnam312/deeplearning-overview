"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>(
  function IconButton({ label, className = "", children, ...props }, ref) {
    return <button ref={ref} type="button" aria-label={label} title={label} className={`icon-button ${className}`} {...props}>{children}</button>;
  },
);
