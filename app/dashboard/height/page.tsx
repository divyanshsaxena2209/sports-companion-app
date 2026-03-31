'use client';

import { useState, useCallback } from 'react';
import { CameraFeed } from '@/components/height/CameraFeed';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { Ruler, Info, Save, Loader2 } from 'lucide-react';

export default function HeightEstimationPage() {
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleHeightCalculated = useCallback((calculated: number | null, errMsg?: string) => {
    if (errMsg) {
      toast.error(errMsg);
      setHeightCm(null);
    } else if (calculated !== null) {
      setHeightCm(calculated);
      toast.success('Successfully analyzed height using Python models!');
    }
  }, []);

  const handleSaveHeight = async () => {
    if (!heightCm) return;
    
    setIsSaving(true);
    try {
      // Supabase integration disabled for now as requested
      await new Promise((resolve) => setTimeout(resolve, 800)); // mock network request
      console.log('Would save this to Supabase:', heightCm);
      toast.success(`Height est. (${heightCm.toFixed(1)} cm) generated! (DB insert skipped)`);
    } catch (error: any) {
      toast.error('Failed to save height');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Ruler className="w-8 h-8 text-blue-500" />
            AI Height Estimator
          </h1>
          <p className="text-gray-500 mt-2 max-w-xl">
            Use your camera and an A4 sheet of paper (29.7cm length) to estimate your real-world height.
          </p>
        </div>

        {heightCm !== null && (
          <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Estimated Height</p>
              <p className="text-3xl font-bold font-mono tracking-tight text-blue-900">
                {heightCm.toFixed(1)} <span className="text-lg text-blue-700/70">cm</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveHeight}
              disabled={isSaving}
              className="ml-4 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-gray-50 border-b flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Instructions:</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Place your device <strong>2-3 meters away</strong> ensuring your full body is visible.</li>
              <li>Hold an A4 sheet upright (portrait mode) against your torso making sure it is fully visible.</li>
              <li>Click <strong>Capture & Analyze</strong> and wait for the 5-second countdown to pose.</li>
              <li>The AI backend will automatically find the A4 paper and measure your height!</li>
            </ul>
          </div>
        </div>
        
        <div className="p-4 md:p-6 bg-black relative">
          <CameraFeed onHeightCalculated={handleHeightCalculated} />
        </div>
      </div>
    </div>
  );
}
