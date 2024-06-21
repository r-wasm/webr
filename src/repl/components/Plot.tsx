import React from 'react';
import './Plot.css';
import { PlotInterface } from '../App';
import { FaArrowCircleLeft, FaArrowCircleRight, FaRegSave, FaTrashAlt } from 'react-icons/fa';
import { Panel } from 'react-resizable-panels';
import { WebR } from '../../webR/webr-main';

export function Plot({
  webR,
  plotInterface,
}: {
  webR: WebR;
  plotInterface: PlotInterface;
}) {
  const plotContainerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const canvasElements = React.useRef<HTMLCanvasElement[]>([]);
  const plotSize = React.useRef<{width: number, height: number}>({width: 1008, height: 1008});
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
      const plotNumber = canvasElements.current.length + 1;
      const canvas = document.createElement('canvas');
      canvas.setAttribute('width', String(plotSize.current.width * 2));
      canvas.setAttribute('height', String(plotSize.current.height * 2));
      canvas.setAttribute('aria-label', `R Plot ${plotNumber}`);
      canvasRef.current = canvas;
      canvasElements.current.push(canvas);
      setSelectedCanvas(plotNumber - 1);
    };

    // Resize the canvas() device when the plotting pane changes size
    plotInterface.resize = (direction, px) => {
      plotSize.current[direction] = Math.max(px / 1.5, 150);
      void webR.init().then(async () => {
        await webR.evalRVoid(`
          # Close any active canvas devices
          repeat {
            devices <- dev.list()
            idx <- which(names(devices) == "canvas")
            if (length(idx) == 0) {
              break
            }
            dev.off(devices[idx[1]])
          }
          # Set canvas size for future devices
          options(webr.fig.width = ${plotSize.current.width}, webr.fig.height = ${plotSize.current.height})
      `, { env: {} });
      });
    };
  }, [plotInterface]);

  // Update the plot container to display the currently selected canvas element
  React.useEffect(() => {
    if (!plotContainerRef.current) {
      return;
    }
    if (selectedCanvas === null) {
      plotContainerRef.current.replaceChildren();
    } else {
      const canvas = canvasElements.current[selectedCanvas];
      plotContainerRef.current.replaceChildren(canvas);
      plotContainerRef.current.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
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
  const onResize = (size:number) => plotInterface.resize("height", size * window.innerHeight / 100);

  return (
    <Panel id="plot" role="region" aria-label="Plotting Pane" minSize={20} onResize={onResize}>
      <div className="plot-header">
        <div role="toolbar" aria-label="Plotting Toolbar" className="plot-actions">
          <button
            aria-label="Previous Plot"
            disabled={!selectedCanvas}
            onClick={prevPlot}
          >
            <FaArrowCircleLeft aria-hidden="true" className="icon" />
          </button>
          <button
            aria-label="Next Plot"
            disabled={
              selectedCanvas === null || selectedCanvas === canvasElements.current.length - 1
            }
            onClick={nextPlot}
          >
            <FaArrowCircleRight aria-hidden="true" className="icon" />
          </button>
          <button
            aria-label="Save Plot"
            disabled={selectedCanvas === null}
            onClick={saveImage}
          >
            <FaRegSave aria-hidden="true" className="icon" /> Save Plot
          </button>
          <button
            aria-label="Clear Plots"
            disabled={selectedCanvas === null}
            onClick={(e) => {
              if (confirm('Clear all plots?')) {
                clearPlots();
              } else {
                e.stopPropagation();
              }
            }}
          >
            <FaTrashAlt aria-hidden="true" className="icon" /> Clear Plots
          </button>
        </div>
      </div>
      <div className='plot-background'>
        <div ref={plotContainerRef} className="plot-container"></div>
      </div>
    </Panel>
  );
}

export default Plot;
