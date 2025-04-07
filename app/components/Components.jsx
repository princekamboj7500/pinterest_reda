import React from "react";

const ComponentsBar = ({ addElement, deleteElement }) => {
  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Add Elements</h3>
      <button style={styles.button} onClick={() => addElement("text")}>
        ➕ Add Text
      </button>

      <button style={styles.button} onClick={deleteElement}>
        Delete
      </button>
    </div>
  );
};

// Inline styles for clean white theme
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "15px",
    border: "1px solid #ddd", // Subtle border to define the container
    borderRadius: "8px",
    background: "#fff", // White background
    boxShadow: "2px 2px 10px rgba(0,0,0,0.1)", // Soft shadow
    width: "200px",
  },
  heading: {
    marginBottom: "10px",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333", // Dark text for contrast
  },
  button: {
    padding: "10px",
    border: "1px solid #ddd", // Light border to keep the buttons subtle
    borderRadius: "5px",
    cursor: "pointer",
    background: "#fff", // White background for buttons
    color: "#333", // Dark text color for contrast
    fontSize: "14px",
    fontWeight: "normal", // No bold to keep it minimalist
    transition: "background 0.3s, border 0.3s", // Smooth hover transition
  },
};

// Export the component
export default ComponentsBar;
