/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import supabase from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Adjust import path as needed

const KeyTotal = () => {
  const [timeRange, setTimeRange] = useState("3months");
  const [isLoading, setIsLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState("Workouts"); // Track which metric is selected
  const [stats, setStats] = useState({
    workouts: 0,
    duration: 0,
    volume: 0,
    reps: 0,
  });
  const [chartData, setChartData] = useState<any>([]);
  const [weeklyAvg, setWeeklyAvg] = useState(0);

  useEffect(() => {
    fetchWorkoutStats();
  }, [timeRange]);

  const fetchWorkoutStats = async () => {
    try {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate date range
      const now = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case "1month":
          startDate.setMonth(now.getMonth() - 1);
          break;
        case "3months":
          startDate.setMonth(now.getMonth() - 3);
          break;
        case "6months":
          startDate.setMonth(now.getMonth() - 6);
          break;
        case "1year":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(now.getMonth() - 3);
      }

      // Fetch completed workout sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select(
          `
          id,
          started_at,
          ended_at,
          workout_session_exercises (
            workout_sets (
              weight,
              reps,
              rep_range_min,
              rep_range_max
            )
          )
        `,
        )
        .eq("status", "finished")
        .eq("user_id", user.id)
        .gte("started_at", startDate.toISOString())
        .order("started_at", { ascending: true });

      if (sessionsError) throw sessionsError;

      // Calculate totals and weekly data
      const totalWorkouts = sessions?.length || 0;
      let totalDurationHours = 0;
      let totalVolume = 0;
      let totalReps = 0;

      // Group by week for chart
      const chartDataMap = new Map();

      sessions?.forEach((session) => {
        // Calculate duration in hours
        let sessionDurationHours = 0;
        if (session.started_at && session.ended_at) {
          const start = new Date(session.started_at);
          const end = new Date(session.ended_at);
          sessionDurationHours =
            (end.getTime() - start.getTime()) / 1000 / 60 / 60;
          totalDurationHours += sessionDurationHours;
        }

        // Calculate volume and reps
        let sessionVolume = 0;
        let sessionReps = 0;
        session.workout_session_exercises?.forEach((exercise) => {
          exercise.workout_sets?.forEach((set) => {
            const reps = set.reps || set.rep_range_min || 0;
            const weight = set.weight || 0;
            const volume = weight * reps;
            totalVolume += volume;
            totalReps += reps;
            sessionVolume += volume;
            sessionReps += reps;
          });
        });

        // Group by week (starting Monday)
        const date = new Date(session.started_at);
        const weekStart = new Date(date);
        const day = date.getDay();
        const diffToMonday = day === 0 ? 6 : day - 1;
        weekStart.setDate(date.getDate() - diffToMonday);
        weekStart.setHours(0, 0, 0, 0);

        const weekKey = weekStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        if (!chartDataMap.has(weekKey)) {
          chartDataMap.set(weekKey, {
            week: weekKey,
            workouts: 0,
            duration: 0,
            volume: 0,
            reps: 0,
            fullDate: weekStart,
          });
        }

        const group = chartDataMap.get(weekKey);
        group.workouts++;
        group.duration += sessionDurationHours;
        group.volume += sessionVolume;
        group.reps += sessionReps;
      });

      // Calculate weekly average for the active metric
      if (chartDataMap.size > 0) {
        let totalForAvg = 0;
        chartDataMap.forEach((group) => {
          totalForAvg += group[activeMetric.toLowerCase()];
        });
        setWeeklyAvg(totalForAvg / chartDataMap.size);
      } else {
        setWeeklyAvg(0);
      }

      // Convert map to array and sort by date
      const chartArray: any = Array.from(chartDataMap.values())
        .sort((a, b) => a.fullDate - b.fullDate)
        .map(({ week, workouts, duration, volume, reps }) => ({
          week,
          workouts,
          duration: Math.round(duration * 100) / 100,
          volume: Math.round(volume),
          reps: Math.round(reps / 100) * 100,
        }));

      setChartData(chartArray);
      setStats({
        workouts: totalWorkouts,
        duration: Math.round(totalDurationHours),
        volume: Math.round(totalVolume),
        reps: totalReps,
      });
    } catch (error) {
      console.error("Error fetching workout stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update weekly average when active metric changes
  useEffect(() => {
    if (chartData.length > 0) {
      const total = chartData.reduce(
        (sum: any, item: { [x: string]: any }) =>
          sum + item[activeMetric.toLowerCase()],
        0,
      );
      setWeeklyAvg(total / chartData.length);
    }
  }, [activeMetric, chartData]);

  const KEY_TOTAL = [
    {
      name: "Workouts",
      total: stats.workouts,
      unit: "",
      color: "#ea580c",
      barColor: "#f97316",
    },
    {
      name: "Duration",
      total: stats.duration,
      unit: "hrs",
      color: "#3b82f6",
      barColor: "#3b82f6",
    },
    {
      name: "Volume",
      total: stats.volume.toLocaleString(),
      unit: "kg",
      color: "#10b981",
      barColor: "#10b981",
    },
    {
      name: "Reps",
      total: stats.reps.toLocaleString(),
      unit: "",
      color: "#9ca3af",
      barColor: "#9ca3af",
    },
  ];

  const getYAxisLabel = () => {
    switch (activeMetric) {
      case "Workouts":
        return "Number of Workouts";
      case "Duration":
        return "Duration (hrs)";
      case "Volume":
        return "Volume (kg)";
      case "Reps":
        return "Reps";
      default:
        return "";
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-bold mb-2">{label}</p>
          <p
            className="text-sm"
            style={{
              color: KEY_TOTAL.find((k) => k.name === activeMetric)?.color,
            }}
          >
            {activeMetric}:{" "}
            {activeMetric === "Volume"
              ? payload[0].value.toLocaleString()
              : activeMetric === "Duration"
                ? `${payload[0].value} hrs`
                : activeMetric === "Workouts"
                  ? payload[0].value
                  : payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="pt-4 space-y-6">
        <div className="items-center grid lg:grid-cols-4 grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-accent rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20 mb-2"></div>
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-6">
      {/* Key Totals - Clickable */}
      <div className="items-center grid lg:grid-cols-4 grid-cols-2 gap-2">
        {KEY_TOTAL.map((kt, i) => {
          const isActive = activeMetric === kt.name;
          return (
            <button
              key={i}
              onClick={() => setActiveMetric(kt.name)}
              className={`flex flex-col bg-accent rounded-xl p-2 transition-all duration-200 hover:scale-105 ${
                isActive ? "ring-2 ring-orange-500 shadow-lg" : ""
              }`}
            >
              <h2 className="font-bold tracking-tight text-orange-600 text-xs">
                {kt.name}
              </h2>
              <p className="text-xl font-bold">
                {kt.total}
                {kt.unit && (
                  <span className="text-sm ml-1 font-normal">{kt.unit}</span>
                )}
              </p>
            </button>
          );
        })}
      </div>

      {/* Total workout duration per week - updates based on active metric */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-500">
            Total {activeMetric.toLowerCase()} per week
          </p>
          <p className="text-2xl font-bold">
            {activeMetric === "Volume"
              ? weeklyAvg.toLocaleString()
              : weeklyAvg.toFixed(1)}
            <span className="text-sm font-normal">
              {" "}
              {activeMetric === "Duration"
                ? "hrs"
                : activeMetric === "Volume"
                  ? "kg"
                  : activeMetric === "Workouts"
                    ? "workouts"
                    : "reps"}{" "}
              avg.
            </span>
          </p>
        </div>

        {/* Replaced select with Select component */}
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Time Range</SelectLabel>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Chart Section - Updates based on active metric */}
      <div className="bg-accent rounded-xl p-4 ">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                yAxisId="left"
                label={{
                  value: getYAxisLabel(),
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fontSize: 10 },
                }}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  if (activeMetric === "Volume" || activeMetric === "Reps") {
                    return value >= 1000
                      ? `${(value / 1000).toFixed(0)}k`
                      : value;
                  }
                  return value;
                }}
              />
              <Tooltip content={<CustomTooltip />} />

              <Bar
                yAxisId="left"
                dataKey={activeMetric.toLowerCase()}
                name={activeMetric}
                fill={
                  KEY_TOTAL.find((k) => k.name === activeMetric)?.barColor ||
                  "#3b82f6"
                }
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            No workout data available for this period
          </div>
        )}
      </div>

      {/* Week highlight note */}
      {chartData.length > 0 && (
        <div className="text-center">
          <p className="text-sm font-medium">
            Week of {chartData[chartData.length - 1]?.week}
          </p>
          <p className="text-xs text-gray-500">
            {activeMetric === "Duration"
              ? `${chartData[chartData.length - 1]?.duration} hrs • Total time logged`
              : activeMetric === "Volume"
                ? `${chartData[chartData.length - 1]?.volume.toLocaleString()} kg • Total volume`
                : activeMetric === "Workouts"
                  ? `${chartData[chartData.length - 1]?.workouts} workouts • Total workouts`
                  : `${chartData[chartData.length - 1]?.reps.toLocaleString()} reps • Total reps`}
          </p>
        </div>
      )}
    </div>
  );
};

export default KeyTotal;
