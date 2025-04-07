import React, { useState } from "react";

const Uploads = ({ images, setImages }) => {
  // Handle File Selection
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    handleUpload(files);
  };

  // Handle Drag & Drop Upload
  const handleDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    handleUpload(files);
  };

  // Upload Function
  const handleUpload = (files) => {
    const uploadedImages = files.map((file) =>
      Object.assign(file, { preview: URL.createObjectURL(file) })
    );
    setImages([...images, ...uploadedImages]);
  };

  return (
    <div style={styles.container}>
      {/* Scrollable Image Sidebar */}
      <div style={styles.imageSidebar}>
        {images.map((image, index) => (
          <div key={index} style={styles.imageWrapper}>
            <img src={image.preview} alt="Uploaded" style={styles.image} />
          </div>
        ))}
      </div>

      {/* Upload Area */}
      <div
        style={styles.uploadBox}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <p>Drag & drop images here, or</p>
        <label htmlFor="fileUpload" style={styles.uploadLabel}>
          Click to Upload
        </label>
        <input
          id="fileUpload"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          style={styles.fileInput}
        />
      </div>
    </div>
  );
};

// ✅ **Styles**
const styles = {
  container: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    padding: "0px",
  },
  imageSidebar: {
    width: "500px",
    height: "400px",
    overflowY: "auto",
    borderRight: "1px solid #ddd",
    padding: "10px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
  },
  uploadBox: {
    width: "300px",
    height: "150px",
    border: "2px dashed #aaa",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "10px",
    cursor: "pointer",
    textAlign: "center",
    marginLeft: "20px",
  },
  uploadLabel: {
    color: "#333",
    cursor: "pointer",
    textDecoration: "underline",
  },
  fileInput: {
    display: "none",
  },
  imageWrapper: {
    width: "100px",
    height: "100px",
    overflow: "hidden",
    borderRadius: "5px",
    border: "1px solid #ddd",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
};

export default Uploads;
