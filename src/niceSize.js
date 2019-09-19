const niceSize = (sizeIn, unitidxIn) => {
  const UNITS = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z'];
  const DIV = 1000;
  let unitidx = unitidxIn || 0;
  let size = sizeIn || 0;

  if (size > DIV) {
    size /= DIV;
    unitidx += 1;

    return unitidx >= UNITS.length ? '???' : niceSize(size, unitidx);
  }

  if (unitidx === 0) {
    return `${size}${UNITS[unitidx]}`;
  }
  return `${size.toFixed(1)}${UNITS[unitidx]}`;
};

export default niceSize;
