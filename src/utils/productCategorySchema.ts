export type CommonProductFieldKey =
  | "processor"
  | "processorGeneration"
  | "ramGb"
  | "storageGb"
  | "storageType"
  | "displaySize"
  | "displayType"
  | "os"
  | "graphicsCard"
  | "battery"
  | "weight";

export type CategoryFieldType = "text" | "textarea" | "select" | "number";

export interface CategoryCustomFieldOption {
  label: string;
  value: string;
}

export interface CategoryCustomField {
  key: string;
  label: string;
  type: CategoryFieldType;
  placeholder?: string;
  hint?: string;
  rows?: number;
  options?: CategoryCustomFieldOption[];
}

export interface CategoryFieldGroup<TField> {
  description?: string;
  fields: TField[];
  title: string;
}

export interface ProductCategoryTemplate {
  commonGroups: CategoryFieldGroup<CommonProductFieldKey>[];
  customGroups: CategoryFieldGroup<CategoryCustomField>[];
  intro: string;
  key: string;
  label: string;
  matches: string[];
}

export const commonFieldMeta: Record<
  CommonProductFieldKey,
  { label: string; placeholder: string; type: Extract<CategoryFieldType, "text" | "number" | "select">; options?: CategoryCustomFieldOption[] }
> = {
  processor: { label: "Processor", placeholder: "Intel Core i5 / Apple M1 / Ryzen 7", type: "text" },
  processorGeneration: { label: "Processor generation", placeholder: "8th Gen / M1 / Ryzen 5000", type: "text" },
  ramGb: { label: "RAM (GB)", placeholder: "8", type: "number" },
  storageGb: { label: "Storage (GB)", placeholder: "256", type: "number" },
  storageType: {
    label: "Storage type",
    placeholder: "SSD",
    type: "select",
    options: [
      { label: "SSD", value: "SSD" },
      { label: "HDD", value: "HDD" },
      { label: "NVMe", value: "NVMe" },
      { label: "eMMC", value: "eMMC" }
    ]
  },
  displaySize: { label: "Display size", placeholder: "14 inch / 24 inch", type: "text" },
  displayType: { label: "Display type", placeholder: "FHD IPS / LED", type: "text" },
  os: { label: "Operating system", placeholder: "Windows 11 / macOS / N/A", type: "text" },
  graphicsCard: { label: "Graphics", placeholder: "Intel Iris / NVIDIA T1000", type: "text" },
  battery: { label: "Battery / power note", placeholder: "4-6 hrs backup / Power cable included", type: "text" },
  weight: { label: "Weight", placeholder: "1.6 kg", type: "text" }
};

const laptopTemplate: ProductCategoryTemplate = {
  key: "laptop",
  label: "Laptop fields",
  matches: ["laptop", "laptops", "gaming laptop", "gaming laptops"],
  intro: "Laptop products should capture portable hardware details, display info, and student/work-ready notes.",
  commonGroups: [
    { title: "Core specs", fields: ["processor", "processorGeneration", "ramGb", "storageGb", "storageType"] },
    { title: "Display and platform", fields: ["displaySize", "displayType", "os", "graphicsCard", "battery", "weight"] }
  ],
  customGroups: [
    {
      title: "Experience details",
      description: "Use these for richer product detail sections on the website.",
      fields: [
        { key: "series", label: "Series", type: "text", placeholder: "ThinkPad / Latitude / Pavilion" },
        { key: "screenResolution", label: "Screen resolution", type: "text", placeholder: "1920 x 1080" },
        { key: "ports", label: "Ports", type: "textarea", rows: 3, placeholder: "USB-C, HDMI, USB 3.0, RJ45" },
        { key: "connectivity", label: "Connectivity", type: "text", placeholder: "Wi-Fi 6, Bluetooth 5.1" },
        { key: "webcam", label: "Webcam", type: "text", placeholder: "720p HD webcam" },
        { key: "keyboardLayout", label: "Keyboard / input", type: "text", placeholder: "Backlit keyboard, precision trackpad" },
        { key: "idealFor", label: "Ideal for", type: "text", placeholder: "Students, office work, browsing" },
        { key: "boxContents", label: "What is in the box", type: "textarea", rows: 3, placeholder: "Laptop, charger, inspection report" }
      ]
    }
  ]
};

const macbookTemplate: ProductCategoryTemplate = {
  key: "macbook",
  label: "MacBook fields",
  matches: ["macbook", "macbooks"],
  intro: "MacBook products should highlight Apple-specific battery, chipset, and included accessory details.",
  commonGroups: [
    { title: "Core specs", fields: ["processor", "processorGeneration", "ramGb", "storageGb", "storageType"] },
    { title: "Display and platform", fields: ["displaySize", "displayType", "os", "graphicsCard", "battery", "weight"] }
  ],
  customGroups: [
    {
      title: "Apple-specific details",
      fields: [
        { key: "series", label: "Series", type: "text", placeholder: "MacBook Air / MacBook Pro" },
        { key: "screenResolution", label: "Screen resolution", type: "text", placeholder: "Retina / 2560 x 1600" },
        { key: "batteryCycles", label: "Battery cycle count", type: "text", placeholder: "Below 300 cycles" },
        { key: "chargerIncluded", label: "Charger included", type: "select", options: [{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }] },
        { key: "ports", label: "Ports", type: "textarea", rows: 3, placeholder: "Thunderbolt / MagSafe / HDMI" },
        { key: "keyboardLayout", label: "Keyboard / input", type: "text", placeholder: "Magic Keyboard / Touch ID" },
        { key: "idealFor", label: "Ideal for", type: "text", placeholder: "Students, creators, coding" },
        { key: "boxContents", label: "What is in the box", type: "textarea", rows: 3, placeholder: "MacBook, adapter, cable, report" }
      ]
    }
  ]
};

const desktopTemplate: ProductCategoryTemplate = {
  key: "desktop",
  label: "Desktop fields",
  matches: ["desktop", "desktops"],
  intro: "Desktop listings should focus on tower hardware, ports, connectivity, and what is included with the CPU.",
  commonGroups: [
    { title: "Core specs", fields: ["processor", "processorGeneration", "ramGb", "storageGb", "storageType"] },
    { title: "Platform", fields: ["os", "graphicsCard", "weight"] }
  ],
  customGroups: [
    {
      title: "Desktop configuration",
      description: "These fields power desktop-specific specification blocks on the website.",
      fields: [
        { key: "series", label: "Series", type: "text", placeholder: "ThinkCentre / OptiPlex / ProDesk" },
        { key: "formFactor", label: "Form factor", type: "text", placeholder: "Mini tower / SFF / Tiny" },
        { key: "ramType", label: "RAM type and expansion", type: "text", placeholder: "DDR3, up to 16GB, 4 DIMM slots" },
        { key: "ports", label: "Ports / slots", type: "textarea", rows: 3, placeholder: "8x USB, VGA, DisplayPort, RJ45" },
        { key: "connectivity", label: "Connectivity", type: "text", placeholder: "Gigabit Ethernet, USB Wi-Fi adapter optional" },
        { key: "opticalDrive", label: "Optical drive", type: "text", placeholder: "DVD-ROM / DVD-RW" },
        { key: "audio", label: "Audio", type: "text", placeholder: "Integrated HD audio" },
        { key: "boxContents", label: "What is in the box", type: "textarea", rows: 3, placeholder: "CPU, power cable, inspection report" },
        { key: "idealFor", label: "Ideal for", type: "text", placeholder: "Office desktops, labs, study setups" }
      ]
    }
  ]
};

const workstationTemplate: ProductCategoryTemplate = {
  key: "workstation",
  label: "Workstation fields",
  matches: ["workstation", "workstations"],
  intro: "Workstations need stronger GPU, certification, and expansion details for professional buyers.",
  commonGroups: [
    { title: "Core specs", fields: ["processor", "processorGeneration", "ramGb", "storageGb", "storageType"] },
    { title: "Platform", fields: ["os", "graphicsCard", "weight"] }
  ],
  customGroups: [
    {
      title: "Workstation details",
      fields: [
        { key: "series", label: "Series", type: "text", placeholder: "Precision / ThinkStation / Z Workstation" },
        { key: "formFactor", label: "Form factor", type: "text", placeholder: "Tower / SFF" },
        { key: "ramType", label: "RAM type and expansion", type: "text", placeholder: "DDR4 ECC, up to 64GB" },
        { key: "graphicsMemory", label: "Graphics memory", type: "text", placeholder: "4GB / 8GB GDDR6" },
        { key: "certification", label: "ISV / workflow note", type: "text", placeholder: "CAD, Adobe, 3D, rendering" },
        { key: "ports", label: "Ports / slots", type: "textarea", rows: 3, placeholder: "USB-C, DP, LAN, PCIe slots" },
        { key: "connectivity", label: "Connectivity", type: "text", placeholder: "Ethernet, Wi-Fi, Bluetooth" },
        { key: "boxContents", label: "What is in the box", type: "textarea", rows: 3, placeholder: "CPU, power cable, report" }
      ]
    }
  ]
};

const monitorTemplate: ProductCategoryTemplate = {
  key: "monitor",
  label: "Monitor fields",
  matches: ["monitor", "monitors"],
  intro: "Monitor products should highlight screen, panel, refresh rate, mount and port details instead of laptop specs.",
  commonGroups: [
    { title: "Display basics", fields: ["displaySize", "displayType", "weight"] }
  ],
  customGroups: [
    {
      title: "Monitor details",
      description: "These fields shape the monitor detail cards on the storefront.",
      fields: [
        { key: "resolution", label: "Resolution", type: "text", placeholder: "1920 x 1080 / 2560 x 1440" },
        { key: "panelType", label: "Panel type", type: "text", placeholder: "IPS / VA / TN" },
        { key: "refreshRate", label: "Refresh rate", type: "text", placeholder: "60Hz / 144Hz" },
        { key: "responseTime", label: "Response time", type: "text", placeholder: "5ms / 1ms" },
        { key: "brightness", label: "Brightness", type: "text", placeholder: "250 nits / 300 nits" },
        { key: "ports", label: "Ports", type: "textarea", rows: 3, placeholder: "HDMI, DP, VGA, audio out" },
        { key: "standFeatures", label: "Stand features", type: "text", placeholder: "Tilt / height adjust / pivot" },
        { key: "mountSupport", label: "Mount support", type: "text", placeholder: "VESA 100 x 100" },
        { key: "boxContents", label: "What is in the box", type: "textarea", rows: 3, placeholder: "Monitor, stand, power cable, HDMI cable" }
      ]
    }
  ]
};

const accessoryTemplate: ProductCategoryTemplate = {
  key: "accessory",
  label: "Accessory fields",
  matches: ["accessory", "accessories"],
  intro: "Accessories need type, compatibility, connectivity, and package details instead of core computing specs.",
  commonGroups: [],
  customGroups: [
    {
      title: "Accessory details",
      description: "Capture the information customers actually look for when buying peripherals and add-ons.",
      fields: [
        {
          key: "accessoryType",
          label: "Accessory type",
          type: "select",
          options: [
            { label: "Keyboard", value: "Keyboard" },
            { label: "Mouse", value: "Mouse" },
            { label: "Headset", value: "Headset" },
            { label: "Dock / Hub", value: "Dock / Hub" },
            { label: "Bag / Sleeve", value: "Bag / Sleeve" },
            { label: "Cable / Adapter", value: "Cable / Adapter" },
            { label: "Other", value: "Other" }
          ]
        },
        { key: "compatibility", label: "Compatibility", type: "text", placeholder: "Windows, Mac, USB-C laptops" },
        { key: "connectivity", label: "Connectivity", type: "text", placeholder: "Wireless 2.4G / Bluetooth / USB wired" },
        { key: "color", label: "Color / finish", type: "text", placeholder: "Black / Silver / Grey" },
        { key: "material", label: "Material / build", type: "text", placeholder: "ABS / aluminium / fabric" },
        { key: "dimensions", label: "Dimensions / weight", type: "text", placeholder: "Compact / 650g" },
        { key: "powerRequirement", label: "Power / battery", type: "text", placeholder: "Rechargeable / AAA battery / Plug and play" },
        { key: "idealFor", label: "Ideal for", type: "text", placeholder: "Workstations, travel, students, gaming" },
        { key: "boxContents", label: "What is in the box", type: "textarea", rows: 3, placeholder: "Accessory, cable, adapter, pouch" }
      ]
    }
  ]
};

const genericTemplate: ProductCategoryTemplate = {
  key: "generic",
  label: "Generic product fields",
  matches: [],
  intro: "Use the standard hardware and product detail fields for categories that do not have a tailored schema yet.",
  commonGroups: [
    { title: "Core specs", fields: ["processor", "processorGeneration", "ramGb", "storageGb", "storageType"] },
    { title: "Display and platform", fields: ["displaySize", "displayType", "os", "graphicsCard", "battery", "weight"] }
  ],
  customGroups: [
    {
      title: "Additional details",
      fields: [
        { key: "ports", label: "Ports", type: "textarea", rows: 3, placeholder: "Key ports, connectivity, box contents" },
        { key: "idealFor", label: "Ideal for", type: "text", placeholder: "Students, office, creators, home" },
        { key: "boxContents", label: "What is in the box", type: "textarea", rows: 3, placeholder: "Main device, charger, accessories" }
      ]
    }
  ]
};

export const productCategoryTemplates: ProductCategoryTemplate[] = [
  laptopTemplate,
  macbookTemplate,
  desktopTemplate,
  workstationTemplate,
  monitorTemplate,
  accessoryTemplate,
  genericTemplate
];

export function resolveProductCategoryTemplate(categoryName?: string) {
  const normalized = categoryName?.trim().toLowerCase() ?? "";
  return (
    productCategoryTemplates.find((template) => template !== genericTemplate && template.matches.some((match) => normalized.includes(match))) ??
    genericTemplate
  );
}
