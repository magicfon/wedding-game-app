#!/usr/bin/env node
/**
 * 離線 HTML 匯出腳本
 * 將婚禮遊戲 App 的所有資料和照片打包成可離線瀏覽的 HTML
 *
 * 使用方式: npm run export-offline
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import archiver from 'archiver'

// 載入 .env.local
config({ path: path.join(process.cwd(), '.env.local') })

// ============================================================
// 設定
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GOOGLE_DRIVE_FOLDER_ID = '1ONhhVIoewh3he9mT4ie0llGi_urQh5Kw'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少環境變數 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  console.error('請確認 .env.local 檔案已正確設定')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const timestamp = new Date().toISOString().split('T')[0]
const OUTPUT_DIR = path.join(process.cwd(), `wedding-game-offline-${timestamp}`)
const ZIP_FILE = `${OUTPUT_DIR}.zip`

// ============================================================
// 工具函數
// ============================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function downloadFile(url: string, filepath: string): Promise<boolean> {
  try {
    const response = await fetch(url)
    if (!response.ok) return false
    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(filepath, buffer)
    return true
  } catch {
    return false
  }
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// ============================================================
// 資料抓取
// ============================================================

interface ExportData {
  users: any[]
  photos: any[]
  questions: any[]
  answerRecords: any[]
  gameState: any
  lotteryHistory: any[]
  weddingPhotos: { id: string; url: string; thumbnailUrl: string; name: string; vote_count: number }[]
}

async function fetchAllData(): Promise<ExportData> {
  console.log('\n📦 開始從 Supabase 抓取資料...')
  console.log(`  🔗 Supabase URL: ${SUPABASE_URL}`)
  console.log(`  🔑 Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`)

  // 1. 用戶
  console.log('  👤 抓取用戶資料...')
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('total_score', { ascending: false })
  if (usersError) console.error('     ❌ users 錯誤:', usersError.message, usersError.details, usersError.hint)
  console.log(`     找到 ${users?.length || 0} 位用戶`)

  // 2. 照片 + 上傳者
  console.log('  📸 抓取照片資料...')
  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select(`
      id, image_url, blessing_message, is_public, vote_count,
      created_at, media_type, user_id,
      thumbnail_small_url, thumbnail_medium_url, thumbnail_large_url,
      uploader:users!photos_user_id_fkey(display_name, avatar_url)
    `)
    .order('created_at', { ascending: false })
  if (photosError) console.error('     ❌ photos 錯誤:', photosError.message, photosError.details, photosError.hint)
  console.log(`     找到 ${photos?.length || 0} 張照片`)

  // 3. 問題
  console.log('  ❓ 抓取問答題目...')
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('*')
    .order('display_order', { ascending: true })
  if (questionsError) console.error('     ❌ questions 錯誤:', questionsError.message, questionsError.details, questionsError.hint)
  console.log(`     找到 ${questions?.length || 0} 道題目`)

  // 4. 答題記錄
  console.log('  📝 抓取答題記錄...')
  const { data: answerRecords, error: answersError } = await supabase
    .from('answer_records')
    .select(`
      *,
      user:users!answer_records_user_line_id_fkey(display_name, avatar_url)
    `)
    .order('created_at', { ascending: false })
  if (answersError) console.error('     ❌ answer_records 錯誤:', answersError.message, answersError.details, answersError.hint)
  console.log(`     找到 ${answerRecords?.length || 0} 筆答題記錄`)

  // 5. 遊戲狀態
  console.log('  🎮 抓取遊戲狀態...')
  const { data: gameState, error: gameStateError } = await supabase
    .from('game_state')
    .select('*')
    .single()
  if (gameStateError) console.error('     ❌ game_state 錯誤:', gameStateError.message, gameStateError.details, gameStateError.hint)

  // 6. 抽獎歷史
  console.log('  🎰 抓取抽獎歷史...')
  const { data: lotteryHistory, error: lotteryError } = await supabase
    .from('lottery_history')
    .select('*')
    .order('draw_time', { ascending: false })
  if (lotteryError) console.error('     ❌ lottery_history 錯誤:', lotteryError.message, lotteryError.details, lotteryError.hint)
  console.log(`     找到 ${lotteryHistory?.length || 0} 筆抽獎記錄`)

  // 7. 婚紗照（從 Google Drive）
  console.log('  💒 抓取婚紗照列表...')
  let weddingPhotos: ExportData['weddingPhotos'] = []
  try {
    const folderUrl = `https://drive.google.com/embeddedfolderview?id=${GOOGLE_DRIVE_FOLDER_ID}#grid`
    const response = await fetch(folderUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    if (response.ok) {
      const html = await response.text()
      const fileIds: string[] = []
      const fileIdRegex = /data-id="([a-zA-Z0-9_-]+)"/g
      let match
      while ((match = fileIdRegex.exec(html)) !== null) {
        if (match[1] && !fileIds.includes(match[1]) && match[1] !== GOOGLE_DRIVE_FOLDER_ID) {
          fileIds.push(match[1])
        }
      }
      const imgSrcRegex = /\/d\/([a-zA-Z0-9_-]+)\//g
      while ((match = imgSrcRegex.exec(html)) !== null) {
        if (match[1] && !fileIds.includes(match[1]) && match[1] !== GOOGLE_DRIVE_FOLDER_ID) {
          fileIds.push(match[1])
        }
      }

      // 獲取婚紗照投票數
      let voteCounts: Record<string, number> = {}
      try {
        const { data: votes } = await supabase.from('wedding_photo_votes').select('photo_id')
        if (votes) {
          votes.forEach((v: any) => { voteCounts[v.photo_id] = (voteCounts[v.photo_id] || 0) + 1 })
        }
      } catch { /* ignore */ }

      weddingPhotos = fileIds.map((id, index) => ({
        id,
        name: `婚紗照 ${index + 1}`,
        url: `https://drive.google.com/thumbnail?id=${id}&sz=w1920`,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${id}&sz=w400`,
        vote_count: voteCounts[id] || 0
      }))
      console.log(`     找到 ${weddingPhotos.length} 張婚紗照`)
    }
  } catch (e) {
    console.log('     ⚠️ 無法從 Google Drive 抓取婚紗照，跳過')
  }

  return {
    users: users || [],
    photos: (photos || []).map((p: any) => ({
      ...p,
      uploader: Array.isArray(p.uploader) ? p.uploader[0] : p.uploader
    })),
    questions: questions || [],
    answerRecords: (answerRecords || []).map((r: any) => ({
      ...r,
      user: Array.isArray(r.user) ? r.user[0] : r.user
    })),
    gameState,
    lotteryHistory: lotteryHistory || [],
    weddingPhotos
  }
}

// ============================================================
// 照片下載
// ============================================================

async function downloadPhotos(data: ExportData) {
  const photosDir = path.join(OUTPUT_DIR, 'photos')
  const weddingDir = path.join(OUTPUT_DIR, 'wedding-photos')
  const avatarsDir = path.join(OUTPUT_DIR, 'avatars')
  ensureDir(photosDir)
  ensureDir(weddingDir)
  ensureDir(avatarsDir)

  // 下載賓客照片
  console.log('\n📥 下載賓客照片...')
  for (let i = 0; i < data.photos.length; i++) {
    const photo = data.photos[i]
    const ext = photo.media_type === 'video' ? 'mp4' : 'jpg'
    const filename = `photo_${String(i + 1).padStart(3, '0')}.${ext}`
    process.stdout.write(`  [${i + 1}/${data.photos.length}] ${filename}...`)
    const ok = await downloadFile(photo.image_url, path.join(photosDir, filename))
    console.log(ok ? ' ✅' : ' ❌')
    photo._localFile = `photos/${filename}`
  }

  // 下載婚紗照
  console.log('\n📥 下載婚紗照...')
  for (let i = 0; i < data.weddingPhotos.length; i++) {
    const wp = data.weddingPhotos[i]
    const filename = `wedding_${String(i + 1).padStart(3, '0')}.jpg`
    process.stdout.write(`  [${i + 1}/${data.weddingPhotos.length}] ${filename}...`)
    const ok = await downloadFile(wp.url, path.join(weddingDir, filename))
    console.log(ok ? ' ✅' : ' ❌')
      ; (wp as any)._localFile = `wedding-photos/${filename}`
  }

  // 下載用戶頭像
  console.log('\n📥 下載用戶頭像...')
  const avatarMap: Record<string, string> = {}
  for (let i = 0; i < data.users.length; i++) {
    const user = data.users[i]
    if (!user.avatar_url) continue
    const filename = `avatar_${String(i + 1).padStart(3, '0')}.jpg`
    const ok = await downloadFile(user.avatar_url, path.join(avatarsDir, filename))
    if (ok) avatarMap[user.line_id] = `avatars/${filename}`
  }
  console.log(`  下載了 ${Object.keys(avatarMap).length} 個頭像`)

  return avatarMap
}

// ============================================================
// 共用 CSS
// ============================================================

const COMMON_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #e0e7ff 100%);
  min-height: 100vh;
  color: #333;
}
a { text-decoration: none; color: inherit; }
.container { max-width: 1200px; margin: 0 auto; padding: 20px; }
.header {
  text-align: center; padding: 40px 20px; background: white;
  border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  margin-bottom: 30px;
}
.header h1 {
  font-size: 2.2rem;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; margin-bottom: 8px;
}
.header p { color: #666; font-size: 0.95rem; }
.nav {
  display: flex; justify-content: center; flex-wrap: wrap;
  gap: 12px; padding: 16px 20px; background: white;
  border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  margin-bottom: 24px;
}
.nav a {
  padding: 10px 20px; border-radius: 12px; font-weight: 600;
  font-size: 0.9rem; transition: all 0.2s;
  background: #f3f4f6; color: #4b5563;
}
.nav a:hover { background: #ec4899; color: white; transform: translateY(-2px); }
.nav a.active { background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; }
.card {
  background: white; border-radius: 16px; overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}
.card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
.stats {
  display: flex; justify-content: center; flex-wrap: wrap;
  gap: 20px; margin-top: 20px;
}
.stat {
  background: linear-gradient(135deg, #fdf2f8, #f5f3ff);
  padding: 16px 28px; border-radius: 14px; text-align: center;
}
.stat-value { font-size: 1.8rem; font-weight: 700; color: #ec4899; }
.stat-label { font-size: 0.85rem; color: #666; margin-top: 4px; }
.footer {
  text-align: center; padding: 40px 20px; color: #999;
  font-size: 0.9rem; margin-top: 40px;
}
.badge {
  display: inline-block; padding: 3px 10px; border-radius: 20px;
  font-size: 0.75rem; font-weight: 600;
}
.badge-pink { background: #fce7f3; color: #db2777; }
.badge-blue { background: #dbeafe; color: #2563eb; }
.badge-green { background: #d1fae5; color: #059669; }
.badge-purple { background: #ede9fe; color: #7c3aed; }
.avatar {
  width: 40px; height: 40px; border-radius: 50%;
  object-fit: cover; border: 2px solid #f3f4f6;
}
`

function navHtml(active: string) {
  const links = [
    { href: 'index.html', label: '🏠 首頁' },
    { href: 'photo-wall.html', label: '📸 照片牆' },
    { href: 'wedding-photos.html', label: '💒 婚紗照' },
    { href: 'photo-slideshow.html', label: '🖼️ 幻燈片' },
    { href: 'quiz-results.html', label: '❓ 問答紀錄' },
    { href: 'rankings.html', label: '🏆 排行榜' },
  ]
  return `<div class="nav">${links.map(l =>
    `<a href="${l.href}" class="${l.href === active ? 'active' : ''}">${l.label}</a>`
  ).join('')}</div>`
}

function wrapPage(title: string, activeNav: string, bodyContent: string, extraCss = '') {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - 婚禮遊戲紀錄</title>
  <style>${COMMON_CSS}${extraCss}</style>
</head>
<body>
  <div class="container">
    ${navHtml(activeNav)}
    ${bodyContent}
    <div class="footer">🎊 感謝所有賓客的參與與祝福 🎊<br>匯出時間：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</div>
  </div>
</body>
</html>`
}

// ============================================================
// 各頁面產生
// ============================================================

function generateIndexPage(data: ExportData): string {
  const totalVotes = data.photos.reduce((s: number, p: any) => s + (p.vote_count || 0), 0)
  const totalBlessings = data.photos.filter((p: any) => p.blessing_message).length

  return wrapPage('首頁', 'index.html', `
    <div class="header">
      <h1>💒 婚禮互動遊戲紀錄</h1>
      <p>所有美好回憶，永久珍藏</p>
      <div class="stats">
        <div class="stat"><div class="stat-value">${data.users.length}</div><div class="stat-label">位賓客</div></div>
        <div class="stat"><div class="stat-value">${data.photos.length}</div><div class="stat-label">張照片</div></div>
        <div class="stat"><div class="stat-value">${totalVotes}</div><div class="stat-label">次投票</div></div>
        <div class="stat"><div class="stat-value">${totalBlessings}</div><div class="stat-label">則祝福</div></div>
        <div class="stat"><div class="stat-value">${data.questions.length}</div><div class="stat-label">道題目</div></div>
        <div class="stat"><div class="stat-value">${data.weddingPhotos.length}</div><div class="stat-label">張婚紗照</div></div>
        <div class="stat"><div class="stat-value">${data.lotteryHistory.length}</div><div class="stat-label">次抽獎</div></div>
      </div>
    </div>
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:20px;">
      <a href="photo-wall.html" class="card" style="padding:24px;">
        <div style="font-size:2rem; margin-bottom:8px;">📸</div>
        <h3 style="margin-bottom:6px;">照片牆</h3>
        <p style="color:#666; font-size:0.9rem;">瀏覽賓客上傳的 ${data.photos.length} 張照片與祝福語</p>
      </a>
      <a href="wedding-photos.html" class="card" style="padding:24px;">
        <div style="font-size:2rem; margin-bottom:8px;">💒</div>
        <h3 style="margin-bottom:6px;">婚紗照</h3>
        <p style="color:#666; font-size:0.9rem;">欣賞 ${data.weddingPhotos.length} 張精美婚紗照</p>
      </a>
      <a href="photo-slideshow.html" class="card" style="padding:24px;">
        <div style="font-size:2rem; margin-bottom:8px;">🖼️</div>
        <h3 style="margin-bottom:6px;">照片幻燈片</h3>
        <p style="color:#666; font-size:0.9rem;">自動播放照片輪播</p>
      </a>
      <a href="quiz-results.html" class="card" style="padding:24px;">
        <div style="font-size:2rem; margin-bottom:8px;">❓</div>
        <h3 style="margin-bottom:6px;">問答紀錄</h3>
        <p style="color:#666; font-size:0.9rem;">${data.questions.length} 道題目的完整答題統計</p>
      </a>
      <a href="rankings.html" class="card" style="padding:24px;">
        <div style="font-size:2rem; margin-bottom:8px;">🏆</div>
        <h3 style="margin-bottom:6px;">排行榜</h3>
        <p style="color:#666; font-size:0.9rem;">${data.users.length} 位賓客的分數排名</p>
      </a>
    </div>
  `)
}

function generatePhotoWallPage(data: ExportData, avatarMap: Record<string, string>): string {
  const photoCards = data.photos.map((photo: any, i: number) => {
    const uploaderName = photo.uploader?.display_name || '匿名'
    const avatarSrc = avatarMap[photo.user_id] || ''
    const avatarImg = avatarSrc
      ? `<img src="${avatarSrc}" class="avatar" alt="">`
      : `<div class="avatar" style="background:#f3f4f6;display:flex;align-items:center;justify-content:center;">👤</div>`
    const blessing = photo.blessing_message ? escapeHtml(photo.blessing_message) : ''
    const time = new Date(photo.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
    const mediaTag = photo.media_type === 'video'
      ? `<video src="${photo._localFile}" style="width:100%;display:block;" preload="metadata"></video>
         <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.6);color:white;padding:8px 16px;border-radius:20px;font-weight:bold;">▶ 影片</div>`
      : `<img src="${photo._localFile}" alt="${escapeHtml(uploaderName)}" style="width:100%;display:block;">`

    return `<div class="card">
      <div style="position:relative;">
        <a href="${photo._localFile}" target="_blank" style="display:block;">${mediaTag}</a>
      </div>
      <div style="padding:14px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          ${avatarImg}
          <div>
            <div style="font-weight:600;">${escapeHtml(uploaderName)}</div>
            <div style="font-size:0.8rem;color:#999;">${time}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <span class="badge badge-pink">❤️ ${photo.vote_count} 票</span>
          ${photo.media_type === 'video' ? '<span class="badge badge-blue">🎬 影片</span>' : ''}
          <span class="badge ${photo.is_public ? 'badge-green' : 'badge-purple'}">${photo.is_public ? '公開' : '隱私'}</span>
        </div>
        ${blessing ? `<div style="background:#fdf2f8;border-radius:10px;padding:10px;">
          <div style="font-size:0.8rem;color:#ec4899;margin-bottom:4px;">💬 祝福語</div>
          <div style="color:#4b5563;line-height:1.6;white-space:pre-wrap;">${blessing}</div>
        </div>` : ''}
      </div>
    </div>`
  }).join('\n')

  return wrapPage('照片牆', 'photo-wall.html', `
    <div class="header">
      <h1>📸 照片牆</h1>
      <p>賓客上傳的美好回憶</p>
      <div class="stats">
        <div class="stat"><div class="stat-value">${data.photos.length}</div><div class="stat-label">張照片/影片</div></div>
        <div class="stat"><div class="stat-value">${data.photos.reduce((s: number, p: any) => s + (p.vote_count || 0), 0)}</div><div class="stat-label">總投票數</div></div>
        <div class="stat"><div class="stat-value">${data.photos.filter((p: any) => p.blessing_message).length}</div><div class="stat-label">則祝福語</div></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;">
      ${photoCards}
    </div>
  `)
}

function generateWeddingPhotosPage(data: ExportData): string {
  if (data.weddingPhotos.length === 0) {
    return wrapPage('婚紗照', 'wedding-photos.html', `
      <div class="header"><h1>💒 婚紗照</h1><p>暫無婚紗照</p></div>
    `)
  }

  const sorted = [...data.weddingPhotos].sort((a, b) => b.vote_count - a.vote_count)
  const cards = sorted.map((wp: any, i: number) => `
    <div class="card" style="break-inside:avoid;">
      <a href="${wp._localFile}" target="_blank">
        <img src="${wp._localFile}" alt="${escapeHtml(wp.name)}" style="width:100%;display:block;">
      </a>
      <div style="padding:12px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:600;">${escapeHtml(wp.name)}</span>
        <span class="badge badge-pink">❤️ ${wp.vote_count} 票</span>
      </div>
    </div>
  `).join('\n')

  return wrapPage('婚紗照', 'wedding-photos.html', `
    <div class="header">
      <h1>💒 婚紗照</h1>
      <p>依得票數排序</p>
      <div class="stats">
        <div class="stat"><div class="stat-value">${data.weddingPhotos.length}</div><div class="stat-label">張婚紗照</div></div>
        <div class="stat"><div class="stat-value">${data.weddingPhotos.reduce((s, w) => s + w.vote_count, 0)}</div><div class="stat-label">總投票數</div></div>
      </div>
    </div>
    <div style="columns:2;column-gap:20px;">
      ${cards}
    </div>
  `, `.card { margin-bottom: 20px; }`)
}

function generateSlideshowPage(data: ExportData, avatarMap: Record<string, string>): string {
  const photosJson = JSON.stringify(data.photos.map((p: any) => ({
    localFile: p._localFile,
    uploaderName: p.uploader?.display_name || '匿名',
    avatarFile: avatarMap[p.user_id] || '',
    blessing: p.blessing_message || '',
    voteCount: p.vote_count || 0,
    createdAt: p.created_at,
    mediaType: p.media_type || 'image'
  })))

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>照片幻燈片 - 婚禮遊戲紀錄</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #000; color: white; font-family: -apple-system, sans-serif; overflow: hidden; }
    #slideshow { width: 100vw; height: 100vh; position: relative; }
    #photo-container {
      position: absolute; inset: 0; display: flex;
      align-items: center; justify-content: center;
      transition: opacity 0.6s ease;
    }
    #photo-container img, #photo-container video {
      max-width: 100%; max-height: 100%; object-fit: contain;
    }
    #info {
      position: absolute; top: 24px; left: 24px; max-width: 400px;
      transition: opacity 0.6s ease;
    }
    .info-row { display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.4); padding: 10px 16px; border-radius: 12px; backdrop-filter: blur(8px); margin-bottom: 8px; }
    .info-avatar { width: 48px; height: 48px; border-radius: 50%; border: 2px solid white; object-fit: cover; }
    .info-name { font-size: 1.2rem; font-weight: 700; }
    .info-time { font-size: 0.85rem; color: #ccc; }
    .info-blessing { font-size: 1rem; line-height: 1.5; }
    #vote-badge {
      position: absolute; top: 24px; right: 24px;
      background: rgba(0,0,0,0.4); padding: 12px 24px; border-radius: 16px;
      display: flex; align-items: center; gap: 12px; backdrop-filter: blur(8px);
    }
    #vote-count { font-size: 2.5rem; font-weight: 700; }
    #counter {
      position: absolute; bottom: 24px; left: 24px;
      background: rgba(0,0,0,0.5); padding: 8px 16px; border-radius: 10px;
      font-size: 1rem; backdrop-filter: blur(8px);
    }
    #controls {
      position: absolute; bottom: 24px; right: 24px;
      display: flex; gap: 12px;
    }
    .ctrl-btn {
      background: rgba(255,255,255,0.9); border: none; padding: 12px;
      border-radius: 50%; cursor: pointer; font-size: 1.2rem;
      width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s;
    }
    .ctrl-btn:hover { transform: scale(1.1); }
    .back-link {
      position: absolute; top: 24px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.4); padding: 8px 20px; border-radius: 10px;
      color: white; text-decoration: none; font-size: 0.85rem; backdrop-filter: blur(8px);
      opacity: 0; transition: opacity 0.3s;
    }
    body:hover .back-link { opacity: 1; }
  </style>
</head>
<body>
  <div id="slideshow">
    <div id="photo-container"></div>
    <div id="info"></div>
    <div id="vote-badge"><span style="font-size:2rem;">❤️</span><span id="vote-count">0</span></div>
    <div id="counter"></div>
    <div id="controls">
      <button class="ctrl-btn" onclick="prev()">◀</button>
      <button class="ctrl-btn" id="playBtn" onclick="togglePlay()">⏸</button>
      <button class="ctrl-btn" onclick="next()">▶</button>
    </div>
    <a href="index.html" class="back-link">↩ 返回首頁</a>
  </div>
  <script>
    const photos = ${photosJson};
    let idx = 0, playing = true, timer = null;
    const container = document.getElementById('photo-container');
    const info = document.getElementById('info');
    const voteCount = document.getElementById('vote-count');
    const counter = document.getElementById('counter');
    const playBtn = document.getElementById('playBtn');

    function show(i) {
      if (!photos.length) return;
      idx = ((i % photos.length) + photos.length) % photos.length;
      const p = photos[idx];
      container.style.opacity = 0;
      info.style.opacity = 0;
      setTimeout(() => {
        if (p.mediaType === 'video') {
          container.innerHTML = '<video src="' + p.localFile + '" controls autoplay style="max-width:100%;max-height:100%;"></video>';
        } else {
          container.innerHTML = '<img src="' + p.localFile + '" alt="">';
        }
        const avatarHtml = p.avatarFile
          ? '<img src="' + p.avatarFile + '" class="info-avatar">'
          : '<div class="info-avatar" style="background:#555;display:flex;align-items:center;justify-content:center;">👤</div>';
        let html = '<div class="info-row">' + avatarHtml + '<div><div class="info-name">' + p.uploaderName + '</div><div class="info-time">' + new Date(p.createdAt).toLocaleString('zh-TW') + '</div></div></div>';
        if (p.blessing) html += '<div class="info-row"><div class="info-blessing">' + p.blessing + '</div></div>';
        info.innerHTML = html;
        voteCount.textContent = p.voteCount;
        counter.textContent = (idx + 1) + ' / ' + photos.length;
        container.style.opacity = 1;
        info.style.opacity = 1;
      }, 400);
    }
    function next() { show(idx + 1); resetTimer(); }
    function prev() { show(idx - 1); resetTimer(); }
    function togglePlay() {
      playing = !playing;
      playBtn.textContent = playing ? '⏸' : '▶';
      if (playing) startTimer(); else clearInterval(timer);
    }
    function startTimer() { timer = setInterval(() => show(idx + 1), 5000); }
    function resetTimer() { clearInterval(timer); if (playing) startTimer(); }
    show(0); startTimer();
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    });
  </script>
</body>
</html>`
}

function generateQuizResultsPage(data: ExportData): string {
  const questionCards = data.questions.map((q: any) => {
    const records = data.answerRecords.filter((r: any) => r.question_id === q.id)
    const totalAnswered = records.length
    const correctCount = records.filter((r: any) => r.is_correct).length
    const correctRate = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0

    // 各選項統計
    const optionCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
    records.forEach((r: any) => { if (r.selected_answer) optionCounts[r.selected_answer]++ })

    const options = [
      { key: 'A', text: q.option_a },
      { key: 'B', text: q.option_b },
      { key: 'C', text: q.option_c },
      { key: 'D', text: q.option_d },
    ]

    const optionsHtml = options.map(o => {
      const count = optionCounts[o.key]
      const pct = totalAnswered > 0 ? Math.round((count / totalAnswered) * 100) : 0
      const isCorrect = o.key === q.correct_answer
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;margin-bottom:6px;
        background:${isCorrect ? '#d1fae5' : '#f9fafb'};border:2px solid ${isCorrect ? '#10b981' : '#e5e7eb'};">
        <span style="font-weight:700;color:${isCorrect ? '#059669' : '#6b7280'};min-width:24px;">${o.key}</span>
        <span style="flex:1;">${escapeHtml(o.text)}</span>
        <span style="font-size:0.85rem;color:#999;">${count}人 (${pct}%)</span>
        ${isCorrect ? '<span style="color:#10b981;">✓</span>' : ''}
      </div>`
    }).join('')

    return `<div class="card" style="padding:20px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:14px;">
        <h3 style="font-size:1.1rem;flex:1;">${escapeHtml(q.question_text)}</h3>
        <span class="badge ${correctRate >= 50 ? 'badge-green' : 'badge-pink'}">${correctRate}% 正確率</span>
      </div>
      ${optionsHtml}
      <div style="margin-top:10px;font-size:0.85rem;color:#999;">
        ${totalAnswered} 人作答 · 分數 ${q.points || q.base_score || 10} 分 · 時限 ${q.time_limit || 30} 秒
      </div>
    </div>`
  }).join('\n')

  return wrapPage('問答紀錄', 'quiz-results.html', `
    <div class="header">
      <h1>❓ 問答紀錄</h1>
      <p>所有題目的答題統計</p>
      <div class="stats">
        <div class="stat"><div class="stat-value">${data.questions.length}</div><div class="stat-label">道題目</div></div>
        <div class="stat"><div class="stat-value">${data.answerRecords.length}</div><div class="stat-label">筆答題記錄</div></div>
      </div>
    </div>
    ${questionCards}
  `)
}

function generateRankingsPage(data: ExportData, avatarMap: Record<string, string>): string {
  const sorted = [...data.users].sort((a, b) => (b.total_score || 0) - (a.total_score || 0))

  const rows = sorted.map((user: any, i: number) => {
    const rank = i + 1
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`
    const avatarSrc = avatarMap[user.line_id] || ''
    const avatarImg = avatarSrc
      ? `<img src="${avatarSrc}" class="avatar" alt="">`
      : `<div class="avatar" style="background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:0.8rem;">👤</div>`
    const bg = rank <= 3 ? 'background:linear-gradient(135deg,#fdf2f8,#faf5ff);' : ''

    return `<div class="card" style="padding:14px 20px;margin-bottom:10px;display:flex;align-items:center;gap:14px;${bg}">
      <div style="font-size:1.4rem;min-width:36px;text-align:center;font-weight:700;">${medal}</div>
      ${avatarImg}
      <div style="flex:1;">
        <div style="font-weight:600;">${escapeHtml(user.display_name)}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:1.3rem;font-weight:700;color:#ec4899;">${user.total_score || 0}</div>
        <div style="font-size:0.75rem;color:#999;">分</div>
      </div>
    </div>`
  }).join('\n')

  // 抽獎記錄
  let lotterySection = ''
  if (data.lotteryHistory.length > 0) {
    const lotteryRows = data.lotteryHistory.map((l: any, i: number) => {
      const time = new Date(l.draw_time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
      return `<div class="card" style="padding:14px 20px;margin-bottom:10px;display:flex;align-items:center;gap:14px;">
        <div style="font-size:1.4rem;">🎉</div>
        <div style="flex:1;">
          <div style="font-weight:600;">${escapeHtml(l.winner_display_name)}</div>
          <div style="font-size:0.8rem;color:#999;">${time}</div>
        </div>
        <span class="badge badge-pink">第 ${data.lotteryHistory.length - i} 位中獎</span>
      </div>`
    }).join('\n')
    lotterySection = `
      <h2 style="font-size:1.3rem;margin:30px 0 16px;">🎰 抽獎記錄</h2>
      ${lotteryRows}
    `
  }

  return wrapPage('排行榜', 'rankings.html', `
    <div class="header">
      <h1>🏆 排行榜</h1>
      <p>賓客分數排名</p>
      <div class="stats">
        <div class="stat"><div class="stat-value">${data.users.length}</div><div class="stat-label">位賓客</div></div>
        <div class="stat"><div class="stat-value">${sorted[0]?.total_score || 0}</div><div class="stat-label">最高分</div></div>
      </div>
    </div>
    ${rows}
    ${lotterySection}
  `)
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log('🎊 婚禮遊戲離線匯出工具')
  console.log('========================')

  // 1. 抓資料
  const data = await fetchAllData()

  // 2. 建立輸出目錄
  ensureDir(OUTPUT_DIR)

  // 3. 儲存原始資料備份
  console.log('\n💾 儲存原始資料備份...')
  fs.writeFileSync(path.join(OUTPUT_DIR, 'data.json'), JSON.stringify({
    exportedAt: new Date().toISOString(),
    users: data.users,
    photos: data.photos.map((p: any) => { const { _localFile, ...rest } = p; return rest }),
    questions: data.questions,
    answerRecords: data.answerRecords.map((r: any) => { const { user, ...rest } = r; return rest }),
    gameState: data.gameState,
    lotteryHistory: data.lotteryHistory,
    weddingPhotos: data.weddingPhotos,
  }, null, 2))

  // 4. 下載照片
  const avatarMap = await downloadPhotos(data)

  // 5. 產生 HTML 頁面
  console.log('\n📄 產生 HTML 頁面...')

  const pages = [
    { file: 'index.html', content: generateIndexPage(data), label: '首頁' },
    { file: 'photo-wall.html', content: generatePhotoWallPage(data, avatarMap), label: '照片牆' },
    { file: 'wedding-photos.html', content: generateWeddingPhotosPage(data), label: '婚紗照' },
    { file: 'photo-slideshow.html', content: generateSlideshowPage(data, avatarMap), label: '幻燈片' },
    { file: 'quiz-results.html', content: generateQuizResultsPage(data), label: '問答紀錄' },
    { file: 'rankings.html', content: generateRankingsPage(data, avatarMap), label: '排行榜' },
  ]

  for (const page of pages) {
    fs.writeFileSync(path.join(OUTPUT_DIR, page.file), page.content, 'utf-8')
    console.log(`  ✅ ${page.label} → ${page.file}`)
  }

  // 6. 打包 ZIP
  console.log('\n📦 打包 ZIP 檔案...')
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(ZIP_FILE)
    const archive = archiver('zip', { zlib: { level: 5 } })
    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(1)
      console.log(`  ✅ ${ZIP_FILE} (${sizeMB} MB)`)
      resolve()
    })
    archive.on('error', reject)
    archive.pipe(output)
    archive.directory(OUTPUT_DIR, `wedding-game-offline-${timestamp}`)
    archive.finalize()
  })

  console.log('\n🎉 匯出完成！')
  console.log(`   📂 資料夾: ${OUTPUT_DIR}`)
  console.log(`   📦 ZIP: ${ZIP_FILE}`)
  console.log(`   🌐 用瀏覽器開啟 index.html 即可離線瀏覽`)
}

main().catch(err => {
  console.error('\n❌ 匯出失敗:', err)
  process.exit(1)
})
