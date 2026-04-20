/**
 * allocateParticipants.js
 * 
 * Core allocation logic for the Smart Seat Allocation Platform
 * Enforces all business constraints:
 * - Max 20 participants per session
 * - No duplicate participant allocations
 * - Department limits per session
 * - Shows remaining available seats
 */

/**
 * Validates if a participant can be allocated to a session
 * 
 * @param {Object} participant - Participant object {id, name, department, session}
 * @param {string} sessionName - Target session name
 * @param {Array} participants - All participants array
 * @param {Array} sessions - All sessions array
 * @param {Object} departmentLimits - Department limits per session
 * @returns {Object} {isValid: boolean, reason: string}
 */
export function validateAllocation(
  participant,
  sessionName,
  participants,
  sessions,
  departmentLimits
) {
  // Check 1: Participant already assigned to a session
  if (participant.session && participant.session.trim() !== "") {
    return {
      isValid: false,
      reason: "A participant can only be assigned to one session.",
    };
  }

  // Check 2: Session exists
  const targetSession = sessions.find((s) => s.name === sessionName);
  if (!targetSession) {
    return {
      isValid: false,
      reason: `Session "${sessionName}" does not exist.`,
    };
  }

  // Check 3: Session capacity not exceeded
  const totalInSession = participants.filter(
    (p) => p.session === sessionName
  ).length;

  if (totalInSession >= targetSession.capacity) {
    return {
      isValid: false,
      reason: `${sessionName} session is full (${totalInSession}/${targetSession.capacity}).`,
    };
  }

  // Check 4: Department limit per session not exceeded
  const departmentLimit = departmentLimits[participant.department];
  const departmentInSession = participants.filter(
    (p) =>
      p.department === participant.department && p.session === sessionName
  ).length;

  if (departmentInSession >= departmentLimit) {
    return {
      isValid: false,
      reason: `${participant.department} has reached its maximum allocation of ${departmentLimit} for ${sessionName}.`,
    };
  }

  return {
    isValid: true,
    reason: "Allocation valid.",
  };
}

/**
 * Gets available seats information for a session
 * 
 * @param {string} sessionName - Session name
 * @param {Array} participants - All participants array
 * @param {Array} sessions - All sessions array
 * @param {string} department - Optional: specific department
 * @param {Object} departmentLimits - Department limits per session
 * @returns {Object} {total: number, departmentUsed: number, departmentRemaining: number, totalRemaining: number}
 */
export function getAvailableSeats(
  sessionName,
  participants,
  sessions,
  department,
  departmentLimits
) {
  const session = sessions.find((s) => s.name === sessionName);
  if (!session) {
    return {
      total: 0,
      departmentUsed: 0,
      departmentRemaining: 0,
      totalRemaining: 0,
    };
  }

  const totalUsed = participants.filter(
    (p) => p.session === sessionName
  ).length;

  const departmentLimit = department ? departmentLimits[department] || 0 : 0;
  const departmentUsed = department
    ? participants.filter(
        (p) => p.department === department && p.session === sessionName
      ).length
    : 0;

  return {
    total: session.capacity,
    totalUsed,
    totalRemaining: session.capacity - totalUsed,
    departmentLimit,
    departmentUsed,
    departmentRemaining: departmentLimit - departmentUsed,
  };
}

/**
 * Gets summary of all sessions with available seats
 * 
 * @param {Array} participants - All participants array
 * @param {Array} sessions - All sessions array
 * @param {Object} departmentLimits - Department limits per session
 * @param {string} department - Optional: filter by specific department
 * @returns {Array} Array of session summaries
 */
export function getSessionsSummary(
  participants,
  sessions,
  departmentLimits,
  department = null
) {
  return sessions.map((session) => {
    const available = getAvailableSeats(
      session.name,
      participants,
      sessions,
      department,
      departmentLimits
    );

    return {
      ...session,
      totalUsed: available.totalUsed,
      totalRemaining: available.totalRemaining,
      departmentUsed: department ? available.departmentUsed : null,
      departmentRemaining: department
        ? available.departmentRemaining
        : null,
      isFull: available.totalRemaining === 0,
    };
  });
}

/**
 * Gets statistics about allocation
 * 
 * @param {Array} participants - All participants array
 * @param {Object} departmentLimits - Department limits per session
 * @returns {Object} Allocation statistics
 */
export function getAllocationStats(participants, departmentLimits) {
  const totalParticipants = participants.length;
  const allocatedParticipants = participants.filter(
    (p) => p.session && p.session.trim() !== ""
  ).length;
  const unallocatedParticipants = totalParticipants - allocatedParticipants;

  const departmentStats = {};
  Object.keys(departmentLimits).forEach((dept) => {
    const deptParticipants = participants.filter(
      (p) => p.department === dept
    );
    departmentStats[dept] = {
      total: deptParticipants.length,
      allocated: deptParticipants.filter(
        (p) => p.session && p.session.trim() !== ""
      ).length,
      unallocated: deptParticipants.filter(
        (p) => !p.session || p.session.trim() === ""
      ).length,
    };
  });

  return {
    totalParticipants,
    allocatedParticipants,
    unallocatedParticipants,
    allocationPercentage:
      totalParticipants > 0
        ? ((allocatedParticipants / totalParticipants) * 100).toFixed(2)
        : 0,
    departmentStats,
  };
}

/**
 * Gets all unallocated participants
 * 
 * @param {Array} participants - All participants array
 * @returns {Array} Unallocated participants
 */
export function getUnallocatedParticipants(participants) {
  return participants.filter((p) => !p.session || p.session.trim() === "");
}

/**
 * Gets all participants in a specific session
 * 
 * @param {Array} participants - All participants array
 * @param {string} sessionName - Session name
 * @returns {Array} Participants in the session
 */
export function getParticipantsInSession(participants, sessionName) {
  return participants.filter((p) => p.session === sessionName);
}

/**
 * Gets all participants from a specific department
 * 
 * @param {Array} participants - All participants array
 * @param {string} department - Department name
 * @returns {Array} Participants in the department
 */
export function getParticipantsByDepartment(participants, department) {
  return participants.filter((p) => p.department === department);
}
