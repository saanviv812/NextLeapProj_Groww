/* Connects the pages to this site's AI endpoint (/api/ai). The server tries Groq first, then Gemini. */
(function(){
  async function call(input,json){
    for(let i=0;i<2;i++){
      const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:String(input),json:!!json})});
      const d=await r.json().catch(()=>({}));
      if(r.ok)return d.text||"";
      if(i===0&&(r.status===429||r.status===503)){await new Promise(s=>setTimeout(s,1500));continue}
      throw {code:r.status===429?"rate_limited":(d.code||"error")};
    }
  }
  function strip(t){return String(t).trim().replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/,"")}
  const sample=async(input)=>({text:await call(input,false),truncated:false});
  sample.json=async(input)=>{const t=await call(input,true);try{return JSON.parse(strip(t))}catch(e){const m=strip(t).match(/\{[\s\S]*\}/);if(m){try{return JSON.parse(m[0])}catch(_){}}throw {code:"bad_json"}}};
  /* Saved test runs stay in this browser only. */
  function coll(name){const key="sipfit_"+name;const read=()=>{try{return JSON.parse(localStorage.getItem(key)||"[]")}catch(e){return[]}};
    const q={_o:null,_l:50,orderBy(f,dir){this._o=[f,dir];return this},limit(n){this._l=n;return this},
      async get(){let d=read();if(this._o){const[f,dir]=this._o;d.sort((a,b)=>(a[f]>b[f]?1:-1)*(dir==="desc"?-1:1))}return{docs:d.slice(0,this._l).map(x=>({data:()=>x}))}},
      async add(doc){const d=read();d.push(doc);try{localStorage.setItem(key,JSON.stringify(d.slice(-20)))}catch(e){}return{id:String(d.length)}}};
    return Object.create(q)}
  window.SITE_AI={sample:Promise.resolve(sample),db:Promise.resolve({collection:coll})};
})();
