import React, { useState, useEffect } from "react";
import CalendarView from "./CalendarView";

function Dashboard() {
  const [incomingReqs, setIncomingReqs] = useState([]);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState([]);
  const [swappableSlots, setSwappableSlots] = useState([]);
  const [mySwapSlot, setMySwapSlot] = useState("");
  const [selectedSlotToSwap, setSelectedSlotToSwap] = useState("");

  const token = localStorage.getItem("token");

  //  Fetch my slots
  const fetchSlots = async () => {
    const res = await fetch("http://localhost:4000/slots", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setSlots(data);
  };

  // Fetch swappable slots from others
  const fetchSwappableSlots = async () => {
    const res = await fetch("http://localhost:4000/swappable-slots", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setSwappableSlots(data);
  };
  // Create Slot
  const createSlot = async () => {
    if (!date || !time) return alert("Select date & time");

    const res = await fetch("http://localhost:4000/slot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ date, time }),
    });

    if (res.ok) {
      alert("Slot created");
      setDate("");
      setTime("");
      fetchSlots();
    } else {
      alert("Failed ");
    }
  };

  //  Delete slot
  const deleteSlot = async (id) => {
    if (!window.confirm("Delete this slot?")) return;

    await fetch(`http://localhost:4000/slot/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    fetchSlots();
  };

  //  Mark slot swappable
  const makeSwappable = async (id) => {
    const res = await fetch(`http://localhost:4000/slot/make-swappable/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      alert("Slot marked swappable ");
      fetchSlots();
      fetchSwappableSlots();
    }
  };

  //  Send swap request
  const requestSwap = async () => {
    if (!mySwapSlot || !selectedSlotToSwap)
      return alert("Select both slots ⚠️");

    const chosen = swappableSlots.find((s) => s.id == selectedSlotToSwap);

    const res = await fetch("http://localhost:4000/swap-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mySlotId: parseInt(mySwapSlot),
        theirSlotId: parseInt(selectedSlotToSwap),
        receiverId: chosen.userId,
      }),
    });

    if (res.ok) {
      alert("Swap request sent");
      fetchSlots();
      fetchSwappableSlots();
      setMySwapSlot("");
      setSelectedSlotToSwap("");
    } else alert("Swap failed");
  };

  // Load data on mount
  useEffect(() => {
    fetchSlots();
    fetchSwappableSlots();
    fetchIncomingRequests();

    // auto refresh every 5 seconds
    const interval = setInterval(() => {
      fetchSlots();
      fetchSwappableSlots();
      fetchIncomingRequests();
    }, 5000);

    return () => clearInterval(interval);
  }, []);
  const fetchIncomingRequests = async () => {
    const res = await fetch("http://localhost:4000/incoming-requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setIncomingReqs(data);
  };
  const handleSwapResponse = async (id, accept) => {
    await fetch("http://localhost:4000/swap-response", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ requestId: id, accept }),
    });

    fetchSlots();
    fetchSwappableSlots();
    fetchIncomingRequests();
  };

  return (
    <div style={{ padding: "20px", maxWidth: "650px", margin: "auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Dashboard</h2>

      {/* Create Slot Section */}
      <h3>Create Slot</h3>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={inputStyle}
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        style={inputStyle}
      />
      <button onClick={createSlot} style={primaryBtn}>
        Create Slot
      </button>

      {/* My Slots */}
      <h3 style={{ marginTop: "25px" }}>Your Slots</h3>

      {slots.length === 0 ? (
        <p>No slots created yet</p>
      ) : (
        slots.map((s) => (
          <div key={s.id} style={slotCard}>
            <div>
              <strong>{s.date}</strong> | {s.time}
              <div style={{ fontSize: "12px" }}>
                Status: <strong>{s.status}</strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => makeSwappable(s.id)}
                style={greenBtn}
                disabled={s.status === "SWAPPABLE"}
              >
                Make Swappable
              </button>

              <button onClick={() => deleteSlot(s.id)} style={redBtn}>
                Delete
              </button>
            </div>
          </div>
        ))
      )}
      <CalendarView slots={slots} />

      <h3 style={{ marginTop: "30px" }}>Incoming Swap Requests</h3>

      {incomingReqs.length === 0 ? (
        <p>No requests yet</p>
      ) : (
        incomingReqs.map((r) => (
          <div key={r.id} style={slotCard}>
            <div>
              Swap request from: <strong>{r.requester.email}</strong>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => handleSwapResponse(r.id, true)}
                style={greenBtn}
              >
                Accept
              </button>
              <button
                onClick={() => handleSwapResponse(r.id, false)}
                style={redBtn}
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}

      {/* Swap Section */}
      <h3 style={{ marginTop: "30px" }}>Swap a Slot</h3>

      {/* My swappable slot */}
      <select
        value={mySwapSlot}
        onChange={(e) => setMySwapSlot(e.target.value)}
        style={inputStyle}
      >
        <option value="">-- Select your slot --</option>
        {slots
          .filter((s) => s.status === "SWAPPABLE")
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.date} | {s.time}
            </option>
          ))}
      </select>

      {/* Other swappable slots */}
      <select
        value={selectedSlotToSwap}
        onChange={(e) => setSelectedSlotToSwap(e.target.value)}
        style={inputStyle}
      >
        <option value="">-- Select slot to swap with --</option>
        {swappableSlots.map((s) => (
          <option key={s.id} value={s.id}>
            {s.date} | {s.time} (User {s.userId})
          </option>
        ))}
      </select>

      <button onClick={requestSwap} style={swapBtn}>
        Request Swap
      </button>
    </div>
  );
}

/* Shared Styles */
const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "10px",
  borderRadius: "6px",
  border: "1px solid #aaa",
};

const slotCard = {
  padding: "12px",
  borderRadius: "6px",
  border: "1px solid #aaa",
  marginBottom: "10px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const primaryBtn = {
  padding: "12px",
  width: "100%",
  background: "#007bff",
  color: "white",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
};

const greenBtn = {
  background: "#28a745",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: "4px",
  cursor: "pointer",
};

const redBtn = {
  background: "#dc3545",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: "4px",
  cursor: "pointer",
};

const swapBtn = {
  padding: "12px",
  width: "100%",
  background: "#ff9800",
  color: "white",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
};

export default Dashboard;
