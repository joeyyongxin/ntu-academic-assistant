// Shared presentation for Home and Plan. Date ownership stays with each screen.
(function(root){
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render({mode,date,label,min,max,previousEnabled,nextEnabled,showReset}){
  if(mode!=='day'&&mode!=='week')throw Error('DateNav mode must be day or week.');
  const week=mode==='week',prefix=week?'week':'home';
  const arrow=(delta,text,enabled,aria)=>'<button class="btn" onclick="'+prefix+'Shift('+delta+')"'+(aria?' aria-label="'+aria+'"':'')+(enabled?'':' disabled')+'>'+text+'</button>';
  return '<div class="datebar'+(week?' weeknav':'')+'" role="group" aria-label="'+(week?'Choose study week':'Choose date')+'">'+
   arrow(-1,week?'‹ Previous':'‹',previousEnabled,week?'':'Previous day')+
   '<label class="datepick'+(week?' weekpick':'')+'"><span>'+escape(label)+'</span><input type="date" value="'+escape(date)+'" min="'+escape(min)+'" max="'+escape(max)+'" aria-label="'+(week?'Jump to the week containing a date':'Choose date')+'" onclick="try{this.showPicker()}catch(e){}" onchange="'+prefix+'Pick(this.value)"></label>'+
   arrow(1,week?'Next ›':'›',nextEnabled,week?'':'Next day')+
   (showReset?'<button class="btn" onclick="'+prefix+'Reset()">'+(week?'This week':'Today')+'</button>':'')+'</div>';
 }
 root.PlannerUI={...(root.PlannerUI||{}),DateNav:{render}};
})(globalThis);
