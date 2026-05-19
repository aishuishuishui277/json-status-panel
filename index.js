(()=> {
const N='json-status-panel';
const E=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const Q=(p,e=document)=>e.querySelector(p);

function obj(t){
  let s=t.indexOf('{'); if(s<0) throw Error('没有找到 JSON 对象开头 {');
  let d=0,q=0,esc=0;
  for(let i=s;i<t.length;i++){
    let c=t[i];
    if(esc){esc=0;continue}
    if(c==='\\'){esc=1;continue}
    if(c==='"'){q=!q;continue}
    if(!q){ if(c==='{')d++; if(c==='}')d--; if(d===0)return t.slice(s,i+1) }
  }
  throw Error('JSON 对象没有正确闭合 }');
}

function cut(s,re){return s.match(re)?.[1]?.trim()||''}

function state(d){
  let s=String(d['状态']??'');
  d['状态_身材']=d['状态_身材']||cut(s,/身材\/仪态[:：]\s*([\s\S]*?)(?=\n\s*性格表现[:：]|\n\s*当前情绪[:：]|\n\s*关系倾向[:：]|$)/)||cut(s,/身材[:：]\s*([\s\S]*?)(?=\n\s*性格[:：]|\n\s*性格表现[:：]|\n\s*当前情绪[:：]|\n\s*关系倾向[:：]|$)/);
  d['状态_性格']=d['状态_性格']||cut(s,/性格表现[:：]\s*([\s\S]*?)(?=\n\s*当前情绪[:：]|\n\s*关系倾向[:：]|$)/)||cut(s,/性格[:：]\s*([\s\S]*?)(?=\n\s*当前情绪[:：]|\n\s*关系倾向[:：]|$)/);
  d['状态_情绪']=d['状态_情绪']||cut(s,/当前情绪[:：]\s*([\s\S]*?)(?=\n\s*关系倾向[:：]|$)/);
  d['状态_关系']=d['状态_关系']||cut(s,/关系倾向[:：]\s*([\s\S]*?)$/);
  return d;
}

function tag(t){
  let d={},r=/\[(正文|动作|对白|心里话|状态)\]([\s\S]*?)\[\/\1\]/g,m;
  while((m=r.exec(t))) d[m[1]]=m[2].trim();
  if(!Object.keys(d).length) throw Error('无半角标签');
  return state(d);
}

function cn(t){
  let d={},ks=['正文','动作','对白','心里话','状态'];
  for(let i=0;i<ks.length;i++){
    let k=ks[i],next=ks.slice(i+1).join('|');
    let re=new RegExp(`【${k}】\\s*([\\s\\S]*?)${next?`(?=\\n\\s*【(?:${next})】|$)`:'$'}`);
    d[k]=t.match(re)?.[1]?.trim()||'';
  }
  if(!Object.values(d).some(x=>x)) throw Error('无中文方括号');
  return state(d);
}

function parse(raw){
  let t=String(raw??'').trim().replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```$/i,'').trim();
  try{return {mode:'JSON / 对象格式',data:JSON.parse(obj(t).replace(/,\s*([}\]])/g,'$1'))}}catch(e){}
  try{return {mode:'半角标签格式',data:tag(t)}}catch(e){}
  try{return {mode:'中文方括号格式',data:cn(t)}}catch(e){}
  return {mode:'普通原文兜底',data:{
    '正文':t,
    '动作':'未检测到结构化动作字段',
    '对白':'未检测到结构化对白字段',
    '心里话':'未检测到结构化心里话字段',
    '状态_身材':'未检测到结构化状态字段',
    '状态_性格':'未检测到结构化状态字段',
    '状态_情绪':'未检测到结构化状态字段',
    '状态_关系':'未检测到结构化状态字段'
  }};
}

function need(d,k){let v=d?.[k];return v==null||String(v).trim()===''?`【缺少字段：${k}】`:String(v)}

function html(d){
  let a=need(d,'动作'),b=need(d,'对白'),c=need(d,'心里话');
  return `<div class="jsp-body">${E(need(d,'正文'))}</div>
  <div class="jsp-status"><div class="jsp-status-title">✦ 末尾状态栏 ✦</div>
  <div class="jsp-card jsp-cyan"><div class="jsp-label">【动作】</div><div class="jsp-content">${E(a)}</div></div>
  <div class="jsp-card jsp-pink"><div class="jsp-label">【对白】</div><div class="jsp-content">${E(b)}</div></div>
  <div class="jsp-card jsp-green"><div class="jsp-label">【心里话】</div><div class="jsp-content">${E(c)}</div></div>
  <div class="jsp-card jsp-orange"><div class="jsp-label">【状态】</div><div class="jsp-content">
  身材/仪态：${E(need(d,'状态_身材'))}<br>
  性格表现：${E(need(d,'状态_性格'))}<br>
  当前情绪：${E(need(d,'状态_情绪'))}<br>
  关系倾向：${E(need(d,'状态_关系'))}
  </div></div></div>`;
}

function render(input,out,err,mode){
  err.textContent='';out.innerHTML='';mode.textContent='';
  try{let r=parse(input.value);mode.textContent='当前解析模式：'+r.mode;out.innerHTML=html(r.data)}
  catch(e){err.textContent='解析失败：'+e.message}
}

async function lastAI(){
  try{
    let g=window.SillyTavern?.getContext;
    if(!g) g=(await import('/scripts/extensions.js')).getContext;
    let chat=g()?.chat||[];
    for(let i=chat.length-1;i>=0;i--){
      let x=chat[i],u=x?.is_user===true||x?.is_user==='true',m=x?.mes??x?.message??x?.text??'';
      if(!u&&String(m).trim()) return String(m).trim();
    }
  }catch(e){console.warn(`[${N}] context读取失败，DOM兜底`,e)}
  let ms=[...document.querySelectorAll('.mes')].filter(x=>x.getAttribute('is_user')!=='true'&&!x.classList.contains('user_mes'));
  let m=ms.at(-1)||document.querySelector('.mes:last-child');
  let t=Q('.mes_text',m)||Q('.mes_block',m)||m;
  if(!t?.innerText?.trim()) throw Error('没有找到最后AI回复');
  return t.innerText.trim();
}

function promptText(){
return `你每次回复必须只输出一个 JSON 对象，不要输出 Markdown 代码块，不要解释，不要在 JSON 前后添加任何文字。

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

要求：正文完整；不要照抄说明文字；性格、身材、心理优先遵守角色卡和世界书。`;
}

async function load(){
  let h=await fetch(`/scripts/extensions/third-party/${N}/panel.html`).then(r=>r.text());
  let box=document.createElement('div');box.innerHTML=h;
  let root=Q('#extensions_settings'); if(!root)return console.error(`[${N}] 找不到 #extensions_settings`);
  root.appendChild(box);
  let input=Q('#jsp-input',box),out=Q('#jsp-output',box),err=Q('#jsp-error',box),mode=Q('#jsp-mode',box);
  Q('#jsp-load-last-btn',box).onclick=async()=>{try{input.value=await lastAI();render(input,out,err,mode)}catch(e){err.textContent='读取失败：'+e.message}};
  Q('#jsp-render-btn',box).onclick=()=>render(input,out,err,mode);
  Q('#jsp-copy-prompt-btn',box).onclick=async()=>{let p=promptText();try{await navigator.clipboard.writeText(p);err.textContent='已复制 JSON 格式提示。'}catch(e){input.value=p;err.textContent='复制失败，已放入输入框。'}};
  Q('#jsp-clear-btn',box).onclick=()=>{err.textContent='';mode.textContent='';out.innerHTML='';input.value=''};
  console.log(`[${N}] 已加载`);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',load):load();
})();
