"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/button";
import { PaymentModal } from "@/components/payment-modal";
import { formatSom } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import type { DeliveryZoneQuote, OrderDto } from "@/lib/types";

const REGIONS = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Andijon viloyati",
  "Buxoro viloyati",
  "Farg'ona viloyati",
  "Jizzax viloyati",
  "Namangan viloyati",
  "Navoiy viloyati",
  "Qashqadaryo viloyati",
  "Qoraqalpog'iston Respublikasi",
  "Samarqand viloyati",
  "Sirdaryo viloyati",
  "Surxondaryo viloyati",
  "Xorazm viloyati",
];

type Step = 1 | 2 | 3;

export default function CheckoutPage() {
  const { cart, loading, refresh } = useCart();
  const { user, accessToken, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/register?redirect=/checkout");
  }, [authLoading, user, router]);

  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [region, setRegion] = useState(REGIONS[0]);
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [house, setHouse] = useState("");
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [provider, setProvider] = useState<"PAYME" | "CLICK">("PAYME");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDto | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    if (!region || !district) {
      setDeliveryFee(null);
      return;
    }
    const controller = new AbortController();
    apiGet<DeliveryZoneQuote>(`/deliveries/zones/quote?region=${encodeURIComponent(region)}&district=${encodeURIComponent(district)}`)
      .then((quote) => setDeliveryFee(quote.fee))
      .catch(() => setDeliveryFee(null));
    return () => controller.abort();
  }, [region, district]);

  if (loading || authLoading || !user) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted">Yuklanmoqda...</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl text-ink">Savatcha bo&apos;sh</h1>
        <Link href="/catalog" className="mt-6 inline-block">
          <Button>Katalogga qaytish</Button>
        </Link>
      </div>
    );
  }

  const total = cart.total + (deliveryFee ?? 0);

  async function handleCreateOrder() {
    setError(null);
    try {
      const newOrder = await apiPost<OrderDto>(
        "/orders/checkout",
        {
          cartId: cart!.id,
          customerName: fullName,
          customerPhone: phone,
          newAddress: { recipientName: fullName, phone, region, district, street, house },
          source: "WEBSITE",
        },
        accessToken ?? undefined,
      );
      setOrder(newOrder);
      setShowPaymentModal(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Buyurtmani rasmiylashtirishda xatolik yuz berdi");
    }
  }

  async function handlePayment(_cardData: { cardNumber: string; expiry: string }) {
    if (!order) return;
    setError(null);
    try {
      const payment = await apiPost<{ paymentId: string }>(`/orders/${order.id}/pay`, { provider });
      await apiPost(`/payments/${payment.paymentId}/demo-confirm`);

      await refresh();
      const params = new URLSearchParams({
        orderNumber: order.orderNumber,
        total: String(order.total),
        subtotal: String(order.subtotal),
        delivery: String(order.deliveryFee),
      });
      router.push(`/checkout/success?${params.toString()}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "To'lovda xatolik yuz berdi");
    }
  }

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="mb-8 font-display text-3xl text-ink">Buyurtmani rasmiylashtirish</h1>

        <div className="mb-8 flex items-center gap-4 text-sm">
          {(["Shaxsiy ma'lumotlar", "Yetkazib berish", "To'lov"] as const).map((label, index) => {
            const stepNum = (index + 1) as Step;
            return (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                    step >= stepNum ? "bg-brand text-white" : "bg-brand-light text-brand"
                  }`}
                >
                  {stepNum}
                </span>
                <span className={step === stepNum ? "text-ink" : "text-muted"}>{label}</span>
                {stepNum < 3 && <span className="h-px w-8 bg-line" />}
              </div>
            );
          })}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {step === 1 && (
              <div className="space-y-4 rounded-xl border border-line bg-surface p-6">
                <h2 className="text-sm font-semibold text-ink">Shaxsiy ma&apos;lumotlar</h2>
                <Field label="To'liq ism *">
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input"
                    placeholder="Ismingizni kiriting"
                  />
                </Field>
                <Field label="Telefon raqam *">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input"
                    placeholder="+998 90 123 45 67"
                  />
                </Field>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!fullName || !phone}
                  className="w-full sm:w-auto"
                >
                  Davom etish →
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 rounded-xl border border-line bg-surface p-6">
                <h2 className="text-sm font-semibold text-ink">Yetkazib berish manzili</h2>
                <Field label="Viloyat *">
                  <select value={region} onChange={(e) => setRegion(e.target.value)} className="input">
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tuman *">
                  <input
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="input"
                    placeholder="Tuman nomi"
                  />
                </Field>
                <Field label="Ko'cha, uy">
                  <input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="input"
                    placeholder="Ko'cha nomi"
                  />
                </Field>
                <Field label="Uy raqami">
                  <input value={house} onChange={(e) => setHouse(e.target.value)} className="input" placeholder="10" />
                </Field>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    ← Orqaga
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={!district}>
                    Davom etish →
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 rounded-xl border border-line bg-surface p-6">
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-ink">To'lov usuli</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {(["PAYME", "CLICK"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setProvider(p)}
                        className={`rounded-2xl px-6 py-3 text-base font-medium transition ${
                          provider === p 
                            ? "bg-brand-light text-brand border-2 border-brand-light" 
                            : "border-2 border-line text-ink/70 hover:border-brand/20 bg-white"
                        }`}
                      >
                        {p === "PAYME" ? "Payme" : "Click"}
                      </button>
                    ))}
                  </div>
                </div>
                {error && <p className="text-sm font-medium text-red-600">{error}</p>}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="px-6">
                    ← Orqaga
                  </Button>
                  <Button onClick={handleCreateOrder} className="flex-1">
                    To'lovga o'tish →
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="h-fit space-y-3 rounded-xl border border-line bg-surface p-6">
            <h2 className="text-sm font-semibold text-ink">Buyurtma xulosasi</h2>
            <div className="max-h-56 space-y-2 overflow-y-auto text-sm">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between text-muted">
                  <span>
                    {item.productName} ({item.quantity} dona)
                  </span>
                  <span>{formatSom(item.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-line pt-3 text-sm text-muted">
              <div className="flex justify-between">
                <span>Jami</span>
                <span>{formatSom(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Yetkazib berish</span>
                <span>{deliveryFee != null ? formatSom(deliveryFee) : "—"}</span>
              </div>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold text-ink">
              <span>Umumiy summa</span>
              <span>{formatSom(total)}</span>
            </div>
            <Link href="/cart" className="block text-center text-xs text-muted hover:text-brand">
              ← Savatga qaytish
            </Link>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          provider={provider}
          amount={total}
          onSubmit={handlePayment}
          onClose={() => {
            setShowPaymentModal(false);
            setOrder(null);
          }}
          error={error}
        />
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}
