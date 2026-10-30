"use client";

import { useState } from "react";
import { Button } from "@/components/button";

interface PaymentModalProps {
  provider: "PAYME" | "CLICK";
  amount: number;
  onSubmit: (cardData: { cardNumber: string; expiry: string }) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
  error?: string | null;
}

export function PaymentModal({ provider, amount, onSubmit, onClose, loading, error }: PaymentModalProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ cardNumber, expiry });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.slice(0, 2) + "/" + v.slice(2, 4);
    }
    return v;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 text-lg font-semibold text-ink">Karta ma'lumotlari</h2>

        <div className="mb-6 rounded-lg bg-brand-light px-4 py-3 text-center text-base font-medium text-brand">
          {provider === "PAYME" ? "Payme" : "Click"}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-2">Karta raqami</label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="0000 0000 0000 0000"
              className="input w-full"
              maxLength={19}
              required
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-2">Amal qilish muddati</label>
            <input
              type="text"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              placeholder="OO/YY"
              className="input w-full"
              maxLength={5}
              required
            />
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <Button
            type="submit"
            disabled={submitting || loading || cardNumber.length < 19 || expiry.length < 5}
            className="w-full"
          >
            {submitting ? "Yuborilmoqda..." : "To'lash"}
          </Button>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Buyurtmani bekor qilish
          </button>
        </form>
      </div>
    </div>
  );
}
