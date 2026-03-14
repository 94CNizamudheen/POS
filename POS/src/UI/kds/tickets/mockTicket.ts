export const mockTicket = {
  id: "1",
  orderNumber: "12326",
  restaurant: "Restaurant",
  adminId: "22358",
  receivedTime: new Date(Date.now() - 2 * 60000),
  preparationTime: "02:26",
  tableNumber: "178",
  items: [
    { id: "1-1", name: "Mongolian Beef", quantity: 1, status: "completed" as const, notes: "" },
    { id: "1-2", name: "Chicken Chow Mein", quantity: 1, status: "pending" as const, notes: "" },
    { id: "1-3", name: "Wonton Soup", quantity: 1, status: "pending" as const, notes: "Beef and chicken" },
  ],
};
