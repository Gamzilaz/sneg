import React, { useEffect, useRef } from 'react';

interface SmoothEqualizerProps {
  analyser: AnalyserNode | null;
}

const SmoothEqualizer: React.FC<SmoothEqualizerProps> = ({ analyser }) => {
  const canvasRef = useRef<SVGSVGElement>(null);
  const pathRef1 = useRef<SVGPathElement>(null); // Bass (thick background wave)
  const pathRef2 = useRef<SVGPathElement>(null); // Midtones (primary wave)
  const pathRef3 = useRef<SVGPathElement>(null); // Treble (fast high frequency wave)
  const animationRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);

  // Amplitudes for the three distinct tonalities
  const bassAmpRef = useRef<number>(8.0);
  const midsAmpRef = useRef<number>(8.0);
  const trebleAmpRef = useRef<number>(8.0);

  useEffect(() => {
    const width = 600;
    const height = 100;
    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const animate = () => {
      // Check global analyser from window to support overall sound analysis
      const globalAnalyser = (window as any).audioAnalyser as AnalyserNode | null;
      const currentAnalyser = globalAnalyser || analyser;

      let targetBass = 8.0;
      let targetMids = 8.0;
      let targetTreble = 8.0;

      if (currentAnalyser && dataArray) {
        currentAnalyser.getByteFrequencyData(dataArray);
        const len = dataArray.length;

        // 1. Bass / Lows (0% to 12% of the spectrum)
        let bassSum = 0;
        let bassCount = 0;
        const bassEnd = Math.max(1, Math.floor(len * 0.12));
        for (let i = 0; i < bassEnd; i++) {
          bassSum += dataArray[i];
          bassCount++;
        }
        const bassAvg = bassSum / (bassCount || 1);
        targetBass = 8.0 + (bassAvg / 255) * 55;

        // 2. Midtones (12% to 45% of the spectrum)
        let midsSum = 0;
        let midsCount = 0;
        const midsEnd = Math.max(bassEnd + 1, Math.floor(len * 0.45));
        for (let i = bassEnd; i < midsEnd; i++) {
          midsSum += dataArray[i];
          midsCount++;
        }
        const midsAvg = midsSum / (midsCount || 1);
        targetMids = 8.0 + (midsAvg / 255) * 48;

        // 3. Treble / Highs (45% to 90% of the spectrum)
        let trebleSum = 0;
        let trebleCount = 0;
        const trebleEnd = Math.max(midsEnd + 1, Math.floor(len * 0.9));
        for (let i = midsEnd; i < trebleEnd; i++) {
          trebleSum += dataArray[i];
          trebleCount++;
        }
        const trebleAvg = trebleSum / (trebleCount || 1);
        targetTreble = 8.0 + (trebleAvg / 255) * 42;
      }

      // Smooth interpolation for each frequency band (increased from 0.08 to 0.22 for sharper, faster reaction)
      bassAmpRef.current += (targetBass - bassAmpRef.current) * 0.22;
      midsAmpRef.current += (targetMids - midsAmpRef.current) * 0.22;
      trebleAmpRef.current += (targetTreble - trebleAmpRef.current) * 0.22;

      // Base phase speed (speeds up slightly with higher mids intensity for added energy)
      phaseRef.current += 0.03 + (midsAmpRef.current / 120) * 0.05;

      // Draw three distinct curves matching the different audio tones
      const pointsList1: string[] = [];
      const pointsList2: string[] = [];
      const pointsList3: string[] = [];
      const numPoints = 120;

      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * width;
        const normX = i / numPoints;
        const envelope = Math.pow(Math.sin(normX * Math.PI), 4); // Keep edges perfectly pinned

        // --- Wave 1: Bass (Slow, heavy, deep waves) ---
        const phaseBass = phaseRef.current * 0.7;
        const waveBass = Math.sin(x * 0.0136 - phaseBass) * bassAmpRef.current * 1.1 +
                         Math.sin(x * 0.0245 - phaseBass * 1.3) * (bassAmpRef.current * 0.25);
        const yBass = (height / 2) + waveBass * envelope;
        
        if (i === 0) pointsList1.push(`M ${x} ${yBass}`);
        else pointsList1.push(`L ${x} ${yBass}`);

        // --- Wave 2: Midtones (Balanced, classic organic waves) ---
        const phaseMids = phaseRef.current * 1.1;
        const waveMids = Math.sin(x * 0.021 - phaseMids) * midsAmpRef.current +
                         Math.sin(x * 0.038 - phaseMids * 1.2) * (midsAmpRef.current * 0.35);
        const yMids = (height / 2) + waveMids * envelope;

        if (i === 0) pointsList2.push(`M ${x} ${yMids}`);
        else pointsList2.push(`L ${x} ${yMids}`);

        // --- Wave 3: Treble (Fast, tight, energetic ripples) ---
        const phaseTreble = phaseRef.current * 1.8;
        const waveTreble = Math.sin(x * 0.046 - phaseTreble) * trebleAmpRef.current * 0.75 +
                           Math.sin(x * 0.082 - phaseTreble * 1.5) * (trebleAmpRef.current * 0.2);
        const yTreble = (height / 2) + waveTreble * envelope;

        if (i === 0) pointsList3.push(`M ${x} ${yTreble}`);
        else pointsList3.push(`L ${x} ${yTreble}`);
      }

      if (pathRef1.current) pathRef1.current.setAttribute('d', pointsList1.join(' '));
      if (pathRef2.current) pathRef2.current.setAttribute('d', pointsList2.join(' '));
      if (pathRef3.current) pathRef3.current.setAttribute('d', pointsList3.join(' '));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [analyser]);

  return (
    <div className="w-full max-w-[600px] h-[60px] flex items-center justify-center pointer-events-none overflow-visible">
      <svg
        ref={canvasRef}
        viewBox="0 0 600 100"
        className="w-full h-full overflow-visible"
        style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.4))' }}
      >
        {/* Bass Line: Thick background wave (semi-transparent) */}
        <path
          ref={pathRef1}
          fill="none"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="transition-opacity duration-500"
        />
        {/* Treble Line: Thin background detailed wave (very light opacity) */}
        <path
          ref={pathRef3}
          fill="none"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1.0"
          strokeLinecap="round"
          className="transition-opacity duration-500"
        />
        {/* Midtones Line: Core solid foreground line */}
        <path
          ref={pathRef2}
          fill="none"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="opacity-90 transition-opacity duration-500"
        />
      </svg>
    </div>
  );
};

export default SmoothEqualizer;
