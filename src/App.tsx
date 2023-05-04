import {
  ChangeEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { QueryClientProvider } from "react-query";
import {
  AiOutlineDelete,
  AiOutlineSave,
  AiOutlineClockCircle,
  AiOutlineEdit,
} from "react-icons/ai";
import { useStore } from "./state/stores/timers";
import { convertMilliseconds } from "./state/logic/time";
import { setActiveTimerLabel } from "./state/api/raw";
import {
  queryClient,
  useStartTimerMutation,
  useDeleteLog,
  useLogsQuery,
  useEndTimerMutation,
  useSaveLog,
} from "./state/api/hooks";
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
  const { state } = useStore();
  const end = useEndTimerMutation();
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
      <input value={label} autoFocus onChange={updateLabel} />
      <pre>
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </pre>
      <button onClick={() => end.mutate()}>End</button>
    </div>
  );
}

function Idle() {
  const start = useStartTimerMutation();

  const { data } = useLogsQuery();

  const total = useMemo(
    () =>
      convertMilliseconds(
        Math.floor(
          data?.reduce(
            (t, x) => t + x.data.out.getTime() - x.data.in.getTime(),
            0
          ) || 0
        )
      ),
    [data]
  );

  const grouped = useMemo(
    () =>
      data?.reduce((acc, x) => {
        const key = `${String(x.data.in.getFullYear()).padStart(
          2,
          "0"
        )}-${String(x.data.in.getMonth()).padStart(2, "0")}-${String(
          x.data.in.getDate()
        ).padStart(2, "0")}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(x);
        return acc;
      }, {} as { [key: string]: Doc<Log>[] }),
    [data]
  );

  return (
    <div className="app">
      <button className="start" onClick={() => start.mutate()}>
        Start
      </button>
      <h2>Logs</h2>
      <div className="logs">
        {Object.keys(grouped || {}).map((key) => {
          const { hours, seconds, minutes } = convertMilliseconds(
            grouped?.[key].reduce(
              (acc, x) => acc + (x.data.out.getTime() - x.data.in.getTime()),
              0
            ) || 0
          );
          const totalBillable = grouped?.[key].reduce(
            (acc, x) =>
              acc +
              ((typeof x.data?.rate === "undefined" ? 150 : x.data.rate) *
                (x.data.out.getTime() - x.data.in.getTime())) /
                1000 /
                60 /
                60,
            0
          );
          return (
            <div className="log-group">
              <div className="log-header">{key}</div>
              {grouped?.[key].map((log) => (
                <div key={log.key}>
                  <LogRow doc={log} />
                </div>
              ))}
              <div className="log-row summary">
                <div>
                  <AiOutlineClockCircle />
                  {String(hours).padStart(2, "0")}:
                  {String(minutes).padStart(2, "0")}:
                  {String(seconds).padStart(2, "0")}
                </div>
                <div>${totalBillable?.toFixed(2)}</div>
                <div></div>
              </div>
            </div>
          );
        })}
        <div>
          <br />
          Total: {String(total.hours).padStart(2, "0")}:
          {String(total.minutes).padStart(2, "0")}:
          {String(total.seconds).padStart(2, "0")}
          &nbsp;&nbsp; ${total.hours * 150} / $50,000 &nbsp;&nbsp;{" "}
          {Math.floor((100 * total.hours * 150) / 50_000)}%
        </div>
      </div>
    </div>
  );
}

function LogRow({ doc }: { doc: Doc<Log> }) {
  const { hours, minutes, seconds } = convertMilliseconds(
    doc.data.out.getTime() - doc.data.in.getTime()
  );
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(doc.data.label);
  const [rate, setRate] = useState(doc.data.rate);
  const deleteLog = useDeleteLog();
  const saveLog = useSaveLog();
  const handleDelete = useCallback(() => deleteLog.mutate(doc), []);
  const handleEdit = useCallback(() => setEditing(true), []);
  const handleSave = useCallback(() => {
    setEditing(false);
    saveLog.mutate({ ...doc, data: { ...doc.data, label, rate } });
  }, [label, rate]);
  return editing ? (
    <div className="log-row editing">
      <div>
        <AiOutlineClockCircle />
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </div>
      <input value={rate} onChange={(e) => setRate(Number(e.target.value))} />
      <input value={label} onChange={(e) => setLabel(e.target.value)} />
      <div>
        <div onClick={handleSave}>
          <AiOutlineSave />
        </div>
      </div>
    </div>
  ) : (
    <div className="log-row">
      <div>
        <AiOutlineClockCircle />
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </div>
      <div>${typeof rate === "undefined" ? 150 : rate}</div>
      <div>{label}</div>
      <div>
        <div onClick={handleDelete}>
          <AiOutlineDelete />
        </div>
      </div>
      <div>/</div>
      <div>
        <div onClick={handleEdit}>
          <AiOutlineEdit />
        </div>
      </div>
    </div>
  );
}

export default App;
