import { useState } from "react";
import { CalibrationFlow } from "./components/CalibrationFlow";
import { LiveMeter } from "./components/LiveMeter";
import type { CalibrationBaseline } from "./audio/calibration";
import "./App.css";

function App() {
  const [baseline, setBaseline] = useState<CalibrationBaseline | null>(null);
  // Bumping this remounts LiveMeter, forcing a fresh mic session on recalibrate.
  const [meterKey, setMeterKey] = useState(0);

  return (
    <main className="app-shell">
      <h1>Voice Volume Calibration Prototype</h1>
      <p className="subtitle">
        De-risking mic calibration and real-time metering before building the game.
      </p>

      {!baseline ? (
        <CalibrationFlow onComplete={setBaseline} />
      ) : (
        <LiveMeter
          key={meterKey}
          baseline={baseline}
          onRecalibrate={() => {
            setBaseline(null);
            setMeterKey((k) => k + 1);
          }}
        />
      )}
    </main>
  );
}

export default App;
