'use client'

import { useState, useRef, useEffect } from 'react'
import JSZip from 'jszip'

// ===============================================================
// HTML 生成函數（在瀏覽器端產生離線 HTML 頁面）
// ===============================================================

function esc(text: string): string {
    return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const CSS = `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #e0e7ff 100%); min-height: 100vh; color: #333; }
a { text-decoration: none; color: inherit; }
.container { max-width: 1200px; margin: 0 auto; padding: 20px; }
.header { text-align: center; padding: 40px 20px; background: white; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 30px; }
.header h1 { font-size: 2.2rem; background: linear-gradient(135deg, #ec4899, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 8px; }
.header p { color: #666; font-size: 0.95rem; }
.nav { display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; padding: 16px 20px; background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 24px; }
.nav a { padding: 10px 20px; border-radius: 12px; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; background: #f3f4f6; color: #4b5563; }
.nav a:hover { background: #ec4899; color: white; transform: translateY(-2px); }
.nav a.active { background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; }
.card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); transition: transform 0.2s, box-shadow 0.2s; }
.card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
.stats { display: flex; justify-content: center; flex-wrap: wrap; gap: 20px; margin-top: 20px; }
.stat { background: linear-gradient(135deg, #fdf2f8, #f5f3ff); padding: 16px 28px; border-radius: 14px; text-align: center; }
.stat-value { font-size: 1.8rem; font-weight: 700; color: #ec4899; }
.stat-label { font-size: 0.85rem; color: #666; margin-top: 4px; }
.footer { text-align: center; padding: 40px 20px; color: #999; font-size: 0.9rem; margin-top: 40px; }
.badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.badge-pink { background: #fce7f3; color: #db2777; }
.badge-blue { background: #dbeafe; color: #2563eb; }
.badge-green { background: #d1fae5; color: #059669; }
.badge-purple { background: #ede9fe; color: #7c3aed; }
.avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #f3f4f6; }`

function nav(active: string) {
    const links = [
        { href: 'index.html', label: '🏠 首頁' },
        { href: 'photo-wall.html', label: '📸 照片牆' },
        { href: 'wedding-photos.html', label: '💒 婚紗照' },
        { href: 'photo-slideshow.html', label: '🖼️ 幻燈片' },
        { href: 'quiz-results.html', label: '❓ 問答紀錄' },
        { href: 'rankings.html', label: '🏆 排行榜' },
        { href: 'vote-records.html', label: '🗳️ 投票紀錄' },
    ]
    return `<div class="nav">${links.map(l => `<a href="${l.href}" class="${l.href === active ? 'active' : ''}">${l.label}</a>`).join('')}</div>`
}

function wrap(title: string, activeNav: string, body: string, extraCss = '') {
    const t = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
    return `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title} - 婚禮遊戲紀錄</title><style>${CSS}${extraCss}</style></head><body><div class="container">${nav(activeNav)}${body}<div class="footer">🎊 感謝所有賓客的參與與祝福 🎊<br>匯出時間：${t}</div></div></body></html>`
}

function genIndex(d: any) {
    const tv = d.photos.reduce((s: number, p: any) => s + (p.vote_count || 0), 0)
    const tb = d.photos.filter((p: any) => p.blessing_message).length
    return wrap('首頁', 'index.html', `
    <div class="header"><h1>💒 婚禮互動遊戲紀錄</h1><p>所有美好回憶，永久珍藏</p>
      <div class="stats">
        <div class="stat"><div class="stat-value">${d.users.length}</div><div class="stat-label">位賓客</div></div>
        <div class="stat"><div class="stat-value">${d.photos.length}</div><div class="stat-label">張照片</div></div>
        <div class="stat"><div class="stat-value">${tv}</div><div class="stat-label">次投票</div></div>
        <div class="stat"><div class="stat-value">${tb}</div><div class="stat-label">則祝福</div></div>
        <div class="stat"><div class="stat-value">${d.questions.length}</div><div class="stat-label">道題目</div></div>
        <div class="stat"><div class="stat-value">${d.weddingPhotos.length}</div><div class="stat-label">張婚紗照</div></div>
        <div class="stat"><div class="stat-value">${d.lotteryHistory.length}</div><div class="stat-label">次抽獎</div></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;">
      <a href="photo-wall.html" class="card" style="padding:24px;"><div style="font-size:2rem;margin-bottom:8px;">📸</div><h3 style="margin-bottom:6px;">照片牆</h3><p style="color:#666;font-size:0.9rem;">瀏覽賓客上傳的 ${d.photos.length} 張照片與祝福語</p></a>
      <a href="wedding-photos.html" class="card" style="padding:24px;"><div style="font-size:2rem;margin-bottom:8px;">💒</div><h3 style="margin-bottom:6px;">婚紗照</h3><p style="color:#666;font-size:0.9rem;">欣賞 ${d.weddingPhotos.length} 張精美婚紗照</p></a>
      <a href="photo-slideshow.html" class="card" style="padding:24px;"><div style="font-size:2rem;margin-bottom:8px;">🖼️</div><h3 style="margin-bottom:6px;">照片幻燈片</h3><p style="color:#666;font-size:0.9rem;">自動播放照片輪播</p></a>
      <a href="quiz-results.html" class="card" style="padding:24px;"><div style="font-size:2rem;margin-bottom:8px;">❓</div><h3 style="margin-bottom:6px;">問答紀錄</h3><p style="color:#666;font-size:0.9rem;">${d.questions.length} 道題目的完整答題統計</p></a>
      <a href="rankings.html" class="card" style="padding:24px;"><div style="font-size:2rem;margin-bottom:8px;">🏆</div><h3 style="margin-bottom:6px;">排行榜</h3><p style="color:#666;font-size:0.9rem;">${d.users.length} 位賓客的分數排名</p></a>
      <a href="vote-records.html" class="card" style="padding:24px;"><div style="font-size:2rem;margin-bottom:8px;">🗳️</div><h3 style="margin-bottom:6px;">投票紀錄</h3><p style="color:#666;font-size:0.9rem;">所有照片與婚紗照的投票明細</p></a>
    </div>`)
}

function genPhotoWall(d: any) {
    const cards = d.photos.map((p: any) => {
        const bl = p.blessing_message ? esc(p.blessing_message) : ''
        const time = new Date(p.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
        const media = p.media_type === 'video'
            ? `<video src="${p._localFile}" style="width:100%;display:block;" preload="metadata"></video><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.6);color:white;padding:8px 16px;border-radius:20px;font-weight:bold;">▶ 影片</div>`
            : `<img src="${p._localFile}" alt="${esc(p.uploader_name)}" style="width:100%;display:block;">`
        return `<div class="card"><div style="position:relative;"><a href="${p._localFile}" target="_blank" style="display:block;">${media}</a></div><div style="padding:14px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;"><div class="avatar" style="background:#f3f4f6;display:flex;align-items:center;justify-content:center;">👤</div><div><div style="font-weight:600;">${esc(p.uploader_name)}</div><div style="font-size:0.8rem;color:#999;">${time}</div></div></div><div style="display:flex;gap:8px;margin-bottom:10px;"><span class="badge badge-pink">❤️ ${p.vote_count} 票</span>${p.media_type === 'video' ? '<span class="badge badge-blue">🎬 影片</span>' : ''}<span class="badge ${p.is_public ? 'badge-green' : 'badge-purple'}">${p.is_public ? '公開' : '隱私'}</span></div>${bl ? `<div style="background:#fdf2f8;border-radius:10px;padding:10px;"><div style="font-size:0.8rem;color:#ec4899;margin-bottom:4px;">💬 祝福語</div><div style="color:#4b5563;line-height:1.6;white-space:pre-wrap;">${bl}</div></div>` : ''}</div></div>`
    }).join('\n')
    const tv = d.photos.reduce((s: number, p: any) => s + (p.vote_count || 0), 0)
    return wrap('照片牆', 'photo-wall.html', `<div class="header"><h1>📸 照片牆</h1><p>賓客上傳的美好回憶</p><div class="stats"><div class="stat"><div class="stat-value">${d.photos.length}</div><div class="stat-label">張照片/影片</div></div><div class="stat"><div class="stat-value">${tv}</div><div class="stat-label">總投票數</div></div><div class="stat"><div class="stat-value">${d.photos.filter((p: any) => p.blessing_message).length}</div><div class="stat-label">則祝福語</div></div></div></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;">${cards}</div>`)
}

function genWeddingPhotos(d: any) {
    if (!d.weddingPhotos.length) return wrap('婚紗照', 'wedding-photos.html', '<div class="header"><h1>💒 婚紗照</h1><p>暫無婚紗照</p></div>')
    const sorted = [...d.weddingPhotos].sort((a: any, b: any) => b.vote_count - a.vote_count)
    const cards = sorted.map((wp: any) => `<div class="card" style="break-inside:avoid;margin-bottom:20px;"><a href="${wp._localFile}" target="_blank"><img src="${wp._localFile}" alt="${esc(wp.name)}" style="width:100%;display:block;"></a><div style="padding:12px;display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:600;">${esc(wp.name)}</span><span class="badge badge-pink">❤️ ${wp.vote_count} 票</span></div></div>`).join('\n')
    const tv = d.weddingPhotos.reduce((s: number, w: any) => s + w.vote_count, 0)
    return wrap('婚紗照', 'wedding-photos.html', `<div class="header"><h1>💒 婚紗照</h1><p>依得票數排序</p><div class="stats"><div class="stat"><div class="stat-value">${d.weddingPhotos.length}</div><div class="stat-label">張婚紗照</div></div><div class="stat"><div class="stat-value">${tv}</div><div class="stat-label">總投票數</div></div></div></div><div style="columns:2;column-gap:20px;">${cards}</div>`)
}

function genSlideshow(d: any) {
    const pj = JSON.stringify(d.photos.map((p: any) => ({ localFile: p._localFile, uploaderName: p.uploader_name, blessing: p.blessing_message || '', voteCount: p.vote_count || 0, createdAt: p.created_at, mediaType: p.media_type || 'image' })))
    return `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>照片幻燈片 - 婚禮遊戲紀錄</title><style>* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #000; color: white; font-family: -apple-system, sans-serif; overflow: hidden; } #slideshow { width: 100vw; height: 100vh; position: relative; } #photo-container { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transition: opacity 0.6s ease; } #photo-container img, #photo-container video { max-width: 100%; max-height: 100%; object-fit: contain; } #info { position: absolute; top: 24px; left: 24px; max-width: 400px; transition: opacity 0.6s ease; } .info-row { display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.4); padding: 10px 16px; border-radius: 12px; backdrop-filter: blur(8px); margin-bottom: 8px; } .info-name { font-size: 1.2rem; font-weight: 700; } .info-time { font-size: 0.85rem; color: #ccc; } .info-blessing { font-size: 1rem; line-height: 1.5; } #vote-badge { position: absolute; top: 24px; right: 24px; background: rgba(0,0,0,0.4); padding: 12px 24px; border-radius: 16px; display: flex; align-items: center; gap: 12px; backdrop-filter: blur(8px); } #vote-count { font-size: 2.5rem; font-weight: 700; } #counter { position: absolute; bottom: 24px; left: 24px; background: rgba(0,0,0,0.5); padding: 8px 16px; border-radius: 10px; font-size: 1rem; backdrop-filter: blur(8px); } #controls { position: absolute; bottom: 24px; right: 24px; display: flex; gap: 12px; } .ctrl-btn { background: rgba(255,255,255,0.9); border: none; padding: 12px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; } .ctrl-btn:hover { transform: scale(1.1); } .back-link { position: absolute; top: 24px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.4); padding: 8px 20px; border-radius: 10px; color: white; text-decoration: none; font-size: 0.85rem; backdrop-filter: blur(8px); opacity: 0; transition: opacity 0.3s; } body:hover .back-link { opacity: 1; }</style></head><body><div id="slideshow"><div id="photo-container"></div><div id="info"></div><div id="vote-badge"><span style="font-size:2rem;">❤️</span><span id="vote-count">0</span></div><div id="counter"></div><div id="controls"><button class="ctrl-btn" onclick="prev()">◀</button><button class="ctrl-btn" id="playBtn" onclick="togglePlay()">⏸</button><button class="ctrl-btn" onclick="next()">▶</button></div><a href="index.html" class="back-link">↩ 返回首頁</a></div><script>const photos=${pj};let idx=0,playing=true,timer=null;const container=document.getElementById('photo-container'),info=document.getElementById('info'),voteCount=document.getElementById('vote-count'),counter=document.getElementById('counter'),playBtn=document.getElementById('playBtn');function show(i){if(!photos.length)return;idx=((i%photos.length)+photos.length)%photos.length;const p=photos[idx];container.style.opacity=0;info.style.opacity=0;setTimeout(()=>{if(p.mediaType==='video'){container.innerHTML='<video src="'+p.localFile+'" controls autoplay style="max-width:100%;max-height:100%;"></video>';}else{container.innerHTML='<img src="'+p.localFile+'" alt="">';}let html='<div class="info-row"><div><div class="info-name">'+p.uploaderName+'</div><div class="info-time">'+new Date(p.createdAt).toLocaleString('zh-TW')+'</div></div></div>';if(p.blessing)html+='<div class="info-row"><div class="info-blessing">'+p.blessing+'</div></div>';info.innerHTML=html;voteCount.textContent=p.voteCount;counter.textContent=(idx+1)+' / '+photos.length;container.style.opacity=1;info.style.opacity=1;},400);}function next(){show(idx+1);resetTimer();}function prev(){show(idx-1);resetTimer();}function togglePlay(){playing=!playing;playBtn.textContent=playing?'⏸':'▶';if(playing)startTimer();else clearInterval(timer);}function startTimer(){timer=setInterval(()=>show(idx+1),5000);}function resetTimer(){clearInterval(timer);if(playing)startTimer();}show(0);startTimer();document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')next();else if(e.key==='ArrowLeft')prev();else if(e.key===' '){e.preventDefault();togglePlay();}});</script></body></html>`
}

function genQuizResults(d: any) {
    const cards = d.questions.map((q: any) => {
        const records = d.answerRecords.filter((r: any) => r.question_id === q.id)
        const total = records.length
        const correct = records.filter((r: any) => r.is_correct).length
        const rate = total > 0 ? Math.round((correct / total) * 100) : 0
        const oc: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
        records.forEach((r: any) => { if (r.selected_answer) oc[r.selected_answer]++ })
        const opts = [{ k: 'A', t: q.option_a }, { k: 'B', t: q.option_b }, { k: 'C', t: q.option_c }, { k: 'D', t: q.option_d }]
        const oh = opts.map(o => {
            const c = oc[o.k]; const p = total > 0 ? Math.round((c / total) * 100) : 0; const ic = o.k === q.correct_answer
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;margin-bottom:6px;background:${ic ? '#d1fae5' : '#f9fafb'};border:2px solid ${ic ? '#10b981' : '#e5e7eb'};"><span style="font-weight:700;color:${ic ? '#059669' : '#6b7280'};min-width:24px;">${o.k}</span><span style="flex:1;">${esc(o.t || '')}</span><span style="font-size:0.85rem;color:#999;">${c}人 (${p}%)</span>${ic ? '<span style="color:#10b981;">✓</span>' : ''}</div>`
        }).join('')

        // 每位賓客的個別答案
        const individualRows = records.map((r: any) => {
            const userName = r.user?.display_name || '未知用戶'
            const answer = r.selected_answer || '?'
            const isCorrect = r.is_correct
            const time = new Date(r.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
            const answerTime = r.answer_time ? `${(r.answer_time / 1000).toFixed(1)}秒` : ''
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #f3f4f6;">
              <div style="width:28px;height:28px;border-radius:50%;background:${isCorrect ? '#d1fae5' : '#fef2f2'};display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:${isCorrect ? '#059669' : '#dc2626'};">${answer}</div>
              <div style="flex:1;font-weight:500;">${esc(userName)}</div>
              ${answerTime ? `<span style="font-size:0.8rem;color:#999;">⏱ ${answerTime}</span>` : ''}
              <span style="font-size:0.8rem;font-weight:600;color:${isCorrect ? '#059669' : '#dc2626'};">${isCorrect ? '✓ 正確' : '✗ 錯誤'}</span>
              <div style="font-size:0.75rem;color:#999;min-width:80px;text-align:right;">${time}</div>
            </div>`
        }).join('')

        const individualSection = records.length > 0
            ? `<div style="margin-top:14px;border-top:2px solid #f3f4f6;padding-top:12px;"><div style="font-size:0.9rem;font-weight:600;color:#4b5563;margin-bottom:8px;">📝 每位賓客的答案 (${records.length}人)</div>${individualRows}</div>`
            : ''

        return `<div class="card" style="padding:20px;margin-bottom:20px;"><div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:14px;"><h3 style="font-size:1.1rem;flex:1;">${esc(q.question_text || '')}</h3><span class="badge ${rate >= 50 ? 'badge-green' : 'badge-pink'}">${rate}% 正確率</span></div>${oh}<div style="margin-top:10px;font-size:0.85rem;color:#999;">${total} 人作答 · 分數 ${q.points || q.base_score || 10} 分 · 時限 ${q.time_limit || 30} 秒</div>${individualSection}</div>`
    }).join('\n')
    return wrap('問答紀錄', 'quiz-results.html', `<div class="header"><h1>❓ 問答紀錄</h1><p>所有題目的答題統計</p><div class="stats"><div class="stat"><div class="stat-value">${d.questions.length}</div><div class="stat-label">道題目</div></div><div class="stat"><div class="stat-value">${d.answerRecords.length}</div><div class="stat-label">筆答題記錄</div></div></div></div>${cards}`)
}

function getScore(u: any) {
    if (u.total_score) return u.total_score
    return (u.quiz_score || 0) + (u.vote_score || 0) + (u.upload_score || 0) + (u.bonus_score || 0)
}

function genRankings(d: any) {
    const sorted = [...d.users].sort((a: any, b: any) => getScore(b) - getScore(a))
    const rows = sorted.map((u: any, i: number) => {
        const r = i + 1; const m = r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `${r}`
        const bg = r <= 3 ? 'background:linear-gradient(135deg,#fdf2f8,#faf5ff);' : ''
        const score = getScore(u)
        const quizScore = u.quiz_score || 0
        const voteScore = u.vote_score || 0
        return `<div class="card" style="padding:14px 20px;margin-bottom:10px;display:flex;align-items:center;gap:14px;${bg}"><div style="font-size:1.4rem;min-width:36px;text-align:center;font-weight:700;">${m}</div><div class="avatar" style="background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:0.8rem;">👤</div><div style="flex:1;"><div style="font-weight:600;">${esc(u.display_name || '匿名')}</div><div style="font-size:0.75rem;color:#999;">答題 ${quizScore} · 投票 ${voteScore}</div></div><div style="text-align:right;"><div style="font-size:1.3rem;font-weight:700;color:#ec4899;">${score}</div><div style="font-size:0.75rem;color:#999;">分</div></div></div>`
    }).join('\n')
    let lottery = ''
    if (d.lotteryHistory.length > 0) {
        const lr = d.lotteryHistory.map((l: any, i: number) => {
            const t = new Date(l.draw_time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
            return `<div class="card" style="padding:14px 20px;margin-bottom:10px;display:flex;align-items:center;gap:14px;"><div style="font-size:1.4rem;">🎉</div><div style="flex:1;"><div style="font-weight:600;">${esc(l.winner_display_name || '')}</div><div style="font-size:0.8rem;color:#999;">${t}</div></div><span class="badge badge-pink">第 ${d.lotteryHistory.length - i} 位中獎</span></div>`
        }).join('\n')
        lottery = `<h2 style="font-size:1.3rem;margin:30px 0 16px;">🎰 抽獎記錄</h2>${lr}`
    }
    const topScore = sorted.length > 0 ? getScore(sorted[0]) : 0
    return wrap('排行榜', 'rankings.html', `<div class="header"><h1>🏆 排行榜</h1><p>賓客分數排名</p><div class="stats"><div class="stat"><div class="stat-value">${d.users.length}</div><div class="stat-label">位賓客</div></div><div class="stat"><div class="stat-value">${topScore}</div><div class="stat-label">最高分</div></div></div></div>${rows}${lottery}`)
}

function genVoteRecords(d: any) {
    const vbp: Record<number, any[]> = {}
    d.photoVotes.forEach((v: any) => { if (!vbp[v.photo_id]) vbp[v.photo_id] = []; vbp[v.photo_id].push(v) })
    const spIds = Object.keys(vbp).map(Number).sort((a, b) => (vbp[b]?.length || 0) - (vbp[a]?.length || 0))
    const pvc = spIds.map(pid => {
        const votes = vbp[pid]; const photo = d.photos.find((p: any) => p.id === pid)
        const un = photo ? esc(photo.uploader_name) : `照片 #${pid}`; const ps = photo?._localFile || ''
        const vr = votes.map((v: any) => {
            const vn = v.voter?.display_name || '未知用戶'; const t = new Date(v.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #f3f4f6;"><div style="width:28px;height:28px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">👤</div><div style="flex:1;font-weight:500;">${esc(vn)}</div><div style="font-size:0.8rem;color:#999;">${t}</div></div>`
        }).join('')
        return `<div class="card" style="margin-bottom:20px;"><div style="display:flex;align-items:center;gap:14px;padding:16px;border-bottom:2px solid #f3f4f6;">${ps ? `<img src="${ps}" style="width:60px;height:60px;object-fit:cover;border-radius:10px;">` : ''}<div style="flex:1;"><div style="font-weight:700;font-size:1.05rem;">${un} 的照片</div><div style="font-size:0.85rem;color:#999;">照片 #${pid}</div></div><span class="badge badge-pink" style="font-size:0.9rem;padding:6px 14px;">❤️ ${votes.length} 票</span></div><div>${vr}</div></div>`
    }).join('')

    const vbw: Record<string, any[]> = {}
    d.weddingVotes.forEach((v: any) => { if (!vbw[v.photo_id]) vbw[v.photo_id] = []; vbw[v.photo_id].push(v) })
    const swIds = Object.keys(vbw).sort((a, b) => (vbw[b]?.length || 0) - (vbw[a]?.length || 0))
    const wvc = swIds.map(pid => {
        const votes = vbw[pid]; const wp = d.weddingPhotos.find((w: any) => w.id === pid)
        const wn = wp ? esc(wp.name) : `婚紗照 ${pid.substring(0, 8)}...`; const ws = wp?._localFile || ''
        const vr = votes.map((v: any) => {
            const vn = v.voter?.display_name || '未知用戶'; const t = new Date(v.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #f3f4f6;"><div style="width:28px;height:28px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">👤</div><div style="flex:1;font-weight:500;">${esc(vn)}</div><div style="font-size:0.8rem;color:#999;">${t}</div></div>`
        }).join('')
        return `<div class="card" style="margin-bottom:20px;"><div style="display:flex;align-items:center;gap:14px;padding:16px;border-bottom:2px solid #f3f4f6;">${ws ? `<img src="${ws}" style="width:60px;height:60px;object-fit:cover;border-radius:10px;">` : ''}<div style="flex:1;"><div style="font-weight:700;font-size:1.05rem;">${wn}</div></div><span class="badge badge-purple" style="font-size:0.9rem;padding:6px 14px;">💒 ${votes.length} 票</span></div><div>${vr}</div></div>`
    }).join('')

    const uvs: Record<string, { name: string, pv: number, wv: number }> = {}
    d.photoVotes.forEach((v: any) => { const n = v.voter?.display_name || '未知用戶'; const k = v.voter_line_id || n; if (!uvs[k]) uvs[k] = { name: n, pv: 0, wv: 0 }; uvs[k].pv++ })
    d.weddingVotes.forEach((v: any) => { const n = v.voter?.display_name || '未知用戶'; const k = v.voter_line_id || n; if (!uvs[k]) uvs[k] = { name: n, pv: 0, wv: 0 }; uvs[k].wv++ })
    const su = Object.values(uvs).sort((a, b) => (b.pv + b.wv) - (a.pv + a.wv))
    const usr = su.map(u => `<div class="card" style="padding:12px 20px;margin-bottom:8px;display:flex;align-items:center;gap:12px;"><div style="width:32px;height:32px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;">👤</div><div style="flex:1;font-weight:600;">${esc(u.name)}</div><span class="badge badge-pink">📸 ${u.pv}</span><span class="badge badge-purple">💒 ${u.wv}</span><span class="badge badge-blue">合計 ${u.pv + u.wv}</span></div>`).join('')

    return wrap('投票紀錄', 'vote-records.html', `<div class="header"><h1>🗳️ 投票紀錄</h1><p>所有照片與婚紗照的投票明細</p><div class="stats"><div class="stat"><div class="stat-value">${d.photoVotes.length}</div><div class="stat-label">照片投票</div></div><div class="stat"><div class="stat-value">${d.weddingVotes.length}</div><div class="stat-label">婚紗照投票</div></div><div class="stat"><div class="stat-value">${su.length}</div><div class="stat-label">位投票者</div></div></div></div><h2 style="font-size:1.3rem;margin:24px 0 16px;">👤 用戶投票統計</h2>${usr}<h2 style="font-size:1.3rem;margin:30px 0 16px;">📸 照片投票明細</h2>${pvc || '<div class="card" style="padding:24px;text-align:center;color:#999;">暫無照片投票記錄</div>'}<h2 style="font-size:1.3rem;margin:30px 0 16px;">💒 婚紗照投票明細</h2>${wvc || '<div class="card" style="padding:24px;text-align:center;color:#999;">暫無婚紗照投票記錄</div>'}`)
}

// ===============================================================
// 主頁面元件
// ===============================================================

export default function ExportPage() {
    const [status, setStatus] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle')
    const [step, setStep] = useState('')
    const [percent, setPercent] = useState(0)
    const [elapsedTime, setElapsedTime] = useState(0)
    const [errorMsg, setErrorMsg] = useState('')
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const downloadUrlRef = useRef<string | null>(null)

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current)
        }
    }, [])

    async function fetchBlob(url: string): Promise<ArrayBuffer | null> {
        try {
            const r = await fetch(url)
            if (!r.ok) return null
            return await r.arrayBuffer()
        } catch { return null }
    }

    const startExport = async () => {
        setStatus('exporting')
        setStep('正在連接資料庫...')
        setPercent(3)
        setElapsedTime(0)
        setErrorMsg('')

        const startTime = Date.now()
        timerRef.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
        }, 1000)

        try {
            // 1. 抓取資料
            setStep('正在抓取資料庫資料...')
            setPercent(5)
            const res = await fetch('/api/admin/export-data')
            if (!res.ok) throw new Error(`資料抓取失敗 (HTTP ${res.status})`)
            const data = await res.json()
            if (data.error) throw new Error(data.error)

            setStep(`已取得 ${data.users.length} 位用戶、${data.photos.length} 張照片`)
            setPercent(15)

            const zip = new JSZip()
            const totalFiles = data.photos.length + data.weddingPhotos.length
            let downloaded = 0

            // 2. 下載賓客照片
            setStep(`正在下載賓客照片 (0/${data.photos.length})...`)
            setPercent(18)
            for (let i = 0; i < data.photos.length; i++) {
                const photo = data.photos[i]
                const ext = photo.media_type === 'video' ? 'mp4' : 'jpg'
                const filename = `photo_${String(i + 1).padStart(3, '0')}.${ext}`
                photo._localFile = `photos/${filename}`

                const buf = await fetchBlob(photo.image_url)
                if (buf) zip.file(`photos/${filename}`, buf)

                downloaded++
                if (i % 3 === 0 || i === data.photos.length - 1) {
                    const pct = 18 + Math.round((downloaded / Math.max(totalFiles, 1)) * 52)
                    setPercent(pct)
                    setStep(`正在下載賓客照片 (${i + 1}/${data.photos.length})...`)
                }
            }

            // 3. 下載婚紗照（透過 proxy 繞過 CORS）
            setStep(`正在下載婚紗照 (0/${data.weddingPhotos.length})...`)
            for (let i = 0; i < data.weddingPhotos.length; i++) {
                const wp = data.weddingPhotos[i]
                const filename = `wedding_${String(i + 1).padStart(3, '0')}.jpg`
                wp._localFile = `wedding-photos/${filename}`

                // 使用 proxy 繞過 Google Drive CORS 限制
                const proxyUrl = `/api/admin/export-proxy?url=${encodeURIComponent(wp.url)}`
                const buf = await fetchBlob(proxyUrl)
                if (buf) zip.file(`wedding-photos/${filename}`, buf)

                downloaded++
                if (i % 3 === 0 || i === data.weddingPhotos.length - 1) {
                    const pct = 18 + Math.round((downloaded / Math.max(totalFiles, 1)) * 52)
                    setPercent(pct)
                    setStep(`正在下載婚紗照 (${i + 1}/${data.weddingPhotos.length})...`)
                }
            }

            // 4. 生成 HTML 頁面
            setStep('正在生成 HTML 頁面...')
            setPercent(75)
            zip.file('index.html', genIndex(data))
            zip.file('photo-wall.html', genPhotoWall(data))
            zip.file('wedding-photos.html', genWeddingPhotos(data))
            zip.file('photo-slideshow.html', genSlideshow(data))
            zip.file('quiz-results.html', genQuizResults(data))
            zip.file('rankings.html', genRankings(data))
            zip.file('vote-records.html', genVoteRecords(data))

            // 5. data.json
            zip.file('data.json', JSON.stringify({
                exportedAt: new Date().toISOString(),
                users: data.users, photos: data.photos,
                questions: data.questions, answerRecords: data.answerRecords,
                gameState: data.gameState, lotteryHistory: data.lotteryHistory,
                photoVotes: data.photoVotes, weddingVotes: data.weddingVotes,
                weddingPhotos: data.weddingPhotos,
            }, null, 2))

            // 6. 打包
            setStep('正在打包 ZIP 檔案...')
            setPercent(85)
            const blob = await zip.generateAsync(
                { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 5 } },
                (metadata) => {
                    setPercent(85 + Math.round(metadata.percent * 0.14))
                }
            )

            downloadUrlRef.current = URL.createObjectURL(blob)
            setPercent(100)
            setStep('匯出完成！')
            setStatus('done')
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : '未知錯誤')
            setStatus('error')
        } finally {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }

    const doDownload = () => {
        if (downloadUrlRef.current) {
            const a = document.createElement('a')
            a.href = downloadUrlRef.current
            a.download = `wedding-game-offline-${new Date().toISOString().split('T')[0]}.zip`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        }
    }

    const fmtTime = (s: number) => {
        const m = Math.floor(s / 60); const sec = s % 60
        return m > 0 ? `${m}分${String(sec).padStart(2, '0')}秒` : `${sec}秒`
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #e0e7ff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: '20px',
        }}>
            <div style={{
                background: 'white', borderRadius: '24px', padding: '40px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                maxWidth: '500px', width: '100%', textAlign: 'center',
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
                <h1 style={{
                    fontSize: '1.6rem', fontWeight: 700, marginBottom: '8px',
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>離線匯出</h1>
                <p style={{ color: '#666', marginBottom: '30px', fontSize: '0.95rem' }}>
                    匯出所有遊戲資料為離線 HTML 頁面
                </p>

                {status === 'idle' && (
                    <div>
                        <div style={{ background: '#f9fafb', borderRadius: '14px', padding: '20px', marginBottom: '24px', textAlign: 'left', fontSize: '0.9rem', color: '#555', lineHeight: 1.8 }}>
                            <div style={{ fontWeight: 600, marginBottom: '10px' }}>📋 匯出內容包含：</div>
                            <div>👤 用戶與排行榜</div>
                            <div>📸 照片牆與祝福語</div>
                            <div>💒 婚紗照</div>
                            <div>❓ 問答紀錄</div>
                            <div>🗳️ 投票紀錄明細</div>
                            <div>🎰 抽獎紀錄</div>
                            <div>🖼️ 照片幻燈片</div>
                        </div>
                        <button onClick={startExport} style={{
                            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', color: 'white', border: 'none',
                            padding: '14px 40px', borderRadius: '14px', fontSize: '1.1rem', fontWeight: 700,
                            cursor: 'pointer', boxShadow: '0 4px 15px rgba(236,72,153,0.3)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                        >🚀 開始匯出</button>
                    </div>
                )}

                {status === 'exporting' && (
                    <div>
                        <div style={{ background: '#f3f4f6', borderRadius: '10px', height: '16px', overflow: 'hidden', marginBottom: '16px' }}>
                            <div style={{
                                height: '100%', borderRadius: '10px',
                                background: 'linear-gradient(90deg, #ec4899, #8b5cf6, #ec4899)',
                                backgroundSize: '200% 100%',
                                width: `${percent}%`, transition: 'width 0.5s ease',
                                animation: 'shimmer 2s linear infinite',
                            }} />
                        </div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '8px' }}>{percent}%</div>
                        <div style={{ color: '#555', fontSize: '1rem', marginBottom: '14px', fontWeight: 500 }}>{step}</div>
                        <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '20px' }}>⏱️ 已經過 {fmtTime(elapsedTime)}</div>
                        <div><div style={{ display: 'inline-block', width: '44px', height: '44px', border: '4px solid #f3f4f6', borderTopColor: '#ec4899', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>
                        <p style={{ marginTop: '16px', color: '#bbb', fontSize: '0.8rem' }}>匯出過程可能需要數分鐘，請勿關閉此頁面</p>
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
                    </div>
                )}

                {status === 'done' && (
                    <div>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#059669', marginBottom: '8px' }}>匯出完成！</div>
                        <div style={{ color: '#666', fontSize: '0.95rem', marginBottom: '24px' }}>耗時 {fmtTime(elapsedTime)}</div>
                        <button onClick={doDownload} style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none',
                            padding: '16px 44px', borderRadius: '14px', fontSize: '1.15rem', fontWeight: 700,
                            cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                            transition: 'transform 0.2s', marginBottom: '16px',
                        }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >📥 下載 ZIP 檔案</button>
                        <div style={{ marginTop: '14px' }}>
                            <button onClick={() => { setStatus('idle'); downloadUrlRef.current = null; setPercent(0) }} style={{
                                background: 'transparent', border: '2px solid #e5e7eb',
                                padding: '10px 24px', borderRadius: '10px', fontSize: '0.9rem', cursor: 'pointer', color: '#666',
                            }}>🔄 重新匯出</button>
                        </div>
                        <p style={{ marginTop: '20px', fontSize: '0.85rem', color: '#999', lineHeight: 1.6 }}>
                            下載 ZIP 後解壓縮<br />打開 <b>index.html</b> 即可離線瀏覽所有頁面
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#dc2626', marginBottom: '8px' }}>匯出失敗</div>
                        <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '14px', marginBottom: '20px', color: '#991b1b', fontSize: '0.9rem', wordBreak: 'break-all' }}>{errorMsg}</div>
                        <button onClick={() => { setStatus('idle'); setPercent(0) }} style={{
                            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', color: 'white', border: 'none',
                            padding: '12px 30px', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                        }}>🔄 重試</button>
                    </div>
                )}
            </div>
        </div>
    )
}
