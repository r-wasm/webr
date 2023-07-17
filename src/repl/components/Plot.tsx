import React from 'react';
import './Plot.css';

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
    <div className='plot'>
      <button type="button" onClick={savePlot} className='save'>Save Plot</button>
      <canvas ref={canvasRef} id='plot-canvas' width="1008" height="1008"></canvas>
    </div>
  );
}

export default Plot;
