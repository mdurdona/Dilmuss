const COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  ARCHIVED: "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300",
  INACTIVE: "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300",
  BLOCKED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  PENDING_PAYMENT: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  MANUAL_REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  CONFIRMED: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  PROCESSING: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  PACKED: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  SHIPPED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  DELIVERED: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  PAID: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const DEFAULT_COLOR = "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${COLORS[status] ?? DEFAULT_COLOR}`}>
      {status}
    </span>
  );
}
