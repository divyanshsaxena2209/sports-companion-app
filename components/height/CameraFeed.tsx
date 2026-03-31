'use client';

import { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, Loader2 } from 'lucide-react';

export const CameraFeed = ({
  onHeightCalculated,
}: {
  onHeightCalculated: (heightCm: number | null, errorMsg?: string) => void;
}) => {
  const webcamRef = useRef<Webcam>(null);
  const [isCounting, setIsCounting] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fallback to standard HTTP on localhost since it's local Python
  const API_URL = 'http://127.0.0.1:8000/estimate-height';

  const captureImageAndAnalyze = async () => {
    if (!webcamRef.current) return;
    
    // Capture base64 string
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setIsProcessing(true);
    try {
      // Send to FastAPI Backend
      const formData = new FormData();
      formData.append('image_data', imageSrc);

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.status === 'success' && data.height_cm) {
        onHeightCalculated(data.height_cm);
      } else {
        onHeightCalculated(null, data.error || 'Failed to analyze pose or paper.');
      }
    } catch (e: any) {
       onHeightCalculated(null, 'Could not connect to the Python AI backend. Please ensure it is running.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCounting && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (isCounting && countdown === 0) {
      setIsCounting(false);
      setCountdown(5);
      captureImageAndAnalyze();
    }
    return () => clearTimeout(timer);
  }, [isCounting, countdown]); // Removed captureImageAndAnalyze from deps as it triggers infinite loops without careful wrapping

  const startCountdown = () => {
    setIsCounting(true);
    setCountdown(5);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden shadow-2xl bg-black aspect-[3/4] sm:aspect-video flex items-center justify-center">
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        className="w-full h-full object-cover z-0"
        videoConstraints={{ facingMode: "user" }}
      />
      
      {/* 5-second countdown overlay */}
      {isCounting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 backdrop-blur-sm">
          <span className="text-[120px] font-bold text-white drop-shadow-lg animate-pulse">
            {countdown}
          </span>
        </div>
      )}

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-30 text-white backdrop-blur-sm">
          <Loader2 className="w-16 h-16 animate-spin mb-4 text-blue-500" />
          <p className="text-xl font-medium tracking-wide">Analyzing Posture & Paper...</p>
          <p className="text-sm text-gray-300 mt-2">Connecting to Python AI...</p>
        </div>
      )}

      {/* Control UI */}
      {!isCounting && !isProcessing && (
        <div className="absolute bottom-6 left-0 right-0 z-40 flex justify-center">
          <button 
            type="button"
            onClick={startCountdown}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold flex items-center gap-3 transition-transform hover:scale-105 shadow-xl border border-blue-400"
          >
            <Camera className="w-6 h-6" />
            Capture & Analyze
          </button>
        </div>
      )}
    </div>
  );
};
