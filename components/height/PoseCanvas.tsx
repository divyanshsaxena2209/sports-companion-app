'use client';

import { RefObject } from 'react';

export const PoseCanvas = ({
  canvasRef,
  width,
  height
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
}) => {
  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full object-cover z-0 pointer-events-none"
      width={width}
      height={height}
    />
  );
};
