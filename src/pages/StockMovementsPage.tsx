import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function StockMovementsPage() {
  const { data: movements = [] } = useQuery({ queryKey: ["admin-stock-movements"], queryFn: adminApi.getStockMovements });

  async function handleExport() {
    try {
      downloadBlob(await adminApi.exportInventoryMovements(), "inventory-movements.csv");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to export inventory movements"));
    }
  }

  return (
    <div className="admin-card-elevated overflow-hidden rounded-[24px]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-6">
        <div>
          <div className="admin-pill">Inventory</div>
          <h1 className="mt-3 text-2xl font-black text-slate-950">Stock movement history</h1>
          <p className="mt-1 text-sm text-slate-500">Audit trail for restocks, adjustments, sale reservations, cancellations, and returns.</p>
        </div>
        <button type="button" className="admin-button-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="admin-table-head">
            <tr>
              <th className="px-5 py-3 text-left">Product</th>
              <th className="px-5 py-3 text-left">Type</th>
              <th className="px-5 py-3 text-right">Qty</th>
              <th className="px-5 py-3 text-right">Before</th>
              <th className="px-5 py-3 text-right">After</th>
              <th className="px-5 py-3 text-left">Reason</th>
              <th className="px-5 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.map((movement) => (
              <tr key={movement.id}>
                <td className="px-5 py-4 font-semibold text-slate-900">{movement.productTitle}</td>
                <td className="px-5 py-4 text-slate-600">{movement.movementType}</td>
                <td className="px-5 py-4 text-right font-black">{movement.quantity}</td>
                <td className="px-5 py-4 text-right">{movement.previousStock}</td>
                <td className="px-5 py-4 text-right">{movement.newStock}</td>
                <td className="px-5 py-4 text-slate-500">{movement.reason || "-"}</td>
                <td className="px-5 py-4 text-slate-500">{new Date(movement.createdAt).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
