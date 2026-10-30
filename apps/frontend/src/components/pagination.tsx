import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="mt-10 flex items-center justify-center gap-2">
      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
            p === page ? "bg-brand text-white" : "text-ink/70 hover:bg-brand-light"
          }`}
        >
          {p}
        </Link>
      ))}
    </div>
  );
}
