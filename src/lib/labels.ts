// Matches Order of Service item labels loosely — stray spacing/casing, or a
// colon (with anything after it, since some run sheets have the assignee
// typed straight into the label, e.g. "Message: Pastor Dave") shouldn't make
// a label fail to match itself elsewhere, such as "Worship" or "Message" in
// the Pull matching, or two differently-cased typings of the same header in
// the known-headers list on Service Log song destinations.
export function normalizeLabel(label: string): string {
  return label.split(":")[0].trim().toLowerCase();
}
