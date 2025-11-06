export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return function () {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}
