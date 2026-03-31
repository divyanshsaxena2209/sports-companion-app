'use client';

import { useEffect, useRef, useState } from 'react';
import * as mpPose from '@mediapipe/pose';
import * as mpCamera from '@mediapipe/camera_utils';
import type { Results } from '@mediapipe/pose';

// Webpack workaround for MediaPipe UMD modules in Next.js
const Pose = mpPose.Pose || (mpPose as any).default?.Pose || (typeof window !== 'undefined' ? (window as any).Pose : undefined);
const Camera = mpCamera.Camera || (mpCamera as any).default?.Camera || (typeof window !== 'undefined' ? (window as any).Camera : undefined);

export const usePoseDetection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const poseRef = useRef<mpPose.Pose | null>(null);
  const cameraRef = useRef<mpCamera.Camera | null>(null);
  const [personPixelHeight, setPersonPixelHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      },
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    poseRef.current = pose;
    setIsLoaded(true);

    return () => {
      poseRef.current?.close();
    };
  }, []);

  const calculatePersonHeight = (results: Results) => {
    if (!results.poseLandmarks || !canvasRef.current || !videoRef.current) {
      setPersonPixelHeight(null);
      return;
    }

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    // Calculate height
    const landmarks = results.poseLandmarks;
    
    // 0 is Nose. 33 is not a valid landmark, ankles are 27 and 28.
    const nose = landmarks[0];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    
    const headY = nose.y;
    // Use the lowest ankle
    const footY = Math.max(leftAnkle.y, rightAnkle.y);
    
    // Convert normalized coordinates to pixel height based on video intrinsic height
    // We can use the canvas or video height
    const pixelHeight = (footY - headY) * canvasRef.current.height;
    
    if (pixelHeight > 0) {
      setPersonPixelHeight(pixelHeight);
    }

    // Draw lines over body
    canvasCtx.globalCompositeOperation = 'source-over';
    
    // Draw landmarks
    landmarks.forEach((landmark) => {
      canvasCtx.beginPath();
      canvasCtx.arc(
        landmark.x * canvasRef.current!.width,
        landmark.y * canvasRef.current!.height,
        3,
        0,
        2 * Math.PI
      );
      canvasCtx.fillStyle = '#00FF00';
      canvasCtx.fill();
    });

    canvasCtx.restore();
  };

  const startCamera = async () => {
    if (!videoRef.current || !poseRef.current) return;

    poseRef.current.onResults(calculatePersonHeight);

    cameraRef.current = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current && poseRef.current) {
          await poseRef.current.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480,
    });

    await cameraRef.current.start();
  };

  const stopCamera = async () => {
    if (cameraRef.current) {
      await cameraRef.current.stop();
    }
  };

  return {
    videoRef,
    canvasRef,
    isLoaded,
    personPixelHeight,
    startCamera,
    stopCamera
  };
};
