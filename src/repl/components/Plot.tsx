import React from 'react';
import './Plot.css';
import { PlotInterface } from '../App';
import { FaArrowCircleLeft, FaArrowCircleRight, FaRegSave, FaTrashAlt } from 'react-icons/fa';

export function Plot({
  plotInterface,
}: {
  plotInterface: PlotInterface;
}) {
  const plotContainterRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const canvasElements = React.useRef<HTMLCanvasElement[]>([]);
  const [selectedCanvas, setSelectedCanvas] = React.useState<number | null>(null);

   // Register the current canvas with the plotting interface so that when the
   // webR canvas device draws it writes to the currently active canvas element
  React.useEffect(() => {
    plotInterface.drawImage = (img: ImageBitmap) => {
      if (!canvasRef.current) {
        return;
      }
      canvasRef.current.getContext('2d')!.drawImage(img, 0, 0);
    };

    // If a new plot is created in R, add it to the list of canvas elements
    plotInterface.newPlot = () => {
      const canvas = document.createElement('canvas');
      canvas.setAttribute('width', '1008');
      canvas.setAttribute('height', '1008');
      canvasRef.current = canvas;
      canvasElements.current.push(canvas);
      setSelectedCanvas(canvasElements.current.length - 1);
    };
  }, [plotInterface]);

  // Update the plot container to display the currently selected canvas element
  React.useEffect(() => {
    if (!plotContainterRef.current) {
      return;
    }
    if (selectedCanvas === null) {
      plotContainterRef.current.replaceChildren();
    } else {
      const canvas = canvasElements.current[selectedCanvas];
      plotContainterRef.current.replaceChildren(canvas);
    }
  }, [selectedCanvas]);

  const saveImage = React.useCallback(() => {
    if (selectedCanvas === null) return;
    const link = document.createElement('a');
    link.download = `Rplot${selectedCanvas}.png`;
    link.href = canvasElements.current[selectedCanvas].toDataURL();
    link.click();
    link.remove();
  }, [selectedCanvas]);

  const clearPlots = () => {
    setSelectedCanvas(null);
    canvasElements.current = [];
  };

  const nextPlot = () => setSelectedCanvas((selectedCanvas === null) ? null : selectedCanvas + 1);
  const prevPlot = () => setSelectedCanvas((selectedCanvas === null) ? null : selectedCanvas - 1);

  return (
    <div className="plot">
      <div className="plot-header">
        <div className="plot-actions">
          <button disabled={!selectedCanvas} onClick={prevPlot}>
            <FaArrowCircleLeft className="icon" />
          </button>
          <button
            disabled={
              selectedCanvas === null || selectedCanvas === canvasElements.current.length - 1
            }
            onClick={nextPlot}
          >
            <FaArrowCircleRight className="icon" />
          </button>
          <button disabled={selectedCanvas === null} onClick={saveImage}>
            <FaRegSave className="icon" /> Save Plot
          </button>
          <button disabled={selectedCanvas === null} onClick={clearPlots}>
            <FaTrashAlt className="icon" /> Clear Plots
          </button>
        </div>
      </div>
      <div ref={plotContainterRef} className="plot-container"></div>
    </div>
  );
}

export default Plot;
