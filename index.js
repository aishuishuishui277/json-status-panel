(()=>{
const N='json-status-panel',$=(s,e=document)=>e.querySelector(s);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const cut=(s,r)=>s.match(r)?.[1]?.trim()||'';

function firstObj(t){
  let s=t.indexOf('{'); if(s<0) throw Error('没有找到 JSON 对象开头 {');
  let d=0,q=false,e=false;
  for(let i=s;i<t.length;i++){
    let c=t[i];
    if(e){e=false;continue}
    if(c==='\\'){e=true;continue}
    if(c==='"'){q=!q;continue}
    if(!q){if(c==='{')d++; if(c==='}')d--; if(d===0)return t.slice(s,i+1)}
  }
  throw Error('JSON 对象没有正确闭合 }');
}

function fillState(d){
  let s=String(d['状态']??'');
  d['状态_身材']=d['状态_身材']||cut(s,/身材\/仪态[:：]\s*([\s\S]*?)(?=\n\s*性格表现[:：]|\n\s*当前情绪[:：]|\n\s*关系倾向[:：]|$)/)||cut(s,/身材[:：]\s*([\s\S]*?)(?=\n\s*性格[:：]|\n\s*性格表现[:：]|\n\s*当前情绪[:：]|\n\s*关系倾向[:：]|$)/);
  d['状态_性格']=d['状态_性格']||cut(s,/性格表现[:：]\s*([\s\S]*?)(?=\n\s*当前情绪[:：]|\n\s*关系倾向[:：]|$)/)||cut(s,/性格[:：]\s*([\s\S]*?)(?=\n\s*当前情绪[:：]|\n\s*关系倾向[:：]|$)/);
  d['状态_情绪']=d['状态_情绪']||cut(s,/当前情绪[:：]\s*([\s\S]*?)(?=\n\s*关系倾向[:：]|$)/);
  d['状态_关系']=d['状态_关系']||cut(s,/关系倾向[:：]\s*([\s\S]*?)$/);
  return d;
}

function parseTag(t){
  let d={},r=/\[(正文|动作|对白|心里话|状态)\]([\s\S]*?)\[\/\1\]/g,m;
  while((m=r.exec(t)))d[m[1]]=m[2].trim();
  if(!Object.keys(d).length)throw Error('无半角标签');
  return fillState(d);
}

function parseCN(t){
  let d={},ks=['正文','动作','对白','心里话','状态'];
  for(let i=0;i<ks.length;i++){
    let k=ks[i],n=ks.slice(i+1).join('|');
    let r=new RegExp(`【${k}】\\s*([\\s\\S]*?)${n?`(?=\\n\\s*【(?:${n})】|$)`:'$'}`);
    d[k]=t.match(r)?.[1]?.trim()||'';
  }
  if(!Object.values(d).some(Boolean))throw Error('无中文方括号');
  return fillState(d);
}

function parse(raw){
  let t=String(raw??'').trim().replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```$/,'').trim();
  try{return {mode:'JSON / 对象格式',data:JSON.parse(firstObj(t).replace(/,\s*([}\]])/g,'$1'))}}catch(e){}
  try{return {mode:'半角标签格式',data:parseTag(t)}}catch(e){}
  try{return {mode:'中文方括号格式',data:parseCN(t)}}catch(e){}
  return {mode:'普通原文兜底',data:{'正文':t,'动作':'未检测到结构化动作字段','对白':'未检测到结构化对白字段','心里话':'未检测到结构化心里话字段','状态_身材':'未检测到结构化状态字段','状态_性格':'未检测到结构化状态字段','状态_情绪':'未检测到结构化状态字段','状态_关系':'未检测到结构化状态字段'}};
}

function need(d,k){let v=d?.[k];return v==null||String(v).trim()===''?`【缺少字段：${k}】`:String(v)}
EOFcat >> index.js <<'EOF'
function view(d){return `<div class="jsp-body">${esc(need(d,'正文'))}</div><div class="jsp-status"><div class="jsp-status-title">✦ 末尾状态栏 ✦</div><div class="jsp-card jsp-cyan"><div class="jsp-label">【动作】</div><div class="jsp-content">${esc(need(d,'动作'))}</div></div><div class="jsp-card jsp-pink"><div class="jsp-label">【对白】</div><div class="jsp-content">${esc(need(d,'对白'))}</div></div><div class="jsp-card jsp-green"><div class="jsp-label">【心里话】</div><div class="jsp-content">${esc(need(d,'心里话'))}</div></div><div class="jsp-card jsp-orange"><div class="jsp-label">【状态】</div><div class="jsp-content">身材/仪态：${esc(need(d,'状态_身材'))}<br>性格表现：${esc(need(d,'状态_性格'))}<br>当前情绪：${esc(need(d,'状态_情绪'))}<br>关系倾向：${esc(need(d,'状态_关系'))}</div></div></div>`}
function render(inp,out,err,mode){err.textContent='';mode.textContent='';out.innerHTML='';let r=parse(inp.value);mode.textContent='当前解析模式：'+r.mode;out.innerHTML=view(r.data);return r.data}

async function lastAI(){
  let g=window.SillyTavern?.getContext;
  if(!g){try{g=(await import('/scripts/extensions.js')).getContext}catch(e){}}
  let chat=(g?.()?.chat)||window.chat||[];
  if(!Array.isArray(chat)||!chat.length)throw Error('没有读取到聊天数据，请先打开角色聊天并生成回复');
  for(let i=chat.length-1;i>=0;i--){let x=chat[i],u=x?.is_user===true||x?.is_user==='true',m=x?.mes??x?.message??x?.text??''; if(!u&&String(m).trim())return String(m).trim()}
  throw Error('没有找到最后一条AI原始回复');
}

function promptText(){return `你每次回复必须只输出一个 JSON 对象，不要输出 Markdown 代码块，不要解释，不要在 JSON 前后添加任何文字。

{
  "正文": "完整剧情正文",
  "动作": "当前动作、表情、姿态、环境互动",
  "对白": "角色此刻符合人设的一句对白",
  "心里话": "角色没有说出口的真实心理",
  "状态_身材": "根据角色卡和世界书动态生成身材/仪态",
  "状态_性格": "根据角色卡和世界书动态生成性格表现",
  "状态_情绪": "根据当前剧情动态总结",
  "状态_关系": "根据角色对{{user}}的当前态度动态总结"
}

要求：正文完整；不要照抄说明文字；性格、身材、心理优先遵守角色卡和世界书。`}
async function copy(txt,err){try{await navigator.clipboard.writeText(txt);return true}catch(e){err.textContent='复制失败，已放入输入框。';return false}}

async function load(){
  let html=await fetch(`/scripts/extensions/third-party/${N}/panel.html`).then(r=>r.text());
  let box=document.createElement('div');box.innerHTML=html;let root=$('#extensions_settings');if(!root)return console.error(`[${N}] 找不到 #extensions_settings`);root.appendChild(box);
  let inp=$('#jsp-input',box),out=$('#jsp-output',box),err=$('#jsp-error',box),mode=$('#jsp-mode',box);
  $('#jsp-load-last-btn',box).onclick=async()=>{try{inp.value=await lastAI();render(inp,out,err,mode)}catch(e){err.textContent='读取失败：'+e.message}};
  $('#jsp-render-btn',box).onclick=()=>{try{render(inp,out,err,mode)}catch(e){err.textContent='解析失败：'+e.message}};
  $('#jsp-copy-prompt-btn',box).onclick=async()=>{let p=promptText();if(await copy(p,err))err.textContent='已复制 JSON 格式提示。';else inp.value=p};
  $('#jsp-copy-current-btn',box).onclick=async()=>{try{let d=render(inp,out,err,mode),j=JSON.stringify(d,null,2);if(await copy(j,err))err.textContent='已复制当前生成 JSON。';else inp.value=j}catch(e){err.textContent='复制当前 JSON 失败：'+e.message}};
  $('#jsp-clear-btn',box).onclick=()=>{err.textContent='';mode.textContent='';out.innerHTML='';inp.value=''};
  console.log(`[${N}] 已加载`);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',load):load();
})();
