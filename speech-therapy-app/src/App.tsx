import { useState } from "react";
import { CalibrationFlow } from "./components/CalibrationFlow";
import { SessionSummary } from "./components/SessionSummary";
import { SessionHistory } from "./components/SessionHistory";
import { BalloonGame } from "./game/BalloonGame";
import { loadSessions, saveSession } from "./game/sessionHistory";
import type { CalibrationBaseline } from "./audio/calibration";
import type { SessionRecord } from "./game/types";
import "./App.css";

type View = "calibrating" | "playing" | "summary" | "history";

function App() {
  const [view, setView] = useState<View>("calibrating");
  const [baseline, setBaseline] = useState<CalibrationBaseline | null>(null);
  const [lastRecord, setLastRecord] = useState<SessionRecord | null>(null);
  // Bumping this remounts BalloonGame, forcing a fresh mic session each round.
  const [gameKey, setGameKey] = useState(0);

  function handleCalibrationComplete(newBaseline: CalibrationBaseline) {
    setBaseline(newBaseline);
    setView("playing");
  }

  function handleGameComplete(partialRecord: Omit<SessionRecord, "id" | "timestamp">) {
    const record: SessionRecord = {
      ...partialRecord,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    saveSession(record);
    setLastRecord(record);
    setView("summary");
  }

  return (
    <main className="app-shell">
      <h1>Loud &amp; Clear</h1>
      <p className="subtitle">Keep the balloon aloft by speaking loud and clear.</p>

      {view === "calibrating" && <CalibrationFlow onComplete={handleCalibrationComplete} />}

      {view === "playing" && baseline && (
        <BalloonGame key={gameKey} baseline={baseline} onComplete={handleGameComplete} />
      )}

      {view === "summary" && lastRecord && (
        <SessionSummary
          record={lastRecord}
          onPlayAgain={() => {
            setBaseline(null);
            setGameKey((k) => k + 1);
            setView("calibrating");
          }}
          onViewHistory={() => setView("history")}
        />
      )}

      {view === "history" && (
        <SessionHistory
          sessions={loadSessions()}
          onBack={() => setView(lastRecord ? "summary" : "calibrating")}
        />
      )}
    </main>
  );
}

export default App;
