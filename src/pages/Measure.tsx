import { Link, Outlet, useLocation } from "react-router-dom";

const Measure = () => {
  const STATS_ITEMS = [
    {
      name: "overview",
      link: "/dashboard/stats",
    },
    {
      name: "exercises",
      link: "/dashboard/stats/exercises",
    },
    {
      name: "measurements",
      link: "/dashboard/stats/measurements",
    },
  ];
  const location = useLocation();
  return (
    <div className="max-w-[1440px] mx-auto pt-10 space-y-10">
      <div>
        <h2 className="text-orange-600 font-black text-2xl tracking-tight">
          Progress
        </h2>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          {STATS_ITEMS.map((si) => {
            const isActive = location.pathname === si.link;
            return (
              <Link
                key={si.name}
                to={si.link}
                className={`capitalize px-2 py-1 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? "bg-orange-500 text-white font-bold tracking-tight text-base"
                    : "text-sm"
                }`}
              >
                {si.name}
              </Link>
            );
          })}
        </div>

        <Outlet />
      </div>
    </div>
  );
};

export default Measure;
