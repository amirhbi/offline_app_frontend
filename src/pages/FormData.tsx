import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
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
} from "antd";
import {
  DatePicker as DatePickerJalali,
  JalaliLocaleListener,
} from "antd-jalali";
import logo from "../assets/fire_department.png";
import reactLogo from "../assets/react.svg";
import { useNavigate, useParams } from "react-router-dom";
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
  const [formDef, setFormDef] = useState<FormRecord | null>(null);
  const [entries, setEntries] = useState<FormEntryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [inlineAdd, setInlineAdd] = useState(false);
  const [inlineValues, setInlineValues] = useState<Record<string, any>>({});
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
  const [selectAll, setSelectAll] = useState(false);
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

  const fieldMeta = useMemo(() => {
    const meta: Record<
      string,
      {
        type: FormRecord["fields"][number]["type"];
        options?: string[];
        required?: boolean;
      }
    > = {};
    if (!formDef) return meta;
    for (const f of formDef.fields || [])
      meta[f.label] = {
        type: f.type,
        options: f.options,
        required: f.required,
      };
    for (const c of formDef.categories || []) {
      for (const f of c.fields || [])
        meta[`${c.name} - ${f.label}`] = {
          type: f.type,
          options: f.options,
          required: f.required,
        };
    }
    return meta;
  }, [formDef]);

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
        const dv: any =
          typeof value === "string"
            ? (dayjs as any)(value, { jalali: true })
            : value;
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
    const initial: Record<string, any> = {};
    // Base fields
    for (const f of (formDef.fields ?? []) as FormField[]) {
      const v = row?.data?.[f.label];
      if (f.type === "date" && v)
        initial[f.label] = (dayjs as any)(v, { jalali: true });
      else if (f.type === "checkbox") initial[f.label] = !!v;
      else initial[f.label] = v ?? "";
    }
    // Category fields
    for (const c of formDef.categories || []) {
      for (const f of (c.fields ?? []) as FormField[]) {
        const key = `${c.name} - ${f.label}`;
        const v = row?.data?.[key];
        if (f.type === "date" && v)
          initial[key] = (dayjs as any)(v, { jalali: true });
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
    setEditingEntryId(null);
    setInlineAdd(true);
    setInlineScope(
      categoryName
        ? { type: "category", category: categoryName }
        : { type: "base" }
    );
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
      if (f.type === "date" && v)
        initial[f.label] = (dayjs as any)(v, { jalali: true });
      else if (f.type === "checkbox") initial[f.label] = !!v;
      else if (f.type === "select") initial[f.label] = v ?? undefined;
      else initial[f.label] = v ?? "";
    }
    for (const c of formDef.categories || []) {
      for (const f of (c.fields ?? []) as FormField[]) {
        const key = `${c.name} - ${f.label}`;
        const v = row?.data?.[key];
        if (f.type === "date" && v)
          initial[key] = (dayjs as any)(v, { jalali: true });
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
    setEditingEntryId(row.id);
    setInlineAdd(true);
    setInlineScope(
      categoryName
        ? { type: "category", category: categoryName }
        : { type: "base" }
    );
  };

  const handleDelete = (row: any) => {
    Modal.confirm({
      title: "حذف رکورد",
      content: "آیا از حذف این رکورد مطمئن هستید؟",
      okText: "حذف",
      okType: "danger",
      cancelText: "انصراف",
      onOk: async () => {
        try {
          await deleteFormEntry(formId as string, row.id);
          message.success("رکورد حذف شد");
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
        if (f.type === "date") data[f.label] = v.format("YYYY-MM-DD");
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
          if (f.type === "date") data[key] = v.format("YYYY-MM-DD");
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
            : fieldMeta[f.label]?.type === "checkbox"
              ? typeof val === "boolean"
                ? val
                  ? "✓"
                  : "✗"
                : "—"
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
  }, [formDef, inlineValues]);

  const baseColumns = useMemo(() => {
    const cols: any[] = [];
    if (!formDef) return cols;

    // Index column
    cols.push({
      title: "ردیف",
      key: "index",
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
            <Button onClick={() => handleDuplicate(row, undefined)}>کپی</Button>
            <Button onClick={() => handleEdit(row, undefined)}>ویرایش</Button>
            <Button danger onClick={() => handleDelete(row)}>
              حذف
            </Button>
          </Space>
        ),
      });
    }
    return cols.map((c) => ({
      ...c,
      onHeaderCell: () => ({ style: { whiteSpace: "nowrap" } }),
    }));
  }, [formDef, fieldMeta, exportView]);

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
              <Button onClick={() => handleDuplicate(row, c.name)}>کپی</Button>
              <Button onClick={() => handleEdit(row, c.name)}>ویرایش</Button>
              <Button danger onClick={() => handleDelete(row)}>
                حذف
              </Button>
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
  }, [formDef, entries, fieldMeta, exportView]);

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
            disabledFormat
            value={inlineValues["__color"] ?? undefined}
            onChange={(_, hex) => {
              setInlineValues((p) => ({ ...p, __color: _.toHexString() }))
            }

            }
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
  }, [formDef, inlineValues]);

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
                disabledFormat
                onChange={(_, hex) =>
                  setInlineValues((p) => ({ ...p, [colorKey]: _.toHexString() }))
                }
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
  }, [formDef, inlineValues]);

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

  const downloadCsv = () => {
    if (!formDef) return;
    const exportColumns = (allColumns as any[])
      .filter((c) => c.key !== "__actions" && c.title !== "عملیات")
      .filter((c) => {
        if (includeColors) return true;
        const path = c.dataIndex;
        if (Array.isArray(path)) {
          const last = path[path.length - 1];
          return !(
            typeof last === "string" &&
            (last === "__color" || String(last).endsWith(" - __color"))
          );
        }
        return true;
      });
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
    const headers = exportColumns.map((c: any) => c.title);
    const rows = targetEntries.map((e) =>
      exportColumns.map((c: any) => {
        const path = c.dataIndex;
        if (Array.isArray(path)) {
          let cur: any = e;
          for (const p of path) cur = (cur ?? {})[p];
          return cur ?? "";
        }
        return (e as any)[path] ?? "";
      })
    );
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((v) => {
            const s = String(v ?? "");
            const needsQuote =
              s.includes(",") || s.includes("\n") || s.includes('"');
            return needsQuote ? '"' + s.replace(/"/g, '""') + '"' : s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formDef.name}-entries.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
      wsBase.addRow(baseHeaders);
      const headerRow = wsBase.getRow(1);
      headerRow.font = { bold: true } as any;
      headerRow.alignment = { horizontal: "right" } as any;
      wsBase.columns = baseHeaders.map((h) => ({ header: h, width: Math.max(12, Math.min(40, String(h).length + 6)) })) as any;

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
          return v ?? "";
        });
        wsBase.addRow(values);
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
      wsCat.addRow(catHeaders);
      const headerRow = wsCat.getRow(1);
      headerRow.font = { bold: true } as any;
      headerRow.alignment = { horizontal: "right" } as any;
      wsCat.columns = catHeaders.map((h) => ({ header: h, width: Math.max(12, Math.min(40, String(h).length + 6)) })) as any;

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
          return v ?? "";
        });
        wsCat.addRow(values);
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
    container.style.width = "800px";
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
      metaKeyOf?: (l: string) => string
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
      labels.forEach((lab) => {
        const th = document.createElement("th");
        th.textContent = lab;
        th.style.border = "1px solid #ccc";
        th.style.padding = "6px 8px";
        th.style.textAlign = "right";
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
        labels.forEach((lab) => {
          const td = document.createElement("td");
          const v = valueOf(e, lab);
          const metaKey = metaKeyOf ? metaKeyOf(lab) : lab;
          const meta = fieldMeta[metaKey];
          let display = v;
          if (meta && meta.type === "checkbox") {
            const checked = v === true || v === "true" || v === 1 || v === "1";
            display = checked ? "✓" : "";
          }
          td.textContent = display === null || display === undefined ? "" : String(display);
          td.style.border = "1px solid #ddd";
          td.style.padding = "6px 8px";
          td.style.textAlign = "right";
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
        addedRows++;
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
        "فیلدهای اصلی",
        baseLabels,
        (e, lab) => (e.data || {})[lab] ?? "",
        (e) => (e.data || {})["__color"]
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
        (lab) => `${c.name} - ${lab}`
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
        margin: 2,
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
        },
        pagebreak: { mode: ["css", "legacy"] },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      } as any;
      await html2pdfCandidate().from(container).set(opt).save();
    } catch (err) {
      console.error(err);
      message.error("خطا در تولید PDF");
    } finally {
      document.body.removeChild(container);
    }
  };

  const startInlineAdd = () => {
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
    setInlineAdd(true);
    setInlineScope({ type: "all" });
  };

  return (
    <Card className="border border-red-300">
      <Space
        style={{ width: "100%", justifyContent: "space-between" }}
        className="mb-4"
      >
        <Typography.Title level={4} className="!mb-0 text-red-600">
          داده‌های فرم
        </Typography.Title>
        <Space>
          <Button onClick={() => navigate("/structure")}>بازگشت</Button>
          <Button onClick={load}>بازخوانی</Button>
          <Button onClick={exportMode}>دریافت خروجی</Button>
          <Button type="primary" onClick={startInlineAdd} disabled={inlineAdd}>
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
            </div>


            <div className="flex gap-2">
              <Button type="primary" onClick={downloadXlsx}>
                دانلود XLSX
              </Button>
              <Button onClick={downloadPdf}>دانلود PDF</Button>
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
