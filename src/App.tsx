import {
  ChangeEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { QueryClientProvider } from "react-query";
import { AiOutlineDelete } from "react-icons/ai";
import { useStore } from "./state/stores/timers";
import { convertMilliseconds } from "./state/logic/time";
import { setActiveTimerLabel } from "./state/api/raw";
import { queryClient, useDeleteLog, useLogsQuery } from "./state/api/hooks";
import { Doc } from "@junobuild/core";
import { Log } from "./state/models/timesheets";

function App() {
  const { init } = useStore();

  // Initialize the store when the app mounts.
  useEffect(() => void init(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <Render />
    </QueryClientProvider>
  );
}

function Render() {
  const { state } = useStore();
  if ("running" in state) return <Timer />;
  if ("idle" in state) return <Idle />;
  return <>Unknown state</>;
}

function Timer() {
  const { state, end } = useStore();
  if (!("running" in state)) throw new Error("Timer not running");

  const [delta, setDelta] = useState(0);
  const [label, setLabel] = useState(state.running.label);

  // Update the component every 250ms.
  useEffect(() => {
    const id = window.setInterval(
      () => setDelta(new Date().getTime() - state.running.in.getTime()),
      250
    );
    return () => clearInterval(id);
  }, []);

  // Handle updates to the label.
  const waitForQuiet = useRef<number | null>(null);
  const updateLabel = useCallback<ChangeEventHandler<HTMLInputElement>>((e) => {
    setLabel(e.target.value);
    if (waitForQuiet.current) clearTimeout(waitForQuiet.current);
    waitForQuiet.current = window.setTimeout(
      () => setActiveTimerLabel(e.target.value),
      1000
    );
  }, []);

  const { hours, minutes, seconds } = convertMilliseconds(delta);

  return (
    <div>
      <input value={label} onChange={updateLabel} />
      <pre>
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </pre>
      <button onClick={() => end()}>End</button>
    </div>
  );
}

function Idle() {
  const { start } = useStore();

  const { data } = useLogsQuery();

  return (
    <div>
      <button onClick={() => start()}>Start</button>
      <div>
        <h2>Logs</h2>
        {data?.map((log) => (
          <div key={log.key}>
            <LogRow doc={log} />
          </div>
        ))}
      </div>
    </div>
  );
}

function LogRow({ doc }: { doc: Doc<Log> }) {
  const { hours, minutes, seconds } = convertMilliseconds(
    doc.data.out.getTime() - doc.data.in.getTime()
  );
  const deleteLog = useDeleteLog();
  const handleDelete = useCallback(() => {
    deleteLog.mutate(doc);
  }, []);
  return (
    <div className="log-row">
      <div>{doc.data.in.toDateString()}</div>
      <div>
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </div>
      <div>{doc.data.label}</div>
      <div>
        <div onClick={handleDelete}>
          <AiOutlineDelete />
        </div>
      </div>
    </div>
  );
}

export default App;
