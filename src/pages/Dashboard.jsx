import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { initialParticipants, sessions, departmentLimits } from "../data/mockData";

function Dashboard() {
  const location = useLocation();
  const currentDepartment = location.state?.department || "Division A";

  const [participants, setParticipants] = useState(initialParticipants);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("unallocated");
  const [selectedSession, setSelectedSession] = useState("All Sessions");
  const [message, setMessage] = useState("");

  const departmentParticipants = useMemo(() => {
    return participants.filter(
      (person) => person.department === currentDepartment
    );
  }, [participants, currentDepartment]);

  const sessionSummary = useMemo(() => {
    return sessions.map((session) => {
      const totalUsed = participants.filter(
        (person) => person.session === session.name
      ).length;

      const departmentUsed = participants.filter(
        (person) =>
          person.department === currentDepartment &&
          person.session === session.name
      ).length;

      return {
        ...session,
        totalUsed,
        totalRemaining: session.capacity - totalUsed,
        departmentUsed,
        departmentRemaining: departmentLimits[currentDepartment] - departmentUsed,
      };
    });
  }, [participants, currentDepartment]);

  const filteredParticipants = useMemo(() => {
    let filtered = [...departmentParticipants];

    if (viewMode === "allocated") {
      filtered = filtered.filter((person) => person.session !== "");
    } else {
      filtered = filtered.filter((person) => person.session === "");
    }

    if (viewMode === "allocated" && selectedSession !== "All Sessions") {
      filtered = filtered.filter(
        (person) => person.session === selectedSession
      );
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter((person) =>
        person.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [departmentParticipants, viewMode, selectedSession, searchTerm]);

  const allocateParticipant = (participantId, sessionName) => {
    setMessage("");

    const targetParticipant = participants.find((person) => person.id === participantId);
    const targetSession = sessions.find((session) => session.name === sessionName);

    if (!targetParticipant || !targetSession) return;

    if (targetParticipant.session) {
      setMessage("A participant can only be assigned to one session.");
      return;
    }

    const totalInSession = participants.filter(
      (person) => person.session === sessionName
    ).length;

    if (totalInSession >= targetSession.capacity) {
      setMessage(`${sessionName} session is full.`);
      return;
    }

    const departmentInSession = participants.filter(
      (person) =>
        person.department === currentDepartment &&
        person.session === sessionName
    ).length;

    if (departmentInSession >= departmentLimits[currentDepartment]) {
      setMessage(
        `${currentDepartment} has reached its maximum allocation for ${sessionName}.`
      );
      return;
    }

    setParticipants((prev) =>
      prev.map((person) =>
        person.id === participantId
          ? { ...person, session: sessionName }
          : person
      )
    );

    setMessage(`Participant allocated to ${sessionName}.`);
  };

  const removeParticipant = (participantId) => {
    setMessage("");

    setParticipants((prev) =>
      prev.map((person) =>
        person.id === participantId
          ? { ...person, session: "" }
          : person
      )
    );

    setMessage("Participant removed from session.");
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>{currentDepartment} Dashboard</h1>
          <p>Only members from {currentDepartment} are visible here.</p>
        </div>
      </header>

      {message && <div className="info-message">{message}</div>}

      <section className="session-summary">
        {sessionSummary.map((session) => (
          <div key={session.id} className="session-card">
            <h3>{session.name}</h3>
            <p>{session.time}</p>
            <p>Total used: {session.totalUsed}/{session.capacity}</p>
            <p>Total remaining: {session.totalRemaining}</p>
            <p>
              {currentDepartment} used: {session.departmentUsed}/{departmentLimits[currentDepartment]}
            </p>
            <p>{currentDepartment} remaining: {session.departmentRemaining}</p>
          </div>
        ))}
      </section>

      <section className="controls">
        <input
          type="text"
          placeholder="Search participant by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <div className="toggle-group">
          <button
            className={viewMode === "unallocated" ? "active" : ""}
            onClick={() => {
              setViewMode("unallocated");
              setSelectedSession("All Sessions");
            }}
          >
            Unallocated
          </button>

          <button
            className={viewMode === "allocated" ? "active" : ""}
            onClick={() => setViewMode("allocated")}
          >
            Allocated
          </button>
        </div>

        {viewMode === "allocated" && (
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="session-select"
          >
            <option>All Sessions</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.name}>
                {session.name}
              </option>
            ))}
          </select>
        )}
      </section>

      <section className="table-section">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Department</th>
              <th>Status</th>
              <th>Session</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map((person) => (
                <tr key={person.id}>
                  <td>{person.name}</td>
                  <td>{person.department}</td>
                  <td>{person.session ? "Allocated" : "Unallocated"}</td>
                  <td>{person.session || "Not assigned"}</td>
                  <td>
                    {person.session ? (
                      <button
                        className="remove-btn"
                        onClick={() => removeParticipant(person.id)}
                      >
                        Remove
                      </button>
                    ) : (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            allocateParticipant(person.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="" disabled>
                          Allocate to...
                        </option>
                        {sessions.map((session) => (
                          <option key={session.id} value={session.name}>
                            {session.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-data">
                  No participants found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default Dashboard;