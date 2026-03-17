import { Navigate } from "react-router-dom";

import type { JSX } from "react";
import { useAuth } from "./useAuth";

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="flex justify-center items-center w-full h-screen">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 42 42"
          fill="none"
        >
          <path
            d="M40.6421 18.6841H24.3608C23.898 18.6841 24.0622 19.3363 24.349 19.6996L29.6363 26.3969C29.5485 26.3129 29.6363 26.5153 29.6363 26.3969C29.7204 26.4809 36.3036 26.3893 31.028 26.3969H29.6363C29.2352 29.602 25.6061 32.2226 21.4269 32.2226C14.9824 32.2226 10.9981 26.3014 10.9981 20.8119C10.9981 15.4141 14.8984 9.82912 21.4269 9.82912C23.5283 9.82912 29.6858 9.40706 31.5118 8.36701C33.9942 6.953 36.4913 5.53029 36.4476 5.48948C32.574 1.89859 27.3787 0 21.4269 0C9.01162 0 0 8.75185 0 20.8081C0 32.8681 9.01162 41.62 21.4269 41.62C40.1493 41.62 41.0966 22.8862 41.0966 19.1311C41.0966 18.8866 40.8942 18.6841 40.6421 18.6841Z"
            fill="url(#paint0_linear_628_596)"
          />
          <defs>
            <linearGradient
              id="paint0_linear_628_596"
              x1="20.5483"
              y1="0"
              x2="20.5483"
              y2="41.62"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0.230769" stopColor="#40E740" />
              <stop offset="1" stopColor="#246B81" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
