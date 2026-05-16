import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  AtSign,
  Calendar,
  Heart,
  Inbox,
  IndianRupee,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  PackageX,
  Phone,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  UserCircle2
} from "lucide-react";
import { adminApi, getApiErrorMessage } from "api/client";
import { EmptyState } from "components/admin/EmptyState";
import { PageHeader } from "components/admin/PageHeader";
import { SkeletonLoader } from "components/admin/SkeletonLoader";
import { Tabs, type TabItem } from "components/admin/Tabs";
import type { Customer360 } from "types";

type TabKey =
  | "overview"
  | "orders"
  | "cart"
  | "wishlist"
  | "enquiries"
  | "returns"
  | "back-in-stock"
  | "addresses";

export function Customer360Page() {
  const params = useParams<{ id: string }>();
  const customerId = Number(params.id);
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("overview");

  const customerQuery = useQuery({
    queryKey: ["customer-360", customerId],
    queryFn: () => adminApi.getCustomer360(customerId),
    enabled: Number.isFinite(customerId)
  });

  const data = customerQuery.data;
  const tabItems = useMemo<TabItem<TabKey>[]>(() => {
    if (!data) {
      return [
        { value: "overview", label: "Overview" },
        { value: "orders", label: "Orders" },
        { value: "cart", label: "Cart" },
        { value: "wishlist", label: "Wishlist" },
        { value: "enquiries", label: "Enquiries" },
        { value: "returns", label: "Returns" },
        { value: "back-in-stock", label: "Back-in-stock" },
        { value: "addresses", label: "Addresses" }
      ];
    }
    return [
      { value: "overview", label: "Overview" },
      { value: "orders", label: "Orders", badge: data.summary.totalOrders || undefined },
      { value: "cart", label: "Cart", badge: data.summary.cartItemCount || undefined },
      { value: "wishlist", label: "Wishlist", badge: data.summary.wishlistItemCount || undefined },
      { value: "enquiries", label: "Enquiries", badge: data.enquiries.length || undefined },
      { value: "returns", label: "Returns", badge: data.returns.length || undefined },
      { value: "back-in-stock", label: "Back-in-stock", badge: data.backInStock.length || undefined },
      { value: "addresses", label: "Addresses", badge: data.addresses.length || undefined }
    ];
  }, [data]);

  if (customerQuery.isError) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <EmptyState
          icon={<UserCircle2 className="h-6 w-6" />}
          title="Customer not found"
          description={getApiErrorMessage(customerQuery.error, "We couldn't load this customer's profile.")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Commerce"
        title={data?.profile.name ?? "Customer profile"}
        description={data?.profile.email ?? data?.profile.phone ?? "Loading customer details…"}
        actions={
          <Link
            to="/customers"
            className="admin-button-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> All customers
          </Link>
        }
      />

      {customerQuery.isLoading || !data ? (
        <SkeletonLoader lines={6} />
      ) : (
        <>
          <ProfileBanner data={data} />
          <SummaryGrid summary={data.summary} />

          <Tabs value={tab} onChange={setTab} items={tabItems} />

          {tab === "overview" ? <OverviewSection data={data} setTab={setTab} /> : null}
          {tab === "orders" ? <OrdersSection orders={data.recentOrders} /> : null}
          {tab === "cart" ? <CartSection cart={data.cart} /> : null}
          {tab === "wishlist" ? <WishlistSection wishlist={data.wishlist} /> : null}
          {tab === "enquiries" ? <EnquiriesSection enquiries={data.enquiries} /> : null}
          {tab === "returns" ? <ReturnsSection returns={data.returns} /> : null}
          {tab === "back-in-stock" ? <BackInStockSection items={data.backInStock} /> : null}
          {tab === "addresses" ? <AddressesSection addresses={data.addresses} /> : null}
        </>
      )}
    </div>
  );
}

function ProfileBanner({ data }: { data: Customer360 }) {
  const { profile } = data;
  return (
    <section className="admin-surface flex flex-wrap items-center gap-5 rounded-3xl border border-[color:var(--color-border)] p-5">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[color:var(--admin-surface-muted)] text-[color:var(--color-accent)] ring-1 ring-[color:var(--color-border)]">
        {profile.profileImageUrl ? (
          <img src={profile.profileImageUrl} alt={profile.name ?? "Customer"} className="h-full w-full object-cover" />
        ) : (
          <UserCircle2 className="h-8 w-8" />
        )}
      </div>
      <div className="flex-1 min-w-[220px]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-[color:var(--color-text)]">
            {profile.name ?? "Unnamed customer"}
          </h2>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.14em] ${
              profile.active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}
          >
            {profile.active ? "Active" : "Disabled"}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-[color:var(--color-text-subtle)]">
          {profile.email ? (
            <span className="inline-flex items-center gap-1.5">
              <AtSign className="h-3.5 w-3.5" /> {profile.email}
            </span>
          ) : null}
          {profile.phone ? (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> {profile.phone}
            </span>
          ) : null}
          {profile.registeredAt ? (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Joined {formatDate(profile.registeredAt)}
            </span>
          ) : null}
          {profile.lastLoginAt ? (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Last login {formatRelative(profile.lastLoginAt)}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SummaryGrid({ summary }: { summary: Customer360["summary"] }) {
  const tiles = [
    { label: "Lifetime spend", value: formatCurrency(summary.lifetimeSpend), icon: IndianRupee, accent: "text-emerald-600" },
    { label: "Total orders", value: String(summary.totalOrders), icon: ShoppingBag, accent: "text-indigo-600" },
    { label: "Avg order value", value: formatCurrency(summary.averageOrderValue), icon: TrendingUp, accent: "text-violet-600" },
    { label: "Open enquiries", value: String(summary.openEnquiries), icon: MessageCircle, accent: "text-amber-600" }
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="admin-surface rounded-2xl border border-[color:var(--color-border)] p-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[color:var(--color-text-subtle)]">
              {t.label}
            </div>
            <t.icon className={`h-4 w-4 ${t.accent}`} />
          </div>
          <div className={`mt-2 text-2xl font-extrabold ${t.accent}`}>{t.value}</div>
        </div>
      ))}
    </div>
  );
}

function OverviewSection({ data, setTab }: { data: Customer360; setTab: (k: TabKey) => void }) {
  const recent = data.recentOrders.slice(0, 5);
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="admin-surface rounded-3xl border border-[color:var(--color-border)] p-5 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[color:var(--color-text-subtle)]">Recent orders</h3>
          <button onClick={() => setTab("orders")} className="text-xs font-bold text-[color:var(--color-accent)] hover:underline">View all →</button>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title="No orders yet"
            description="When this customer places their first order, it will appear here."
            className="!p-6"
          />
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.map((order) => (
              <OrderRow key={order.id} order={order} compact />
            ))}
          </ul>
        )}
      </div>

      <div className="admin-surface rounded-3xl border border-[color:var(--color-border)] p-5">
        <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[color:var(--color-text-subtle)]">Activity snapshot</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <SnapshotRow icon={ShoppingCart} label="Cart items" value={data.summary.cartItemCount} onView={() => setTab("cart")} />
          <SnapshotRow icon={Heart} label="Wishlist items" value={data.summary.wishlistItemCount} onView={() => setTab("wishlist")} />
          <SnapshotRow icon={MessageCircle} label="Open enquiries" value={data.summary.openEnquiries} onView={() => setTab("enquiries")} />
          <SnapshotRow icon={RotateCcw} label="Open returns" value={data.summary.openReturns} onView={() => setTab("returns")} />
          <SnapshotRow icon={Inbox} label="Back-in-stock subs" value={data.summary.backInStockSubscriptions} onView={() => setTab("back-in-stock")} />
          <SnapshotRow icon={MapPin} label="Saved addresses" value={data.addresses.length} onView={() => setTab("addresses")} />
        </ul>
      </div>
    </div>
  );
}

function SnapshotRow({
  icon: Icon,
  label,
  value,
  onView
}: {
  icon: typeof ShoppingCart;
  label: string;
  value: number;
  onView: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2.5">
      <Icon className="h-4 w-4 text-[color:var(--color-text-subtle)]" />
      <span className="text-sm text-[color:var(--color-text)]">{label}</span>
      <span className="ml-auto text-sm font-bold text-[color:var(--color-text)]">{value}</span>
      <button
        onClick={onView}
        className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--color-accent)] hover:underline"
      >
        View
      </button>
    </li>
  );
}

function OrdersSection({ orders }: { orders: Customer360["recentOrders"] }) {
  if (orders.length === 0) {
    return <EmptyState icon={<Package className="h-6 w-6" />} title="No orders" description="This customer hasn't placed any orders yet." />;
  }
  return (
    <ul className="space-y-2">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </ul>
  );
}

function OrderRow({
  order,
  compact
}: {
  order: Customer360["recentOrders"][number];
  compact?: boolean;
}) {
  return (
    <li className="admin-surface rounded-2xl border border-[color:var(--color-border)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`/orders/${order.id}`}
          className="inline-flex items-center gap-2 font-bold text-[color:var(--color-text)] hover:text-[color:var(--color-accent)]"
        >
          <ShoppingBag className="h-4 w-4" />
          {order.orderNumber ?? `Order #${order.id}`}
        </Link>
        <StatusPill label={order.status} />
        <PaymentPill label={order.paymentStatus} />
        {!compact && order.storeName ? (
          <span className="text-xs text-[color:var(--color-text-subtle)]">@ {order.storeName}</span>
        ) : null}
        <span className="ml-auto font-bold text-[color:var(--color-text)]">{formatCurrency(order.totalAmount)}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-3 text-xs text-[color:var(--color-text-subtle)]">
        <span>{order.itemCount} item{order.itemCount === 1 ? "" : "s"}</span>
        {order.placedAt ? <span>· Placed {formatDate(order.placedAt)}</span> : null}
        {order.deliveredAt ? <span>· Delivered {formatDate(order.deliveredAt)}</span> : null}
        {order.cancelledAt ? <span>· Cancelled {formatDate(order.cancelledAt)}</span> : null}
      </div>
    </li>
  );
}

function CartSection({ cart }: { cart: Customer360["cart"] }) {
  if (cart.length === 0) {
    return <EmptyState icon={<ShoppingCart className="h-6 w-6" />} title="Empty cart" description="No items in this customer's cart right now." />;
  }
  const total = cart.reduce((acc, line) => acc + (line.lineTotal ?? 0), 0);
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {cart.map((line) => (
          <ProductLineRow
            key={line.id}
            productId={line.productId}
            title={line.productTitle}
            imageUrl={line.productImageUrl}
            price={line.price}
            extra={`× ${line.quantity}`}
            right={formatCurrency(line.lineTotal)}
          />
        ))}
      </ul>
      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface-muted)] px-4 py-3 text-sm">
        <span className="font-extrabold uppercase tracking-[0.14em] text-[color:var(--color-text-subtle)]">Cart subtotal</span>
        <span className="ml-auto float-right font-extrabold text-[color:var(--color-text)]">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function WishlistSection({ wishlist }: { wishlist: Customer360["wishlist"] }) {
  if (wishlist.length === 0) {
    return <EmptyState icon={<Heart className="h-6 w-6" />} title="No wishlist items" description="This customer hasn't saved any products." />;
  }
  return (
    <ul className="space-y-2">
      {wishlist.map((line) => (
        <ProductLineRow
          key={line.id}
          productId={line.productId}
          title={line.productTitle}
          imageUrl={line.productImageUrl}
          price={line.price}
          extra={line.inStock ? "In stock" : "Out of stock"}
          extraTone={line.inStock ? "emerald" : "rose"}
          right={line.addedAt ? `Added ${formatDate(line.addedAt)}` : undefined}
        />
      ))}
    </ul>
  );
}

function EnquiriesSection({ enquiries }: { enquiries: Customer360["enquiries"] }) {
  if (enquiries.length === 0) {
    return <EmptyState icon={<MessageCircle className="h-6 w-6" />} title="No enquiries" description="No support or product enquiries from this customer yet." />;
  }
  return (
    <ul className="space-y-2">
      {enquiries.map((enquiry) => (
        <li key={enquiry.id} className="admin-surface rounded-2xl border border-[color:var(--color-border)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-indigo-700">
              {enquiry.enquiryType ?? "GENERAL"}
            </span>
            {enquiry.status ? <StatusPill label={enquiry.status} /> : null}
            {enquiry.productTitle ? (
              <Link
                to={`/products/${enquiry.productId}/edit`}
                className="text-xs font-semibold text-[color:var(--color-accent)] hover:underline"
              >
                {enquiry.productTitle}
              </Link>
            ) : null}
            {enquiry.createdAt ? (
              <span className="ml-auto text-xs text-[color:var(--color-text-subtle)]">{formatDate(enquiry.createdAt)}</span>
            ) : null}
          </div>
          {enquiry.message ? (
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[color:var(--color-text)]">{enquiry.message}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ReturnsSection({ returns }: { returns: Customer360["returns"] }) {
  if (returns.length === 0) {
    return <EmptyState icon={<RotateCcw className="h-6 w-6" />} title="No returns" description="This customer hasn't requested any returns." />;
  }
  return (
    <ul className="space-y-2">
      {returns.map((r) => (
        <li key={r.id} className="admin-surface rounded-2xl border border-[color:var(--color-border)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/orders/${r.orderId}`}
              className="font-bold text-[color:var(--color-text)] hover:text-[color:var(--color-accent)]"
            >
              {r.orderNumber ?? `Order #${r.orderId}`}
            </Link>
            <StatusPill label={r.status} />
            {r.createdAt ? (
              <span className="ml-auto text-xs text-[color:var(--color-text-subtle)]">{formatDate(r.createdAt)}</span>
            ) : null}
          </div>
          {r.reason ? <p className="mt-2 text-sm text-[color:var(--color-text)]">{r.reason}</p> : null}
          {r.resolvedAt ? <p className="mt-1 text-xs text-[color:var(--color-text-subtle)]">Resolved {formatDate(r.resolvedAt)}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function BackInStockSection({ items }: { items: Customer360["backInStock"] }) {
  if (items.length === 0) {
    return <EmptyState icon={<Inbox className="h-6 w-6" />} title="No subscriptions" description="No back-in-stock notifications subscribed by this customer." />;
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="admin-surface flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--color-border)] px-4 py-3">
          <PackageX className="h-4 w-4 text-[color:var(--color-text-subtle)]" />
          {item.productId ? (
            <Link to={`/products/${item.productId}/edit`} className="font-bold text-[color:var(--color-text)] hover:text-[color:var(--color-accent)]">
              {item.productTitle ?? `Product #${item.productId}`}
            </Link>
          ) : (
            <span className="font-bold text-[color:var(--color-text)]">{item.productTitle ?? "Unknown product"}</span>
          )}
          {item.status ? <StatusPill label={item.status} /> : null}
          {item.createdAt ? (
            <span className="ml-auto text-xs text-[color:var(--color-text-subtle)]">{formatDate(item.createdAt)}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function AddressesSection({ addresses }: { addresses: Customer360["addresses"] }) {
  if (addresses.length === 0) {
    return <EmptyState icon={<MapPin className="h-6 w-6" />} title="No saved addresses" description="This customer hasn't saved any delivery addresses yet." />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {addresses.map((addr) => (
        <article
          key={addr.id}
          className="admin-surface rounded-2xl border border-[color:var(--color-border)] p-4"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold uppercase tracking-[0.14em] text-[color:var(--color-text-subtle)]">{addr.label ?? "Address"}</span>
            {addr.defaultAddress ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">Default</span>
            ) : null}
          </div>
          <div className="mt-2 text-sm text-[color:var(--color-text)]">{addr.fullName}</div>
          <div className="mt-1 text-sm text-[color:var(--color-text-subtle)]">
            {addr.addressLine1}
            {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
          </div>
          <div className="text-sm text-[color:var(--color-text-subtle)]">
            {[addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}
          </div>
          {addr.phone ? (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-[color:var(--color-text-subtle)]">
              <Phone className="h-3 w-3" /> {addr.phone}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function ProductLineRow({
  productId,
  title,
  imageUrl,
  price,
  extra,
  extraTone,
  right
}: {
  productId?: number;
  title?: string;
  imageUrl?: string;
  price?: number;
  extra?: string;
  extraTone?: "emerald" | "rose";
  right?: string;
}) {
  const tone = extraTone === "emerald" ? "text-emerald-600" : extraTone === "rose" ? "text-rose-600" : "text-[color:var(--color-text-subtle)]";
  return (
    <li className="admin-surface flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--color-border)] px-3 py-2.5">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-[color:var(--admin-surface-muted)]">
        {imageUrl ? <img src={imageUrl} alt={title ?? ""} className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-[color:var(--color-text-subtle)]" />}
      </div>
      <div className="min-w-0 flex-1">
        {productId ? (
          <Link to={`/products/${productId}/edit`} className="block truncate font-semibold text-[color:var(--color-text)] hover:text-[color:var(--color-accent)]">
            {title ?? `Product #${productId}`}
          </Link>
        ) : (
          <span className="block truncate font-semibold text-[color:var(--color-text)]">{title ?? "Unknown product"}</span>
        )}
        <div className="mt-0.5 flex flex-wrap gap-2 text-xs">
          {price != null ? <span className="text-[color:var(--color-text-subtle)]">{formatCurrency(price)}</span> : null}
          {extra ? <span className={`font-bold ${tone}`}>{extra}</span> : null}
        </div>
      </div>
      {right ? <span className="ml-auto text-xs text-[color:var(--color-text-subtle)]">{right}</span> : null}
    </li>
  );
}

function StatusPill({ label }: { label: string }) {
  const tone = pickTone(label);
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.14em] ${tone}`}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

function PaymentPill({ label }: { label: string }) {
  const tone = label === "PAID"
    ? "bg-emerald-100 text-emerald-700"
    : label === "FAILED"
      ? "bg-rose-100 text-rose-700"
      : label === "REFUNDED"
        ? "bg-violet-100 text-violet-700"
        : "bg-amber-100 text-amber-700";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.14em] ${tone}`}>
      <Mail className="h-3 w-3" /> {label}
    </span>
  );
}

function pickTone(label: string) {
  const upper = label.toUpperCase();
  if (["DELIVERED", "RESOLVED", "REFUNDED", "PAID", "APPROVED", "COMPLETED"].includes(upper))
    return "bg-emerald-100 text-emerald-700";
  if (["CANCELLED", "FAILED", "REJECTED"].includes(upper))
    return "bg-rose-100 text-rose-700";
  if (["PENDING", "WAITING", "NEW", "REQUESTED"].includes(upper))
    return "bg-amber-100 text-amber-700";
  if (["SHIPPED", "PACKED", "READY", "FOLLOW_UP", "CONFIRMED"].includes(upper))
    return "bg-indigo-100 text-indigo-700";
  return "bg-slate-100 text-slate-700";
}

function formatCurrency(amount?: number | null) {
  if (amount == null) return "₹0";
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return "—";
  return new Date(ts).toLocaleDateString();
}

function formatRelative(value?: string) {
  if (!value) return "—";
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return "—";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`;
  return new Date(ts).toLocaleDateString();
}
