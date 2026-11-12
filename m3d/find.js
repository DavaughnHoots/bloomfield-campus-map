// "Find an office" search panel, shared by the campus walk and the 3D map.
// Needs offices.js loaded first. Each page calls FindOffice.mount({button, actions}),
// where actions(entry, building) returns [{label, primary, run}] for a result.
(function(){
const TAG = {sign:["From building sign","ok"], css:["From CSS team","ok"], map:["2026 map label","ok"], old:["Older map, confirm","warn"]};
const QUICK = ["Financial aid","Tutoring","Counseling","Food","Registrar","Disability services","Printing","Parking"];
const esc = s => String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const css = `
.fo-back{position:fixed;inset:0;z-index:30;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}
.fo{background:var(--surface,#fff);color:var(--ink,#333);width:100%;max-width:560px;max-height:88%;display:flex;flex-direction:column;border-radius:18px 18px 0 0;box-shadow:0 -6px 24px rgba(0,0,0,.25);
  padding:14px max(16px,env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));font-family:var(--body,Roboto,Arial,sans-serif)}
@media (min-width:760px){.fo-back{align-items:center}.fo{border-radius:18px;max-height:80%}}
.fo-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.fo h2{font-family:var(--display,inherit);font-size:1.3rem;margin:0}
.fo-x{flex:none;min-width:40px;min-height:40px;border-radius:50%;border:1px solid var(--line,#ccc);background:var(--bg,#f4f4f5);color:var(--ink,#333);font:700 1.1rem inherit;cursor:pointer}
.fo label{display:block;font-size:.85rem;font-weight:700;margin:10px 0 4px;color:var(--muted,#666)}
.fo input{width:100%;min-height:46px;border-radius:12px;border:2px solid var(--line,#ccc);background:var(--bg,#f4f4f5);color:var(--ink,#333);font:400 1rem inherit;padding:0 12px}
.fo input:focus{outline:none;border-color:var(--accent,#d21437)}
.fo-quick{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.fo-quick button{min-height:36px;padding:0 12px;border-radius:99px;border:1px solid var(--line,#ccc);background:transparent;color:var(--ink,#333);font:700 .82rem inherit;cursor:pointer}
.fo-list{list-style:none;margin:10px 0 0;padding:0;overflow:auto;flex:1;min-height:0;-webkit-overflow-scrolling:touch}
.fo-list li{border-top:1px solid var(--line,#ddd);padding:10px 0;display:flex;flex-direction:column;gap:4px}
.fo-list b{font-size:1rem;line-height:1.3}
.fo-where{font-size:.88rem;color:var(--muted,#666)}
.fo-tag{align-self:flex-start;font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:99px;border:1px solid var(--line,#ddd);color:var(--muted,#666)}
.fo-tag.warn{background:#fff6d6;color:#5c4700;border-color:#f0dc8c}
.fo-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.fo-acts button{min-height:40px;padding:0 14px;border-radius:10px;border:2px solid var(--accent,#d21437);background:transparent;color:var(--accent,#d21437);font:700 .85rem inherit;cursor:pointer}
.fo-acts button.p{background:var(--accent,#d21437);color:var(--accent-ink,#fff)}
.fo-none,.fo-note{font-size:.85rem;color:var(--muted,#666);margin:10px 0 0}
.fo button:focus-visible,.fo input:focus-visible{outline:3px solid #ffc909;outline-offset:2px}`;

function score(e, B, terms){
  const name = e.o.toLowerCase(), hay = (e.o+" "+e.k+" "+B[e.b].n).toLowerCase();
  let s = 0;
  for(const t of terms){
    if(!hay.includes(t)) return 0;
    s += name.startsWith(t) ? 6 : name.includes(t) ? 4 : (" "+e.k+" ").includes(" "+t) ? 3 : 1;
  }
  return s + (e.s==="old" ? -0.5 : 0);
}

window.FindOffice = { mount(opt){
  const O = window.OFFICES || [], B = window.OFFICE_BLDG || {};
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const back = document.createElement("div"); back.className = "fo-back"; back.hidden = true;
  back.innerHTML = `<div class="fo" role="dialog" aria-modal="true" aria-labelledby="fo-h">
    <div class="fo-top"><h2 id="fo-h">Find an office</h2><button type="button" class="fo-x" aria-label="Close search">×</button></div>
    <label for="fo-q">What do you need?</label>
    <input id="fo-q" type="search" autocomplete="off" enterkeyhint="search" placeholder="Try financial aid, tutoring or food">
    <div class="fo-quick" aria-label="Common searches">${QUICK.map(q=>`<button type="button">${q}</button>`).join("")}</div>
    <ul class="fo-list" aria-live="polite"></ul>
    <p class="fo-note">Offices come from building signs photographed in October 2026, the CSS team, and campus maps. Ones marked "Older map, confirm" may have moved.</p>
  </div>`;
  document.body.appendChild(back);
  const q = back.querySelector("#fo-q"), list = back.querySelector(".fo-list"), quick = back.querySelector(".fo-quick");
  let shown = [];
  function draw(){
    const terms = q.value.toLowerCase().replace(/disability services/,"disability").split(/\s+/).filter(Boolean);
    quick.hidden = terms.length>0;
    if(!terms.length){ list.innerHTML = ""; shown = []; return; }
    shown = O.map(e=>[score(e,B,terms),e]).filter(a=>a[0]>0).sort((a,b)=>b[0]-a[0]).slice(0,15).map(a=>a[1]);
    if(!shown.length){ list.innerHTML = `<li class="fo-none">No match yet. Try a simpler word, such as "aid", "food" or "help". If an office is missing, tell the CSS team.</li>`; return; }
    list.innerHTML = shown.map((e,n)=>{
      const t = e.u ? ["Not confirmed yet","warn"] : TAG[e.s];
      const acts = opt.actions(e, B[e.b]);
      return `<li><b>${esc(e.o)}</b><span class="fo-where">${esc(B[e.b].n)}${e.w?" · "+esc(e.w):""}</span><span class="fo-tag ${t[1]}">${t[0]}</span>
        <span class="fo-acts">${acts.map((a,k)=>`<button type="button" class="${a.primary?"p":""}" data-n="${n}" data-k="${k}">${esc(a.label)}</button>`).join("")}</span></li>`;
    }).join("");
  }
  function open(){ back.hidden = false; q.focus(); q.select(); }
  function close(){ back.hidden = true; opt.button.focus(); }
  opt.button.addEventListener("click", open);
  back.querySelector(".fo-x").onclick = close;
  back.addEventListener("click", e=>{ if(e.target===back) close(); });
  back.addEventListener("keydown", e=>{ if(e.key==="Escape") close(); });
  q.addEventListener("input", draw);
  quick.addEventListener("click", e=>{ const b = e.target.closest("button"); if(b){ q.value = b.textContent; draw(); q.focus(); } });
  list.addEventListener("click", e=>{
    const b = e.target.closest("button[data-n]"); if(!b) return;
    const ent = shown[+b.dataset.n], act = opt.actions(ent, B[ent.b])[+b.dataset.k];
    back.hidden = true; act.run();
  });
  return {open, close};
}};
})();
