
/* LSPD static app (localStorage) */
const LS_USERS = 'lspd_users_v3';
const LS_SESS = 'lspd_sess_v3';
const LS_ATT = 'lspd_att_v3';

function load(k,def){ try{ return JSON.parse(localStorage.getItem(k)) ?? def }catch{ return def } }
function save(k,v){ localStorage.setItem(k, JSON.stringify(v)) }

// Seed sample data
(function seed(){
  if(!load(LS_USERS,null)){
    save(LS_USERS, [
      {id:1,username:'admin',password:'123456',fullname:'Chief Officer',rank:'Trung Tá',position:'Chỉ huy',role:'admin',created:'2025-08-01'},
      {id:2,username:'officer1',password:'123456',fullname:'John Carter',rank:'Trung Úy',position:'Tuần tra',role:'officer',created:'2025-08-02'},
      {id:3,username:'officer2',password:'123456',fullname:'Anna Smith',rank:'Thiếu Úy',position:'Tuần tra',role:'officer',created:'2025-08-03'}
    ]);
  }
  if(!load(LS_ATT,null)) save(LS_ATT, []);
})();

// Simple toast
function toast(msg){ try{alert(msg)}catch(e){console.log(msg)} }

/* ===== Login (index.html) ===== */
document.addEventListener('DOMContentLoaded', ()=>{
  const f = document.getElementById('loginForm');
  if(f){
    f.addEventListener('submit', e=>{
      e.preventDefault();
      const u = document.getElementById('username').value.trim();
      const p = document.getElementById('password').value.trim();
      const users = load(LS_USERS,[]);
      const user = users.find(x=>x.username===u && x.password===p);
      if(!user){ document.getElementById('loginError').innerText='Sai tài khoản hoặc mật khẩu'; return; }
      save(LS_SESS, {username:user.username, fullname:user.fullname, role:user.role});
      window.location.href = 'home.html';
    });
  }

  // Home page init: show datetime and duty status
  if(document.getElementById('dateTime')){
    setInterval(()=>{ document.getElementById('dateTime').innerText = new Date().toLocaleString(); }, 1000);
    const sess = load(LS_SESS, null);
    if(!sess) { window.location.href='index.html'; return; }
    document.getElementById('officerName').innerText = sess.fullname;
    document.getElementById('officerRank').innerText = (load(LS_USERS,[]).find(u=>u.username===sess.username)||{}).rank||'';
    renderHistory(sess.username);
  }

  // Staff page init: load staff list
  if(document.getElementById('staffTableBody')){
    const sess = load(LS_SESS, null);
    if(!sess || sess.role!=='admin'){ window.location.href='home.html'; return; }
    renderStaffTable();
    document.getElementById('addStaffForm').addEventListener('submit', e=>{
      e.preventDefault();
      const fullname = document.getElementById('staffFullname').value.trim();
      const username = document.getElementById('staffUsername').value.trim();
      const password = document.getElementById('staffPassword').value.trim();
      const rank = document.getElementById('staffRank').value;
      const position = document.getElementById('staffPosition').value.trim();
      const role = document.getElementById('staffRole').value;
      if(!fullname||!username||!password){ toast('Vui lòng điền đủ'); return; }
      let users = load(LS_USERS,[]);
      if(users.some(u=>u.username===username)){ toast('Username đã tồn tại'); return; }
      const id = Date.now();
      users.push({id, username, password, fullname, rank, position, role, created:new Date().toLocaleDateString()});
      save(LS_USERS, users);
      renderStaffTable();
      document.getElementById('addStaffForm').reset();
      toast('Đã thêm nhân sự');
    });
  }
});

// logout
function logout(){ localStorage.removeItem(LS_SESS); window.location.href='index.html' }

// Attendance functions
function onDuty(){
  const sess = load(LS_SESS, null); if(!sess) return;
  let att = load(LS_ATT, []);
  const open = att.find(a=>a.username===sess.username && !a.timeOut);
  if(open){ toast('Bạn đang On Duty'); return; }
  att.push({id:Date.now(), username:sess.username, timeIn: new Date().toISOString(), timeOut:null});
  save(LS_ATT, att); renderHistory(sess.username); toast('On Duty ghi nhận');
}
function offDuty(){
  const sess = load(LS_SESS, null); if(!sess) return;
  let att = load(LS_ATT, []);
  const open = att.find(a=>a.username===sess.username && !a.timeOut);
  if(!open){ toast('Bạn chưa On Duty'); return; }
  open.timeOut = new Date().toISOString(); save(LS_ATT, att); renderHistory(sess.username); toast('Off Duty ghi nhận');
}
function renderHistory(username){
  const tb = document.getElementById('historyBody'); if(!tb) return;
  const att = load(LS_ATT, []).filter(a=>a.username===username).slice().reverse();
  tb.innerHTML = att.map(a=>`<tr><td>${new Date(a.timeIn).toLocaleString()}</td><td>${a.timeOut?new Date(a.timeOut).toLocaleString():'-'}</td></tr>`).join('');
}

// Staff management
function renderStaffTable(){
  const tbody = document.getElementById('staffTableBody'); if(!tbody) return;
  const users = load(LS_USERS, []);
  tbody.innerHTML = users.map(u=>`<tr>
    <td>${u.fullname}</td><td>${u.username}</td><td>${u.rank||''}</td><td>${u.position||''}</td><td>${u.role}</td>
    <td><button class="btn" onclick="deleteStaff('${u.username}')">Xóa</button></td></tr>`).join('');
}
function deleteStaff(username){
  if(!confirm('Xóa tài khoản '+username+' ?')) return;
  let users = load(LS_USERS, []); users = users.filter(u=>u.username!==username); save(LS_USERS, users);
  renderStaffTable(); toast('Đã xóa');
}

// Export CSV (staff)
function exportStaffCSV(){
  const users = load(LS_USERS, []);
  const header = ['Fullname','Username','Rank','Position','Role'];
  const rows = users.map(u=>[u.fullname,u.username,u.rank||'',u.position||'',u.role]);
  const csv = [header, ...rows].map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='lspd_staff.csv'; a.click(); URL.revokeObjectURL(url);
  toast('Đã xuất CSV');
}
