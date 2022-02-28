import { BlockSubpathResult, CachedMetadata, HeadingSubpathResult } from "obsidian";

export const translate = i18next.t.bind(i18next);

export function genId(size: number) {
  for (var e = [], n = 0; n < size; n++) e.push(((16 * Math.random()) | 0).toString(16));

  return e.join("");
}

// TODO: clean up this minified code
// export function combineContent(
//   content: string,
//   fileCache: CachedMetadata,
//   subPath: HeadingSubpathResult | BlockSubpathResult
// ) {
//   var before = "";
//   var r = "";
//   var o = "";

//   if ("block" === subPath.type && subPath.list) {
//     var s = (function (t, e) {
//       var n = t.listItems;

//       if (!n) {
//         return e;
//       }

//       var i = n.indexOf(e);

//       if (-1 === i) {
//         return e;
//       }

//       var r = new Set();
//       r.add(e.position.start.line);

//       for (var o = e, s = i + 1; s < n.length; s++) {
//         var a = n[s];

//         if (!r.has(a.parent)) {
//           break;
//         }

//         r.add(a.position.start.line);
//         o = a;
//       }

//       return o;
//     })(fileCache, subPath.list);

//     var a = (function (t, e) {
//       var n = t.position.start;
//       var i = e.position.end;
//       return {
//         start: n.offset - n.col,
//         end: i.offset,
//       };
//     })(subPath.list, s);

//     var l = a.start;
//     var c = a.end;
//     before = content.substring(0, l);
//     r = content.substring(c);

//     var u = (function (t) {
//       var e = t.split("\n");
//       var n = e[0].match(/^\s*/)[0];
//       var i = n.replace("\t", "    ").length;

//       if (i > 0) {
//         for (var r = 0; r < e.length; r++) {
//           for (var o = e[r], s = 0, a = 0; s < o.length && a < i; ) {
//             a += "\t" === o.charAt(s) ? 4 : 1;
//             s++;
//           }

//           e[r] = o.substr(s);
//         }
//       }

//       return {
//         indent: n,
//         text: e.join("\n"),
//       };
//     })(content.substring(l, c));

//     content = u.text;
//     o = u.indent;
//   } else {
//     l = subPath.start.offset;
//     c = subPath.end ? subPath.end.offset : content.length;
//     before = content.substring(0, l);
//     r = content.substring(c);
//     content = content.substring(l, c);
//   }

//   return {
//     before: before,
//     after: r,
//     indent: o,
//     content: content,
//   };
// }
