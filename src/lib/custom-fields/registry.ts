import type { CustomFieldEntity } from "./constants"
import type { BuiltInFieldConfig } from "./types"

export const BUILT_IN_FIELDS: Record<CustomFieldEntity, BuiltInFieldConfig[]> = {
  FIELD_DEFECT: [
    { fieldName: "title", label: "Title", fieldType: "TEXT", required: true, section: "general" },
    { fieldName: "description", label: "Description", fieldType: "TEXTAREA", required: true, section: "general" },
    { fieldName: "source", label: "Source", fieldType: "SELECT", required: false, section: "general",
      options: [
        { label: "Field", value: "FIELD" },
        { label: "Service", value: "SERVICE" },
        { label: "Customer", value: "CUSTOMER" },
        { label: "Dealer", value: "DEALER" },
        { label: "Internal", value: "INTERNAL" },
      ] },
    { fieldName: "severity", label: "Severity", fieldType: "SELECT", required: false, section: "general",
      options: [
        { label: "Minor", value: "MINOR" },
        { label: "Major", value: "MAJOR" },
        { label: "Critical", value: "CRITICAL" },
      ] },
    { fieldName: "safetyImpact", label: "Safety Impact", fieldType: "CHECKBOX", required: false, section: "general" },
    { fieldName: "vehicleDown", label: "Vehicle Down", fieldType: "CHECKBOX", required: false, section: "general" },
    { fieldName: "repeatIssue", label: "Repeat Issue", fieldType: "CHECKBOX", required: false, section: "general" },
    { fieldName: "vin", label: "VIN", fieldType: "TEXT", required: false, section: "vehicle", placeholder: "17-character VIN" },
    { fieldName: "vehicleModel", label: "Vehicle Model", fieldType: "TEXT", required: false, section: "vehicle", placeholder: "e.g., Model X 2024" },
    { fieldName: "vehicleVariant", label: "Vehicle Variant", fieldType: "TEXT", required: false, section: "vehicle", placeholder: "e.g., Sport Package" },
    { fieldName: "mileage", label: "Mileage (km)", fieldType: "NUMBER", required: false, section: "vehicle", placeholder: "e.g., 15000" },
    { fieldName: "failureDate", label: "Failure Date", fieldType: "DATE", required: false, section: "vehicle" },
    { fieldName: "location", label: "Location / Service Center", fieldType: "TEXT", required: false, section: "vehicle", placeholder: "e.g., Istanbul Service Center" },
    { fieldName: "partNumber", label: "Part Number", fieldType: "TEXT", required: false, section: "part", placeholder: "e.g., AX-7420-B" },
    { fieldName: "partName", label: "Part Name", fieldType: "TEXT", required: false, section: "part", placeholder: "e.g., Cylinder Head Casting" },
    { fieldName: "supplierId", label: "Supplier", fieldType: "SELECT", required: false, section: "part" },
    { fieldName: "category", label: "Category", fieldType: "TEXT", required: false, section: "classification", placeholder: "e.g., Electrical" },
    { fieldName: "subcategory", label: "Subcategory", fieldType: "TEXT", required: false, section: "classification", placeholder: "e.g., Wiring Harness" },
    { fieldName: "probableArea", label: "Probable Area", fieldType: "TEXT", required: false, section: "classification", placeholder: "e.g., Front Left Door" },
  ],

  DEFECT: [
    { fieldName: "supplierId", label: "Supplier", fieldType: "SELECT", required: true, section: "general" },
    { fieldName: "supplierAssigneeId", label: "Supplier Assignee", fieldType: "USER", required: false, section: "general" },
    { fieldName: "partNumber", label: "Part Number", fieldType: "TEXT", required: true, section: "general", placeholder: "e.g. AX-7420-B" },
    { fieldName: "description", label: "Defect Description", fieldType: "TEXTAREA", required: true, section: "general", placeholder: "Describe the defect in detail..." },
  ],

  PPAP_SUBMISSION: [
    { fieldName: "supplierId", label: "Supplier", fieldType: "SELECT", required: true, section: "general" },
    { fieldName: "partNumber", label: "Part Number", fieldType: "TEXT", required: true, section: "general", placeholder: "e.g. AX-7420-B" },
    { fieldName: "partName", label: "Part Name", fieldType: "TEXT", required: true, section: "general", placeholder: "e.g. Cylinder Head Casting" },
    { fieldName: "revision", label: "Revision", fieldType: "TEXT", required: false, section: "general" },
    { fieldName: "projectName", label: "Project Name", fieldType: "TEXT", required: false, section: "details", placeholder: "e.g. Model S 2026" },
    { fieldName: "vehicleModel", label: "Vehicle Model", fieldType: "TEXT", required: false, section: "details", placeholder: "e.g. Model S 2025" },
    { fieldName: "revisionLevel", label: "Revision Level", fieldType: "TEXT", required: false, section: "details", placeholder: "e.g. Rev C" },
    { fieldName: "drawingNumber", label: "Drawing Number", fieldType: "TEXT", required: false, section: "details", placeholder: "e.g. DWG-7420-001" },
    { fieldName: "level", label: "PPAP Level", fieldType: "SELECT", required: true, section: "details",
      options: [
        { label: "Level 1", value: "LEVEL_1" },
        { label: "Level 2", value: "LEVEL_2" },
        { label: "Level 3", value: "LEVEL_3" },
        { label: "Level 4", value: "LEVEL_4" },
        { label: "Level 5", value: "LEVEL_5" },
      ] },
    { fieldName: "reasonForSubmission", label: "Reason for Submission", fieldType: "SELECT", required: false, section: "details",
      options: [
        { label: "New Part", value: "NEW_PART" },
        { label: "Engineering Change", value: "ENGINEERING_CHANGE" },
        { label: "Supplier Change", value: "SUPPLIER_CHANGE" },
        { label: "Process Change", value: "PROCESS_CHANGE" },
        { label: "Tooling Change", value: "TOOLING_CHANGE" },
        { label: "Annual Revalidation", value: "ANNUAL_REVALIDATION" },
        { label: "Corrective Action Follow-up", value: "CORRECTIVE_ACTION_FOLLOW_UP" },
        { label: "Other", value: "OTHER" },
      ] },
    { fieldName: "dueDate", label: "Due Date", fieldType: "DATE", required: false, section: "details" },
    { fieldName: "notes", label: "Notes", fieldType: "TEXTAREA", required: false, section: "details", placeholder: "Additional notes or instructions for the supplier..." },
  ],

  IQC_REPORT: [
    { fieldName: "supplierId", label: "Supplier", fieldType: "SELECT", required: true, section: "general" },
    { fieldName: "partNumber", label: "Part Number", fieldType: "TEXT", required: true, section: "general", placeholder: "e.g. AX-7420-B" },
    { fieldName: "partName", label: "Part Name", fieldType: "TEXT", required: false, section: "general", placeholder: "e.g. Cylinder Head Casting" },
    { fieldName: "inspectionType", label: "Inspection Type", fieldType: "SELECT", required: false, section: "general",
      options: [
        { label: "Receiving Inspection", value: "RECEIVING_INSPECTION" },
        { label: "First Article Inspection", value: "FIRST_ARTICLE_INSPECTION" },
        { label: "Containment Inspection", value: "CONTAINMENT_INSPECTION" },
        { label: "Re-Inspection", value: "RE_INSPECTION" },
        { label: "Dock Audit", value: "DOCK_AUDIT" },
      ] },
    { fieldName: "quantityReceived", label: "Quantity Received", fieldType: "NUMBER", required: true, section: "details", placeholder: "e.g. 100" },
    { fieldName: "inspectionQuantity", label: "Inspection Quantity", fieldType: "NUMBER", required: false, section: "details", placeholder: "e.g. 10" },
    { fieldName: "lotNumber", label: "Lot Number", fieldType: "TEXT", required: false, section: "details", placeholder: "e.g. LOT-2026-0042" },
    { fieldName: "batchNumber", label: "Batch Number", fieldType: "TEXT", required: false, section: "details", placeholder: "e.g. BATCH-A123" },
    { fieldName: "purchaseOrder", label: "Purchase Order", fieldType: "TEXT", required: false, section: "details", placeholder: "e.g. PO-12345" },
    { fieldName: "deliveryNote", label: "Delivery Note", fieldType: "TEXT", required: false, section: "details", placeholder: "e.g. DN-67890" },
    { fieldName: "vehicleModel", label: "Vehicle Model", fieldType: "TEXT", required: false, section: "details", placeholder: "e.g. Model S 2025" },
    { fieldName: "projectName", label: "Project Name", fieldType: "TEXT", required: false, section: "details", placeholder: "e.g. NextGen Platform" },
    { fieldName: "inspectionDate", label: "Inspection Date", fieldType: "DATE", required: false, section: "details" },
    { fieldName: "samplingPlan", label: "Sampling Plan", fieldType: "TEXT", required: false, section: "details", placeholder: "e.g. AQL 1.0 Level II" },
    { fieldName: "notes", label: "Notes", fieldType: "TEXTAREA", required: false, section: "details", placeholder: "Additional notes or observations..." },
  ],

  FMEA: [
    { fieldName: "fmeaType", label: "FMEA Type", fieldType: "SELECT", required: true, section: "general",
      options: [
        { label: "PFMEA (Process)", value: "PROCESS" },
        { label: "DFMEA (Design)", value: "DESIGN" },
      ] },
    { fieldName: "supplierId", label: "Supplier", fieldType: "SELECT", required: false, section: "general" },
    { fieldName: "title", label: "Title", fieldType: "TEXT", required: true, section: "general", placeholder: "e.g. Cylinder Head Casting Process FMEA" },
    { fieldName: "partNumber", label: "Part Number", fieldType: "TEXT", required: true, section: "general", placeholder: "e.g. AX-7420-B" },
    { fieldName: "partName", label: "Part Name", fieldType: "TEXT", required: false, section: "general", placeholder: "e.g. Cylinder Head Casting" },
    { fieldName: "processName", label: "Process Name", fieldType: "TEXT", required: false, section: "general", placeholder: "e.g. Gravity Die Casting" },
    { fieldName: "projectName", label: "Project Name", fieldType: "TEXT", required: false, section: "details", placeholder: "e.g. Engine Block Platform" },
    { fieldName: "vehicleModel", label: "Vehicle Model", fieldType: "TEXT", required: false, section: "details", placeholder: "e.g. Model S 2026" },
    { fieldName: "revision", label: "Revision", fieldType: "TEXT", required: false, section: "details", placeholder: "e.g. A" },
    { fieldName: "dueDate", label: "Due Date", fieldType: "DATE", required: false, section: "details" },
    { fieldName: "notes", label: "Notes", fieldType: "TEXTAREA", required: false, section: "details", placeholder: "Optional notes or context for this FMEA" },
  ],

  LOGISTIC_ORDER: [
    { fieldName: "customerType", label: "Customer Type", fieldType: "SELECT", required: true, section: "customer",
      options: [
        { label: "Customer", value: "CUSTOMER" },
        { label: "Dealer", value: "DEALER" },
        { label: "Distributor", value: "DISTRIBUTOR" },
        { label: "Internal", value: "INTERNAL" },
      ] },
    { fieldName: "customerName", label: "Customer / Dealer / Distributor Name", fieldType: "TEXT", required: true, section: "customer", placeholder: "Enter customer name" },
    { fieldName: "dealerName", label: "Dealer Name", fieldType: "TEXT", required: false, section: "customer", placeholder: "Optional" },
    { fieldName: "distributorName", label: "Distributor Name", fieldType: "TEXT", required: false, section: "customer", placeholder: "Optional" },
    { fieldName: "country", label: "Country", fieldType: "TEXT", required: false, section: "customer", placeholder: "e.g. Germany" },
    { fieldName: "market", label: "Market", fieldType: "TEXT", required: false, section: "customer", placeholder: "e.g. EU, MENA, LATAM" },
    { fieldName: "vehicleModel", label: "Vehicle Model", fieldType: "TEXT", required: true, section: "vehicle", placeholder: "e.g. CityStar 12E" },
    { fieldName: "vehicleVariant", label: "Vehicle Variant", fieldType: "TEXT", required: false, section: "vehicle", placeholder: "e.g. Low Entry, High Floor" },
    { fieldName: "vehicleType", label: "Vehicle Type", fieldType: "SELECT", required: true, section: "vehicle",
      options: [
        { label: "Bus", value: "BUS" },
        { label: "Midibus", value: "MIDIBUS" },
        { label: "Truck", value: "TRUCK" },
        { label: "Light Truck", value: "LIGHT_TRUCK" },
        { label: "Other", value: "OTHER" },
      ] },
    { fieldName: "powertrain", label: "Powertrain", fieldType: "SELECT", required: false, section: "vehicle",
      options: [
        { label: "Diesel", value: "DIESEL" },
        { label: "CNG", value: "CNG" },
        { label: "Electric", value: "ELECTRIC" },
        { label: "Hybrid", value: "HYBRID" },
        { label: "Other", value: "OTHER" },
      ] },
    { fieldName: "quantity", label: "Quantity", fieldType: "NUMBER", required: true, section: "vehicle" },
    { fieldName: "priority", label: "Priority", fieldType: "SELECT", required: false, section: "vehicle",
      options: [
        { label: "Low", value: "LOW" },
        { label: "Normal", value: "NORMAL" },
        { label: "High", value: "HIGH" },
        { label: "Urgent", value: "URGENT" },
      ] },
    { fieldName: "requestedDeliveryDate", label: "Requested Delivery Date", fieldType: "DATE", required: false, section: "timeline" },
    { fieldName: "requestNumber", label: "Request Number", fieldType: "TEXT", required: false, section: "details", placeholder: "Optional" },
    { fieldName: "salesOrderNo", label: "Sales Order Number", fieldType: "TEXT", required: false, section: "details", placeholder: "Optional" },
    { fieldName: "notes", label: "Notes", fieldType: "TEXTAREA", required: false, section: "details", placeholder: "Additional notes..." },
  ],
}

export function getBuiltInFields(entity: CustomFieldEntity): BuiltInFieldConfig[] {
  return BUILT_IN_FIELDS[entity] ?? []
}

export function getBuiltInField(entity: CustomFieldEntity, fieldName: string): BuiltInFieldConfig | undefined {
  return BUILT_IN_FIELDS[entity]?.find((f) => f.fieldName === fieldName)
}
