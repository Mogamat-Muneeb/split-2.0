import KeyTotal from "@/components/stats/key-total";
import MuscleSplit from "@/components/stats/muscle-split";
import TopTrends from "@/components/stats/top-trends";

const StatsHome = () => {
  return (
    <div className="grid lg:grid-cols-6 grid-cols-1 lg:grid-rows-1 gap-4  ">
      {/* Row 1 */}
      <div className="col-span-6 bg-[#FAF6FA] dark:bg-[#2d2d2d] rounded-2xl p-4">
        <h2 className="font-bold tracking-tight ">Key Totals</h2>
        <KeyTotal />
      </div>

      <div className="lg:col-span-3 col-span-6 bg-[#FAF6FA] dark:bg-[#2d2d2d] rounded-2xl p-4">
        <h2 className="font-bold tracking-tight ">Muscle Split</h2>
        <MuscleSplit />
      </div>

      {/* Row 2 */}
      <div className="lg:col-span-3 col-span-6 bg-[#FAF6FA] dark:bg-[#2d2d2d] rounded-2xl p-4">
        <h2 className="font-bold tracking-tight ">Top Trends</h2>
        <TopTrends />
      </div>

      <div className="lg:col-span-3 col-span-6 bg-[#FAF6FA] dark:bg-[#2d2d2d] rounded-2xl p-4">
        <h2 className="font-bold tracking-tight ">Split Performance</h2>
      </div>

      <div className="lg:col-span-3 col-span-6 bg-[#FAF6FA] dark:bg-[#2d2d2d] rounded-2xl p-4">
        <h2 className="font-bold tracking-tight ">Most Logged</h2>
      </div>
    </div>
  );
};

export default StatsHome;
