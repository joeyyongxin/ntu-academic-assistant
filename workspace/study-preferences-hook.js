function studyToolsScope(){return (ReferenceCloud.user?.id||'signed-out')+':'+active;}
function studyToolsPrefs(write=false){if(write)recordWritable();const owner=ReferenceCloud.user?.id;if(!owner)throw Error('Sign in to use study tools.');if(term().studyTools?.owner===owner)return term().studyTools;const value={owner,rules:[],sessions:[],grades:{},reminders:{enabled:false,offsets:[1440,60],fallback:'09:00'}};if(write)term().studyTools=value;return value;}
function studyRecordKey(table,id){return ReferenceCloud.bridge?.map?.get(table+':'+id)?.id||null;}
function studyToolsMessage(id,message){const el=document.getElementById(id);if(el)el.textContent=message;}
function studyActualDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
