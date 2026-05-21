import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi, getApiErrorMessage } from "api/client";
import { PageHeader } from "components/admin/PageHeader";
import { StatCard } from "components/admin/StatCard";

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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Inventory Integrity"
        title="Movement Audit"
        description="Comprehensive audit trail for the inventory lifecycle. Monitor restocks, adjustments, reservations, and returns across the global warehouse."
        variant="premium"
        actions={
          <button 
            type="button" 
            className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-blue-50" 
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export Audit
          </button>
        }
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Traversal"
            value={String(movements.length)}
            meta="Audit trail entries"
            icon={<Download className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Replenishment"
            value={String(movements.filter(m => m.movementType === "RESTOCK").length)}
            meta="Inbound stock protocols"
            icon={<Download className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Adjustments"
            value={String(movements.filter(m => m.movementType === "ADJUSTMENT").length)}
            meta="Manual delta corrections"
            icon={<Download className="h-6 w-6" />}
            variant="glass"
          />
          <StatCard
            label="Audit State"
            value="Stable"
            meta="Core integrity status"
            icon={<Download className="h-6 w-6" />}
            variant="glass"
          />
        </div>
      </PageHeader>

      <section className="admin-card-elevated border-none bg-white p-0 shadow-2xl dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-col gap-6 border-b border-slate-100 bg-slate-50/50 px-10 py-8 dark:border-white/5 dark:bg-white/2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              Inventory Ledger
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Global Stock Registry</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Analyze the behavioral fingerprint of product availability.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Ledger Stream</span>
          </div>
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
      </section>
    </div>
  );
}
