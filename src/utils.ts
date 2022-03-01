export const translate = i18next.t.bind(i18next);

export function genId(size: number) {
  for (var e = [], n = 0; n < size; n++) e.push(((16 * Math.random()) | 0).toString(16));

  return e.join("");
}
