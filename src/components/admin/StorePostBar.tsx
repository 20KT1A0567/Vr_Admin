import { MapPin, Plus, Star, Store, Users } from "lucide-react";
import { ActionButton } from "components/admin/ActionButton";

interface StorePostBarProps {
  activeCount: number;
  averageRating: string;
  onPostStore: () => void;
  reviewCount: number;
  totalCount: number;
}

export function StorePostBar({ activeCount, averageRating, onPostStore, reviewCount, totalCount }: StorePostBarProps) {
  return (
    <section className="admin-shell px-6 py-5 lg:px-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="admin-pill">Stores</div>
          <h1 className="admin-display mt-3 text-3xl font-extrabold text-slate-950 lg:text-4xl">Branch directory</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage branch identity, Google trust signals, and storefront-ready store cards.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <ActionButton className="self-start xl:self-end" icon={<Plus className="h-4 w-4" />} onClick={onPostStore}>
            Post store
          </ActionButton>
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {[
              { label: "Total stores", value: totalCount, icon: Store },
              { label: "Active", value: activeCount, icon: MapPin },
              { label: "Avg rating", value: averageRating, icon: Star },
              { label: "Reviews", value: reviewCount, icon: Users }
            ].map((item) => (
              <article key={item.label} className="admin-shell-muted min-w-[150px] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="admin-section-label">{item.label}</div>
                    <div className="mt-1 text-3xl font-extrabold text-slate-950">{item.value}</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                    <item.icon className="h-4 w-4" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
