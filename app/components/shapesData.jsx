const generateShortId = () => Math.random().toString(36).substr(2, 6);
export const predefinedShapes = [
  {
    type: "shape",
    subType: "rect",
    x: 50,
    y: 50,
    width: 100,
    height: 80,
    stroke: "black",
    strokeWidth: 2,
  },
  {
    type: "shape",
    subType: "circle",
    x: 200,
    y: 100,
    radius: 50,
    stroke: "blue",
    strokeWidth: 2,
  },
  {
    type: "shape",
    subType: "line",
    x: 100,
    y: 200,
    points: [0, 0, 100, 0],
    stroke: "red",
    strokeWidth: 3,
  },
  {
    type: "shape",
    subType: "star",
    x: 300,
    y: 200,
    numPoints: 5,
    innerRadius: 20,
    outerRadius: 40,
    stroke: "purple",
    strokeWidth: 2,
  },
  {
    type: "shape",
    subType: "triangle",
    x: 400,
    y: 100,
    points: [0, 0, -50, 100, 50, 100],
    stroke: "green",
    strokeWidth: 2,
    closed: true,
  },
  {
    type: "shape",
    subType: "ellipse",
    x: 150,
    y: 250,
    radiusX: 60,
    radiusY: 40,
    stroke: "orange",
    strokeWidth: 2,
  },
  {
    type: "shape",
    subType: "polygon",
    x: 300,
    y: 250,
    points: [0, 0, 40, -80, 80, 0],
    stroke: "brown",
    strokeWidth: 2,
    closed: true,
  },
  {
    type: "shape",
    subType: "arrow",
    x: 100,
    y: 300,
    points: [0, 0, 100, 50],
    stroke: "black",
    strokeWidth: 2,
  },
  {
    type: "shape",
    subType: "curved-arrow",
    x: 250,
    y: 300,
    points: [0, 0, 50, 50, 100, 0],
    stroke: "black",
    strokeWidth: 2,
    tension: 0.5,
  },
];
