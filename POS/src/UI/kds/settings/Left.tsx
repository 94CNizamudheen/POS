import ColorInput from "./inputs/ColorInput";
import SelectInput from "./inputs/SelectInput";
import ToggleInput from "./inputs/ToggleInput";

const sections = [
  { id: "card", label: "Card Background" },
  { id: "header", label: "Header Style" },
  { id: "items", label: "Item Style" },
  { id: "button", label: "Button Style" },
  { id: "elapsed", label: "Elapsed Colors" },
  { id: "display", label: "Display Options" },
];

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
    <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
    <p className="text-sm text-gray-500">{subtitle}</p>
  </div>
);

const Left = ({
  settings,
  updateSettings,
  activeSection,
  setActiveSection,
}: {
  settings: any;
  updateSettings: (s: any) => void;
  activeSection: string;
  setActiveSection: (s: string) => void;
}) => {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Section tabs */}
      <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
        <div className="grid grid-cols-3 gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-3 rounded-lg font-semibold transition-all text-sm ${
                activeSection === section.id
                  ? "bg-orange-500 text-white shadow"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-5">
          {activeSection === "card" && (
            <>
              <SectionHeader title="Card Border" subtitle="Customize the overall card appearance" />
              <SelectInput
                label="Border Radius"
                value={settings.cardBorderRadius}
                onChange={(v: string) => updateSettings({ cardBorderRadius: v })}
                options={[
                  { value: "0px", label: "None (Square)" },
                  { value: "4px", label: "Small (4px)" },
                  { value: "8px", label: "Medium (8px)" },
                  { value: "12px", label: "Large (12px)" },
                  { value: "16px", label: "Extra Large (16px)" },
                ]}
              />
              <SelectInput
                label="Card Shadow"
                value={settings.cardShadow}
                onChange={(v: string) => updateSettings({ cardShadow: v })}
                options={[
                  { value: "none", label: "None" },
                  { value: "0 1px 2px 0 rgb(0 0 0 / 0.05)", label: "Small" },
                  { value: "0 4px 6px -1px rgb(0 0 0 / 0.1)", label: "Medium" },
                  { value: "0 10px 15px -3px rgb(0 0 0 / 0.1)", label: "Large" },
                  { value: "0 20px 25px -5px rgb(0 0 0 / 0.1)", label: "Extra Large" },
                ]}
              />
              <SectionHeader
                title="Card Body Colors"
                subtitle="Colors for normal and completed states"
              />
              <ColorInput
                label="Body Background (Normal)"
                value={settings.bodyBgColor}
                onChange={(v: string) => updateSettings({ bodyBgColor: v })}
              />
              <ColorInput
                label="Body Text Color"
                value={settings.bodyTextColor}
                onChange={(v: string) => updateSettings({ bodyTextColor: v })}
              />
              <ColorInput
                label="Completed Card Background"
                value={settings.completedCardBg}
                onChange={(v: string) => updateSettings({ completedCardBg: v })}
              />
              <ColorInput
                label="Completed Card Text"
                value={settings.completedTextColor}
                onChange={(v: string) => updateSettings({ completedTextColor: v })}
              />
            </>
          )}

          {activeSection === "header" && (
            <>
              <SectionHeader title="Header Text Style" subtitle="Customize header typography" />
              <ColorInput
                label="Header Text Color"
                value={settings.headerTextColor}
                onChange={(v: string) => updateSettings({ headerTextColor: v })}
              />
              <SelectInput
                label="Font Size"
                value={settings.headerFontSize}
                onChange={(v: string) => updateSettings({ headerFontSize: v })}
                options={[
                  { value: "14px", label: "Small (14px)" },
                  { value: "16px", label: "Medium (16px)" },
                  { value: "18px", label: "Large (18px)" },
                  { value: "20px", label: "Extra Large (20px)" },
                  { value: "24px", label: "XXL (24px)" },
                ]}
              />
              <SelectInput
                label="Font Weight"
                value={settings.headerFontWeight}
                onChange={(v: string) => updateSettings({ headerFontWeight: v })}
                options={[
                  { value: "400", label: "Normal (400)" },
                  { value: "500", label: "Medium (500)" },
                  { value: "600", label: "Semibold (600)" },
                  { value: "700", label: "Bold (700)" },
                  { value: "800", label: "Extra Bold (800)" },
                ]}
              />
            </>
          )}

          {activeSection === "items" && (
            <>
              <SectionHeader
                title="Pending Items Style"
                subtitle="Style for items not yet completed"
              />
              <ColorInput
                label="Background Color"
                value={settings.itemPendingBg}
                onChange={(v: string) => updateSettings({ itemPendingBg: v })}
              />
              <ColorInput
                label="Border Color"
                value={settings.itemPendingBorder}
                onChange={(v: string) => updateSettings({ itemPendingBorder: v })}
              />
              <ColorInput
                label="Text Color"
                value={settings.itemPendingText}
                onChange={(v: string) => updateSettings({ itemPendingText: v })}
              />
              <SectionHeader
                title="Completed Items Style"
                subtitle="Style for completed items"
              />
              <ColorInput
                label="Background Color"
                value={settings.itemCompletedBg}
                onChange={(v: string) => updateSettings({ itemCompletedBg: v })}
              />
              <ColorInput
                label="Border Color"
                value={settings.itemCompletedBorder}
                onChange={(v: string) => updateSettings({ itemCompletedBorder: v })}
              />
              <ColorInput
                label="Text Color"
                value={settings.itemCompletedText}
                onChange={(v: string) => updateSettings({ itemCompletedText: v })}
              />
              <SectionHeader
                title="Item Typography & Spacing"
                subtitle="Size and spacing options"
              />
              <SelectInput
                label="Border Radius"
                value={settings.itemBorderRadius}
                onChange={(v: string) => updateSettings({ itemBorderRadius: v })}
                options={[
                  { value: "0px", label: "None (Square)" },
                  { value: "4px", label: "Small (4px)" },
                  { value: "8px", label: "Medium (8px)" },
                  { value: "12px", label: "Large (12px)" },
                ]}
              />
              <SelectInput
                label="Padding"
                value={settings.itemPadding}
                onChange={(v: string) => updateSettings({ itemPadding: v })}
                options={[
                  { value: "8px", label: "Small (8px)" },
                  { value: "12px", label: "Medium (12px)" },
                  { value: "16px", label: "Large (16px)" },
                  { value: "20px", label: "Extra Large (20px)" },
                ]}
              />
              <SelectInput
                label="Font Size"
                value={settings.itemFontSize}
                onChange={(v: string) => updateSettings({ itemFontSize: v })}
                options={[
                  { value: "12px", label: "Small (12px)" },
                  { value: "14px", label: "Medium (14px)" },
                  { value: "16px", label: "Large (16px)" },
                  { value: "18px", label: "Extra Large (18px)" },
                ]}
              />
              <SelectInput
                label="Font Weight"
                value={settings.itemFontWeight}
                onChange={(v: string) => updateSettings({ itemFontWeight: v })}
                options={[
                  { value: "400", label: "Normal (400)" },
                  { value: "500", label: "Medium (500)" },
                  { value: "600", label: "Semibold (600)" },
                  { value: "700", label: "Bold (700)" },
                ]}
              />
            </>
          )}

          {activeSection === "button" && (
            <>
              <SectionHeader
                title="Button Colors"
                subtitle='Customize the "Mark as done" button'
              />
              <ColorInput
                label="Background Color"
                value={settings.buttonBgColor}
                onChange={(v: string) => updateSettings({ buttonBgColor: v })}
              />
              <ColorInput
                label="Text Color"
                value={settings.buttonTextColor}
                onChange={(v: string) => updateSettings({ buttonTextColor: v })}
              />
              <ColorInput
                label="Hover Background"
                value={settings.buttonHoverBg}
                onChange={(v: string) => updateSettings({ buttonHoverBg: v })}
              />
              <SectionHeader title="Button Style" subtitle="Typography and spacing" />
              <SelectInput
                label="Border Radius"
                value={settings.buttonBorderRadius}
                onChange={(v: string) => updateSettings({ buttonBorderRadius: v })}
                options={[
                  { value: "0px", label: "None (Square)" },
                  { value: "4px", label: "Small (4px)" },
                  { value: "8px", label: "Medium (8px)" },
                  { value: "12px", label: "Large (12px)" },
                  { value: "9999px", label: "Full Rounded (Pill)" },
                ]}
              />
              <SelectInput
                label="Font Size"
                value={settings.buttonFontSize}
                onChange={(v: string) => updateSettings({ buttonFontSize: v })}
                options={[
                  { value: "12px", label: "Small (12px)" },
                  { value: "14px", label: "Medium (14px)" },
                  { value: "16px", label: "Large (16px)" },
                  { value: "18px", label: "Extra Large (18px)" },
                ]}
              />
              <SelectInput
                label="Font Weight"
                value={settings.buttonFontWeight}
                onChange={(v: string) => updateSettings({ buttonFontWeight: v })}
                options={[
                  { value: "400", label: "Normal (400)" },
                  { value: "500", label: "Medium (500)" },
                  { value: "600", label: "Semibold (600)" },
                  { value: "700", label: "Bold (700)" },
                  { value: "800", label: "Extra Bold (800)" },
                ]}
              />
              <SelectInput
                label="Padding"
                value={settings.buttonPadding}
                onChange={(v: string) => updateSettings({ buttonPadding: v })}
                options={[
                  { value: "8px", label: "Small (8px)" },
                  { value: "12px", label: "Medium (12px)" },
                  { value: "16px", label: "Large (16px)" },
                  { value: "20px", label: "Extra Large (20px)" },
                ]}
              />
            </>
          )}

          {activeSection === "elapsed" && (
            <>
              <SectionHeader
                title="Elapsed Time Colors"
                subtitle="Header background changes based on time since order received"
              />
              <ColorInput
                label="0-5 Minutes (Fresh Orders)"
                value={settings.elapsedColor0to5}
                onChange={(v: string) => updateSettings({ elapsedColor0to5: v })}
              />
              <ColorInput
                label="5-10 Minutes (Getting Old)"
                value={settings.elapsedColor5to10}
                onChange={(v: string) => updateSettings({ elapsedColor5to10: v })}
              />
              <ColorInput
                label="10-15 Minutes (Urgent)"
                value={settings.elapsedColor10to15}
                onChange={(v: string) => updateSettings({ elapsedColor10to15: v })}
              />
              <ColorInput
                label="15+ Minutes (Critical)"
                value={settings.elapsedColor15plus}
                onChange={(v: string) => updateSettings({ elapsedColor15plus: v })}
              />
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-bold">Tip:</span> Use distinct colors to help kitchen staff
                  quickly identify order priority.
                </p>
              </div>
            </>
          )}

          {activeSection === "display" && (
            <>
              <SectionHeader
                title="Display Options"
                subtitle="Control what information is shown"
              />
              <ToggleInput
                label="Show Admin ID"
                checked={settings.showAdminId}
                onChange={(v: boolean) => updateSettings({ showAdminId: v })}
                description="Display admin identifier on each ticket"
              />
              <div className="border-b border-gray-200" />
              <ToggleInput
                label="Show Preparation Time"
                checked={settings.showPreparationTime}
                onChange={(v: boolean) => updateSettings({ showPreparationTime: v })}
                description="Display estimated preparation time on tickets"
              />
              <div className="border-b border-gray-200" />
              <ToggleInput
                label="Auto Mark as Done"
                checked={settings.autoMarkDone}
                onChange={(v: boolean) => updateSettings({ autoMarkDone: v })}
                description="Automatically remove tickets when all items are completed (2 second delay)"
              />
              <SectionHeader title="Page Layout" subtitle="Customize grid and spacing" />
              <ColorInput
                label="Page Background Color"
                value={settings.pageBgColor}
                onChange={(v: string) => updateSettings({ pageBgColor: v })}
              />
              <SelectInput
                label="Grid Columns"
                value={settings.pageGridCols}
                onChange={(v: string) => updateSettings({ pageGridCols: v })}
                options={[
                  { value: "1", label: "1 Column" },
                  { value: "2", label: "2 Columns" },
                  { value: "3", label: "3 Columns" },
                  { value: "4", label: "4 Columns" },
                  { value: "5", label: "5 Columns" },
                  { value: "6", label: "6 Columns" },
                ]}
              />
              <SelectInput
                label="Gap Between Cards"
                value={settings.pageGap}
                onChange={(v: string) => updateSettings({ pageGap: v })}
                options={[
                  { value: "8px", label: "Small (8px)" },
                  { value: "12px", label: "Medium (12px)" },
                  { value: "16px", label: "Large (16px)" },
                  { value: "20px", label: "Extra Large (20px)" },
                  { value: "24px", label: "XXL (24px)" },
                ]}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Left;
