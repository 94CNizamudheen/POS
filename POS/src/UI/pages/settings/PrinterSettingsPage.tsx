import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Printer, Plus, LayoutTemplate, List,
  RefreshCw,
} from "lucide-react";
import type { Printer as PrinterType } from "@/types/printer";
import { printerService } from "@/services/local/printer.local.service";
import PrinterCard from "@/UI/components/settings/printer/PrinterCard";
import PrinterForm from "@/UI/components/settings/printer/PrinterForm";
import PrinterJobMapping from "@/UI/components/settings/printer/PrinterJobMapping";

type Tab = "list" | "add" | "templates";

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "list",      label: "Printers",        icon: <List className="w-4 h-4" /> },
  { id: "add",       label: "Add / Edit",       icon: <Plus className="w-4 h-4" /> },
  { id: "templates", label: "Print Templates",  icon: <LayoutTemplate className="w-4 h-4" /> },
];

export default function PrinterSettingsPage() {
  const navigate = useNavigate();
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("list");
  const [editing, setEditing] = useState<PrinterType | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await printerService.getAllPrinters();
      setPrinters(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  function openEdit(printer: PrinterType) {
    setEditing(printer);
    setTab("add");
  }

  function handleFormSuccess() {
    setEditing(null);
    load();
    setTab("list");
  }

  function handleFormClose() {
    setEditing(null);
    setTab("list");
  }

  function switchTab(t: Tab) {
    if (t !== "add") setEditing(null);
    setTab(t);
  }

  return (
    <main className="flex-1 overflow-y-auto px-8 py-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/settings")}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-800">Printers</h1>
          <p className="text-xs text-gray-400">Manage receipt and kitchen printers</p>
        </div>
        {tab === "list" && (
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.icon}
            {t.label}
            {t.id === "list" && printers.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === "list" ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-400"
              }`}>
                {printers.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── LIST TAB ── */}
      {tab === "list" && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-300">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : printers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Printer className="w-6 h-6 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-500">No printers configured</p>
                <p className="text-xs text-gray-400 mt-0.5">Add a printer to get started</p>
              </div>
              <button
                onClick={() => setTab("add")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Printer
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {printers.map((p) => (
                <PrinterCard key={p.id} printer={p} reload={load} onEdit={openEdit} />
              ))}
              {/* Add new card */}
              <button
                onClick={() => setTab("add")}
                className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-400 text-gray-300 hover:text-gray-500 transition-all min-h-[160px]"
              >
                <Plus className="w-6 h-6" />
                <span className="text-xs font-semibold">Add Printer</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ADD / EDIT TAB ── */}
      {tab === "add" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-gray-800">
                {editing ? `Edit: ${editing.name}` : "Add New Printer"}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {editing ? "Update printer configuration" : "Configure a new printer connection"}
              </p>
            </div>
            {editing && (
              <button
                onClick={handleFormClose}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium transition"
              >
                ← Back to list
              </button>
            )}
          </div>
          <PrinterForm
            editing={editing}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        </div>
      )}

      {/* ── TEMPLATES TAB ── */}
      {tab === "templates" && (
        <div>
          <div className="mb-4">
            <h2 className="text-sm font-bold text-gray-800">Print Template Mapping</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Choose which print jobs each printer handles
            </p>
          </div>
          <PrinterJobMapping printers={printers} reload={load} />
        </div>
      )}
    </main>
  );
}
