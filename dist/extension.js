(()=>{"use strict";var t={398:t=>{t.exports=require("vscode")}},e={};function r(n){var a=e[n];if(void 0!==a)return a.exports;var o=e[n]={exports:{}};return t[n](o,o.exports,r),o.exports}var n={};(()=>{var t=n;Object.defineProperty(t,"__esModule",{value:!0}),t.activate=function(t){t.subscriptions.push(e.commands.registerTextEditorCommand("alt-delete.alt-backspace",a("backward")),e.commands.registerTextEditorCommand("alt-delete.alt-delete",a("forward")),e.commands.registerTextEditorCommand("alt-delete.alt-left",o("backward")),e.commands.registerTextEditorCommand("alt-delete.alt-right",o("forward")),e.commands.registerTextEditorCommand("alt-delete.alt-shift-left",o("backward",!0)),e.commands.registerTextEditorCommand("alt-delete.alt-shift-right",o("forward",!0)))};const e=r(398);function a(t){return(e,r)=>{const n=[];for(let r=0;r<e.selections.length;r++){const a=s(e,r,t);n[r]=l(e,r,a)}for(const t of n)r.delete(t)}}function o(t,e=!1){return r=>{const n=[];for(let a=0;a<r.selections.length;a++){const o=s(r,a,t);n[a]=d(r,a,o,e)}r.selections=n}}var c;function i(t){return/[A-Z]/.test(t)?c.UPPER:/[a-z]/.test(t)?c.LOWER:/\d/.test(t)?c.DIGIT:/\s/.test(t)?c.SPACE:c.SYMBOL}function s(t,r,n){const a="backward"===n,o=t.document,s=t.selections[r].active,l=s.line,d=o.lineAt(l).range,f=new e.Range(s,a?d.start:d.end);let u=o.getText(f);if(0===u.length){if(a&&l>0)return{char:o.lineAt(l-1).text.length,line:-1};if(!a&&l<o.lineCount-1)return{char:-o.lineAt(l).text.length,line:1}}if(u=a?u.trimEnd():u.trimStart(),!u)return a?{char:f.start.character-f.end.character}:{char:f.end.character-f.start.character};const h=u.length-u.length;if(i(u.at(a?-1:0))===c.UPPER){if(a)return{char:-h-1};if(i(u[1])===c.UPPER)return{char:h+1}}if(a){let t=1;for(;i(u.at(-t-1))===i(u.at(-t))&&t<u.length;)t++;return i(u.at(-t-1))===c.UPPER&&i(u.at(-t))===c.LOWER&&t++,{char:-t-h}}{let t=i(u[0])===c.UPPER?1:0;for(;i(u[t+1])===i(u[t])&&t<u.length-1;)t++;return{char:t+h+1}}}function l(t,r,n){const a=t.selections[r].active;return new e.Range(a,a.translate(n.line,n.char))}function d(t,r,n,a=!1){const o=t.selections[r],c=new e.Position(o.active.line+(n.line??0),o.active.character+n.char);return new e.Selection(a?o.anchor:c,c)}!function(t){t[t.UPPER=0]="UPPER",t[t.LOWER=1]="LOWER",t[t.DIGIT=2]="DIGIT",t[t.SPACE=3]="SPACE",t[t.SYMBOL=4]="SYMBOL"}(c||(c={}))})(),module.exports=n})();
//# sourceMappingURL=extension.js.map