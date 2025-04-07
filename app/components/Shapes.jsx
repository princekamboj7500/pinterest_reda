import React from "react";
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Line,
  Arrow,
  Star,
  Ellipse,
} from "react-konva";
import { predefinedShapes } from "./shapesData";

const Shapes = ({ addShape }) => {
  return (
    <div style={{ textAlign: "center", marginTop: 20 }}>
      <h2>Available Shapes</h2>
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
          {predefinedShapes.map((shape) => {
            return (
              <div
                key={shape.id}
                style={{
                  display: "inline-block",
                  margin: 10,
                  border: "1px solid #ccc",
                  padding: 10,
                  cursor: "pointer",
                }}
              >
                <h3 onClick={() => addShape(shape.type, shape)}>
                  {shape.type}
                </h3>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Shapes;
