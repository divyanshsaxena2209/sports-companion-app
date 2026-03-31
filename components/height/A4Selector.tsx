'use client';
import { useState, useEffect } from 'react';

type Point = { x: number, y: number };

export const A4Selector = ({
  onA4Selected,
  resetSignal
}: {
  onA4Selected: (pixelHeight: number) => void;
  resetSignal: number;
}) => {
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    setPoints([]);
  }, [resetSignal]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (points.length >= 2) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPoints = [...points, { x, y }];
    setPoints(newPoints);
    
    if (newPoints.length === 2) {
      // Calculate Y distance (pixel height of A4)
      const height = Math.abs(newPoints[0].y - newPoints[1].y);
      onA4Selected(height);
    }
  };

  return (
    <div 
      className="absolute inset-0 z-10 cursor-crosshair" 
      onClick={points.length < 2 ? handleClick : undefined}
    >
      {points.map((p, i) => (
        <div 
          key={i} 
          className="absolute w-4 h-4 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg border-2 border-white"
          style={{ left: p.x, top: p.y }}
        >
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-red-500 text-white px-1 rounded">
                Point {i + 1}
            </span>
        </div>
      ))}
      {points.length === 2 && (
        <div 
          className="absolute border-2 border-red-500 border-dashed bg-red-500/10"
          style={{
            left: Math.min(points[0].x, points[1].x) - 100, // Make it look like an A4 width for visual cue
            top: Math.min(points[0].y, points[1].y),
            width: 200,
            height: Math.abs(points[0].y - points[1].y)
          }}
        />
      )}
    </div>
  );
};
