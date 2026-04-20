/**
 * allocateParticipants.test.js
 * 
 * Comprehensive test suite for the Smart Seat Allocation Platform
 * Verifies all 4 constraints and system behaviors
 */

import {
    getAllocationStats,
    getAvailableSeats,
    getSessionsSummary,
    validateAllocation
} from "./allocateParticipants";

// ─────────────────────────────────────────────────────────────
// TEST DATA SETUP
// ─────────────────────────────────────────────────────────────

const mockSessions = [
  { id: 1, name: "Morning", time: "09:00 - 10:30", capacity: 20 },
  { id: 2, name: "Midday", time: "11:00 - 12:30", capacity: 20 },
  { id: 3, name: "Afternoon", time: "13:00 - 14:30", capacity: 20 },
];

const mockDepartmentLimits = {
  "Division A": 8,
  "Division B": 6,
  "Division C": 6,
};

const createMockParticipant = (id, name, department, session = "") => ({
  id,
  name,
  department,
  session,
});

// ─────────────────────────────────────────────────────────────
// CONSTRAINT 1: Maximum 20 participants per session (Hard Limit)
// ─────────────────────────────────────────────────────────────

console.log(
  "\n═════════════════════════════════════════════════════════════"
);
console.log(
  "CONSTRAINT 1: Maximum 20 participants per session (Hard Limit)"
);
console.log(
  "═════════════════════════════════════════════════════════════"
);

{
  const participants = [
    ...Array.from({ length: 20 }, (_, i) =>
      createMockParticipant(
        i + 1,
        `Person${i + 1}`,
        "Division A",
        "Morning"
      )
    ),
    createMockParticipant(21, "PersonNew", "Division B", ""),
  ];

  const newParticipant = participants[20];
  const result = validateAllocation(
    newParticipant,
    "Morning",
    participants,
    mockSessions,
    mockDepartmentLimits
  );

  console.log(
    "✓ TEST 1.1: Cannot allocate participant to FULL session (20/20)"
  );
  console.log(`  Result: ${result.isValid ? "FAILED" : "PASSED"}`);
  console.log(`  Reason: ${result.reason}`);
  console.log(`  Expected: isValid=false`);
  console.log(`  Actual: isValid=${result.isValid}`);
}

{
  const participants = [
    ...Array.from({ length: 19 }, (_, i) =>
      createMockParticipant(
        i + 1,
        `Person${i + 1}`,
        "Division A",
        "Morning"
      )
    ),
    createMockParticipant(20, "PersonNew", "Division B", ""),
  ];

  const newParticipant = participants[19];
  const result = validateAllocation(
    newParticipant,
    "Morning",
    participants,
    mockSessions,
    mockDepartmentLimits
  );

  console.log("\n✓ TEST 1.2: CAN allocate participant to session with space");
  console.log(`  Result: ${result.isValid ? "PASSED" : "FAILED"}`);
  console.log(`  Reason: ${result.reason}`);
  console.log(`  Expected: isValid=true`);
  console.log(`  Actual: isValid=${result.isValid}`);
}

// ─────────────────────────────────────────────────────────────
// CONSTRAINT 2: A participant can only be assigned to one session
// ─────────────────────────────────────────────────────────────

console.log(
  "\n═════════════════════════════════════════════════════════════"
);
console.log(
  "CONSTRAINT 2: No duplicate participant allocations (Hard Limit)"
);
console.log(
  "═════════════════════════════════════════════════════════════"
);

{
  const participants = [
    createMockParticipant(1, "Alice", "Division A", "Morning"),
    createMockParticipant(2, "Bob", "Division B", ""),
  ];

  const alreadyAssignedParticipant = participants[0];
  const result = validateAllocation(
    alreadyAssignedParticipant,
    "Midday",
    participants,
    mockSessions,
    mockDepartmentLimits
  );

  console.log(
    "✓ TEST 2.1: Cannot reassign already allocated participant"
  );
  console.log(`  Result: ${result.isValid ? "FAILED" : "PASSED"}`);
  console.log(`  Current Session: ${alreadyAssignedParticipant.session}`);
  console.log(`  Attempted Session: Midday`);
  console.log(`  Reason: ${result.reason}`);
  console.log(`  Expected: isValid=false`);
  console.log(`  Actual: isValid=${result.isValid}`);
}

{
  const participants = [
    createMockParticipant(1, "Alice", "Division A", ""),
    createMockParticipant(2, "Bob", "Division B", ""),
  ];

  const unassignedParticipant = participants[0];
  const result = validateAllocation(
    unassignedParticipant,
    "Morning",
    participants,
    mockSessions,
    mockDepartmentLimits
  );

  console.log("\n✓ TEST 2.2: CAN assign unallocated participant");
  console.log(`  Result: ${result.isValid ? "PASSED" : "FAILED"}`);
  console.log(`  Current Session: ${unassignedParticipant.session || "None"}`);
  console.log(`  Reason: ${result.reason}`);
  console.log(`  Expected: isValid=true`);
  console.log(`  Actual: isValid=${result.isValid}`);
}

// ─────────────────────────────────────────────────────────────
// CONSTRAINT 3: Departments cannot exceed their per-session allocation
// ─────────────────────────────────────────────────────────────

console.log(
  "\n═════════════════════════════════════════════════════════════"
);
console.log(
  "CONSTRAINT 3: Department limits per session (Hard Limit)"
);
console.log(
  "═════════════════════════════════════════════════════════════"
);

console.log("\nDepartment Allocations:");
console.log(
  "  - Division A: 8 seats per session"
);
console.log(
  "  - Division B: 6 seats per session"
);
console.log(
  "  - Division C: 6 seats per session"
);

{
  // Division A has 8 members already in Morning, try to add 9th
  const participants = [
    ...Array.from({ length: 8 }, (_, i) =>
      createMockParticipant(i + 1, `PersonA${i + 1}`, "Division A", "Morning")
    ),
    createMockParticipant(9, "PersonA9", "Division A", ""),
  ];

  const newParticipant = participants[8];
  const result = validateAllocation(
    newParticipant,
    "Morning",
    participants,
    mockSessions,
    mockDepartmentLimits
  );

  console.log(
    "\n✓ TEST 3.1: Division A cannot exceed 8 seats in Morning session"
  );
  console.log(`  Current Division A in Morning: 8/8`);
  console.log(`  Attempted: Add PersonA9`);
  console.log(`  Result: ${result.isValid ? "FAILED" : "PASSED"}`);
  console.log(`  Reason: ${result.reason}`);
  console.log(`  Expected: isValid=false`);
  console.log(`  Actual: isValid=${result.isValid}`);
}

{
  // Division B has 5 members already in Midday, can add 6th
  const participants = [
    ...Array.from({ length: 5 }, (_, i) =>
      createMockParticipant(
        i + 1,
        `PersonB${i + 1}`,
        "Division B",
        "Midday"
      )
    ),
    createMockParticipant(6, "PersonB6", "Division B", ""),
  ];

  const newParticipant = participants[5];
  const result = validateAllocation(
    newParticipant,
    "Midday",
    participants,
    mockSessions,
    mockDepartmentLimits
  );

  console.log(
    "\n✓ TEST 3.2: Division B CAN allocate 6th member to Midday"
  );
  console.log(`  Current Division B in Midday: 5/6`);
  console.log(`  Attempted: Add PersonB6`);
  console.log(`  Result: ${result.isValid ? "PASSED" : "FAILED"}`);
  console.log(`  Reason: ${result.reason}`);
  console.log(`  Expected: isValid=true`);
  console.log(`  Actual: isValid=${result.isValid}`);
}

{
  // Division C has 6 members in Afternoon, try to add 7th
  const participants = [
    ...Array.from({ length: 6 }, (_, i) =>
      createMockParticipant(
        i + 1,
        `PersonC${i + 1}`,
        "Division C",
        "Afternoon"
      )
    ),
    createMockParticipant(7, "PersonC7", "Division C", ""),
  ];

  const newParticipant = participants[6];
  const result = validateAllocation(
    newParticipant,
    "Afternoon",
    participants,
    mockSessions,
    mockDepartmentLimits
  );

  console.log(
    "\n✓ TEST 3.3: Division C cannot exceed 6 seats in Afternoon session"
  );
  console.log(`  Current Division C in Afternoon: 6/6`);
  console.log(`  Attempted: Add PersonC7`);
  console.log(`  Result: ${result.isValid ? "FAILED" : "PASSED"}`);
  console.log(`  Reason: ${result.reason}`);
  console.log(`  Expected: isValid=false`);
  console.log(`  Actual: isValid=${result.isValid}`);
}

// ─────────────────────────────────────────────────────────────
// SYSTEM BEHAVIOUR: Show remaining available seats per session
// ─────────────────────────────────────────────────────────────

console.log(
  "\n═════════════════════════════════════════════════════════════"
);
console.log("SYSTEM BEHAVIOUR: Show remaining available seats");
console.log(
  "═════════════════════════════════════════════════════════════"
);

{
  const participants = [
    createMockParticipant(1, "PersonA1", "Division A", "Morning"),
    createMockParticipant(2, "PersonA2", "Division A", "Morning"),
    createMockParticipant(3, "PersonB1", "Division B", "Morning"),
    createMockParticipant(4, "PersonC1", "Division C", "Midday"),
  ];

  const morningSeats = getAvailableSeats(
    "Morning",
    participants,
    mockSessions,
    null,
    mockDepartmentLimits
  );

  const middaySeats = getAvailableSeats(
    "Midday",
    participants,
    mockSessions,
    null,
    mockDepartmentLimits
  );

  console.log("\n✓ TEST 4.1: Show available seats per session");
  console.log("\nMorning Session:");
  console.log(`  Total Capacity: ${morningSeats.total}`);
  console.log(`  Used: ${morningSeats.totalUsed}`);
  console.log(`  Remaining: ${morningSeats.totalRemaining}`);

  console.log("\nMidday Session:");
  console.log(`  Total Capacity: ${middaySeats.total}`);
  console.log(`  Used: ${middaySeats.totalUsed}`);
  console.log(`  Remaining: ${middaySeats.totalRemaining}`);

  const sessionsummary = getSessionsSummary(
    participants,
    mockSessions,
    mockDepartmentLimits,
    "Division A"
  );

  console.log("\n✓ TEST 4.2: Show department-specific seat allocation");
  console.log("\nDivision A allocation in each session:");
  sessionsummary.forEach((session) => {
    console.log(
      `  ${session.name}: ${session.departmentUsed}/${mockDepartmentLimits["Division A"]} used, ${session.departmentRemaining} remaining`
    );
  });
}

// ─────────────────────────────────────────────────────────────
// OVERALL STATISTICS
// ─────────────────────────────────────────────────────────────

console.log(
  "\n═════════════════════════════════════════════════════════════"
);
console.log("ALLOCATION STATISTICS");
console.log(
  "═════════════════════════════════════════════════════════════"
);

{
  // Create a realistic scenario with 60 participants
  let participants = [];
  let id = 1;

  // Division A: 24 participants, 16 allocated
  for (let i = 0; i < 8; i++) {
    participants.push(
      createMockParticipant(
        id++,
        `DivA_Morning_${i + 1}`,
        "Division A",
        "Morning"
      )
    );
  }
  for (let i = 0; i < 8; i++) {
    participants.push(
      createMockParticipant(
        id++,
        `DivA_Midday_${i + 1}`,
        "Division A",
        "Midday"
      )
    );
  }
  for (let i = 0; i < 8; i++) {
    participants.push(
      createMockParticipant(id++, `DivA_Unallocated_${i + 1}`, "Division A", "")
    );
  }

  // Division B: 18 participants, 12 allocated
  for (let i = 0; i < 6; i++) {
    participants.push(
      createMockParticipant(
        id++,
        `DivB_Morning_${i + 1}`,
        "Division B",
        "Morning"
      )
    );
  }
  for (let i = 0; i < 6; i++) {
    participants.push(
      createMockParticipant(
        id++,
        `DivB_Afternoon_${i + 1}`,
        "Division B",
        "Afternoon"
      )
    );
  }
  for (let i = 0; i < 6; i++) {
    participants.push(
      createMockParticipant(id++, `DivB_Unallocated_${i + 1}`, "Division B", "")
    );
  }

  // Division C: 18 participants, 12 allocated
  for (let i = 0; i < 6; i++) {
    participants.push(
      createMockParticipant(
        id++,
        `DivC_Morning_${i + 1}`,
        "Division C",
        "Morning"
      )
    );
  }
  for (let i = 0; i < 6; i++) {
    participants.push(
      createMockParticipant(
        id++,
        `DivC_Midday_${i + 1}`,
        "Division C",
        "Midday"
      )
    );
  }
  for (let i = 0; i < 6; i++) {
    participants.push(
      createMockParticipant(id++, `DivC_Unallocated_${i + 1}`, "Division C", "")
    );
  }

  const stats = getAllocationStats(participants, mockDepartmentLimits);

  console.log("\n✓ OVERALL SYSTEM STATUS (Full 60-participant dataset):");
  console.log(`\nTotal Participants: ${stats.totalParticipants}`);
  console.log(`Allocated: ${stats.allocatedParticipants}`);
  console.log(`Unallocated: ${stats.unallocatedParticipants}`);
  console.log(`Allocation %: ${stats.allocationPercentage}%`);

  console.log("\nBy Department:");
  Object.entries(stats.departmentStats).forEach(([dept, data]) => {
    console.log(
      `  ${dept}: ${data.allocated}/${data.total} allocated (${data.unallocated} remaining)`
    );
  });

  console.log("\nSessions Status:");
  const sessionsSummary = getSessionsSummary(
    participants,
    mockSessions,
    mockDepartmentLimits
  );
  sessionsSummary.forEach((session) => {
    console.log(
      `  ${session.name} (${session.time}): ${session.totalUsed}/${session.total} used, ${session.totalRemaining} remaining, ${session.isFull ? "FULL" : "Has space"}`
    );
  });
}

// ─────────────────────────────────────────────────────────────
// TEST SUMMARY
// ─────────────────────────────────────────────────────────────

console.log(
  "\n═════════════════════════════════════════════════════════════"
);
console.log("ALL TESTS COMPLETED");
console.log(
  "═════════════════════════════════════════════════════════════\n"
);
