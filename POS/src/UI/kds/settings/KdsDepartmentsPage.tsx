import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UtensilsCrossed, Plus, Trash2, Check } from "lucide-react";
import { useKdsGroup } from "@/context/kds/KdsGroupContext";

export default function KdsDepartmentsPage() {
  const navigate = useNavigate();
  const { groups, saveGroups } = useKdsGroup();
  const [newName, setNewName] = useState("");

  const addGroup = async () => {
    if (!newName.trim()) return;
    await saveGroups([...groups, { id: `grp-${Date.now()}`, name: newName.trim() }]);
    setNewName("");
  };

  const deleteGroup = async (id: string) => {
    await saveGroups(groups.filter((g) => g.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/kds/settings")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={18} />
          Settings
        </button>
        <div className="h-5 w-px bg-gray-200" />
        <UtensilsCrossed size={20} className="text-orange-500" />
        <h1 className="text-xl font-bold text-gray-900">Kitchen Departments</h1>
      </div>

      <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
        <p className="text-sm text-gray-500 mb-6">
          Define kitchen departments shown in the KDS header for filtering orders by station.
        </p>

        {/* Add new group */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addGroup()}
            placeholder="e.g. Hot Kitchen, Cold Station, Grill..."
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-orange-400 bg-white"
          />
          <button
            onClick={addGroup}
            disabled={!newName.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-40 transition-colors"
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
            No departments defined. Add one above.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white"
              >
                <Check size={16} className="text-green-500 shrink-0" />
                <span className="flex-1 text-sm font-semibold text-gray-900">{g.name}</span>
                <button
                  onClick={() => deleteGroup(g.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
