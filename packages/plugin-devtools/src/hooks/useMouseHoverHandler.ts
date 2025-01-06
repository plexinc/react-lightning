import { useState } from 'react';

export const useMouseHoverHandler = () => {
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = () => setHovered(true);
  const handleMouseLeave = () => setHovered(false);

  return { isHovered: hovered, handleMouseEnter, handleMouseLeave };
};
