/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import supabase from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  dateKey,
  effectiveReps,
  formatShortDate,
  getRangeStart,
  getWeekStarts,
  isCompletedSet,
  roundTo,
  setVolume,
  startOfWeek,
} from "@/lib/statsMath";

interface TrendData {
  exerciseName: string;
  metric: "volume" | "sets" | "reps";
  change: number;
  changePercent: number;
  unit: string;
  currentValue: number;
  previousValue: number;
  chartData: { date: string; value: number }[];
  isPositive: boolean;
}

const TopTrends = () => {
  const [timeRange, setTimeRange] = useState("3months");
  const [activeMetric, setActiveMetric] = useState<"volume" | "sets" | "reps">(
    "volume",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);

  const METRIC_CONFIG = {
    volume: { label: "Volume", unit: "kg", color: "#10b981" },
    sets: { label: "Sets", unit: "sets", color: "#ea580c" },
    reps: { label: "Reps", unit: "reps", color: "#3b82f6" },
  };

  useEffect(() => {
    fetchTrendingExercises();
  }, [timeRange, activeMetric]);

  const fetchTrendingExercises = async () => {
    try {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const now = new Date();
      const startDate = getRangeStart(timeRange, now);

      const { data: sessions, error } = await supabase
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
            rep_range_max,
            checked,
            type
          )
        )
      `,
        )
        .eq("status", "finished")
        .eq("user_id", user.id)
        .gte("started_at", startDate.toISOString())
        .order("started_at", { ascending: true });

      if (error) throw error;

      const weekMeta = getWeekStarts(startDate, now).map((weekStart) => ({
        key: dateKey(weekStart),
        date: formatShortDate(weekStart),
      }));

      const exerciseData = new Map<string, Map<string, number>>();

      sessions?.forEach((session) => {
        const weekKey = dateKey(startOfWeek(new Date(session.started_at)));

        session.workout_session_exercises?.forEach((exercise) => {
          if (!exercise.name) return;

          let metricValue = 0;

          exercise.workout_sets?.forEach((set) => {
            if (!isCompletedSet(set)) return;

            const reps = effectiveReps(set);
            const volume = setVolume(set);

            if (activeMetric === "volume") {
              metricValue += volume;
            } else if (activeMetric === "sets") {
              metricValue += 1;
            } else if (activeMetric === "reps") {
              metricValue += reps;
            }
          });

          if (metricValue > 0) {
            if (!exerciseData.has(exercise.name)) {
              exerciseData.set(exercise.name, new Map());
            }

            const existing = exerciseData.get(exercise.name)!;
            existing.set(weekKey, (existing.get(weekKey) || 0) + metricValue);
          }
        });
      });

      const trends: TrendData[] = [];

      exerciseData.forEach((weeklyValues, exerciseName) => {
        const weeklyPoints = weekMeta.map(({ key, date }) => ({
          date,
          value: weeklyValues.get(key) || 0,
        }));

        const activeWeeks = weeklyPoints.filter((point) => point.value > 0);
        if (activeWeeks.length < 2) return;

        const midPoint = Math.floor(weeklyPoints.length / 2);
        const previousPeriod = weeklyPoints.slice(0, midPoint);
        const recentPeriod = weeklyPoints.slice(midPoint);

        if (previousPeriod.length === 0 || recentPeriod.length === 0) return;

        const previousAvg = roundTo(
          previousPeriod.reduce((sum, d) => sum + d.value, 0) /
            previousPeriod.length,
          1,
        );

        const recentAvg = roundTo(
          recentPeriod.reduce((sum, d) => sum + d.value, 0) /
            recentPeriod.length,
          1,
        );

        const change = roundTo(recentAvg - previousAvg, 1);
        const changePercent =
          previousAvg > 0
            ? (change / previousAvg) * 100
            : recentAvg > 0
              ? 100
              : 0;

        if (Math.abs(changePercent) > 3 && Math.abs(change) > 0) {
          trends.push({
            exerciseName,
            metric: activeMetric,
            change,
            changePercent: Math.round(changePercent),
            unit: METRIC_CONFIG[activeMetric].unit,
            currentValue: recentAvg,
            previousValue: previousAvg,
            chartData: weeklyPoints.slice(-7).map(({ date, value }) => ({
              date,
              value: roundTo(value, 1),
            })),
            isPositive: change > 0,
          });
        }
      });

      const topTrends = trends
        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
        .slice(0, 3);

      setTrendsData(topTrends);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Error fetching trending exercises:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % trendsData.length);
  };

  const prevSlide = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + trendsData.length) % trendsData.length,
    );
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-6 ">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
            <div className="h-5 w-40 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-16 w-full bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (trendsData.length === 0) {
    return (
      <div className="bg-accent rounded-2xl p-6 mt-4">
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Info className="w-8 h-8 mb-3 opacity-50" />
          <p className="text-sm text-center">
            Not enough data to show trends yet.
            <br />
            Keep logging your workouts!
          </p>
        </div>
      </div>
    );
  }

  const currentTrend = trendsData[currentIndex];
  const metricConfig = METRIC_CONFIG[currentTrend.metric];

  // Custom tooltip for sparkline
  const SparklineTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-popover text-popover-foreground px-2 py-1 rounded text-xs border shadow-sm">
          <p className="font-medium">{label}</p>
          <p style={{ color: metricConfig.color }}>
            {payload[0].value.toLocaleString()} {metricConfig.unit}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className=" rounded-2xl mt-4 ">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Metric Selector */}
          <Select
            value={activeMetric}
            onValueChange={(value: "volume" | "sets" | "reps") =>
              setActiveMetric(value)
            }
          >
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue placeholder="Metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Metric</SelectLabel>
                <SelectItem value="volume">Volume</SelectItem>
                <SelectItem value="sets">Sets</SelectItem>
                <SelectItem value="reps">Reps</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Time Range Selector */}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Time range" />
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
      </div>

      {/* Trend Carousel */}
      <div className="space-y-4">
        {/* Exercise Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-xl font-bold text-foreground">
              {currentTrend.exerciseName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-medium text-foreground leading-tight">
                {currentTrend.exerciseName}
              </h3>
              <p className="text-xs text-muted-foreground">
                {metricConfig.label} trend
              </p>
            </div>
          </div>

          {/* Navigation */}
          {trendsData.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={prevSlide}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Previous trend"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextSlide}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Next trend"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Metrics Row */}
        <div className="flex items-center justify-between">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
              currentTrend.isPositive
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            }`}
          >
            {currentTrend.isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {currentTrend.isPositive ? "+" : ""}
            {currentTrend.change} {metricConfig.unit}/week
            <span className="text-xs opacity-70 ml-1">
              ({currentTrend.isPositive ? "+" : ""}
              {currentTrend.changePercent}%)
            </span>
          </div>

          <div className="text-right">
            <div className="text-xs text-muted-foreground">Current avg</div>
            <div className="text-xl font-bold text-foreground">
              {currentTrend.currentValue.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {metricConfig.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Mini Sparkline Chart */}
        <div className="h-14 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={currentTrend.chartData}>
              <Tooltip content={<SparklineTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={currentTrend.isPositive ? "#22c55e" : "#ef4444"}
                strokeWidth={2}
                dot={false}
                strokeLinecap="round"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Dots Indicator */}
        {trendsData.length > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            {trendsData.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "bg-primary w-6"
                    : "bg-muted hover:bg-muted-foreground/50 w-1.5"
                }`}
                aria-label={`View trend ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopTrends;
