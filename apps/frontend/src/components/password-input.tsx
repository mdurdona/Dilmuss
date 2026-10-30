"use client";

import { useState, type InputHTMLAttributes } from "react";

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`input pr-10 ${props.className ?? ""}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Parolni yashirish" : "Parolni ko'rsatish"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-brand"
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 3l18 18" strokeLinecap="round" />
            <path d="M10.6 10.6a2.5 2.5 0 0 0 3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M6.6 6.7C4.5 8.1 3 10 2 12c1.6 3.5 5 7 10 7 1.8 0 3.4-.4 4.8-1.2M9.9 4.3A10.6 10.6 0 0 1 12 4c5 0 8.4 3.5 10 7-.5 1.1-1.2 2.2-2.1 3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M2 12c1.6-3.5 5-7 10-7s8.4 3.5 10 7c-1.6 3.5-5 7-10 7s-8.4-3.5-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
