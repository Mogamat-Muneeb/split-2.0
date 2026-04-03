/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import supabase from "@/lib/supabase";
import { getFoldersAndContents } from "@/hooks/getExerciseByName";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MuscleSplit = () => {
  const [timeRange, setTimeRange] = useState("1year");
  const [isLoading, setIsLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState("Sets");
  const [chartData, setChartData] = useState<any>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);

  const METRICS = [
    {
      name: "Sets",
      color: "#ea580c",
      fillColor: "#f97316",
    },
    {
      name: "Volume",
      color: "#3b82f6",
      fillColor: "#3b82f6",
    },
    {
      name: "Reps",
      color: "#10b981",
      fillColor: "#10b981",
    },
  ];

  useEffect(() => {
    const fetchExercises = async () => {
      const { exercises } = await getFoldersAndContents();

      setExerciseLibrary(exercises);
    };
    fetchExercises();
  }, []);

  useEffect(() => {
    if (exerciseLibrary.length > 0) {
      fetchMuscleSplitData();
    }
  }, [timeRange, exerciseLibrary]);

  const getMuscleGroup = (exerciseName: string, exerciseLibrary: any[]) => {
    const searchName = exerciseName?.toLowerCase().trim();

    const exercise = exerciseLibrary.find((ex) => {
      const libraryName = ex.jsonContents?.[0]?.content?.name;
      return libraryName?.toLowerCase().trim() === searchName;
    });

    if (!exercise || !exercise.jsonContents?.[0]?.content?.primaryMuscles) {
      return null;
    }

    const primaryMuscles = exercise.jsonContents[0].content.primaryMuscles;

    if (primaryMuscles.includes("abdominals")) return "Core";
    if (primaryMuscles.includes("quadriceps")) return "Legs";
    if (primaryMuscles.includes("hamstrings")) return "Legs";
    if (primaryMuscles.includes("glutes")) return "Legs";
    if (primaryMuscles.includes("calves")) return "Legs";
    if (primaryMuscles.includes("chest")) return "Chest";
    if (primaryMuscles.includes("lats")) return "Back";
    if (primaryMuscles.includes("middle back")) return "Back";
    if (primaryMuscles.includes("lower back")) return "Back";
    if (primaryMuscles.includes("biceps")) return "Arms";
    if (primaryMuscles.includes("triceps")) return "Arms";
    if (primaryMuscles.includes("forearms")) return "Arms";
    if (primaryMuscles.includes("shoulders")) return "Shoulders";
    if (primaryMuscles.includes("traps")) return "Shoulders";
    if (primaryMuscles.includes("adductors")) return "Legs";

    return null;
  };

  const fetchMuscleSplitData = async () => {
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
          startDate.setFullYear(now.getFullYear() - 1);
      }

      // Fetch workout sessions with exercises
      const { data: sessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select(
          `
          id,
          started_at,
          workout_session_exercises (
            name,
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
        .gte("started_at", startDate.toISOString());

      if (sessionsError) throw sessionsError;

      // Initialize data structure for muscle groups
      const muscleStats = {
        Back: { sets: 0, volume: 0, reps: 0 },
        Chest: { sets: 0, volume: 0, reps: 0 },
        Legs: { sets: 0, volume: 0, reps: 0 },
        Core: { sets: 0, volume: 0, reps: 0 },
        Arms: { sets: 0, volume: 0, reps: 0 },
        Shoulders: { sets: 0, volume: 0, reps: 0 },
      };

      // Process each session
      sessions?.forEach((session) => {
        session.workout_session_exercises?.forEach((exercise) => {
          const muscleGroup = getMuscleGroup(exercise.name, exerciseLibrary);

          if (muscleGroup && muscleStats[muscleGroup]) {
            // Process sets
            exercise.workout_sets?.forEach((set) => {
              muscleStats[muscleGroup].sets++;

              const reps = set.reps || set.rep_range_min || 0;
              muscleStats[muscleGroup].reps += reps;

              const volume = (set.weight || 0) * reps;
              muscleStats[muscleGroup].volume += volume;
            });
          }
        });
      });

      // Find max value for normalization (0-100 scale)
      const maxValues = {
        sets: Math.max(...Object.values(muscleStats).map((m) => m.sets), 1),
        volume: Math.max(...Object.values(muscleStats).map((m) => m.volume), 1),
        reps: Math.max(...Object.values(muscleStats).map((m) => m.reps), 1),
      };

      // Convert to radar chart format with normalization
      const radarData = Object.entries(muscleStats).map(([muscle, data]) => ({
        muscle,
        sets: (data.sets / maxValues.sets) * 100,
        volume: (data.volume / maxValues.volume) * 100,
        reps: (data.reps / maxValues.reps) * 100,
        rawSets: data.sets,
        rawVolume: Math.round(data.volume),
        rawReps: data.reps,
      }));
      //@ts-ignore
      setChartData(radarData);
    } catch (error) {
      console.error("Error fetching muscle split data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active: any;
    payload: any;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const metricValue = data[`raw${activeMetric}`];
      const unit =
        activeMetric === "Volume"
          ? "kg"
          : activeMetric === "Sets"
            ? "sets"
            : "reps";
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-bold mb-2">{data.muscle}</p>
          <p
            className="text-sm"
            style={{
              color: METRICS.find((m) => m.name === activeMetric)?.color,
            }}
          >
            {activeMetric}: {metricValue.toLocaleString()} {unit}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="pt-4 space-y-6">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-accent rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
            </div>
          ))}
        </div>
        <div className="bg-accent rounded-xl p-4 animate-pulse">
          <div className="h-[400px] bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  const activeMetricData = activeMetric.toLowerCase();
  const metricColor = METRICS.find((m) => m.name === activeMetric)?.color;
  const metricFillColor = METRICS.find(
    (m) => m.name === activeMetric,
  )?.fillColor;

  return (
    <div className="pt-4 space-y-6">
      {/* Metric Selector */}
      <div className="grid grid-cols-3 gap-2">
        {METRICS.map((metric, i) => {
          const isActive = activeMetric === metric.name;
          return (
            <button
              key={i}
              onClick={() => setActiveMetric(metric.name)}
              className={`flex flex-col bg-accent rounded-xl lg:p-4 p-3 transition-all duration-200 hover:scale-105 ${
                isActive ? "ring-2 ring-orange-500 shadow-lg" : ""
              }`}
            >
              <h2 className="font-bold tracking-tight text-orange-600 text-center">
                {metric.name}
              </h2>
            </button>
          );
        })}
      </div>

      {/* Time Range Selector */}
      <div className="flex justify-end">
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

      <div className="flex w-full">
        {/* Radar Chart */}
        <div className="bg-accent rounded-xl p-4 w-full">
          {chartData.length > 0 &&
          chartData.some(
            (d: any) => d.rawSets > 0 || d.rawVolume > 0 || d.rawReps > 0,
          ) ? (
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="muscle"
                  tick={{
                    fill: "currentColor",
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  content={
                    <CustomTooltip active={undefined} payload={undefined} />
                  }
                />
                <Radar
                  name={activeMetric}
                  dataKey={activeMetricData}
                  stroke={metricColor}
                  fill={metricFillColor}
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[450px] flex items-center justify-center text-gray-500">
              No workout data available for this period
            </div>
          )}
        </div>
        {/* <div className="">

              {chartData.length > 0 && chartData.some((d) => d.rawSets > 0) && (
                <div className="flex flex-col gap-2 text-center">

                  <div className="bg-accent rounded-xl p-2">
                    <p className="text-xs text-gray-500">Most Trained</p>
                    <p className="text-sm font-bold text-orange-600">
                      {
                        chartData.reduce((max, item) =>
                          item[activeMetricData] > max[activeMetricData] ? item : max,
                        )?.muscle
                      }
                    </p>
                  </div>

                  <div className="bg-accent rounded-xl p-2">
                    <p className="text-xs text-gray-500">Needs Work</p>
                    <p className="text-sm font-bold text-red-500">
                      {
                        chartData.reduce((min, item) =>
                          item[activeMetricData] < min[activeMetricData] ? item : min,
                        )?.muscle
                      }
                    </p>
                  </div>

                  <div className="bg-accent rounded-xl p-2">
                    <p className="text-xs text-gray-500">Total {activeMetric}</p>
                    <p className="text-sm font-bold text-green-600">
                      {chartData
                        .reduce((sum, item) => sum + item[`raw${activeMetric}`], 0)
                        .toLocaleString()}
                      {activeMetric === "Volume"
                        ? "kg"
                        : activeMetric === "Sets"
                          ? ""
                          : ""}
                    </p>
                  </div>
                </div>
              )}
          </div> */}
      </div>
    </div>
  );
};

export default MuscleSplit;
