export const initialParticipants = [
  { id: 1, name: "Alice Nkosi", department: "Division A", session: "" },
  { id: 2, name: "Brian Mokoena", department: "Division A", session: "Morning" },
  { id: 3, name: "Carol Sithole", department: "Division A", session: "" },
  { id: 4, name: "David Khumalo", department: "Division A", session: "Midday" },
  { id: 5, name: "Emma Dube", department: "Division A", session: "" },
  { id: 6, name: "Faith Ndlovu", department: "Division B", session: "" },
  { id: 7, name: "Gift Maseko", department: "Division B", session: "Morning" },
  { id: 8, name: "Hope Zulu", department: "Division B", session: "" },
  { id: 9, name: "Ian Peters", department: "Division B", session: "Afternoon" },
  { id: 10, name: "Jane Molefe", department: "Division C", session: "" },
  { id: 11, name: "Kevin Radebe", department: "Division C", session: "Midday" },
  { id: 12, name: "Lerato Mokoena", department: "Division C", session: "" },
];

export const sessions = [
  { id: 1, name: "Morning", time: "09:00 - 10:30", capacity: 20 },
  { id: 2, name: "Midday", time: "11:00 - 12:30", capacity: 20 },
  { id: 3, name: "Afternoon", time: "13:00 - 14:30", capacity: 20 },
];

export const departmentLimits = {
  "Division A": 8,
  "Division B": 8,
  "Division C": 6,
};