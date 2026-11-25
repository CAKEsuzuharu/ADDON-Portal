import fs from 'node:fs/promises';

// Parse quoted CSV cells (roles is a comma-separated value inside one cell).
function parseCSV(input) {
  const rows=[]; let row=[], cell='', quoted=false;
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(quoted){if(c==='"'&&input[i+1]==='"'){cell+='"';i++;}
      else if(c==='"')quoted=false;else cell+=c;}
    else if(c==='"')quoted=true;
    else if(c===','){row.push(cell);cell='';}
    else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell='';}
    else if(c!=='\r')cell+=c;
  }
  if(quoted)throw Error('CSVの引用符が閉じていません');
  if(cell||row.length){row.push(cell);rows.push(row);}
  return rows.filter(r=>r.some(v=>String(v).trim()));
}
function publicRoleData(csv){
  const rows=parseCSV(csv);
  if(!rows.length)throw Error('streamers CSVが空です');
  const headers=rows.shift().map(x=>x.trim().toLowerCase());
  const idx=key=>headers.indexOf(key);
  for(const col of ['enabled','name','platform','id','roles']){
    if(idx(col)<0)throw Error('streamers CSVに '+col+' 列がありません');
  }
  const byKey=new Map();
  for(const row of rows){
    if(!['true','1','yes','on','有効'].includes(String(row[idx('enabled')]||'').trim().toLowerCase()))continue;
    const name=String(row[idx('name')]||'').trim();
    const platform=String(row[idx('platform')]||'').trim().toLowerCase();
    const id=String(row[idx('id')]||'').trim();
    if(!name||!id||!['twitch','youtube'].includes(platform))continue;
    const roles=[...new Set(String(row[idx('roles')]||'').split(/[,、，]/).map(x=>x.trim()).filter(Boolean))].slice(0,15);
    if(roles.length)byKey.set(platform+':'+name.normalize('NFKC').toLocaleLowerCase('ja-JP'),{name,platform,id,roles});
  }
  return {streamers:[...byKey.values()].sort((a,b)=>(a.platform+':'+a.name).localeCompare(b.platform+':'+b.name,'ja'))};
}
const url=process.env.STREAMERS_CSV_URL;
if(!url||!url.startsWith('https://'))throw Error('Secret STREAMERS_CSV_URL に公開streamers CSV URLを設定してください');
const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});
if(!response.ok)throw Error('streamers CSV 読込失敗 HTTP '+response.status);
const output=publicRoleData(await response.text());
await fs.mkdir('data',{recursive:true});
await fs.writeFile('data/streamer-roles.json',JSON.stringify(output,null,2)+'\n','utf8');
console.log('公開用職業ロール数:',output.streamers.length);
