import type { IndustryTemplate } from "./types"

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: "automotive_parts",
    name: "Automotive Parts Manufacturer",
    description: "For companies that produce vehicle components (not complete vehicles). Hides VIN and vehicle-specific fields while emphasizing part identification and production details.",
    icon: "factory",
    configs: {
      FIELD_DEFECT: {
        builtInOverrides: [
          { entity: "FIELD_DEFECT", fieldName: "vin", visible: false },
          { entity: "FIELD_DEFECT", fieldName: "vehicleDown", visible: false },
          { entity: "FIELD_DEFECT", fieldName: "vehicleModel", label: "Target Platform" },
          { entity: "FIELD_DEFECT", fieldName: "vehicleVariant", label: "Target Variant" },
          { entity: "FIELD_DEFECT", fieldName: "partNumber", required: true, label: "Part Number" },
          { entity: "FIELD_DEFECT", fieldName: "partName", required: true, label: "Part Name" },
        ],
        customFields: [
          {
            entity: "FIELD_DEFECT",
            fieldName: "product_serial_no",
            label: "Product Serial Number",
            fieldType: "TEXT",
            section: "vehicle",
            required: false,
            placeholder: "e.g. SN-2024-001",
          },
          {
            entity: "FIELD_DEFECT",
            fieldName: "production_station",
            label: "Production Station",
            fieldType: "TEXT",
            section: "vehicle",
            placeholder: "e.g. Station A7",
          },
          {
            entity: "FIELD_DEFECT",
            fieldName: "shift",
            label: "Shift",
            fieldType: "SELECT",
            section: "vehicle",
            options: [
              { label: "Day Shift", value: "day" },
              { label: "Night Shift", value: "night" },
              { label: "Weekend Shift", value: "weekend" },
            ],
          },
          {
            entity: "FIELD_DEFECT",
            fieldName: "batch_code",
            label: "Batch / Lot Code",
            fieldType: "TEXT",
            section: "part",
            placeholder: "e.g. LOT-2024-A42",
          },
          {
            entity: "FIELD_DEFECT",
            fieldName: "rework_status",
            label: "Rework Status",
            fieldType: "SELECT",
            section: "classification",
            options: [
              { label: "Not Applicable", value: "na" },
              { label: "First Time Quality", value: "ftq" },
              { label: "Reworked Once", value: "rework_1" },
              { label: "Reworked Multiple", value: "rework_multi" },
            ],
          },
        ],
      },
      DEFECT: {
        builtInOverrides: [
          { entity: "DEFECT", fieldName: "partNumber", required: true },
        ],
        customFields: [
          {
            entity: "DEFECT",
            fieldName: "batch_code",
            label: "Batch / Lot Code",
            fieldType: "TEXT",
          },
          {
            entity: "DEFECT",
            fieldName: "component_type",
            label: "Component Type",
            fieldType: "SELECT",
            options: [
              { label: "Mechanical", value: "mechanical" },
              { label: "Electrical", value: "electrical" },
              { label: "Electronic", value: "electronic" },
              { label: "Structural", value: "structural" },
              { label: "Chemical", value: "chemical" },
            ],
          },
        ],
      },
      IQC_REPORT: {
        builtInOverrides: [
          { entity: "IQC_REPORT", fieldName: "vehicleModel", visible: false },
        ],
        customFields: [
          {
            entity: "IQC_REPORT",
            fieldName: "inspection_method",
            label: "Inspection Method",
            fieldType: "SELECT",
            options: [
              { label: "Visual", value: "visual" },
              { label: "Dimensional", value: "dimensional" },
              { label: "CMM", value: "cmm" },
              { label: "X-Ray", value: "xray" },
              { label: "Destructive", value: "destructive" },
            ],
          },
        ],
      },
      PPAP_SUBMISSION: {
        builtInOverrides: [
          { entity: "PPAP_SUBMISSION", fieldName: "vehicleModel", label: "Target Program / Platform" },
        ],
        customFields: [],
      },
      FMEA: {
        builtInOverrides: [
          { entity: "FMEA", fieldName: "vehicleModel", label: "Target Program / Platform" },
        ],
        customFields: [],
      },
      LOGISTIC_ORDER: {
        builtInOverrides: [
          { entity: "LOGISTIC_ORDER", fieldName: "vehicleType", options: [
            { label: "Module", value: "MODULE" },
            { label: "Component", value: "COMPONENT" },
            { label: "Assembly", value: "ASSEMBLY" },
            { label: "Kit", value: "KIT" },
          ] },
        ],
        customFields: [
          {
            entity: "LOGISTIC_ORDER",
            fieldName: "packaging_type",
            label: "Packaging Type",
            fieldType: "SELECT",
            options: [
              { label: "Standard", value: "standard" },
              { label: "Returnable", value: "returnable" },
              { label: "Bulk", value: "bulk" },
              { label: "Custom", value: "custom" },
            ],
          },
        ],
      },
    },
  },
  {
    id: "electronics",
    name: "Electronics Manufacturing",
    description: "For electronics and PCB assembly companies. Replaces vehicle fields with PCB revision and test data.",
    icon: "cpu",
    configs: {
      FIELD_DEFECT: {
        builtInOverrides: [
          { entity: "FIELD_DEFECT", fieldName: "vin", visible: false },
          { entity: "FIELD_DEFECT", fieldName: "vehicleDown", visible: false },
          { entity: "FIELD_DEFECT", fieldName: "vehicleModel", label: "Product Family" },
          { entity: "FIELD_DEFECT", fieldName: "vehicleVariant", label: "SKU Variant" },
          { entity: "FIELD_DEFECT", fieldName: "mileage", label: "Operating Hours" },
          { entity: "FIELD_DEFECT", fieldName: "partNumber", required: true, label: "Component ID" },
        ],
        customFields: [
          {
            entity: "FIELD_DEFECT",
            fieldName: "pcb_revision",
            label: "PCB Revision",
            fieldType: "TEXT",
            section: "vehicle",
            placeholder: "e.g. Rev C",
          },
          {
            entity: "FIELD_DEFECT",
            fieldName: "schematic_version",
            label: "Schematic Version",
            fieldType: "TEXT",
            section: "vehicle",
            placeholder: "e.g. V2.1",
          },
          {
            entity: "FIELD_DEFECT",
            fieldName: "test_station_id",
            label: "Test Station ID",
            fieldType: "TEXT",
            section: "vehicle",
            placeholder: "e.g. TS-42",
          },
          {
            entity: "FIELD_DEFECT",
            fieldName: "failure_bin",
            label: "Failure Bin",
            fieldType: "SELECT",
            section: "classification",
            options: [
              { label: "Short Circuit", value: "short" },
              { label: "Open Circuit", value: "open" },
              { label: "Component Value Out of Spec", value: "value" },
              { label: "Missing Component", value: "missing" },
              { label: "Wrong Component", value: "wrong" },
              { label: "Solder Defect", value: "solder" },
            ],
          },
        ],
      },
      DEFECT: {
        builtInOverrides: [],
        customFields: [
          {
            entity: "DEFECT",
            fieldName: "pcb_assembly_id",
            label: "PCB Assembly ID",
            fieldType: "TEXT",
          },
          {
            entity: "DEFECT",
            fieldName: "esd_suspect",
            label: "ESD Suspect",
            fieldType: "CHECKBOX",
          },
        ],
      },
      FMEA: {
        builtInOverrides: [
          { entity: "FMEA", fieldName: "vehicleModel", label: "Product Family" },
        ],
        customFields: [],
      },
      PPAP_SUBMISSION: {
        builtInOverrides: [
          { entity: "PPAP_SUBMISSION", fieldName: "vehicleModel", label: "Product Family" },
        ],
        customFields: [],
      },
      IQC_REPORT: {
        builtInOverrides: [],
        customFields: [],
      },
      LOGISTIC_ORDER: {
        builtInOverrides: [],
        customFields: [],
      },
    },
  },
  {
    id: "pharma_gmp",
    name: "Pharmaceutical (GMP)",
    description: "For pharmaceutical and medical device companies with GMP compliance requirements. Adds batch traceability and regulatory fields.",
    icon: "pill",
    configs: {
      FIELD_DEFECT: {
        builtInOverrides: [
          { entity: "FIELD_DEFECT", fieldName: "vin", visible: false },
          { entity: "FIELD_DEFECT", fieldName: "vehicleDown", visible: false },
          { entity: "FIELD_DEFECT", fieldName: "vehicleModel", label: "Product Name" },
          { entity: "FIELD_DEFECT", fieldName: "vehicleVariant", label: "Dosage Form" },
          { entity: "FIELD_DEFECT", fieldName: "mileage", visible: false },
          { entity: "FIELD_DEFECT", fieldName: "failureDate", label: "Discovery Date" },
          { entity: "FIELD_DEFECT", fieldName: "location", label: "Facility / Site" },
          { entity: "FIELD_DEFECT", fieldName: "partNumber", required: true, label: "Material Code" },
        ],
        customFields: [
          {
            entity: "FIELD_DEFECT",
            fieldName: "batch_number",
            label: "Batch Number",
            fieldType: "TEXT",
            section: "vehicle",
            required: true,
            placeholder: "e.g. BN-2024-0001",
          },
          {
            entity: "FIELD_DEFECT",
            fieldName: "gmp_classification",
            label: "GMP Classification",
            fieldType: "SELECT",
            section: "general",
            options: [
              { label: "Critical", value: "critical" },
              { label: "Major", value: "major" },
              { label: "Minor", value: "minor" },
            ],
          },
          {
            entity: "FIELD_DEFECT",
            fieldName: "cfr_part",
            label: "CFR Part",
            fieldType: "SELECT",
            section: "classification",
            options: [
              { label: "21 CFR Part 11", value: "21cfr11" },
              { label: "21 CFR Part 210", value: "21cfr210" },
              { label: "21 CFR Part 211", value: "21cfr211" },
              { label: "21 CFR Part 820", value: "21cfr820" },
            ],
          },
          {
            entity: "FIELD_DEFECT",
            fieldName: "best_before_date",
            label: "Best Before Date",
            fieldType: "DATE",
            section: "vehicle",
          },
        ],
      },
      DEFECT: {
        builtInOverrides: [
          { entity: "DEFECT", fieldName: "partNumber", label: "Material Code", required: true },
        ],
        customFields: [
          {
            entity: "DEFECT",
            fieldName: "capa_reference",
            label: "CAPA Reference",
            fieldType: "TEXT",
            placeholder: "e.g. CAPA-2024-001",
          },
        ],
      },
      PPAP_SUBMISSION: {
        builtInOverrides: [
          { entity: "PPAP_SUBMISSION", fieldName: "vehicleModel", visible: false },
        ],
        customFields: [],
      },
      FMEA: {
        builtInOverrides: [
          { entity: "FMEA", fieldName: "vehicleModel", visible: false },
        ],
        customFields: [],
      },
      IQC_REPORT: {
        builtInOverrides: [
          { entity: "IQC_REPORT", fieldName: "vehicleModel", visible: false },
          { entity: "IQC_REPORT", fieldName: "batchNumber", required: true, label: "Batch Number" },
        ],
        customFields: [
          {
            entity: "IQC_REPORT",
            fieldName: "temperature_zone",
            label: "Temperature Zone",
            fieldType: "SELECT",
            options: [
              { label: "Ambient", value: "ambient" },
              { label: "Refrigerated (2-8°C)", value: "refrigerated" },
              { label: "Frozen (-20°C)", value: "frozen" },
              { label: "Deep Frozen (-80°C)", value: "deep_frozen" },
            ],
          },
        ],
      },
      LOGISTIC_ORDER: {
        builtInOverrides: [
          { entity: "LOGISTIC_ORDER", fieldName: "vehicleType", visible: false },
          { entity: "LOGISTIC_ORDER", fieldName: "vehicleModel", label: "Product Name" },
          { entity: "LOGISTIC_ORDER", fieldName: "powertrain", visible: false },
        ],
        customFields: [
          {
            entity: "LOGISTIC_ORDER",
            fieldName: "temperature_controlled",
            label: "Temperature Controlled",
            fieldType: "CHECKBOX",
          },
        ],
      },
    },
  },
  {
    id: "general_manufacturing",
    name: "General Manufacturing",
    description: "For general manufacturing companies. Adds production line, shift, and machine identification fields.",
    icon: "settings",
    configs: {
      FIELD_DEFECT: {
        builtInOverrides: [
          { entity: "FIELD_DEFECT", fieldName: "vin", visible: false },
          { entity: "FIELD_DEFECT", fieldName: "vehicleDown", visible: false },
          { entity: "FIELD_DEFECT", fieldName: "vehicleModel", label: "Product Line" },
          { entity: "FIELD_DEFECT", fieldName: "vehicleVariant", label: "Product Variant" },
          { entity: "FIELD_DEFECT", fieldName: "partNumber", required: true },
        ],
        customFields: [
          {
            entity: "FIELD_DEFECT",
            fieldName: "production_line",
            label: "Production Line",
            fieldType: "TEXT",
            section: "vehicle",
            placeholder: "e.g. Line 3",
          },
          {
            entity: "FIELD_DEFECT",
            fieldName: "machine_id",
            label: "Machine ID",
            fieldType: "TEXT",
            section: "vehicle",
            placeholder: "e.g. M-1042",
          },
          {
            entity: "FIELD_DEFECT",
            fieldName: "operator_id",
            label: "Operator ID",
            fieldType: "TEXT",
            section: "vehicle",
            placeholder: "e.g. OP-789",
          },
          {
            entity: "FIELD_DEFECT",
            fieldName: "shift",
            label: "Shift",
            fieldType: "SELECT",
            section: "vehicle",
            options: [
              { label: "Day Shift", value: "day" },
              { label: "Afternoon Shift", value: "afternoon" },
              { label: "Night Shift", value: "night" },
            ],
          },
          {
            entity: "FIELD_DEFECT",
            fieldName: "work_order",
            label: "Work Order",
            fieldType: "TEXT",
            section: "part",
            placeholder: "e.g. WO-2024-001",
          },
        ],
      },
      DEFECT: {
        builtInOverrides: [
          { entity: "DEFECT", fieldName: "partNumber", required: true },
        ],
        customFields: [
          {
            entity: "DEFECT",
            fieldName: "work_order",
            label: "Work Order",
            fieldType: "TEXT",
          },
          {
            entity: "DEFECT",
            fieldName: "production_line",
            label: "Production Line",
            fieldType: "TEXT",
          },
        ],
      },
      PPAP_SUBMISSION: {
        builtInOverrides: [
          { entity: "PPAP_SUBMISSION", fieldName: "vehicleModel", label: "Product Line" },
        ],
        customFields: [],
      },
      FMEA: {
        builtInOverrides: [
          { entity: "FMEA", fieldName: "vehicleModel", label: "Product Line" },
        ],
        customFields: [],
      },
      IQC_REPORT: {
        builtInOverrides: [
          { entity: "IQC_REPORT", fieldName: "vehicleModel", label: "Product Line" },
        ],
        customFields: [],
      },
      LOGISTIC_ORDER: {
        builtInOverrides: [],
        customFields: [],
      },
    },
  },
]

export function getTemplateById(id: string): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES.find((t) => t.id === id)
}
