from pathlib import Path
import re
root=Path(__file__).resolve().parent
source=root/'workspace/reference'
html=(source/'index.html').read_text(encoding='utf-8')
# The same approved v2.9 stylesheet and responsive navigation are retained.
for name in ['revision-hook.js']:
 html=html.replace((source/'src'/name).read_text(encoding='utf-8'),'')
html=html.replace("if(c.projectRole!=='staging')", "if(c.projectRole!=='production')")
html=html.replace("storageKey:'aa-reference-staging-auth'", "storageKey:'sb-'+new URL(this.config.supabaseUrl).hostname.split('.')[0]+'-auth-token'")
html=html.replace((source/'src/file-library.js').read_text(encoding='utf-8'),(root/'workspace/file-library.js').read_text(encoding='utf-8'))
html=html.replace((source/'src/files-hook.js').read_text(encoding='utf-8'),(root/'workspace/files-hook.js').read_text(encoding='utf-8'))
point='ReferenceCloud.configure(window.ACADEMIC_REFERENCE_CONFIG||{mode:"local"});'
html=html.replace(point,point+'\n'+(root/'workspace/updates.js').read_text(encoding='utf-8')+'\n'+(root/'workspace/file-preview.js').read_text(encoding='utf-8')+'\n'+(root/'workspace/preferences.js').read_text(encoding='utf-8')+'\n'+(root/'workspace/production-bridge.js').read_text(encoding='utf-8'),1)
point='const assistantSettings=settings;'
position=html.index(point)
html=html[:position]+(root/'workspace/preview-hook.js').read_text(encoding='utf-8')+'\n'+(root/'workspace/production-hook.js').read_text(encoding='utf-8')+'\n'+(root/'workspace/updates-hook.js').read_text(encoding='utf-8')+'\n'+html[position:]
html=html.replace('<script src="config.js"></script>', '<script src="config.js"></script><script src="data-service.js"></script><script>window.ACADEMIC_REFERENCE_CONFIG={mode:"supabase",projectRole:"production",supabaseUrl:PLANNER_CONFIG.supabaseUrl,publishableKey:PLANNER_CONFIG.supabaseAnonKey};</script>')
for old,new in [('Separate test workspace','Academic workspace'),('Separate test project','Academic Assistant'),('separate test project','Academic Assistant'),('separate test workspace','saved workspace'),('test workspace','saved workspace'),('test account','account'),('Test account','Account'),('test project','database'),('Test workspace','Workspace'),('SUPABASE Â· SEPARATE TEST PROJECT','ACADEMIC ASSISTANT'),('Separate test environment Â· No production changes','Your Academic Assistant account'),('aa-reference-staging-view','aa-production-view')]:html=html.replace(old,new)
html=html.replace('NTULearn, AI and file transfers are not connected.','NTULearn and AI integrations are not connected.')
html=html.replace('Account linking is being prepared. ChatGPT cannot access this workspace yet.','Task changes can use the existing planner connection in ChatGPT. Sign-in status is managed there.')
html=html.replace(".replace('Demo · Not connected','Not connected')", ".replace('Demo · Not connected','Check in ChatGPT')")
assert re.search(r'<style>(.*?)</style>',html,re.S)[1]==re.search(r'<style>(.*?)</style>',(source/'index.html').read_text(encoding='utf-8'),re.S)[1]
html=html.replace('</head>', '<link rel="manifest" href="manifest.json"><link rel="icon" href="icon.svg"><link rel="apple-touch-icon" href="apple-touch-icon.png"><meta name="theme-color" content="#3551db"></head>',1)
worker="<script>if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});</script>"
html=html.replace('</body>',worker+'</body>',1)
legacy=root/'legacy.html'
if not legacy.exists():legacy.write_bytes((root/'index.html').read_bytes())
(root/'workspace.html').write_text(html,encoding='utf-8')
(root/'index.html').write_text(html,encoding='utf-8')
(root/'workspace/bundle.js').write_text(re.search(r'<script>(?=\/\* Local)(.*?)</script>',html,re.S)[1] if re.search(r'<script>(?=\/\* Local)(.*?)</script>',html,re.S) else re.findall(r'<script>(.*?)</script>',html,re.S)[-1],encoding='utf-8')
print('Built production workspace using the approved v2.9 interface and existing database service.')
