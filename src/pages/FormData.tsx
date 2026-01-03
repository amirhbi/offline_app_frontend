import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import jalaliday from "jalaliday";
dayjs.extend(jalaliday);
(dayjs as any).calendar("jalali");
import ExcelJS from "exceljs";
import {
  Card,
  Typography,
  Table,
  Space,
  Button,
  message,
  Input,
  Select,
  Checkbox,
  Modal,
  ColorPicker,
  Tooltip,
} from "antd";
import { CloseCircleTwoTone } from "@ant-design/icons";
import {
  DatePicker as DatePickerJalali,
  JalaliLocaleListener,
} from "antd-jalali";
import logo from "../assets/fire_department.png";
import reactLogo from "../assets/react.svg";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getForm, FormRecord, FormField } from "../api/forms";
import {
  listFormEntries,
  FormEntryRecord,
  createFormEntry,
  updateFormEntry,
  deleteFormEntry,
} from "../api/formEntries";

export default function FormData() {
  const navigate = useNavigate();
  const { formId } = useParams<{ formId: string }>();
  const { userData, role } = useAuth();
  const isSuperAdmin = (role === 'super_admin');
  const prePath = (isSuperAdmin ? '' : '/' + role);
  const [formDef, setFormDef] = useState<FormRecord | null>(null);
  const [entries, setEntries] = useState<FormEntryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [inlineAdd, setInlineAdd] = useState(false);
  const [inlineValues, setInlineValues] = useState<Record<string, any>>({});
  const [subFieldsData, setSubFieldsData] = useState<Record<string, any>[]>([]);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [inlineScope, setInlineScope] = useState<{
    type: "all" | "base" | "category";
    category?: string;
  }>({ type: "all" });
  // Export mode state
  const [exportView, setExportView] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [includeColors, setIncludeColors] = useState(true);
  const [randomOrder, setRandomOrder] = useState(false);
  const [pdfLandscape, setPdfLandscape] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [existValidations, setExistValidations] = useState<
    Record<string, Set<string>>
  >({});
  // Export column selection state
  const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>([]);
  const [selectedExportColumnsByCategory, setSelectedExportColumnsByCategory] = useState<Record<string, string[]>>({});
  const exportColumnOptions = useMemo(() => {
    if (!formDef) return [] as { value: string; label: string }[];
    const base = (formDef.fields || []).map((f) => ({ value: f.label, label: f.label }));
    return base; // Only main fields
  }, [formDef]);

  const exportColumnOptionsByCategory = useMemo(() => {
    const map: Record<string, { value: string; label: string }[]> = {};
    if (!formDef) return map;
    for (const c of formDef.categories || []) {
      map[c.name] = (c.fields || []).map((f) => ({ value: `${c.name} - ${f.label}`, label: f.label }));
    }
    return map;
  }, [formDef]);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewItems, setViewItems] = useState<{ label: string; value: any }[]>([]);
  const [viewSubRows, setViewSubRows] = useState<Record<string, any>[]>([]);
  const [viewTitle, setViewTitle] = useState<string>("");

  // Default: select all columns when options become available
  useEffect(() => {
    if (exportColumnOptions.length > 0 && selectedExportColumns.length === 0) {
      setSelectedExportColumns(exportColumnOptions.map((o) => o.value));
    }
  }, [exportColumnOptions]);

  // Default: select all columns per category when form definition changes
  useEffect(() => {
    if (!formDef) return;
    setSelectedExportColumnsByCategory((prev) => {
      const next = { ...prev };
      for (const c of formDef.categories || []) {
        const fullKeys = (c.fields || []).map((f) => `${c.name} - ${f.label}`);
        if (!next[c.name] || next[c.name].length === 0) {
          next[c.name] = fullKeys;
        }
      }
      return next;
    });
  }, [formDef]);

  const load = async () => {
    if (!formId) return;
    setLoading(true);
    try {
      const [def, list] = await Promise.all([
        getForm(formId),
        listFormEntries(formId),
      ]);
      setFormDef(def);
      setEntries(list);
    } catch (e: any) {
      message.error(e?.message || "خطا در بارگذاری داده‌ها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [formId]);

  useEffect(() => {
    if (!formId || !userData) return;
    console.log(userData);
    if ((userData.role as any) === "super_admin") return;
    const allowed = new Set<string>([
      ...((userData.forms || []).map((id) => id?.toString?.() || String(id))),
      ...((userData.forms_view || []).map((id) => id?.toString?.() || String(id))),
    ]);
    if (!allowed.has(formId)) {
      message.warning("شما دسترسی مشاهده این فرم را ندارید");
      navigate("/structure", { replace: true });
    }
  }, [formId, userData]);

  const hasWriteAccess = useMemo(() => {
    if (!userData || !formId) return false;
    if ((userData.role as any) === "super_admin") return true;
    return (userData.forms || []).some(
      (id) => (id as any)?.toString?.() === formId || String(id) === formId
    );
  }, [userData, formId]);

  const fieldMeta = useMemo(() => {
    const meta: Record<
      string,
      {
        type: FormRecord["fields"][number]["type"];
        options?: string[];
        required?: boolean;
        lookupFormId?: string;
        lookupSourceField?: string;
        lookupMap?: Record<string, string>;
      }
    > = {};
    if (!formDef) return meta;
    for (const f of formDef.fields || [])
      meta[f.label] = {
        type: f.type,
        options: f.options,
        required: f.required,
        lookupFormId: f.lookupFormId,
        lookupSourceField: f.lookupSourceField,
      };
    for (const c of formDef.categories || []) {
      for (const f of c.fields || [])
        meta[`${c.name} - ${f.label}`] = {
          type: f.type,
          options: f.options,
          required: f.required,
          lookupFormId: f.lookupFormId,
          lookupSourceField: f.lookupSourceField,
        };
    }
    return meta;
  }, [formDef]);

  // Fetch exist validations
  useEffect(() => {
    if (!formDef) return;
    const existFields: {
      lookupFormId: string;
      lookupSourceField: string;
      fieldKeys: string[];
    }[] = [];

    const processField = (f: FormField, key: string) => {
      if (
        f.type === "exist" &&
        f.lookupFormId &&
        f.lookupSourceField
      ) {
        // Find existing group for this formId+sourceField
        let group = existFields.find(
          (g) =>
            g.lookupFormId === f.lookupFormId &&
            g.lookupSourceField === f.lookupSourceField
        );
        if (!group) {
          group = {
            lookupFormId: f.lookupFormId,
            lookupSourceField: f.lookupSourceField,
            fieldKeys: [],
          };
          existFields.push(group);
        }
        group.fieldKeys.push(key);
      }
    };

    for (const f of formDef.fields || []) {
      processField(f, f.label);
    }
    for (const c of formDef.categories || []) {
      for (const f of c.fields || []) {
        processField(f, `${c.name} - ${f.label}`);
      }
    }

    if (existFields.length === 0) return;

    // Fetch data
    const newValidations: Record<string, Set<string>> = {};
    Promise.all(
      existFields.map(async (group) => {
        try {
          const entries = await listFormEntries(group.lookupFormId);
          const validValues = new Set<string>();
          entries.forEach((e) => {
            const v = e.data[group.lookupSourceField];
            if (v !== undefined && v !== null && String(v).trim() !== "") {
              validValues.add(String(v).trim());
            }
          });
          group.fieldKeys.forEach((k) => {
            newValidations[k] = validValues;
          });
        } catch (e) {
          console.error("Error checking exist validations", e);
        }
      })
    ).then(() => {
      setExistValidations((prev) => ({ ...prev, ...newValidations }));
    });

    return () => {
      setExistValidations({});
    };
  }, [formDef]);

  // Helper: format Unix timestamp or string to Jalali string
  const formatToJalali = (v: any) => {
    if (v === null || v === undefined) return "";
    let d: any;
    if (dayjs.isDayjs(v)) {
      d = v;
    } else if (typeof v === "number") {
      const ms = v < 10000000000 ? v * 1000 : v;
      d = dayjs(ms);
    } else if (typeof v === "string") {
      const s = v.trim();
      if (s === "") return "";
      const isNumericLike =
        !s.includes("-") && !s.includes("/") && !isNaN(Number(s));
      if (isNumericLike) {
        const n = Number(s);
        const ms = n < 10000000000 ? n * 1000 : n;
        d = dayjs(ms);
      } else {
        d = dayjs(s);
      }
    } else {
      return String(v);
    }
    if (!d || typeof d.format !== "function" || !(d as any).isValid?.()) {
      return String(v);
    }
    return d.format("YYYY-MM-DD");
  };

  // Helper: determine if a value should be considered meaningful/present for display/save
  const hasMeaningfulValue = (type: FormField["type"], v: any): boolean => {
    if (v === null || v === undefined) return false;
    switch (type) {
      case "text":
      case "select":
        return String(v).trim() !== "";
      case "number": {
        if (typeof v === "number") return !isNaN(v);
        if (typeof v === "string") {
          const s = v.trim();
          if (s === "") return false;
          const n = Number(s);
          return !isNaN(n);
        }
        return false;
      }
      case "date":
        return !!v; // Dayjs instance
      case "checkbox":
        return typeof v === "boolean";
      default:
        return String(v).trim() !== "";
    }
  };

  // Inline cell renderer and save handler must be defined before columns
  const renderInlineCell = (key: string) => {
    const meta = fieldMeta[key];
    const value = inlineValues[key];
    if (!meta) return null;
    switch (meta.type) {
      case "text":
        return (
          <Input
            value={value}
            onChange={(e) =>
              setInlineValues((p) => ({ ...p, [key]: e.target.value }))
            }
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) =>
              setInlineValues((p) => ({ ...p, [key]: e.target.value }))
            }
          />
        );
      case "date":
        // Ensure value is parsed/formatted as Jalali when present
        let dv: any = value;
        if (value && !dayjs.isDayjs(value)) {
          const possibleNum = Number(value);
          const val = (!isNaN(possibleNum) && String(value).trim() !== "" && !String(value).includes("-") && !String(value).includes("/"))
            ? (possibleNum < 10000000000 ? possibleNum * 1000 : possibleNum)
            : value;
          dv = dayjs(val);
        }
        return (
          <>
            <JalaliLocaleListener />
            <DatePickerJalali
              style={{ width: "100%" }}
              value={dv || null}
              onChange={(d) => setInlineValues((p) => ({ ...p, [key]: d }))}
            />
          </>
        );
      case "select":
        if (meta.options && meta.options.length) {
          return (
            <Select
              className="w-40"
              value={value ?? undefined}
              onChange={(v) => setInlineValues((p) => ({ ...p, [key]: v }))}
              options={meta.options.map((o) => ({ value: o, label: o }))}
              placeholder=" انتخاب کنید"
              allowClear
            />
          );
        }
        return (
          <Input
            value={value}
            onChange={(e) =>
              setInlineValues((p) => ({ ...p, [key]: e.target.value }))
            }
          />
        );
      case "checkbox":
        return (
          <Checkbox
            checked={!!value}
            onChange={(e) =>
              setInlineValues((p) => ({ ...p, [key]: e.target.checked }))
            }
          />
        );
      case "exist":
        return (
          <Space.Compact style={{ width: "100%" }}>
            <Input.Search
              value={value}
              enterButton="بررسی"
              placeholder="جستجو..."
              onChange={(e) =>
                setInlineValues((p) => ({ ...p, [key]: e.target.value }))
              }
              onSearch={async (val) => {
                if (!val) return;
                if (!meta.lookupFormId || !meta.lookupSourceField) {
                  message.warning("تنظیمات بررسی ناقص است");
                  return;
                }
                try {
                  const results = await listFormEntries(meta.lookupFormId);
                  const match = results.find(
                    (r) => String(r.data[meta.lookupSourceField!]) === String(val)
                  );
                  if (match) {
                    message.warning("این مقدار در فرم دیگر وجود دارد");
                  } else {
                    message.success("این مقدار در فرم دیگر یافت نشد");
                  }
                } catch (e) {
                  message.error("خطا در بررسی");
                }
              }}
            />
            {value && existValidations[key]?.has(String(value)) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 8px",
                  border: "1px solid #d9d9d9",
                  borderLeft: "none",
                  backgroundColor: "#f6ffed",
                }}
              >
                <Tooltip title="مقدار تکراری">
                  <CloseCircleTwoTone twoToneColor="#fea900ff" />
                </Tooltip>
              </div>
            )}
          </Space.Compact>
        );
      case "lookup":
        return (
          <Input.Search
            value={value}
            placeholder="جستجو..."
            onChange={(e) =>
              setInlineValues((p) => ({ ...p, [key]: e.target.value }))
            }
            onSearch={async (val) => {
              if (!val) return;
              if (!meta.lookupFormId || !meta.lookupSourceField) {
                message.warning("تنظیمات جستجو ناقص است");
                return;
              }
              try {
                const results = await listFormEntries(meta.lookupFormId);
                const match = results.find(
                  (r) => String(r.data[meta.lookupSourceField!]) === String(val)
                );
                if (match) {
                  const updates: Record<string, any> = {};
                  const categoryPrefix = key.includes(" - ")
                    ? key.split(" - ")[0] + " - "
                    : "";

                  // auto-fill based on matching labels
                  Object.keys(match.data).forEach((sourceLabel) => {
                    const val = match.data[sourceLabel];
                    // check direct match
                    if (fieldMeta[sourceLabel]) {
                      updates[sourceLabel] = val;
                    }
                    // check category prefixed match
                    else if (categoryPrefix && fieldMeta[categoryPrefix + sourceLabel]) {
                      updates[categoryPrefix + sourceLabel] = val;
                    }
                  });

                  setInlineValues((p) => ({ ...p, ...updates, [key]: val }));
                  message.success("داده‌ها بازخوانی شد");
                } else {
                  message.error("موردی یافت نشد");
                }
              } catch (e) {
                message.error("خطا در جستجو");
              }
            }}
          />
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) =>
              setInlineValues((p) => ({ ...p, [key]: e.target.value }))
            }
          />
        );
    }
  };

  const handleDuplicate = (row: any, categoryName?: string) => {
    if (!formDef) return;
    if (inlineAdd) {
      message.warning("در حال افزودن رکورد جدید هستید");
      return;
    }
    if (categoryName) {
      const cat = (formDef.categories || []).find((c) => c.name === categoryName);
      const initial: Record<string, any> = {};
      if (cat) {
        for (const f of (cat.fields ?? []) as FormField[]) {
          const key = `${cat.name} - ${f.label}`;
          const v = row?.data?.[key];
          if (f.type === "date" && v) {
            const val = typeof v === "number" && v < 10000000000 ? v * 1000 : v;
            initial[key] = dayjs(val);
          }
          else if (f.type === "checkbox") initial[key] = !!v;
          else if (f.type === "select") initial[key] = v ?? undefined;
          else initial[key] = v ?? "";
        }
        const colorKey = `${cat.name} - __color`;
        initial[colorKey] = row?.data?.[colorKey] ?? undefined;
      }
      setInlineValues(initial);
      setSubFieldsData([]);
      setEditingEntryId(null);
      setInlineAdd(true);
      setInlineScope({ type: "category", category: categoryName });
    } else {
      const initial: Record<string, any> = {};
      for (const f of (formDef.fields ?? []) as FormField[]) {
        const v = row?.data?.[f.label];
        if (f.type === "date" && v) {
          const val = typeof v === "number" && v < 10000000000 ? v * 1000 : v;
          initial[f.label] = dayjs(val);
        }
        else if (f.type === "checkbox") initial[f.label] = !!v;
        else initial[f.label] = v ?? "";
      }
      initial["__color"] = row?.data?.["__color"] ?? undefined;
      setInlineValues(initial);
      setSubFieldsData((row?.data?.subFieldsData || []) as Record<string, any>[]);
      setEditingEntryId(null);
      setInlineAdd(true);
      setInlineScope({ type: "base" });
    }
  };

  const handleEdit = (row: any, categoryName?: string) => {
    if (!formDef) return;
    if (inlineAdd) {
      message.warning("در حال افزودن/ویرایش رکورد هستید");
      return;
    }
    const initial: Record<string, any> = {};
    for (const f of (formDef.fields ?? []) as FormField[]) {
      const v = row?.data?.[f.label];
      if (f.type === "date" && v) {
        const val = typeof v === "number" && v < 10000000000 ? v * 1000 : v;
        initial[f.label] = dayjs(val);
      }
      else if (f.type === "checkbox") initial[f.label] = !!v;
      else if (f.type === "select") initial[f.label] = v ?? undefined;
      else initial[f.label] = v ?? "";
    }
    for (const c of formDef.categories || []) {
      for (const f of (c.fields ?? []) as FormField[]) {
        const key = `${c.name} - ${f.label}`;
        const v = row?.data?.[key];
        if (f.type === "date" && v) {
          const val = typeof v === "number" && v < 10000000000 ? v * 1000 : v;
          initial[key] = dayjs(val);
        }
        else if (f.type === "checkbox") initial[key] = !!v;
        else if (f.type === "select") initial[key] = v ?? undefined;
        else initial[key] = v ?? "";
      }
    }
    // Extra: category color fields
    for (const c of formDef.categories || []) {
      const colorKey = `${c.name} - __color`;
      initial[colorKey] = row?.data?.[colorKey] ?? undefined;
    }
    // Extra color field
    initial["__color"] = row?.data?.["__color"] ?? undefined;
    setInlineValues(initial);
    // Load subFieldsData if exists
    setSubFieldsData((row?.data?.subFieldsData || []) as Record<string, any>[]);
    setEditingEntryId(row.id);
    setInlineAdd(true);
    setInlineScope(
      categoryName
        ? { type: "category", category: categoryName }
        : { type: "base" }
    );
  };

  const handleView = (row: any, categoryName?: string) => {
    if (!formDef) return;
    const items: { label: string; value: any }[] = [];
    if (!categoryName) {
      for (const f of (formDef.fields ?? []) as FormField[]) {
        const v = row?.data?.[f.label];
        const meta = fieldMeta[f.label];
        let display = v;
        if (meta && meta.type === "checkbox") {
          const checked = v === true || v === "true" || v === 1 || v === "1";
          display = checked ? "✓" : "✗";
        } else if (meta && meta.type === "date") {
          display = formatToJalali(v);
        }
        items.push({ label: f.label, value: display });
      }
      const sub = (row?.data?.subFieldsData || []) as Record<string, any>[];
      setViewSubRows(Array.isArray(sub) ? sub : []);
      setViewTitle("مشاهده رکورد");
    } else {
      const cat = (formDef.categories || []).find((c) => c.name === categoryName);
      if (cat) {
        for (const f of (cat.fields ?? []) as FormField[]) {
          const key = `${cat.name} - ${f.label}`;
          const v = row?.data?.[key];
          const meta = fieldMeta[key];
          let display = v;
          if (meta && meta.type === "checkbox") {
            const checked = v === true || v === "true" || v === 1 || v === "1";
            display = checked ? "✓" : "✗";
          } else if (meta && meta.type === "date") {
            display = formatToJalali(v);
          }
          items.push({ label: f.label, value: display });
        }
      }
      setViewSubRows([]);
      setViewTitle(categoryName);
    }
    setViewItems(items);
    setViewOpen(true);
  };

  const handleDelete = (row: any, categoryName?: string) => {
    const isCategoryDelete = !!categoryName;
    Modal.confirm({
      title: isCategoryDelete ? "حذف رکورد در این دسته" : "حذف رکورد",
      content: isCategoryDelete
        ? "آیا از حذف داده‌های این دسته برای این رکورد مطمئن هستید؟"
        : "آیا از حذف کامل این رکورد مطمئن هستید؟",
      okText: "حذف",
      okType: "danger",
      cancelText: "انصراف",
      onOk: async () => {
        try {
          if (!formDef || !formId) return;
          if (!isCategoryDelete) {
            await deleteFormEntry(formId as string, row.id);
            message.success("رکورد حذف شد");
            load();
            return;
          }
          const cat = (formDef.categories || []).find((c) => c.name === categoryName);
          const updatedData: Record<string, any> = { ...(row?.data || {}) };
          if (cat) {
            for (const f of (cat.fields || []) as FormField[]) {
              const key = `${cat.name} - ${f.label}`;
              delete updatedData[key];
            }
            delete updatedData[`${cat.name} - __color`];
          }
          let hasAny = false;
          for (const f of (formDef.fields || []) as FormField[]) {
            const v = updatedData[f.label];
            if (hasMeaningfulValue(f.type, v)) {
              hasAny = true;
              break;
            }
          }
          if (!hasAny) {
            for (const c of formDef.categories || []) {
              if (c.name === categoryName) continue;
              for (const f of (c.fields || []) as FormField[]) {
                const v = updatedData[`${c.name} - ${f.label}`];
                if (hasMeaningfulValue(f.type, v)) {
                  hasAny = true;
                  break;
                }
              }
              if (hasAny) break;
            }
          }
          if (!hasAny) {
            const sub = updatedData["subFieldsData"];
            if (Array.isArray(sub) && sub.length > 0) {
              hasAny = true;
            }
          }
          if (!hasAny) {
            await deleteFormEntry(formId as string, row.id);
            message.success("به‌دلیل نبود داده دیگر، کل رکورد حذف شد");
          } else {
            await updateFormEntry(formId as string, row.id, { data: updatedData });
            message.success("داده‌های این دسته حذف شد");
          }
          load();
        } catch (e: any) {
          message.error(e?.message || "حذف رکورد ناموفق بود");
        }
      },
    });
  };

  const handleInlineSave = async () => {
    if (!formId || !formDef) return;
    try {
      // Validate required fields before building payload
      const missingRequired: string[] = [];
      for (const f of formDef.fields || []) {
        const v = inlineValues[f.label];
        if (f.required && !hasMeaningfulValue(f.type, v))
          missingRequired.push(f.label);
      }
      for (const c of formDef.categories || []) {
        for (const f of c.fields || []) {
          const key = `${c.name} - ${f.label}`;
          const v = inlineValues[key];
          if (f.required && !hasMeaningfulValue(f.type, v))
            missingRequired.push(key);
        }
      }
      if (missingRequired.length) {
        message.error(
          `لطفاً فیلدهای ضروری را کامل کنید: ${missingRequired.join("، ")}`
        );
        return;
      }

      const data: Record<string, any> = {};
      for (const f of formDef.fields || []) {
        const v = inlineValues[f.label];
        if (!hasMeaningfulValue(f.type, v)) continue;
        if (f.type === "date") {
          const possibleNum = Number(v);
          const val = (dayjs.isDayjs(v) || isNaN(possibleNum) || String(v).trim() === "" || String(v).includes("-") || String(v).includes("/"))
            ? v
            : (possibleNum < 10000000000 ? possibleNum * 1000 : possibleNum);
          data[f.label] = (dayjs(val) as any).unix();
        }
        else if (f.type === "number") {
          const n = typeof v === "number" ? v : Number(v);
          if (!isNaN(n)) data[f.label] = n;
        } else if (f.type === "checkbox") {
          data[f.label] = v as boolean;
        } else {
          data[f.label] = String(v).trim();
        }
      }
      for (const c of formDef.categories || []) {
        for (const f of c.fields || []) {
          const key = `${c.name} - ${f.label}`;
          const v = inlineValues[key];
          if (!hasMeaningfulValue(f.type, v)) continue;
          if (f.type === "date") {
            const possibleNum = Number(v);
            const val = (dayjs.isDayjs(v) || isNaN(possibleNum) || String(v).trim() === "" || String(v).includes("-") || String(v).includes("/"))
              ? v
              : (possibleNum < 10000000000 ? possibleNum * 1000 : possibleNum);
            data[key] = (dayjs(val) as any).unix();
          }
          else if (f.type === "number") {
            const n = typeof v === "number" ? v : Number(v);
            if (!isNaN(n)) data[key] = n;
          } else if (f.type === "checkbox") {
            data[key] = v as boolean;
          } else {
            data[key] = String(v).trim();
          }
        }
      }
      // Include color per category
      for (const c of formDef.categories || []) {
        const colorKey = `${c.name} - __color`;
        const v = inlineValues[colorKey];
        if (typeof v === "string" && v.trim() !== "") {
          data[colorKey] = v.trim();
        }
      }
      // Include color if selected
      if (
        typeof inlineValues["__color"] === "string" &&
        inlineValues["__color"].trim() !== ""
      ) {
        data["__color"] = inlineValues["__color"].trim();
      }
      // Include subFieldsData if there's any data (simpler condition)
      if (subFieldsData.length > 0) {
        data["subFieldsData"] = subFieldsData.map((row) => {
          const newRow = { ...row };
          (formDef.subFields || []).forEach((sf) => {
            if (sf.type === "date" && dayjs.isDayjs(newRow[sf.label])) {
              newRow[sf.label] = newRow[sf.label].unix();
            }
          });
          return newRow;
        });
      }
      if (editingEntryId) {
        await updateFormEntry(formId, editingEntryId, { data });
        message.success("ویرایش رکورد انجام شد");
      } else {
        await createFormEntry(formId, { data });
        message.success("رکورد جدید ثبت شد");
      }
      setInlineAdd(false);
      setEditingEntryId(null);
      setInlineValues({});
      setSubFieldsData([]);
      load();
    } catch (e: any) {
      message.error(e?.message || "ثبت داده ناموفق بود");
    }
  };


  const allColumns = useMemo(() => {
    const cols: any[] = [];
    if (!formDef) return cols;
    // Actions column for inline add row
    cols.push({
      title: "عملیات",
      key: "__actions",
      fixed: "right",
      align: "left",
      render: (_: any, row: any) =>
        row.id === "__new__" ? (
          <Space>
            <Button type="primary" onClick={handleInlineSave}>
              ثبت
            </Button>
            <Button
              onClick={() => {
                setInlineAdd(false);
                setInlineValues({});
                setEditingEntryId(null);
              }}
            >
              لغو
            </Button>
          </Space>
        ) : (
          <Space>
            <Button onClick={() => handleDuplicate(row)}>کپی</Button>
            <Button onClick={() => handleEdit(row)}>ویرایش</Button>
            <Button danger onClick={() => handleDelete(row)}>
              حذف
            </Button>
          </Space>
        ),
    });
    // Base fields
    for (const f of formDef.fields || []) {
      cols.push({
        title: f.label,
        dataIndex: ["data", f.label],
        key: f.label,
        render: (val: any, row: any) =>
          row.id === "__new__"
            ? renderInlineCell(f.label)
            : fieldMeta[f.label]?.type === "exist"
              ? (
                <Space>
                  {val}
                  {val && existValidations[f.label]?.has(String(val)) && (
                    <Tooltip title="تایید شده">
                      <CloseCircleTwoTone twoToneColor="#52c41a" />
                    </Tooltip>
                  )}
                </Space>
              )
              : fieldMeta[f.label]?.type === "date"
                ? formatToJalali(val)
                : val,
      });
    }
    // Extra color field (appended after base fields)
    cols.push({
      title: "رنگ",
      dataIndex: ["data", "__color"],
      key: "__color",
    });
    // Category fields (flattened with prefix)
    for (const c of formDef.categories || []) {
      for (const f of c.fields || []) {
        const key = `${c.name} - ${f.label}`;
        cols.push({
          title: key,
          dataIndex: ["data", key],
          key,
          render: (val: any, row: any) =>
            row.id === "__new__"
              ? renderInlineCell(key)
              : fieldMeta[key]?.type === "checkbox"
                ? typeof val === "boolean"
                  ? val
                    ? "✓"
                    : "✗"
                  : "—"
                : fieldMeta[key]?.type === "exist"
                  ? (
                    <Space>
                      {val}
                      {val && existValidations[key]?.has(String(val)) && (
                        <Tooltip title="مقدار تکراری">
                          <CloseCircleTwoTone twoToneColor="#fea900ff" />
                        </Tooltip>
                      )}
                    </Space>
                  )
                  : fieldMeta[key]?.type === "date"
                    ? formatToJalali(val)
                    : val,
        });
      }
    }
    // Category color columns
    for (const c of formDef.categories || []) {
      const colorKey = `${c.name} - __color`;
      cols.push({
        title: `${c.name} - رنگ`,
        dataIndex: ["data", colorKey],
        key: colorKey,
      });
    }
    // Prevent header title wrapping for all columns
    return cols.map((c) => ({
      ...c,
      onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }),
    }));
  }, [formDef, inlineValues, existValidations]);

  const baseColumns = useMemo(() => {
    const cols: any[] = [];
    if (!formDef) return cols;

    // Index column
    cols.push({
      title: "ردیف",
      key: "index",
      width: 60,
      align: "center",
      render: (_, row: any, index: number) => index + 1,
    });

    // Base fields only
    for (const f of formDef.fields || []) {
      cols.push({
        title: f.label,
        dataIndex: ["data", f.label],
        key: f.label,
        render: (val: any) => {
          const meta = fieldMeta[f.label];
          if (meta?.type === "checkbox") {
            return typeof val === "boolean" ? (val ? "✓" : "✗") : "—";
          }
          if (meta?.type === "exist") {
            return (
              <Space>
                {val}
                {val && existValidations[f.label]?.has(String(val)) && (
                  <Tooltip title="مقدار تکراری">
                    <CloseCircleTwoTone twoToneColor="#fea900ff" />
                  </Tooltip>
                )}
              </Space>
            );
          }
          if (meta?.type === "date") {
            return formatToJalali(val);
          }
          return val;
        },
      });
    }

    // Actions: duplicate, edit, delete (hide in export mode)
    if (!exportView) {
      cols.push({
        title: "عملیات",
        key: "__actions",
        fixed: "right",
        align: "left",
        render: (_: any, row: any) => (
          <Space>
            <Button onClick={() => handleView(row, undefined)}>نمایش</Button>
            {hasWriteAccess && <Button onClick={() => handleDuplicate(row, undefined)}>کپی</Button>}
            {hasWriteAccess && <Button onClick={() => handleEdit(row, undefined)}>ویرایش</Button>}
            {hasWriteAccess && (
              <Button danger onClick={() => handleDelete(row)}>
                حذف
              </Button>
            )}
          </Space>
        ),
      });
    }
    return cols.map((c) => ({
      ...c,
      onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }),
    }));
  }, [formDef, fieldMeta, exportView, existValidations]);

  const categoryTables = useMemo(() => {
    const tables: { name: string; columns: any[]; rows: FormEntryRecord[] }[] =
      [];
    if (!formDef) return tables;
    for (const c of formDef.categories || []) {
      if (!c.fields || c.fields.length === 0) continue;
      const cols: any[] = [];

      // Index column
      cols.push({
        title: "ردیف",
        key: "index",
        render: (_, row: any, index: number) => index + 1,
      });

      const keys: string[] = [];
      for (const f of c.fields || []) {
        const key = `${c.name} - ${f.label}`;
        keys.push(key);
        cols.push({
          title: f.label,
          dataIndex: ["data", key],
          key,
          render: (val: any) => {
            const meta = fieldMeta[key];
            if (meta?.type === "checkbox") {
              return typeof val === "boolean" ? (val ? "✓" : "—") : "—";
            }
            if (meta?.type === "exist") {
              return (
                <Space>
                  {val}
                  {val && existValidations[key]?.has(String(val)) && (
                    <Tooltip title="مقدار تکراری">
                      <CloseCircleTwoTone twoToneColor="#fea900ff" />
                    </Tooltip>
                  )}
                </Space>
              );
            }
            if (meta?.type === "date") {
              return formatToJalali(val);
            }
            return val;
          },
        });
      }

      // Actions: duplicate, edit, delete (hide in export mode)
      if (!exportView) {
        cols.push({
          title: "عملیات",
          key: "__actions",
          fixed: "right",
          align: "left",
          render: (_: any, row: any) => (
            <Space>
              <Button onClick={() => handleView(row, c.name)}>نمایش</Button>
              {hasWriteAccess && <Button onClick={() => handleDuplicate(row, c.name)}>کپی</Button>}
              {hasWriteAccess && <Button onClick={() => handleEdit(row, c.name)}>ویرایش</Button>}
              {hasWriteAccess && (
                <Button danger onClick={() => handleDelete(row, c.name)}>
                  حذف
                </Button>
              )}
            </Space>
          ),
        });
      }

      const rows = entries
        .filter((e) =>
          keys.some((k) => {
            const meta = fieldMeta[k];
            return meta
              ? hasMeaningfulValue(meta.type, (e.data || {})[k])
              : false;
          })
        )
        .slice()
        .sort((a, b) => {
          const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return ad - bd; // oldest first, newest last
        });
      tables.push({
        name: c.name,
        columns: cols.map((c2) => ({
          ...c2,
          onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }),
        })),
        rows,
      });
    }
    return tables;
  }, [formDef, entries, fieldMeta, exportView, existValidations]);

  // Inline add columns: split into base and per-category rows
  const addBaseColumns = useMemo(() => {
    const cols: any[] = [];
    if (!formDef) return cols;

    for (const f of formDef.fields || []) {
      cols.push({
        title: f.label,
        dataIndex: ["data", f.label],
        key: f.label,
        render: (_val: any, row: any) =>
          row.id === "__new__" ? renderInlineCell(f.label) : _val,
      });
    }

    // Extra color field (last item before actions)
    cols.push({
      title: "رنگ",
      dataIndex: ["data", "__color"],
      key: "__color",
      render: (_val: any, row: any) =>
        row.id === "__new__" ? (
          <ColorPicker
            defaultFormat={'hex'}
            format={'hex'}
            disabledAlpha
            allowClear
            disabledFormat
            value={inlineValues["__color"] ?? undefined}
            onChange={(_, hex) => {
              setInlineValues((p) => ({ ...p, __color: _.toHexString() }))
            }
            }
            presets={[
              { label: "رنگ های پیش فرض", colors: ["#ff8170", "#fcc266", "#fffd70", "#70ff99", "#70d9ff", "#ff70d4", "#8370ff", "#e6e6e6"] },
            ]}
          />
        ) : (
          _val
        ),
    });

    // Actions
    cols.push({
      title: "عملیات",
      key: "__actions",
      fixed: "right",
      align: "left",
      render: (_: any, row: any) =>
        row.id === "__new__" ? (
          <Space>
            <Button type="primary" onClick={handleInlineSave}>
              ثبت
            </Button>
            <Button
              onClick={() => {
                setInlineAdd(false);
                setInlineValues({});
                setEditingEntryId(null);
              }}
            >
              لغو
            </Button>
          </Space>
        ) : null,
    });

    return cols.map((c) => ({
      ...c,
      onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }),
    }));
  }, [formDef, inlineValues, subFieldsData, editingEntryId]);

  const addCategoryTables = useMemo(() => {
    const tables: { name: string; columns: any[] }[] = [];
    if (!formDef) return tables;
    for (const c of formDef.categories || []) {
      if (!c.fields || c.fields.length === 0) continue;
      const cols: any[] = [];

      for (const f of c.fields || []) {
        const key = `${c.name} - ${f.label}`;
        cols.push({
          title: f.label,
          dataIndex: ["data", key],
          key,
          render: (_val: any, row: any) =>
            row.id === "__new__" ? renderInlineCell(key) : _val,
        });
      }

      // Category color column (inline add)
      {
        const colorKey = `${c.name} - __color`;
        cols.push({
          title: "رنگ",
          dataIndex: ["data", colorKey],
          key: colorKey,
          render: (_val: any, row: any) =>
            row.id === "__new__" ? (
              <ColorPicker
                value={inlineValues[colorKey] ?? undefined}
                defaultFormat={'hex'}
                format={'hex'}
                disabledAlpha
                allowClear
                disabledFormat
                onChange={(_, hex) =>
                  setInlineValues((p) => ({ ...p, [colorKey]: _.toHexString() }))
                }
                presets={[
                  { label: "رنگ های پیش فرض", colors: ["#ff8170", "#fcc266", "#fffd70", "#70ff99", "#70d9ff", "#ff70d4", "#8370ff", "#e6e6e6"] },
                ]}
              />
            ) : (
              _val
            ),
        });
      }

      cols.push({
        title: "عملیات",
        key: "__actions",
        fixed: "right",
        align: "left",
        render: (_: any, row: any) =>
          row.id === "__new__" ? (
            <Space>
              <Button type="primary" onClick={handleInlineSave}>
                ثبت
              </Button>
              <Button
                onClick={() => {
                  setInlineAdd(false);
                  setInlineValues({});
                  setEditingEntryId(null);
                }}
              >
                لغو
              </Button>
            </Space>
          ) : null,
      });
      tables.push({
        name: c.name,
        columns: cols.map((c2) => ({
          ...c2,
          onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }),
        })),
      });
    }
    return tables;
  }, [formDef, inlineValues, subFieldsData, editingEntryId]);

  // Filter entries shown in the base table to only those having meaningful values in base fields
  const filteredBaseEntries = useMemo(() => {
    if (!formDef)
      return entries.slice().sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ad - bd;
      });
    const keys = (formDef.fields || []).map((f) => f.label);
    if (!keys.length) return [];
    return entries
      .filter((e) =>
        keys.some((k) => {
          const meta = fieldMeta[k];
          return meta
            ? hasMeaningfulValue(meta.type, (e.data || {})[k])
            : false;
        })
      )
      .slice()
      .sort((a, b) => {
        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ad - bd; // oldest first, newest last
      });
  }, [entries, formDef, fieldMeta]);

  const exportMode = () => {
    setExportView(true);
  };


  // Normalize color string into ExcelJS ARGB format (e.g., FFAABBCC)
  const normalizeColorToArgb = (input: any): string | null => {
    if (!input) return null;
    const s = String(input).trim();
    // #RRGGBB or #RGB
    if (s.startsWith('#')) {
      const hex = s.slice(1);
      if (hex.length === 3) {
        const r = hex[0];
        const g = hex[1];
        const b = hex[2];
        return `FF${r}${r}${g}${g}${b}${b}`.toUpperCase();
      }
      if (hex.length === 6) {
        return (`FF${hex}`).toUpperCase();
      }
      return null;
    }
    // rgb(r,g,b) or rgba(r,g,b,a)
    const m = s.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\)/i);
    if (m) {
      const r = Math.max(0, Math.min(255, parseInt(m[1], 10) || 0));
      const g = Math.max(0, Math.min(255, parseInt(m[2], 10) || 0));
      const b = Math.max(0, Math.min(255, parseInt(m[3], 10) || 0));
      // ignore alpha for now; always opaque
      const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
      return `FF${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    return null;
  };

  const downloadXlsx = async () => {
    if (!formDef) return;
    const targetEntries = selectedRowIds.length
      ? entries.filter((e) => selectedRowIds.includes(e.id))
      : selectAll
        ? entries.slice()
        : [];
    if (!targetEntries.length) {
      message.warning("هیچ رکوردی برای خروجی انتخاب نشده است");
      return;
    }
    if (randomOrder) {
      for (let i = targetEntries.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [targetEntries[i], targetEntries[j]] = [
          targetEntries[j],
          targetEntries[i],
        ];
      }
    }

    const wb = new ExcelJS.Workbook();
    const filterCols = selectedExportColumns.length > 0;
    const selColsSet = new Set(selectedExportColumns);

    // Base sheet (فیلدهای اصلی)
    if ((formDef.fields || []).length) {
      const wsBase = wb.addWorksheet("فیلدهای اصلی", { views: [{ rightToLeft: true }] });
      let baseHeaders = (formDef.fields || []).map((f) => f.label);
      if (filterCols) baseHeaders = baseHeaders.filter((lab) => selColsSet.has(lab));
      const headersWithIndex = ["ردیف", ...baseHeaders];
      wsBase.addRow(headersWithIndex);
      const headerRow = wsBase.getRow(1);
      headerRow.font = { bold: true } as any;
      headerRow.alignment = { horizontal: "right" } as any;
      wsBase.columns = headersWithIndex.map((h) => ({ header: h, width: Math.max(12, Math.min(40, String(h).length + 6)) })) as any;

      let rIndex = 2;
      for (const e of targetEntries) {
        const keys = baseHeaders;
        const hasAny = keys.some((k) => {
          const meta = fieldMeta[k];
          return meta ? hasMeaningfulValue(meta.type, (e.data || {})[k]) : false;
        });
        if (!hasAny) continue;
        const values = keys.map((k) => {
          const meta = fieldMeta[k];
          const v = (e.data || {})[k];
          if (meta && meta.type === "checkbox") {
            const checked = v === true || v === "true" || v === 1 || v === "1";
            return checked ? "✓" : "";
          }
          if (meta && meta.type === "date") {
            return formatToJalali(v);
          }
          return v ?? "";
        });
        const rowValues = [(rIndex - 1).toString(), ...values];
        wsBase.addRow(rowValues);
        const row = wsBase.getRow(rIndex);
        row.alignment = { horizontal: "right" } as any;
        const argb = normalizeColorToArgb((e.data || {})["__color"]);
        if (includeColors && argb) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb },
              bgColor: { argb },
            } as any;
          });
        }
        rIndex++;

        // Nested sub-fields rows
        if (
          formDef.subFields &&
          formDef.subFields.length > 0 &&
          e.data?.subFieldsData &&
          Array.isArray(e.data.subFieldsData) &&
          e.data.subFieldsData.length > 0
        ) {
          const subLabels = (formDef.subFields || []).map((sf) => sf.label);
          const subLabelsWithIndex = ["ردیف", ...subLabels];
          wsBase.addRow(subLabelsWithIndex);
          const subHeaderRow = wsBase.getRow(rIndex);
          subHeaderRow.font = { italic: true, size: 10, color: { argb: "FF555555" } } as any;
          subHeaderRow.alignment = { horizontal: "right" } as any;
          subHeaderRow.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF0F0F0" },
            } as any;
          });
          rIndex++;

          let subIdx = 1;
          for (const subItem of e.data.subFieldsData as any[]) {
            const subValues = (formDef.subFields || []).map((sf) => {
              const v = subItem[sf.label];
              if (sf.type === "checkbox") {
                const checked = v === true || v === "true" || v === 1 || v === "1";
                return checked ? "✓" : "";
              }
              if (sf.type === "date") {
                return formatToJalali(v);
              }
              return v ?? "";
            });
            const subValuesWithIndex = [subIdx.toString(), ...subValues];
            wsBase.addRow(subValuesWithIndex);
            subIdx++;
            const subDataRow = wsBase.getRow(rIndex);
            subDataRow.font = { size: 10 } as any;
            subDataRow.alignment = { horizontal: "right" } as any;
            subDataRow.eachCell((cell) => {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF9F9F9" },
              } as any;
            });
            rIndex++;
          }
        }
      }
    }

    // Category sheets
    for (const c of formDef.categories || []) {
      if (!c.fields || c.fields.length === 0) continue;
      const wsCat = wb.addWorksheet(c.name, { views: [{ rightToLeft: true }] });
      let catHeaders = (c.fields || []).map((f) => f.label);
      const catSel = selectedExportColumnsByCategory[c.name];
      if (catSel && catSel.length > 0) {
        const catSet = new Set(catSel);
        catHeaders = catHeaders.filter((lab) => catSet.has(`${c.name} - ${lab}`));
      } else if (filterCols) {
        catHeaders = catHeaders.filter((lab) => selColsSet.has(`${c.name} - ${lab}`));
      }
      const catHeadersWithIndex = ["ردیف", ...catHeaders];
      wsCat.addRow(catHeadersWithIndex);
      const headerRow = wsCat.getRow(1);
      headerRow.font = { bold: true } as any;
      headerRow.alignment = { horizontal: "right" } as any;
      wsCat.columns = catHeadersWithIndex.map((h) => ({ header: h, width: Math.max(12, Math.min(40, String(h).length + 6)) })) as any;


      let rIndex = 2;
      for (const e of targetEntries) {
        const keys = catHeaders.map((lab) => `${c.name} - ${lab}`);
        const hasAny = keys.some((k) => {
          const meta = fieldMeta[k];
          return meta ? hasMeaningfulValue(meta.type, (e.data || {})[k]) : false;
        });
        if (!hasAny) continue;
        const values = catHeaders.map((lab) => {
          const key = `${c.name} - ${lab}`;
          const meta = fieldMeta[key];
          const v = (e.data || {})[key];
          if (meta && meta.type === "checkbox") {
            const checked = v === true || v === "true" || v === 1 || v === "1";
            return checked ? "✓" : "";
          }
          if (meta && meta.type === "date") {
            return formatToJalali(v);
          }
          return v ?? "";
        });
        const rowValues = [(rIndex - 1).toString(), ...values];
        wsCat.addRow(rowValues);
        const row = wsCat.getRow(rIndex);
        row.alignment = { horizontal: "right" } as any;
        const argb = normalizeColorToArgb((e.data || {})[`${c.name} - __color`]);
        if (includeColors && argb) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb },
              bgColor: { argb },
            } as any;
          });
        }
        rIndex++;
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formDef.name}-entries.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (!formDef) return;
    const targetEntries = selectedRowIds.length
      ? entries.filter((e) => selectedRowIds.includes(e.id))
      : selectAll
        ? entries.slice()
        : [];

    if (!targetEntries.length) {
      message.warning("هیچ رکوردی برای خروجی انتخاب نشده است");
      return;
    }
    if (randomOrder) {
      for (let i = targetEntries.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [targetEntries[i], targetEntries[j]] = [
          targetEntries[j],
          targetEntries[i],
        ];
      }
    }

    const filterCols = selectedExportColumns.length > 0;
    const selColsSet = new Set(selectedExportColumns);

    const container = document.createElement("div");
    container.style.pointerEvents = "none";
    container.style.zIndex = "0";
    container.style.width = pdfLandscape ? "1115px" : "785px";
    container.style.padding = "16px";
    container.style.background = "#fff";
    container.style.direction = "rtl";
    container.style.fontFamily =
      "system-ui, -apple-system, Segoe UI, Roboto, Vazirmatn, Arial, sans-serif";
    container.style.color = "#000";

    // Header with logo at the top
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "center";
    header.style.alignItems = "center";
    header.style.marginBottom = "12px";
    const headerImg = document.createElement("img");
    headerImg.src = String(logo);
    headerImg.alt = "Logo";
    headerImg.style.maxHeight = "60px";
    headerImg.style.objectFit = "contain";
    header.appendChild(headerImg);
    container.appendChild(header);

    // Optional description text and image below the header
    let contentImg: HTMLImageElement | null = null;
    if (formDef?.pdfDescription && String(formDef.pdfDescription).trim().length) {
      const desc = document.createElement("p");
      desc.textContent = String(formDef.pdfDescription);
      desc.style.margin = "0 0 12px";
      desc.style.fontSize = "13px";
      desc.style.lineHeight = "1.6";
      desc.style.textAlign = "right";
      container.appendChild(desc);
    }
    if (formDef?.pdfImage) {
      const imageMap: Record<string, string> = {
        "fire_department.png": String(logo),
        "react.svg": String(reactLogo),
      };
      const assetSrc = imageMap[String(formDef.pdfImage)] || "";
      if (assetSrc) {
        contentImg = document.createElement("img");
        contentImg.src = assetSrc;
        contentImg.alt = "تصویر توضیح";
        contentImg.style.maxWidth = "100%";
        contentImg.style.maxHeight = "300px";
        contentImg.style.objectFit = "contain";
        contentImg.style.marginBottom = "12px";
        contentImg.style.display = "block";
        contentImg.style.marginLeft = "auto";
        contentImg.style.marginRight = "auto";
        container.appendChild(contentImg);
      }
    }

    const makeSection = (
      title: string,
      labels: string[],
      valueOf: (e: any, l: string) => any,
      colorOf?: (e: any) => any,
      metaKeyOf?: (l: string) => string,
      isBaseSection: boolean = false
    ) => {
      if (!labels.length) return;
      const section = document.createElement("section");
      section.style.pageBreakInside = "avoid";
      section.style.marginBottom = "16px";
      const h2 = document.createElement("h2");
      h2.textContent = title;
      h2.style.margin = "0 0 8px";
      h2.style.fontSize = "14px";
      h2.style.textAlign = "right";
      section.appendChild(h2);

      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.direction = "rtl";

      const thead = document.createElement("thead");
      const trh = document.createElement("tr");
      const thIndex = document.createElement("th");
      thIndex.textContent = "ردیف";
      thIndex.style.border = "1px solid #ccc";
      thIndex.style.padding = "6px 8px";
      thIndex.style.width = "50px";
      thIndex.style.textAlign = "center";
      thIndex.style.verticalAlign = "middle";
      thIndex.style.backgroundColor = "#f7f7f7";
      trh.appendChild(thIndex);

      labels.forEach((lab) => {
        const th = document.createElement("th");
        th.textContent = lab;
        th.style.border = "1px solid #ccc";
        th.style.padding = "6px 8px";
        th.style.textAlign = "right";
        th.style.verticalAlign = "middle";
        th.style.backgroundColor = "#f7f7f7";
        trh.appendChild(th);
      });
      thead.appendChild(trh);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      let addedRows = 0;
      for (const e of targetEntries) {
        const hasAny = labels.some((lab) => {
          const metaKey = metaKeyOf ? metaKeyOf(lab) : lab;
          const meta = fieldMeta[metaKey];
          const v = valueOf(e, lab);
          if (meta) return hasMeaningfulValue(meta.type, v);
          if (v === null || v === undefined) return false;
          if (typeof v === "string") return v.trim().length > 0;
          if (Array.isArray(v)) return v.length > 0;
          return true;
        });

        if (!hasAny) continue;

        const tr = document.createElement("tr");
        tr.style.textAlign = "right";
        if (includeColors && colorOf) {
          const color = colorOf(e);
          if (color) {
            tr.style.backgroundColor = String(color);
          }
        }
        const tdIndex = document.createElement("td");
        tdIndex.textContent = String(addedRows + 1);
        tdIndex.style.border = "1px solid #ddd";
        tdIndex.style.padding = "6px 8px";
        tdIndex.style.width = "50px";
        tdIndex.style.textAlign = "center";
        tdIndex.style.verticalAlign = "middle";
        tr.appendChild(tdIndex);

        labels.forEach((lab) => {
          const td = document.createElement("td");
          const v = valueOf(e, lab);
          const metaKey = metaKeyOf ? metaKeyOf(lab) : lab;
          const meta = fieldMeta[metaKey];
          let display = v;
          if (meta && meta.type === "checkbox") {
            const checked = v === true || v === "true" || v === 1 || v === "1";
            display = checked ? "✓" : "";
          } else if (meta && meta.type === "date") {
            display = formatToJalali(v);
          }
          td.textContent = display === null || display === undefined ? "" : String(display);
          td.style.border = "1px solid #ddd";
          td.style.padding = "6px 8px";
          td.style.textAlign = "right";
          td.style.verticalAlign = "middle";
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
        addedRows++;

        // Render sub-fields if exists
        if (
          isBaseSection &&
          formDef.subFields &&
          formDef.subFields.length > 0 &&
          e.data?.subFieldsData &&
          Array.isArray(e.data.subFieldsData) &&
          e.data.subFieldsData.length > 0
        ) {
          const subTr = document.createElement("tr");
          const subTd = document.createElement("td");
          subTd.colSpan = labels.length + 1;
          subTd.style.padding = "0 8px 12px 24px";
          subTd.style.backgroundColor = "#fafafa";

          const subTable = document.createElement("table");
          subTable.style.width = "100%";
          subTable.style.borderCollapse = "collapse";
          subTable.style.marginTop = "4px";
          subTable.style.fontSize = "11px";
          subTable.style.direction = "rtl";

          const subThead = document.createElement("thead");
          const subTrh = document.createElement("tr");
          const subThIdx = document.createElement("th");
          subThIdx.textContent = "ردیف";
          subThIdx.style.border = "1px solid #eee";
          subThIdx.style.padding = "4px 6px";
          subThIdx.style.width = "50px";
          subThIdx.style.textAlign = "center";
          subThIdx.style.verticalAlign = "middle";
          subThIdx.style.backgroundColor = "#eeeeee";
          subTrh.appendChild(subThIdx);

          (formDef.subFields || []).forEach((sf) => {
            const th = document.createElement("th");
            th.textContent = sf.label;
            th.style.border = "1px solid #eee";
            th.style.padding = "4px 6px";
            th.style.textAlign = "right";
            th.style.verticalAlign = "middle";
            th.style.backgroundColor = "#eeeeee";
            subTrh.appendChild(th);
          });
          subThead.appendChild(subTrh);
          subTable.appendChild(subThead);

          const subTbody = document.createElement("tbody");
          (e.data.subFieldsData as any[]).forEach((subRow, subIdx) => {
            const rowTr = document.createElement("tr");
            const rowTdIdx = document.createElement("td");
            rowTdIdx.textContent = String(subIdx + 1);
            rowTdIdx.style.border = "1px solid #eee";
            rowTdIdx.style.padding = "4px 6px";
            rowTdIdx.style.width = "50px";
            rowTdIdx.style.textAlign = "center";
            rowTdIdx.style.verticalAlign = "middle";
            rowTr.appendChild(rowTdIdx);

            (formDef.subFields || []).forEach((sf) => {
              const rowTd = document.createElement("td");
              const val = subRow[sf.label];
              let disp = val;
              if (sf.type === "checkbox") {
                disp = val === true || val === "true" || val === 1 || val === "1" ? "✓" : "";
              } else if (sf.type === "date") {
                disp = formatToJalali(val);
              }
              rowTd.textContent = disp === null || disp === undefined ? "" : String(disp);
              rowTd.style.border = "1px solid #eee";
              rowTd.style.padding = "4px 6px";
              rowTd.style.textAlign = "right";
              rowTd.style.verticalAlign = "middle";
              rowTr.appendChild(rowTd);
            });
            subTbody.appendChild(rowTr);
          });
          subTable.appendChild(subTbody);
          subTd.appendChild(subTable);
          subTr.appendChild(subTd);
          tbody.appendChild(subTr);
        }
      }

      if (addedRows > 0) {
        table.appendChild(tbody);
        section.appendChild(table);
        container.appendChild(section);
      }
    };

    // Base section
    {
      const baseInit = (formDef.fields || []).map((f) => f.label);
      const baseLabels = filterCols ? baseInit.filter((lab) => selColsSet.has(lab)) : baseInit;
      makeSection(
        "",
        baseLabels,
        (e, lab) => (e.data || {})[lab] ?? "",
        (e) => (e.data || {})["__color"],
        undefined,
        true
      );
    }

    // Category sections
    for (const c of formDef.categories || []) {
      const catInit = (c.fields || []).map((f) => f.label);
      const catSel = selectedExportColumnsByCategory[c.name];
      let catLabels = catInit;
      if (catSel && catSel.length > 0) {
        const catSet = new Set(catSel);
        catLabels = catInit.filter((lab) => catSet.has(`${c.name} - ${lab}`));
      } else if (filterCols) {
        catLabels = catInit.filter((lab) => selColsSet.has(`${c.name} - ${lab}`));
      }
      makeSection(
        c.name,
        catLabels,
        (e, lab) => (e.data || {})[`${c.name} - ${lab}`] ?? "",
        (e) => (e.data || {})[`${c.name} - __color`],
        (lab) => `${c.name} - ${lab}`,
        false
      );
    }

    if (!container.children.length) {
      message.warning("هیچ داده‌ای برای خروجی PDF یافت نشد");
      return;
    }
    document.body.appendChild(container);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    // Ensure the logo image is loaded prior to rendering to canvas
    // Wait for header and optional content images
    const imgs: HTMLImageElement[] = [headerImg];
    if (contentImg) imgs.push(contentImg);
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );
    try {
      // Ensure required globals for html2pdf are available
      const [jspdfMod, html2canvasMod] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const jsPDF =
        (jspdfMod as any).jsPDF || (jspdfMod as any).default?.jsPDF;
      if (jsPDF) {
        (window as any).jspdf = { jsPDF };
      }
      (window as any).html2canvas =
        (html2canvasMod as any).default || (html2canvasMod as any);

      const mod = await import("html2pdf.js");
      // html2pdf.js attaches a global function on window in UMD builds
      const html2pdfGlobal = (window as any).html2pdf;
      const html2pdfCandidate =
        html2pdfGlobal || (mod as any).default || (mod as any).html2pdf || (mod as any);
      if (typeof html2pdfCandidate !== "function") {
        throw new Error("html2pdf function is not available");
      }
      const opt = {
        margin: [1, 1, 9, 1],
        filename: `${formDef.name}-entries.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          ignoreElements: (element: Element) => {
            if (element.tagName === "STYLE" && element.innerHTML.includes("oklch")) {
              return true;
            }
            return false;
          },
          // Sanitize oklch colors in cloned DOM before rendering (fixes production build issue)
          onclone: (clonedDoc: Document) => {
            // Remove style elements containing oklch
            const styles = clonedDoc.querySelectorAll("style");
            styles.forEach((style) => {
              if (style.innerHTML.includes("oklch")) {
                style.remove();
              }
            });
            // Walk through all elements and replace oklch in inline styles
            const allElements = clonedDoc.querySelectorAll("*");
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              if (htmlEl.style && htmlEl.style.cssText) {
                if (htmlEl.style.cssText.includes("oklch")) {
                  // Replace oklch values with transparent or remove the property
                  htmlEl.style.cssText = htmlEl.style.cssText.replace(
                    /oklch\([^)]+\)/gi,
                    "transparent"
                  );
                }
              }
              // Also check computed style CSS variables and override them
              try {
                const computed = clonedDoc.defaultView?.getComputedStyle(htmlEl);
                if (computed) {
                  // Force background and color to simple values if they contain oklch
                  const bgColor = computed.backgroundColor;
                  const color = computed.color;
                  const borderColor = computed.borderColor;
                  if (bgColor && bgColor.includes("oklch")) {
                    htmlEl.style.backgroundColor = "transparent";
                  }
                  if (color && color.includes("oklch")) {
                    htmlEl.style.color = "#000000";
                  }
                  if (borderColor && borderColor.includes("oklch")) {
                    htmlEl.style.borderColor = "#cccccc";
                  }
                }
              } catch {
                // Ignore errors from getComputedStyle
              }
            });
          },
        },
        pagebreak: { mode: ["css", "legacy"] },
        jsPDF: { unit: "mm", format: "a4", orientation: pdfLandscape ? "landscape" : "portrait" },
      } as any;
      await html2pdfCandidate().from(container).set(opt).save();
    } catch (err) {
      console.error(err);
      message.error("خطا در تولید PDF");
    } finally {
      document.body.removeChild(container);
    }
  };

  const downloadHtml = async () => {
    if (!formDef) return;
    const targetEntries = selectedRowIds.length
      ? entries.filter((e) => selectedRowIds.includes(e.id))
      : selectAll
        ? entries.slice()
        : [];

    if (!targetEntries.length) {
      message.warning("هیچ رکوردی برای خروجی انتخاب نشده است");
      return;
    }
    if (randomOrder) {
      for (let i = targetEntries.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [targetEntries[i], targetEntries[j]] = [
          targetEntries[j],
          targetEntries[i],
        ];
      }
    }

    const filterCols = selectedExportColumns.length > 0;
    const selColsSet = new Set(selectedExportColumns);

    const container = document.createElement("div");
    container.style.width = pdfLandscape ? "1115px" : "785px";
    container.style.padding = "16px";
    container.style.background = "#fff";
    container.style.direction = "rtl";
    container.style.margin = "0 auto";
    container.style.fontFamily =
      "system-ui, -apple-system, Segoe UI, Roboto, Vazirmatn, Arial, sans-serif";
    container.style.color = "#000";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "center";
    header.style.alignItems = "center";
    header.style.marginBottom = "12px";
    container.appendChild(header);

    if (formDef?.pdfDescription && String(formDef.pdfDescription).trim().length) {
      const desc = document.createElement("p");
      desc.textContent = String(formDef.pdfDescription);
      desc.style.margin = "0 0 12px";
      desc.style.fontSize = "13px";
      desc.style.lineHeight = "1.6";
      desc.style.textAlign = "right";
      container.appendChild(desc);
    }

    const makeSection = (
      title: string,
      labels: string[],
      valueOf: (e: any, l: string) => any,
      colorOf?: (e: any) => any,
      metaKeyOf?: (l: string) => string,
      isBaseSection: boolean = false
    ) => {
      if (!labels.length) return;
      const section = document.createElement("section");
      section.style.marginBottom = "16px";
      const h2 = document.createElement("h2");
      h2.textContent = title;
      h2.style.margin = "0 0 8px";
      h2.style.fontSize = "14px";
      h2.style.textAlign = "right";
      section.appendChild(h2);

      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.direction = "rtl";

      const thead = document.createElement("thead");
      const trh = document.createElement("tr");
      const thIndex = document.createElement("th");
      thIndex.textContent = "ردیف";
      thIndex.style.border = "1px solid #ccc";
      thIndex.style.padding = "6px 8px";
      thIndex.style.width = "50px";
      thIndex.style.textAlign = "center";
      thIndex.style.verticalAlign = "middle";
      thIndex.style.backgroundColor = "#f7f7f7";
      trh.appendChild(thIndex);

      labels.forEach((lab) => {
        const th = document.createElement("th");
        th.textContent = lab;
        th.style.border = "1px solid #ccc";
        th.style.padding = "6px 8px";
        th.style.textAlign = "right";
        th.style.verticalAlign = "middle";
        th.style.backgroundColor = "#f7f7f7";
        trh.appendChild(th);
      });
      thead.appendChild(trh);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      let addedRows = 0;
      for (const e of targetEntries) {
        const hasAny = labels.some((lab) => {
          const metaKey = metaKeyOf ? metaKeyOf(lab) : lab;
          const meta = fieldMeta[metaKey];
          const v = valueOf(e, lab);
          if (meta) return hasMeaningfulValue(meta.type, v);
          if (v === null || v === undefined) return false;
          if (typeof v === "string") return v.trim().length > 0;
          if (Array.isArray(v)) return v.length > 0;
          return true;
        });

        if (!hasAny) continue;

        const tr = document.createElement("tr");
        tr.style.textAlign = "right";
        if (includeColors && colorOf) {
          const color = colorOf(e);
          if (color) {
            tr.style.backgroundColor = String(color);
          }
        }
        const tdIndex = document.createElement("td");
        tdIndex.textContent = String(addedRows + 1);
        tdIndex.style.border = "1px solid #ddd";
        tdIndex.style.padding = "6px 8px";
        tdIndex.style.width = "50px";
        tdIndex.style.textAlign = "center";
        tdIndex.style.verticalAlign = "middle";
        tr.appendChild(tdIndex);

        labels.forEach((lab) => {
          const td = document.createElement("td");
          const v = valueOf(e, lab);
          const metaKey = metaKeyOf ? metaKeyOf(lab) : lab;
          const meta = fieldMeta[metaKey];
          let display = v;
          if (meta && meta.type === "checkbox") {
            const checked = v === true || v === "true" || v === 1 || v === "1";
            display = checked ? "✓" : "";
          } else if (meta && meta.type === "date") {
            display = formatToJalali(v);
          }
          td.textContent = display === null || display === undefined ? "" : String(display);
          td.style.border = "1px solid #ddd";
          td.style.padding = "6px 8px";
          td.style.textAlign = "right";
          td.style.verticalAlign = "middle";
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
        addedRows++;

        if (
          isBaseSection &&
          formDef.subFields &&
          formDef.subFields.length > 0 &&
          e.data?.subFieldsData &&
          Array.isArray(e.data.subFieldsData) &&
          e.data.subFieldsData.length > 0
        ) {
          const subTr = document.createElement("tr");
          const subTd = document.createElement("td");
          subTd.colSpan = labels.length + 1;
          subTd.style.padding = "0 8px 12px 24px";
          subTd.style.backgroundColor = "#fafafa";

          const subTable = document.createElement("table");
          subTable.style.width = "100%";
          subTable.style.borderCollapse = "collapse";
          subTable.style.marginTop = "4px";
          subTable.style.fontSize = "11px";
          subTable.style.direction = "rtl";

          const subThead = document.createElement("thead");
          const subTrh = document.createElement("tr");
          const subThIdx = document.createElement("th");
          subThIdx.textContent = "ردیف";
          subThIdx.style.border = "1px solid #eee";
          subThIdx.style.padding = "4px 6px";
          subThIdx.style.width = "50px";
          subThIdx.style.textAlign = "center";
          subThIdx.style.verticalAlign = "middle";
          subThIdx.style.backgroundColor = "#eeeeee";
          subTrh.appendChild(subThIdx);

          (formDef.subFields || []).forEach((sf) => {
            const th = document.createElement("th");
            th.textContent = sf.label;
            th.style.border = "1px solid #eee";
            th.style.padding = "4px 6px";
            th.style.textAlign = "right";
            th.style.verticalAlign = "middle";
            th.style.backgroundColor = "#eeeeee";
            subTrh.appendChild(th);
          });
          subThead.appendChild(subTrh);
          subTable.appendChild(subThead);

          const subTbody = document.createElement("tbody");
          (e.data.subFieldsData as any[]).forEach((subRow, subIdx) => {
            const rowTr = document.createElement("tr");
            const rowTdIdx = document.createElement("td");
            rowTdIdx.textContent = String(subIdx + 1);
            rowTdIdx.style.border = "1px solid #eee";
            rowTdIdx.style.padding = "4px 6px";
            rowTdIdx.style.width = "50px";
            rowTdIdx.style.textAlign = "center";
            rowTdIdx.style.verticalAlign = "middle";
            rowTr.appendChild(rowTdIdx);

            (formDef.subFields || []).forEach((sf) => {
              const rowTd = document.createElement("td");
              const val = subRow[sf.label];
              let disp = val;
              if (sf.type === "checkbox") {
                disp = val === true || val === "true" || val === 1 || val === "1" ? "✓" : "";
              } else if (sf.type === "date") {
                disp = formatToJalali(val);
              }
              rowTd.textContent = disp === null || disp === undefined ? "" : String(disp);
              rowTd.style.border = "1px solid #eee";
              rowTd.style.padding = "4px 6px";
              rowTd.style.textAlign = "right";
              rowTd.style.verticalAlign = "middle";
              rowTr.appendChild(rowTd);
            });
            subTbody.appendChild(rowTr);
          });
          subTable.appendChild(subTbody);
          subTd.appendChild(subTable);
          subTr.appendChild(subTd);
          tbody.appendChild(subTr);
        }
      }

      if (addedRows > 0) {
        table.appendChild(tbody);
        section.appendChild(table);
        container.appendChild(section);
      }
    };

    const baseInit = (formDef.fields || []).map((f) => f.label);
    const baseLabels = filterCols ? baseInit.filter((lab) => selColsSet.has(lab)) : baseInit;
    makeSection(
      "",
      baseLabels,
      (e, lab) => (e.data || {})[lab] ?? "",
      (e) => (e.data || {})["__color"],
      undefined,
      true
    );

    for (const c of formDef.categories || []) {
      const catInit = (c.fields || []).map((f) => f.label);
      const catSel = selectedExportColumnsByCategory[c.name];
      let catLabels = catInit;
      if (catSel && catSel.length > 0) {
        const catSet = new Set(catSel);
        catLabels = catInit.filter((lab) => catSet.has(`${c.name} - ${lab}`));
      } else if (filterCols) {
        catLabels = catInit.filter((lab) => selColsSet.has(`${c.name} - ${lab}`));
      }
      makeSection(
        c.name,
        catLabels,
        (e, lab) => (e.data || {})[`${c.name} - ${lab}`] ?? "",
        (e) => (e.data || {})[`${c.name} - __color`],
        (lab) => `${c.name} - ${lab}`,
        false
      );
    }

    if (!container.children.length) {
      message.warning("هیچ داده‌ای برای خروجی HTML یافت نشد");
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>${formDef.name}</title>
    <style>
        @font-face {
            font-family: 'Vazirmatn';
            src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/webfonts/Vazirmatn-Regular.woff2') format('woff2');
        }
        body {
            font-family: 'Vazirmatn', system-ui, sans-serif;
            background-color: #f0f2f5;
            padding: 20px;
        }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; background: #fff; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
        th { background-color: #f4f4f4; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        h1 { text-align: center; }
        @media print {
            body { background: none; padding: 0; }
            .container { box-shadow: none; border: none; width: 100%; max-width: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        ${container.innerHTML}
    </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formDef.name}-entries.html`;
    a.click();
    URL.revokeObjectURL(url);
  };


  const startInlineAdd = () => {
    if (!hasWriteAccess) {
      message.warning("شما دسترسی ثبت/ویرایش برای این فرم را ندارید");
      return;
    }
    if (!formDef) return;
    setEditingEntryId(null);
    const initial: Record<string, any> = {};
    for (const f of (formDef.fields ?? []) as FormField[]) {
      if (f.type === "checkbox") initial[f.label] = undefined;
      else if (f.type === "date") initial[f.label] = undefined;
      else if (f.type === "select") initial[f.label] = undefined;
      else initial[f.label] = "";
    }
    for (const c of formDef.categories || []) {
      for (const f of (c.fields ?? []) as FormField[]) {
        const key = `${c.name} - ${f.label}`;
        if (f.type === "checkbox") initial[key] = undefined;
        else if (f.type === "date") initial[key] = undefined;
        else if (f.type === "select") initial[key] = undefined;
        else initial[key] = "";
      }
    }
    // Initialize category color fields
    for (const c of formDef.categories || []) {
      const colorKey = `${c.name} - __color`;
      initial[colorKey] = undefined;
    }
    // Initialize extra color field
    initial["__color"] = undefined;
    setInlineValues(initial);
    setSubFieldsData([]); // Reset subFieldsData for new entry
    setInlineAdd(true);
    setInlineScope({ type: "all" });
  };

  return (
    <Card className="border border-red-300">
      <Modal
        open={viewOpen}
        title={viewTitle || "مشاهده رکورد"}
        onCancel={() => setViewOpen(false)}
        footer={<Button onClick={() => setViewOpen(false)}>بستن</Button>}
        width={900}
      >
        <Table
          rowKey="label"
          className="mt-8"
          dataSource={viewItems}
          columns={[
            { title: "فیلد", dataIndex: "label", key: "label", width: 200 },
            { title: "مقدار", dataIndex: "value", key: "value" },
          ] as any}
          pagination={false}
          size="small"
          bordered
        />
        {viewSubRows.length > 0 && (
          <>
            <Typography.Title level={5} className="!mt-4 !mb-2">
              زیرفیلدها
            </Typography.Title>
            <Table
              rowKey={(_, idx) => `sub-${idx}`}
              dataSource={viewSubRows}
              columns={(formDef?.subFields || []).map((sf) => ({
                title: sf.label,
                dataIndex: sf.label,
                key: sf.label,
                render: (val: any) =>
                  sf.type === "checkbox"
                    ? typeof val === "boolean"
                      ? val
                        ? "✓"
                        : "✗"
                      : "—"
                    : sf.type === "date"
                      ? formatToJalali(val)
                      : val,
              })) as any}
              pagination={false}
              size="small"
              bordered
            />
          </>
        )}
      </Modal>
      <Space
        style={{ width: "100%", justifyContent: "space-between" }}
        className="mb-4"
      >
        <Typography.Title level={4} className="!mb-0 text-red-600">
          داده‌های فرم
        </Typography.Title>
        <Space>
          <Button onClick={() => navigate(`${prePath}/structure`)}>بازگشت</Button>
          <Button onClick={load}>بازخوانی</Button>
          <Button onClick={exportMode}>دریافت خروجی</Button>
          <Button type="primary" onClick={startInlineAdd} disabled={inlineAdd || !hasWriteAccess}>
            افزودن داده جدید
          </Button>
        </Space>
      </Space>
      <Typography.Paragraph className="mt-0">
        نمایش رکوردهای ثبت‌شده برای فرم: {formDef?.name || "—"}
      </Typography.Paragraph>

      {exportView && (
        <Card size="small" className="!mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectAll}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSelectAll(checked);
                  setSelectedRowIds(checked ? entries.map((r) => r.id) : []);
                }}
              >
                انتخاب همه سطر ها
              </Checkbox>
              <Checkbox
                checked={randomOrder}
                onChange={(e) => setRandomOrder(e.target.checked)}
              >
                خروجی تصادفی
              </Checkbox>
              <Checkbox
                checked={includeColors}
                onChange={(e) => setIncludeColors(e.target.checked)}
              >
                خروجی با رنگ‌ها
              </Checkbox>
              <Checkbox
                checked={pdfLandscape}
                onChange={(e) => setPdfLandscape(e.target.checked)}
              >
                خروجی افقی pdf
              </Checkbox>
            </div>


            <div className="flex gap-2">
              <Button type="primary" onClick={downloadXlsx}>
                دانلود XLSX
              </Button>
              <Button onClick={downloadPdf}>دانلود PDF</Button>
              <Button onClick={downloadHtml}>دانلود HTML</Button>
              <Button
                onClick={() => {
                  setExportView(false);
                  setSelectedRowIds([]);
                  setSelectAll(false);
                }}
              >
                خروج از حالت خروجی
              </Button>
            </div>
          </div>
          {exportColumnOptions.length > 0 && (
            <div className="my-8 w-full">
              <Select
                mode="multiple"
                className="w-full"
                allowClear
                style={{ minWidth: 280 }}
                placeholder="انتخاب ستون‌های اصلی"
                options={exportColumnOptions}
                value={selectedExportColumns}
                onChange={(vals) => setSelectedExportColumns(vals as string[])}
              />
            </div>
          )}
          {formDef?.categories && formDef.categories.some((c) => (c.fields || []).length > 0) && (
            <div className="my-4 flex flex-col gap-3">
              {formDef.categories
                .filter((c) => (c.fields || []).length > 0)
                .map((c) => (
                  <div key={c.name} className="flex flex-col gap-1 w-full">
                    <Typography.Text>انتخاب ستون‌های دسته «{c.name}»</Typography.Text>
                    <Select
                      mode="multiple"
                      className="w-full"
                      allowClear
                      style={{ minWidth: 280 }}
                      placeholder={`انتخاب ستون‌های ${c.name}`}
                      options={exportColumnOptionsByCategory[c.name] || []}
                      value={selectedExportColumnsByCategory[c.name] || []}
                      onChange={(vals) =>
                        setSelectedExportColumnsByCategory((prev) => ({
                          ...prev,
                          [c.name]: vals as string[],
                        }))
                      }
                    />
                  </div>
                ))}
            </div>
          )}
          <Typography.Paragraph className="mt-2">
            در حالت خروجی، ستون عملیات مخفی است و می‌توانید ردیف‌ها را انتخاب
            کنید.
          </Typography.Paragraph>

        </Card>
      )}

      {inlineAdd && (
        <>
          {formDef?.fields &&
            formDef.fields.length > 0 &&
            (inlineScope.type === "all" || inlineScope.type === "base") && (
              <>
                <Typography.Title level={5} className="!mb-2">
                  {editingEntryId
                    ? "ویرایش رکورد - فیلدهای اصلی"
                    : "افزودن رکورد جدید - فیلدهای اصلی"}
                </Typography.Title>
                <Table
                  rowKey="id"
                  dataSource={
                    [
                      {
                        id: "__new__",
                        formId: formId as string,
                        data: inlineValues,
                      },
                    ] as any
                  }
                  columns={addBaseColumns as any}
                  loading={loading}
                  pagination={false}
                  scroll={{ x: "max-content" }}
                  onRow={() => {
                    const color = inlineValues["__color"];
                    return {
                      style: color ? { backgroundColor: String(color) } : {},
                    };
                  }}
                />
              </>
            )}

          {/* Sub-fields data entry (Master-Detail rows) */}
          {formDef?.subFields && formDef.subFields.length > 0 && (
            <div className="mt-4 mb-4 border border-blue-200 p-4 rounded-md bg-blue-50">
              <Typography.Title level={5} className="text-blue-700 !mb-2">
                زیرفیلدها (سطرهای جدول)
              </Typography.Title>
              {subFieldsData.map((row, idx) => (
                <div key={`subrow-${idx}`} className="flex gap-2 mb-2 items-center flex-wrap">
                  {(formDef.subFields || []).map((sf) => {
                    if (sf.type === "text" || sf.type === "number") {
                      return (
                        <div key={sf.label} className="flex flex-col">
                          <span className="text-xs text-gray-500 mb-1">{sf.label}</span>
                          <Input
                            type={sf.type === "number" ? "number" : "text"}
                            value={row[sf.label] ?? ""}
                            style={{ width: 140 }}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setSubFieldsData((prev) => {
                                const copy = prev.map((r, i) =>
                                  i === idx ? { ...r, [sf.label]: newValue } : r
                                );
                                return copy;
                              });
                            }}
                          />
                        </div>
                      );
                    }
                    if (sf.type === "select" && sf.options?.length) {
                      return (
                        <div key={sf.label} className="flex flex-col">
                          <span className="text-xs text-gray-500 mb-1">{sf.label}</span>
                          <Select
                            style={{ width: 140 }}
                            value={row[sf.label] ?? undefined}
                            onChange={(v) => {
                              setSubFieldsData((prev) => {
                                const copy = prev.map((r, i) =>
                                  i === idx ? { ...r, [sf.label]: v } : r
                                );
                                return copy;
                              });
                            }}
                            options={sf.options.map((o) => ({ value: o, label: o }))}
                            allowClear
                          />
                        </div>
                      );
                    }
                    if (sf.type === "checkbox") {
                      return (
                        <div key={sf.label} className="flex flex-col">
                          <span className="text-xs text-gray-500 mb-1">{sf.label}</span>
                          <Checkbox
                            checked={!!row[sf.label]}
                            onChange={(e) => {
                              setSubFieldsData((prev) => {
                                const copy = prev.map((r, i) =>
                                  i === idx ? { ...r, [sf.label]: e.target.checked } : r
                                );
                                return copy;
                              });
                            }}
                          />
                        </div>
                      );
                    }
                    if (sf.type === "lookup") {
                      return (
                        <div key={sf.label} className="flex flex-col">
                          <span className="text-xs text-gray-500 mb-1">{sf.label}</span>
                          <Input.Search
                            value={row[sf.label] ?? ""}
                            style={{ width: 180 }}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setSubFieldsData((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, [sf.label]: newValue } : r
                                )
                              );
                            }}
                            onSearch={async (val) => {
                              if (!val) return;
                              if (!sf.lookupFormId || !sf.lookupSourceField) {
                                message.warning("تنظیمات جستجو ناقص است");
                                return;
                              }
                              try {
                                const results = await listFormEntries(sf.lookupFormId);
                                const match = results.find(
                                  (r) => String(r.data[sf.lookupSourceField!]) === String(val)
                                );
                                if (match) {
                                  const updates: Record<string, any> = {};
                                  // auto-fill based on matching labels for subfields
                                  Object.keys(match.data).forEach((sourceLabel) => {
                                    const val = match.data[sourceLabel];
                                    if ((formDef.subFields || []).some(s => s.label === sourceLabel)) {
                                      updates[sourceLabel] = val;
                                    }
                                  });
                                  setSubFieldsData((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, ...updates, [sf.label]: val } : r
                                    )
                                  );
                                  message.success("داده‌ها بازخوانی شد");
                                } else {
                                  message.error("موردی یافت نشد");
                                }
                              } catch (e) {
                                message.error("خطا در جستجو");
                              }
                            }}
                          />
                        </div>
                      );
                    }
                    if (sf.type === "date") {
                      const val = row[sf.label];
                      let dv: any = null;
                      if (val) {
                        if (dayjs.isDayjs(val)) {
                          dv = val;
                        } else {
                          const possibleNum = Number(val);
                          const finalVal = (!isNaN(possibleNum) && String(val).trim() !== "" && !String(val).includes("-") && !String(val).includes("/"))
                            ? (possibleNum < 10000000000 ? possibleNum * 1000 : possibleNum)
                            : val;
                          dv = dayjs(finalVal);
                        }
                      }
                      return (
                        <div key={sf.label} className="flex flex-col">
                          <span className="text-xs text-gray-500 mb-1">{sf.label}</span>
                          <DatePickerJalali
                            style={{ width: 140 }}
                            value={(dv && dv.isValid()) ? dv : null}
                            onChange={(d) => {
                              setSubFieldsData((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, [sf.label]: d } : r
                                )
                              );
                            }}
                          />
                        </div>
                      );
                    }
                    return null;
                  })}
                  <Button
                    danger
                    size="small"
                    className="mt-4"
                    onClick={() => {
                      setSubFieldsData((prev) => prev.filter((_, i) => i !== idx));
                    }}
                  >
                    حذف
                  </Button>
                </div>
              ))}
              <Button
                type="dashed"
                className="mt-2 border-blue-400 text-blue-600"
                onClick={() => {
                  const newRow: Record<string, any> = {};
                  for (const sf of formDef.subFields || []) {
                    newRow[sf.label] = sf.type === "checkbox" ? false : "";
                  }
                  setSubFieldsData((prev) => [...prev, newRow]);
                }}
              >
                + افزودن سطر
              </Button>
            </div>
          )}

          {inlineScope.type !== "base" &&
            addCategoryTables
              .filter(
                (cat) =>
                  inlineScope.type === "all" ||
                  cat.name === inlineScope.category
              )
              .map((cat) => (
                <div key={cat.name}>
                  <Typography.Title level={5} className="!mt-4 !mb-2">
                    {editingEntryId
                      ? `ویرایش رکورد - ${cat.name}`
                      : `افزودن رکورد جدید - ${cat.name}`}
                  </Typography.Title>
                  <Table
                    rowKey="id"
                    dataSource={
                      [
                        {
                          id: "__new__",
                          formId: formId as string,
                          data: inlineValues,
                        },
                      ] as any
                    }
                    columns={cat.columns as any}
                    loading={loading}
                    pagination={false}
                    scroll={{ x: "max-content" }}
                    onRow={() => {
                      const color = inlineValues[`${cat.name} - __color`];
                      return {
                        style: color ? { backgroundColor: String(color) } : {},
                      };
                    }}
                  />
                </div>
              ))}
        </>
      )}

      {/* Base fields table (only if there are base fields) */}
      {formDef?.fields && formDef.fields.length > 0 && (
        <>
          <Typography.Title level={5} className="!mt-6 !mb-2">
            فیلدهای اصلی
          </Typography.Title>
          <Table
            rowKey="id"
            dataSource={filteredBaseEntries}
            columns={baseColumns as any}
            loading={loading}
            pagination={{ pageSize: 12 }}
            scroll={{ x: "max-content" }}
            rowSelection={
              exportView
                ? {
                  selectedRowKeys: selectedRowIds,
                  onChange: (keys) => setSelectedRowIds(keys as string[]),
                }
                : undefined
            }
            onRow={(row: any) => {
              const color = (row?.data || {})["__color"];
              return { style: color ? { backgroundColor: String(color) } : {} };
            }}
            expandable={
              formDef?.hasSubFields && formDef?.subFields && formDef.subFields.length > 0
                ? {
                  expandedRowRender: (record: any) => {
                    const subFieldRows = (record?.data?.subFieldsData || []) as any[];
                    if (subFieldRows.length === 0) {
                      return <Typography.Text type="secondary">بدون زیرفیلد</Typography.Text>;
                    }
                    const subCols: any[] = [
                      {
                        title: "ردیف",
                        key: "index",
                        width: 60,
                        align: "center",
                        render: (_: any, __: any, index: number) => index + 1,
                      },
                      ...(formDef.subFields || []).map((sf) => ({
                        title: sf.label,
                        dataIndex: sf.label,
                        key: sf.label,
                        render: (val: any) =>
                          sf.type === "checkbox"
                            ? typeof val === "boolean"
                              ? val
                                ? "✓"
                                : "✗"
                              : "—"
                            : sf.type === "date"
                              ? formatToJalali(val)
                              : val,
                      })),
                    ];
                    return (
                      <Table
                        rowKey={(_, idx) => `sub-${idx}`}
                        dataSource={subFieldRows}
                        columns={subCols}
                        pagination={false}
                        size="small"
                        bordered
                      />
                    );
                  },
                  rowExpandable: (record: any) =>
                    (record?.data?.subFieldsData || []).length > 0,
                }
                : undefined
            }
          />
        </>
      )}

      {/* Category tables */}
      {categoryTables.map((cat) => (
        <div key={cat.name}>
          <Typography.Title level={5} className="!mt-6 !mb-2">
            {cat.name}
          </Typography.Title>
          <Table
            rowKey="id"
            dataSource={cat.rows}
            columns={cat.columns as any}
            loading={loading}
            pagination={{ pageSize: 12 }}
            scroll={{ x: "max-content" }}
            rowSelection={
              exportView
                ? {
                  selectedRowKeys: selectedRowIds,
                  onChange: (keys) => setSelectedRowIds(keys as string[]),
                }
                : undefined
            }
            onRow={(row: any) => {
              const color = (row?.data || {})[`${cat.name} - __color`];
              return { style: color ? { backgroundColor: String(color) } : {} };
            }}
          />
        </div>
      ))}
    </Card>
  );
}
