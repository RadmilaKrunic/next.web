import { ActivityIndicator } from "@bosch/react-frok";
import { useEffect, useState, type ComponentProps } from "react";

type ActivityIndicatorWithDelayProps = ComponentProps<typeof ActivityIndicator> & {
  delay: number;
  size?: "medium" | "large" | "small";
};

function ActivityIndicatorWithDelay({
  delay,
  size = "large",
  ...activityIndicatorProps
}: ActivityIndicatorWithDelayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [delay]);

  if (!isVisible) {
    return null;
  }

  return <ActivityIndicator size={size} {...activityIndicatorProps} />;
}

export default ActivityIndicatorWithDelay;
