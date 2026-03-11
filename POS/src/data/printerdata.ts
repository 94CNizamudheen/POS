import type { PrintTemplate, PrintTemplateDefinition } from "@/types/printer";

const posReceiptTemplate: PrintTemplateDefinition = {
  id: "tpl-pos-default",
  name: "POS Receipt",
  type: "POS",
  is_default: true,

  layout: [
    "<LOGO>",
    "<C11>{location_name}",
    "<F>",
    "<C>Ticket: {ticket_number}",
    "[<C>Queue: #{queue_number}]",
    "<F>",
    "<L>Mode: {order_mode}",
    "<L>{timestamp}",
    "<F>-",
    "<EB>",
    "<ITEM_HEADER>",
    "<DB>",
    "<F>-",
    "{ITEMS}",
    "<F>-",
    "<J>Subtotal|S${subtotal}",
    "{CHARGES}",
    "<F>-",
    "<C11>TOTAL  S${total}",
    "<F>",
    "<L>{total_in_words}",
    "<F>-",
    "{PAYMENTS}",
    "<F>-",
    "<J>Tendered|S${tendered}",
    "<J>Change|S${change}",
    "<F>",
    "<F>",
    "<C>Thank You!",
    "<C>Please Come Again",
  ].join("\n"),

  sections: {
    ITEMS: "<ITEM_ROW>{name}|{quantity}|{price}|{total}",
    CHARGES: "<J>{name}|S${amount}",
    PAYMENTS: "<J>{method}|S${amount}\n[<L>Ref: {reference}]",
  },
};

const kotTemplate: PrintTemplateDefinition = {
  id: "tpl-kot-default",
  name: "Kitchen Order Ticket",
  type: "KOT",
  is_default: true,
  layout: [
    "<LOGO>",
    "<C11>KITCHEN ORDER",
    "<F>=",
    "<C11>#{queue_number}",
    "<F>",
    "[<J>Mode: {order_mode}|Table: {table_number}]",
    "<L>Time: {timestamp}",
    "<F>-",
    "{ITEMS}",
    "<F>-",
  ].join("\n"),
  sections: {
    ITEMS: "<KOT_ITEM>{name}| x{quantity}\n[<L>  {notes}]\n{MODIFIERS}\n<F>",
    MODIFIERS: "<L>   + {name} x{qty}",
  },
};

const openTicketTemplate: PrintTemplateDefinition = {
  id: "tpl-open-ticket-default",
  name: "Open Ticket Slip",
  type: "OPEN_TICKET",
  is_default: true,

  layout: [
    "<LOGO>",
    "<C11>{location_name}",
    "<F>=",
    "<C>-- HOLD ORDER --",
    "<F>",
    "<C11>{ticket_number}",
    "<F>=",
    "[<C>[ {note} ]]",
    "<F>-",
    "<EB>",
    "<ITEM_HEADER>",
    "<DB>",
    "<F>-",
    "{ITEMS}",
    "<F>-",
    "<C11>TOTAL  S${total}",
    "<F>",
    "<C>{timestamp}",
    "<F>",
    "<C>Present this slip to collect your order",
    "<F>",
  ].join("\n"),

  sections: {
    ITEMS: "<ITEM_ROW>{name}|{quantity}|{price}|{total}",
  },
};

const templates: PrintTemplateDefinition[] = [
  posReceiptTemplate,
  kotTemplate,
  openTicketTemplate,
];

export function getAvailableTemplates(): PrintTemplateDefinition[] {
  return templates;
}

export function getTemplateByType(type: PrintTemplate): PrintTemplateDefinition | null {
  return templates.find((t) => t.type === type && t.is_default) ?? null;
}

export function getTemplateById(id: string): PrintTemplateDefinition | null {
  return templates.find((t) => t.id === id) ?? null;
}
