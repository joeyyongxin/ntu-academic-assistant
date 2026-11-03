export const APP='https://joeyyongxin.github.io/ntu-academic-assistant/';
export function appUrl(value){try{const u=new URL(value),a=new URL(APP);return u.origin===a.origin&&[a.pathname,a.pathname+'index.html',a.pathname+'workspace.html'].includes(u.pathname);}catch{return false;}}
export function validContext(c){return !!c&&typeof c.owner==='string'&&/^[\w-]{1,100}$/.test(c.owner)&&typeof c.semester==='string'&&/^[\w-]{1,100}$/.test(c.semester)&&typeof c.label==='string'&&c.label.length<=200&&typeof c.termName==='string'&&c.termName.length<=200;}
export function sameContext(a,b){return !!a&&!!b&&a.owner===b.owner&&a.semester===b.semester;}
