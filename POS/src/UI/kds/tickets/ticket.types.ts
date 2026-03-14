export interface ThemeSettings {
  cardBgColor: string;
  cardBorderRadius: string;
  cardShadow: string;
  headerTextColor: string;
  headerFontSize: string;
  headerFontWeight: string;
  elapsedColor0to5: string;
  elapsedColor5to10: string;
  elapsedColor10to15: string;
  elapsedColor15plus: string;
  bodyBgColor: string;
  bodyTextColor: string;
  completedCardBg: string;
  completedTextColor: string;
  itemPendingBg: string;
  itemPendingBorder: string;
  itemPendingText: string;
  itemCompletedBg: string;
  itemCompletedBorder: string;
  itemCompletedText: string;
  itemBorderRadius: string;
  itemPadding: string;
  itemFontSize: string;
  itemFontWeight: string;
  allCompletedItemPendingBg: string;
  allCompletedItemPendingBorder: string;
  buttonBgColor: string;
  buttonTextColor: string;
  buttonHoverBg: string;
  buttonBorderRadius: string;
  buttonFontSize: string;
  buttonFontWeight: string;
  buttonPadding: string;
  showAdminId: boolean;
  showPreparationTime: boolean;
  autoMarkDone: boolean;
  primaryColor: string;
  pageGridCols: string;
  pageGap: string;
  pageBgColor: string;
  groupSwitcherStyle: string;
  assignedGroupIds: string;
}

export interface TicketItem {
  id: string;
  name: string;
  quantity: number;
  status: "pending" | "completed";
  notes: string;
}

export interface Ticket {
  id: string;
  orderNumber: string;
  restaurant: string;
  adminId: string;
  receivedTime: Date;
  preparationTime: string;
  tableNumber: string;
  items: TicketItem[];
}
