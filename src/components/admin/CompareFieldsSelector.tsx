export const COMPARE_FIELD_OPTIONS = [
  { key: "brandName", label: "Brand" },
  { key: "categoryName", label: "Category" },
  { key: "price", label: "Selling Price" },
  { key: "originalPrice", label: "Original Price" },
  { key: "discountPercent", label: "Discount (%)" },
  { key: "stockQuantity", label: "Stock Quantity" },
  { key: "available", label: "Availability" },
  { key: "featured", label: "Featured" },
  { key: "bestSeller", label: "Best Seller" },
  { key: "todayDeal", label: "Today Deal" },
  { key: "processor", label: "Processor" },
  { key: "processorGeneration", label: "Processor Generation" },
  { key: "ramGb", label: "RAM" },
  { key: "storageGb", label: "Storage" },
  { key: "storageType", label: "Storage Type" },
  { key: "displaySize", label: "Display" },
  { key: "displayType", label: "Display Type" },
  { key: "os", label: "OS" },
  { key: "graphicsCard", label: "Graphics" },
  { key: "battery", label: "Battery" },
  { key: "weight", label: "Weight" },
  { key: "productCondition", label: "Condition" },
  { key: "warrantyMonths", label: "Warranty (months)" },
  { key: "warrantySummary", label: "Warranty Summary" },
  { key: "returnDays", label: "Return Days" },
  { key: "sku", label: "SKU" },
  { key: "modelNumber", label: "Model Number" }
];

interface CompareFieldsSelectorProps {
  onChange: (value: string) => void;
  value: string;
}

export function CompareFieldsSelector({ onChange, value }: CompareFieldsSelectorProps) {
  const selectedFields = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  function setSelectedFields(fields: string[]) {
    onChange(fields.join(","));
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className="admin-section-label">Compare fields</label>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Pick rows shown on the customer compare page. Leave empty to auto-show fields that have data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="admin-button-secondary !min-h-[34px] !px-3 !py-2 text-xs" onClick={() => setSelectedFields(COMPARE_FIELD_OPTIONS.map((option) => option.key))}>
            Select all
          </button>
          <button type="button" className="admin-button-ghost !min-h-[34px] !px-3 !py-2 text-xs" onClick={() => setSelectedFields([])}>
            Auto
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-3">
        {COMPARE_FIELD_OPTIONS.map((option) => {
          const checked = selectedFields.includes(option.key);
          return (
            <label key={option.key} className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 text-xs font-medium text-slate-600 shadow-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={checked}
                onChange={(event) => {
                  const next = event.target.checked
                    ? Array.from(new Set([...selectedFields, option.key]))
                    : selectedFields.filter((field) => field !== option.key);
                  setSelectedFields(next);
                }}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
