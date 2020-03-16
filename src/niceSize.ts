const niceSize = (sizeIn: number, unitIndexIn?: number): string => {
  const UNITS = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z'];
  const DIV = 1000;
  let unitIndex = unitIndexIn || 0;
  let size = sizeIn || 0;

  if (size >= DIV) {
    size /= DIV;
    unitIndex += 1;

    return unitIndex >= UNITS.length ? '???' : niceSize(size, unitIndex);
  }

  if (unitIndex === 0) {
    return `${size}${UNITS[unitIndex]}`;
  }
  return `${size.toFixed(1)}${UNITS[unitIndex]}`;
};

export default niceSize;
