import React, { useState } from "react";

const Photos = ({ images, addElement }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageClick = (image) => {
    console.log(image);
    setSelectedImage(image);
    addElement("image", image.preview);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Select an Image</h2>
      {/* <div style={styles.imageGrid}>
        {images.map((image, index) => (
          <div
            key={index}
            style={{
              ...styles.imageWrapper,
              border: selectedImage === image ? "2px solid blue" : "none",
            }}
            onClick={() => handleImageClick(image)}
          >
            {image.preview && (
              <img src={image.preview} alt="Preview" style={styles.image} />
            )}
          </div>
        ))}
      </div> */}
      <div style={styles.imageSidebar}>
        {images.map((image, index) => (
          <div
            key={index}
            style={styles.imageWrapper}
            onClick={() => handleImageClick(image)}
          >
            <img src={image.preview} alt="Uploaded" style={styles.image} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ✅ **Styles**
const styles = {
  container: {
    // padding: "10px",
    maxHeight: "400px",
    borderRight: "1px solid #ddd",
  },
  imageSidebar: {
    width: "250px",
    height: "400px",
    overflowY: "auto",
    borderRight: "1px solid #ddd",
    padding: "10px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
  },
  title: {
    fontSize: "16px",
    marginBottom: "10px",
    textAlign: "center",
  },
  imageGrid: {
    display: "grid",
    width: "300px",
    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
    gap: "10px",
    overflowY: "auto",
  },
  imageWrapper: {
    width: "80px",
    height: "80px",
    overflow: "hidden",
    cursor: "pointer",
    borderRadius: "5px",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "5px",
  },
};

export default Photos;
