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
            <div
              className={` transition-transform flex border rounded-3xl p-1  bg-[#202020] ${
                isChecked ? "lg:translate-x-1" : "lg:translate-x-0"
              }`}
            >
              <div
                className={` rounded-full  h-8 w-8 p-2 flex items-center justify-center ${
                  isChecked ? "bg-transparent" : "bg-background"
                } transition-opacity`}
              >
                <Sun className={`h-4 w-4 text-foreground `} />
              </div>
              <div
                className={` rounded-full  h-8 w-8  p-2 flex items-center justify-center ${
                  isChecked ? "bg-background" : "bg-transparent"
                } transition-opacity`}
              >
                <Moon
                  className={`h-4 w-4 dark:text-foreground text-background`}
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
