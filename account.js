// The account page's code (a file, not inside the page, so the page can forbid inline scripts: see the
// Content-Security-Policy in account.html)
// Pictures that fail to load are removed (instead of onerror="..." on each one)
document.addEventListener('error',e=>{const i=e.target;if(i&&i.tagName==='IMG'&&i.dataset.fail==='remove')i.remove()},true);
/* Hearth's own yes/no box instead of the browser's pop-ups. await ask(text,{ok,no,danger}) gives true/false; with {input:'text'} it gives the typed text, or null */
function ask(msg,o){o=o||{};return new Promise(function(res){var d=document.createElement('dialog');d.className='askdlg';var parts=String(msg).split(String.fromCharCode(10,10)),inp=null;
var q=document.createElement('p');q.className='askq';q.textContent=parts[0];d.append(q);parts.slice(1).forEach(function(t){var n=document.createElement('p');n.className='askn';n.textContent=t;d.append(n)});
if(o.input){inp=document.createElement('input');inp.type=o.input;inp.className='askin';inp.autocomplete='off';inp.setAttribute('aria-label',parts[0]);inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();fin(true)}});d.append(inp)}
var b=document.createElement('div');b.className='askb';function mk(t,c,v){var x=document.createElement('button');x.type='button';x.className='askbtn '+c;x.textContent=t;x.onclick=function(){fin(v)};b.append(x);return x}
var no=mk(o.no||'Cancel','',false),yes=mk(o.ok||'OK',o.danger?'askdanger':'askgo',true);d.append(b);d.setAttribute('aria-label',parts[0]);
var done=false;function fin(v){if(done)return;done=true;try{d.close()}catch(e){}d.remove();res(inp?(v?inp.value:null):v)}
d.addEventListener('cancel',function(e){e.preventDefault();fin(false)});d.addEventListener('click',function(e){if(e.target!==d)return;var r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)fin(false)});
document.body.append(d);d.showModal();(inp||(o.danger?no:yes)).focus()})}

// Hearth accounts on the website. Logins and passwords: Firebase Authentication (its public web key below).
// Usernames, invites and "Your Hearths": the Hearth accounts service at accounts.hearthapp.cc.
const FB_KEY='AIzaSyD32zcWLYYPrgpkgzV286SZZe8zxH4Jj74', SVC='https://accounts.hearthapp.cc';
const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k){try{return JSON.parse(localStorage.getItem('hearth-'+k))}catch{return null}},set(k,v){try{v==null?localStorage.removeItem('hearth-'+k):localStorage.setItem('hearth-'+k,JSON.stringify(v))}catch{}}};
function toast(t,bad){const e=$('#toast');e.textContent=t;e.style.color=bad?'var(--bad)':'';e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),4000)}
const ic={user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',mail:'<path d="M3 5h18v14H3z"/><path d="m3 6 9 7 9-7"/>',servers:'<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',link:'<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',home:'<path d="M3 11 12 3l9 8v10H3z"/><path d="M9 21v-6h6v6"/>'};
const svg=k=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+ic[k]+'</svg>';
const prog=(n,l)=>`<div class="prog-l">Step ${n} of 3 · ${l}</div><div class="prog">${[1,2,3].map(i=>`<i class="${i<=n?'on':''}" style="--d:${i}"></i>`).join('')}</div>`;
const why=()=>`<div class="card" style="--i:1"><h2>What a Hearth account is for</h2><ul class="why"><li><div class="hic">${svg('user')}</div><div><b>One name for every Hearth</b><span>Friends who run a Hearth add you by your username. No passwords to share.</span></div></li><li><div class="hic">${svg('servers')}</div><div><b>Their servers, in your app</b><span>Servers you've been invited to show up on your Hearth's home page, with Start and Stop if your role allows it.</span></div></li><li><div class="hic">${svg('link')}</div><div><b>A free address for your own Hearth</b><span>Hosting servers yourself? Link your Hearth and open it from your phone anywhere.</span></div></li></ul><p class="mute" style="font-size:14px;margin:16px 0 0">You don't need an account to run servers on your own PC. <a href="./">Download Hearth</a></p></div>`;
const FB_ERR={EMAIL_EXISTS:'There is already an account with that email. Log in instead.',INVALID_EMAIL:"That email doesn't look right.",INVALID_LOGIN_CREDENTIALS:'Wrong email or password.',INVALID_PASSWORD:'Wrong email or password.',EMAIL_NOT_FOUND:'Wrong email or password.',USER_DISABLED:'This account is turned off.',TOO_MANY_ATTEMPTS_TRY_LATER:'Too many tries. Wait a few minutes and try again.',WEAK_PASSWORD:'Pick a longer password (at least 8 characters).',MISSING_PASSWORD:'Type your password.'};
async function fb(path,body){const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:'+path+'?key='+FB_KEY,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));
if(!r.ok){const c=((j.error||{}).message||'').split(' : ')[0];throw new Error(FB_ERR[c]||FB_ERR[c.split(' ')[0]]||'Something went wrong ('+c+'). Try again.')}return j}
// The login: Firebase's refresh token is kept in this browser; ID tokens last an hour
let S=store.get('session');   // {idToken, refreshToken, expires, email}
async function token(force){if(!S)return null;if(!force&&S.expires>Date.now()+60e3)return S.idToken;
const r=await fetch('https://securetoken.googleapis.com/v1/token?key='+FB_KEY,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(S.refreshToken)});
if(!r.ok){logout();return null}const j=await r.json();S={...S,idToken:j.id_token,refreshToken:j.refresh_token,expires:Date.now()+(+j.expires_in)*1000};store.set('session',S);return S.idToken}
function keep(j){S={idToken:j.idToken,refreshToken:j.refreshToken,expires:Date.now()+(+j.expiresIn)*1000,email:j.email};store.set('session',S)}
function logout(){S=null;store.set('session',null);store.set('pending-name',null);render()}
async function svc(m,p,b,auth=true){const h={};if(b)h['content-type']='application/json';if(auth){const t=await token();if(!t)throw Object.assign(new Error('Log in again.'),{status:401});h.authorization='Bearer '+t}
const r=await fetch(SVC+p,{method:m,headers:h,body:b?JSON.stringify(b):undefined});const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error||'Error '+r.status),{status:r.status,data:j});return j}

let MODE=new URLSearchParams(location.search).get('mode')==='signup'?'signup':'login';
const field=(id,l,type='text',ac='off',ph='')=>`<label for="${id}">${l}</label><input id="${id}" type="${type}" autocomplete="${ac}" placeholder="${esc(ph)}" autocapitalize="off" spellcheck="false">`;
function gate(){const sign=MODE==='signup',reset=MODE==='reset';
$('#who').textContent='';
$('#app').innerHTML=`<div class="card">${sign?prog(1,'Your details'):''}<h1>${reset?'Reset your password':sign?'Make your Hearth account':'Welcome back'}</h1><p class="mute">${reset?"Type your account's email and we'll send you a link to pick a new password.":sign?'It takes a minute. Next, you confirm your email, and then you can be invited to servers.':'Log in to see invites to your friends\' servers and the Hearths you\'ve joined.'}</p>
${reset?'':`<div class="tabs ${sign?'r':''}"><button data-mode="login" class="${sign?'':'on'}">Log in</button><button data-mode="signup" class="${sign?'on':''}">Create account</button></div>`}
${sign?field('un','Username','text','username','3-20 letters, numbers or _')+'<div class="mute" id="unok" style="font-size:14px;margin-top:4px"></div>':''}
${field('em','Email','email','email')}${reset?'':field('pw',sign?'Password (8+ characters)':'Password','password',sign?'new-password':'current-password')}
${sign?field('pw2','Confirm password','password','new-password')+'<label class="ck"><input type="checkbox" id="age"> I am 13 or older</label>':''}
${sign?'<p class="mute" style="font-size:14px;margin:12px 0 0">By creating an account you agree to how Hearth handles your info: <a href="privacy">Privacy</a>.</p>':''}<div class="err" id="err"></div><button class="btn go full" id="go">${reset?'Send the link':sign?'Create my account':'Log in'}</button>
<div class="links">${reset?'<button data-mode="login">Back to log in</button>':'<button data-mode="reset">Forgot your password?</button>'}</div></div>${reset?'':why()}`;
const f=$('#un')||$('#em');if(f)f.focus()}
let unT;document.addEventListener('input',e=>{if(e.target.id!=='un'&&e.target.id!=='em')return;clearTimeout(unT);const n=(($('#un')||{}).value||'').trim(),o=$('#unok');if(!o)return;if(!n){o.textContent='';return}
unT=setTimeout(async()=>{try{const r=await svc('GET','/v1/username?name='+encodeURIComponent(n)+'&email='+encodeURIComponent((($('#em')||{}).value||'').trim()),null,false);o.innerHTML=r.available?'<span class="ok">✓ Available</span>':'<span class="err">'+esc(r.error||'Taken')+'</span>'}catch{o.textContent=''}},350)});
async function submit(){const v=id=>($('#'+id)||{}).value||'',err=t=>{$('#err').textContent=t},b=$('#go');err('');b.disabled=true;b.classList.add('busy');try{
if(MODE==='reset'){await fb('sendOobCode',{requestType:'PASSWORD_RESET',email:v('em').trim()});$('#app').innerHTML='<div class="card"><div class="hic" style="margin-bottom:14px">'+svg('mail')+'</div><h1>Check your email</h1><p class="mute">If there\'s a Hearth account for that email, a link to pick a new password is on its way. Check spam too.</p><button class="btn" data-mode="login">Back to log in</button></div>';return}
if(MODE==='signup'){const n=v('un').trim();if(!/^[A-Za-z0-9_]{3,20}$/.test(n))return err('Usernames are 3-20 letters, numbers or _.');if(v('pw').length<8)return err('Pick a password with at least 8 characters.');if(v('pw')!==v('pw2'))return err('The passwords don\'t match.');if(!$('#age').checked)return err('You must be 13 or older to make a Hearth account.');
const av=await svc('GET','/v1/username?name='+encodeURIComponent(n)+'&email='+encodeURIComponent(v('em').trim()),null,false);if(!av.available)return err(av.error||'That username is taken.');
const j=await fb('signUp',{email:v('em').trim(),password:v('pw'),returnSecureToken:true});keep(j);store.set('pending-name',n);await fb('sendOobCode',{requestType:'VERIFY_EMAIL',idToken:j.idToken});return render()}
const j=await fb('signInWithPassword',{email:v('em').trim(),password:v('pw'),returnSecureToken:true});keep(j);render()
}catch(e){err(e.message)}finally{if(b){b.disabled=false;b.classList.remove('busy')}}}

async function render(){if(!S)return gate();let me;
try{me=await svc('GET','/v1/me')}catch(e){
if(e.status===401)return logout();
if(e.data&&e.data.needsUsername)return pickName();
if(e.data&&e.data.maintenance){$('#app').innerHTML='<div class="card"><h1>Back soon</h1><p class="mute">'+esc(e.message)+'</p></div>';return}
$('#app').innerHTML='<div class="card"><h1>Hmm</h1><p class="err">'+esc(e.message)+'</p><button class="btn" id="lo">Log out</button></div>';return}
$('#who').innerHTML='<span class="who">'+(me.pic?`<span class="av">${esc(me.username[0])}<img src="${SVC}/v1/pictures/${encodeURIComponent(me.uid)}?v=${+me.pic}" alt="" data-fail="remove"></span>`:'<span class="av">'+esc(me.username[0])+'</span>')+esc(me.username)+'</span><a href="#" id="lo2">Log out</a>';
const [box,mine,fr]=await Promise.all([svc('GET','/v1/inbox').catch(()=>({invites:[]})),svc('GET','/v1/my-hearths').catch(()=>({hosting:[],joined:[]})),svc('GET','/v1/friends').catch(()=>({friends:[],incoming:[],outgoing:[]}))]);
// A Hearth account's picture (or their first letter)
const avi=(x,cls='')=>`<span class="av${cls?' '+cls:''}">${esc((x.username||'?')[0])}${x.pic?`<img src="${SVC}/v1/pictures/${encodeURIComponent(x.uid)}?v=${+x.pic}" alt="" data-fail="remove">`:''}</span>`;
const BADGES={dev:['Hearth Studios','The people who make Hearth','dev'],beta:['Beta tester','Here before Hearth 1.0. Thanks for helping make it!','beta']};
const badgesHTML=b=>Array.isArray(b)&&b.length?`<div class="badges">${b.filter(x=>BADGES[x]).map(x=>`<span class="badge ${BADGES[x][2]}" title="${BADGES[x][1]}">${BADGES[x][0]}</span>`).join('')}</div>`:'';
const who=x=>`${avi(x,'sm')}<div class="grow"><b>${esc(x.username)}</b>${badgesHTML(x.badges)}<div class="tag">#${esc(x.tag||'????')}</div></div>`;
const nreq=fr.incoming.length;
const roleL={guest:'Guest',helper:'Helper',owner:'Owner'},open=u=>u?`<a class="btn sm" href="${esc(u)}" target="_blank" rel="noopener">Open in browser</a>`:'';
const hosts=mine.hosting.length>0,joined=mine.joined.length>0,inv=box.invites.length;
const steps=[
 {done:true,t:'Make your Hearth account',d:'Done. Welcome!'},
 {done:joined,t:'Get invited to a friend\'s server',d:'Send your username to a friend who runs a Hearth. They add you on a server\'s People tab, and you accept the invite here or in your Hearth app.',a:`<button class="btn sm" data-copy="${esc(me.username)}">Copy username</button>`},
 {done:false,app:true,t:'Use it in the Hearth app',d:'Log in with this account when Hearth first opens (already using Hearth? Settings › Hearth account). Your friends\' servers then show on your home page, and invites pop up at the bell.',a:'<a class="btn sm go" href="./">Get Hearth</a>'},
 {done:hosts,t:'Hosting servers? Link your Hearth',d:'Setting Hearth up with this account links it for you (or Settings › Hearth account › Link this Hearth). With two-factor login on, it gets a free address you can open from anywhere.'}];
const left=steps.filter(x=>!x.done&&!(x.app&&(hosts||joined))).length;
const startCard=left>1?`<div class="card" style="--i:1"><div class="split"><h2 style="margin:0">Getting started</h2><span class="mute" style="font-size:14px">${4-left} of 4 done</span></div><p class="mute" style="margin:6px 0 14px">A few things to make the most of your account.</p><ol class="todo">${steps.map((x,i)=>{const d=x.done||(x.app&&(hosts||joined));return `<li data-n="${i+1}" class="${d?'done':''}"><div><b>${x.t}</b>${d?'':`<span>${x.d}</span>`}</div>${d?'':x.a||''}</li>`}).join('')}</ol></div>`:'';
const empty=(k,t)=>`<div class="empty"><div class="hic">${svg(k)}</div><div>${t}</div></div>`;
$('#app').innerHTML=`<div class="card" style="--i:0"><div class="me">${avi(me)}<div style="flex:1;min-width:160px"><div class="mute" style="font-size:14px">Your username</div><div class="name">${esc(me.username)}</div>${badgesHTML(me.badges)}${me.tag?`<div class="mute" style="font-size:14px">Friend tag <b>${esc(me.username)}#${esc(me.tag)}</b>: friends add you with this in the Friends tab of their Hearth app</div>`:''}${me.premium&&me.premium.on?`<div class="mute" style="font-size:14px;margin-top:4px">✨ <b>Premium</b>, a gift from Hearth${me.premium.until===-1?', forever':', until '+new Date(me.premium.until).toLocaleDateString()}</div>`:''}</div><button class="btn sm" data-copy="${esc(me.tag?me.username+'#'+me.tag:me.username)}">Copy</button></div>
<div class="picbtns"><button class="btn sm" id="pic">${me.pic?'Change picture':'Add a picture'}</button>${me.pic?'<button class="btn sm" id="picrm">Remove picture</button>':''}<input type="file" id="picin" accept="image/png,image/jpeg,image/webp" hidden></div>
<p class="mute" style="margin:14px 0 0">Your picture shows on every Hearth you use and to your friends. Friends invite you by your username and add you with your friend tag.</p></div>
${startCard}
${(box.messages||[]).map(m=>`<div class="card msg" style="--i:1"><h2>Message from Hearth</h2><p style="white-space:pre-wrap">${esc(m.text)}</p><div class="row"><button class="btn sm" data-msgread="${esc(m.id)}">Got it</button></div></div>`).join('')}<div class="card" style="--i:2"><h2>Invites${inv?' <span class="count">'+inv+'</span>':''}</h2>${inv?box.invites.map(i=>`<div class="item"><div class="hic">${esc((i.hearth.name||'?')[0])}</div><div class="grow"><b>${esc(i.from)} invited you to ${esc(i.hearth.name)}</b>${i.servers.map(s=>`<span class="chip">${esc(s.name)} · ${roleL[s.role]||esc(s.role)}</span>`).join('')}</div><div class="row"><button class="btn sm go" data-acc="${esc(i.id)}">Accept</button><button class="btn sm" data-dec="${esc(i.id)}">Decline</button></div></div>`).join(''):empty('mail','No invites right now. When a friend adds you, it shows up here.')}</div>
<div class="card" style="--i:3"><h2>Friends${nreq?' <span class="count">'+nreq+'</span>':''}</h2>
<div class="mute" style="font-size:14px">Add a friend with their username and # number, like Carsyn#4821.</div>
<div class="fadd"><input id="fto" type="text" placeholder="Username#1234" maxlength="50" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Friend's username and number"><button class="btn sm go" id="fadd">Send request</button></div><div class="err" id="ferr"></div>
${nreq?`<div class="sec">Friend requests</div>`+fr.incoming.map(x=>`<div class="item">${who(x)}<div class="row"><button class="btn sm go" data-fact="accept" data-fuid="${esc(x.uid)}">Accept</button><button class="btn sm" data-fact="decline" data-fuid="${esc(x.uid)}">Decline</button></div></div>`).join(''):''}
<div class="sec">Your friends · ${fr.friends.length}</div>${fr.friends.length?fr.friends.map(x=>`<div class="item">${who(x)}<button class="btn sm" data-fact="remove" data-fuid="${esc(x.uid)}" data-fname="${esc(x.username)}">Remove</button></div>`).join(''):empty('user','No friends yet. Send a friend your tag, or add theirs above. Then, in the Hearth app, invite them to your servers from Friends.')}
${fr.outgoing.length?`<div class="sec">Sent requests</div>`+fr.outgoing.map(x=>`<div class="item">${who(x)}<span class="mute" style="font-size:14px">Waiting for them</span><button class="btn sm" data-fact="remove" data-fuid="${esc(x.uid)}" data-fcancel="1">Cancel</button></div>`).join(''):''}</div>
<div class="card" style="--i:4"><h2>Your Hearths</h2>${joined||hosts?[...mine.hosting.map(h=>`<div class="item"><div class="hic">${svg('home')}</div><div class="grow"><b>${esc(h.name)}</b><span class="mute">You host this one${h.url?' · '+esc(h.url):''}</span></div>${open(h.url)}</div>`),...mine.joined.map(h=>`<div class="item"><div class="hic">${esc((h.name||'?')[0])}</div><div class="grow"><b>${esc(h.name)}</b><span class="mute">Hosted by ${esc(h.host||'?')}</span><div>${h.servers.map(s=>`<span class="chip">${esc(s.name)} · ${roleL[s.role]||esc(s.role)}</span>`).join('')}</div></div>${open(h.url)}</div>`)].join('')+'<p class="mute" style="font-size:14px;margin:12px 0 0">Tip: in the Hearth app, these open from your rail, already logged in.</p>':empty('servers','None yet. Accept an invite to join a friend\'s Hearth, or <a href="./">download Hearth</a> to host your own servers.')}</div>
<div class="card" style="--i:5"><h2>Account</h2><div class="split"><div><div class="mute" style="font-size:14px">Email</div><div>${esc(me.email)}</div></div><div class="row"><button class="btn sm" id="chpw">Change password</button><button class="btn sm" id="lo">Log out</button></div></div>
<hr><div class="split"><div><b>Delete account</b><div class="mute" style="font-size:14px">Removes your username, invites and linked Hearths for good.</div></div><button class="btn sm danger" id="del">Delete my account</button></div>
<p class="mute" style="font-size:14px;margin:16px 0 0"><a href="privacy">What Hearth keeps about you</a></p></div>`;
banners(me.announcements)}
function pickName(){const pending=store.get('pending-name')||'';
$('#who').innerHTML='';$('#app').innerHTML=`<div class="card">${prog(2,'Confirm your email')}<div class="hic" style="margin-bottom:14px">${svg('mail')}</div><h1>Check your inbox</h1><p class="mute">We sent a link to <b>${esc(S.email||'your email')}</b>. Open it, then come back here and click <b>I've confirmed it</b>. Can't find it? Check your spam folder.</p>
${field('un','Your username','text','username','3-20 letters, numbers or _')}<div class="mute" id="unok" style="font-size:14px;margin-top:4px"></div><label class="ck"><input type="checkbox" id="age" ${pending?'checked':''}> I am 13 or older</label>
<div class="err" id="err"></div><button class="btn go full" id="claim">I've confirmed it</button><div class="links"><button id="resend">Send the email again</button><button id="lo">Log out</button></div></div>`;
$('#un').value=pending}
async function claim(){const err=t=>{$('#err').textContent=t},n=$('#un').value.trim();err('');try{await token(true);
await svc('POST','/v1/me',{username:n,age13:$('#age').checked});store.set('pending-name',null);toast('Welcome to Hearth, '+n+'! Here\'s what to do next.');render()}catch(e){err(e.message)}}
function banners(list){$('#banners').innerHTML=(list||[]).map(a=>`<div class="banner ${a.level==='warn'?'warn':''}">${esc(a.text)}</div>`).join('')}
document.addEventListener('click',async e=>{const t=e.target.closest('button,a');if(!t)return;const d=t.dataset;
if(d.mode){MODE=d.mode;return gate()}
if(t.id==='go')return submit();
if(t.id==='claim')return claim();
if(t.id==='lo'||t.id==='lo2'){e.preventDefault();return logout()}
if(t.id==='resend'){try{await fb('sendOobCode',{requestType:'VERIFY_EMAIL',idToken:await token()});toast('Sent. Check your email.')}catch(x){toast(x.message,true)}return}
if(t.id==='del'){if(((await ask('Delete your Hearth account for good?'+String.fromCharCode(10,10)+'This deletes your username, invites and linked Hearths. Type DELETE below to go on.',{input:'text',ok:'Delete account',danger:1}))||'').trim().toUpperCase()!=='DELETE')return;try{await svc('DELETE','/v1/me');await fb('delete',{idToken:await token()});toast('Your account is deleted.');logout()}catch(x){toast(x.message+' (if it says log in again, log out and back in, then try again)',true)}return}
if(t.id==='chpw'){try{await fb('sendOobCode',{requestType:'PASSWORD_RESET',email:S.email});toast('We emailed you a link to pick a new password.')}catch(x){toast(x.message,true)}return}
if(t.id==='fadd')return addFriend();
if(d.fact){if(d.fact==='remove'&&!d.fcancel&&!await ask('Remove '+d.fname+' from your friends?'+String.fromCharCode(10,10)+'Their access to servers doesn\'t change.',{ok:'Remove friend',danger:1}))return;t.disabled=true;
try{await svc('POST','/v1/friends/'+encodeURIComponent(d.fuid)+'/'+d.fact);toast({accept:'You\'re friends now',decline:'Declined',remove:d.fcancel?'Request cancelled':'Removed'}[d.fact]);render()}catch(x){toast(x.message,true);t.disabled=false}return}
if(t.id==='pic'){$('#picin').click();return}
if(t.id==='picrm'){t.disabled=true;try{await svc('DELETE','/v1/me/picture');toast('Picture removed');render()}catch(x){toast(x.message,true);t.disabled=false}return}
if(d.copy){navigator.clipboard.writeText(d.copy).then(()=>toast('Copied'),()=>{});return}
if(d.msgread){t.disabled=true;try{await svc('POST','/v1/messages/'+encodeURIComponent(d.msgread)+'/read');t.closest('.card').remove()}catch(x){t.disabled=false;toast(x.message,true)}return}
if(d.acc||d.dec){t.disabled=true;try{const r=await svc('POST','/v1/invites/'+(d.acc||d.dec)+'/'+(d.acc?'accept':'decline'));toast(d.acc?'Accepted! '+(r.hearth&&r.hearth.url?'Open it from Your Hearths.':''):'Declined');render()}catch(x){toast(x.message,true);t.disabled=false}}});
document.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.target.tagName!=='INPUT')return;if(e.target.id==='fto')return addFriend();if($('#go'))submit();else if($('#claim'))claim()});
async function addFriend(){const i=$('#fto'),v=(i&&i.value||'').trim(),er=$('#ferr');if(er)er.textContent='';if(!v)return i&&i.focus();
try{const r=await svc('POST','/v1/friends',{to:v});toast(r.status==='accepted'?'You and '+r.friend.username+' are friends now':r.already?'Already sent to '+r.friend.username:'Friend request sent to '+r.friend.username);render()}catch(x){if(er)er.textContent=x.message}}
// Profile picture: cropped to the middle square and shrunk to 256 px before it's sent (WebP, or PNG where WebP can't be made)
document.addEventListener('change',async e=>{if(e.target.id!=='picin')return;const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
if(!/^image\/(png|jpeg|webp)$/.test(f.type))return toast('Pick a PNG, JPG or WebP picture.',true);
try{const img=await new Promise((ok,no)=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);ok(im)};im.onerror=()=>no(new Error('That picture could not be opened.'));im.src=u});
const n=Math.min(img.naturalWidth,img.naturalHeight),c=document.createElement('canvas');c.width=c.height=256;
c.getContext('2d').drawImage(img,(img.naturalWidth-n)/2,(img.naturalHeight-n)/2,n,n,0,0,256,256);
let data=c.toDataURL('image/webp',.86);if(!/^data:image\/webp/.test(data))data=c.toDataURL('image/png');
await svc('PUT','/v1/me/picture',{image:data});toast('Picture saved. It shows on your Hearths within a few minutes.');render()}catch(x){toast(x.message,true)}});
svc('GET','/v1/status',null,false).then(s=>{if(!S)banners(s.announcements);if(s.maintenance&&!S)$('#banners').innerHTML+='<div class="banner warn">'+esc(s.message||'Hearth accounts are down for maintenance.')+'</div>'}).catch(()=>{});
render();
