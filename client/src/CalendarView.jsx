import React from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

function CalendarView({ slots }) {
  const tileContent = ({ date }) => {
    const d = date.toISOString().split("T")[0];
    const hasSlot = slots.some((s) => s.date === d);

    return hasSlot ? (
      <div
        style={{
          background: "#007bff",
          color: "white",
          fontSize: "10px",
          borderRadius: "4px",
          padding: "2px",
        }}
      >
        Slot
      </div>
    ) : null;
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <h3>Calendar</h3>
      <Calendar tileContent={tileContent} />
    </div>
  );
}

export default CalendarView;
