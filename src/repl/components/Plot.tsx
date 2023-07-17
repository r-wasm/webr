import React from 'react';
import './Plot.css';
import { FaArrowCircleLeft, FaArrowCircleRight, FaRegSave } from 'react-icons/fa';

export function Plot() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const savePlot = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'plot.png';
    link.href = canvasRef.current.toDataURL();
    link.click();
    link.remove();
  };

  return (
    <div className="plot">
      <div className="plot-header">
        <div className="plot-actions">
          <button>
            <FaArrowCircleLeft className="icon" />
          </button>
          <button>
            <FaArrowCircleRight className="icon" />
          </button>
          <button onClick={savePlot}>
            <FaRegSave className="icon" /> Save Plot
          </button>
        </div>
      </div>
      <div className="plot-container">
        <canvas ref={canvasRef} id='plot-canvas' width="1008" height="1008"></canvas>
      </div>
    </div>
  );
}

export default Plot;
