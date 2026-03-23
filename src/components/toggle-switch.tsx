"use client";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";

interface IToggleSwitchProps {
  onChange?: (value: boolean) => void;
  defaultChecked?: boolean;
  isThemeToggle?: boolean;
}

const ToggleSwitch = ({
  onChange,
  defaultChecked,
  isThemeToggle,
}: IToggleSwitchProps) => {
  const [isChecked, setIsChecked] = useState<boolean>(defaultChecked ?? false);

  const handleCheckboxChange = () => {
    const newCheckedState = !isChecked;
    setIsChecked(newCheckedState);
    onChange?.(newCheckedState);
  };

  return (
    <label className="flex cursor-pointer select-none items-center h-full ">
      <div className="relative">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleCheckboxChange}
          className="sr-only"
        />
        {isThemeToggle ? (
          <>
            <div className="flex rounded-3xl p-1 bg-[#FAF6FA] dark:bg-[#2d2d2d]">
              <div
                className={`rounded-full h-8 w-8 p-2 flex items-center justify-center transition-all duration-200 ${
                  !isChecked ? "bg-yellow-300" : "bg-transparent"
                }`}
              >
                <Sun className="h-4 w-4 text-foreground" />
              </div>

              <div
                className={`rounded-full h-8 w-8 p-2 flex items-center justify-center transition-all duration-200 ${
                  isChecked ? "bg-yellow-300" : "bg-transparent"
                }`}
              >
                <Moon
                  className={`h-4 w-4 ${
                    isChecked ? "text-black" : "text-foreground"
                  }`}
                />
              </div>
            </div>
          </>
        ) : (
          <div
            className={`box block h-8 w-14 rounded-full ${
              isChecked ? "bg-muted" : "bg-muted"
            }`}
          />
        )}
      </div>
    </label>
  );
};

export default ToggleSwitch;
