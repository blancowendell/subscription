import { useEffect, useState } from "react";

const QUERY = "(max-width: 767px)";

const useIsNarrow = () => {
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = (e) => setIsNarrow(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isNarrow;
};

export default useIsNarrow;
