/* ============================================
   COURTCALL PAGES.JS - 모든 페이지 렌더 로직
   ============================================ */

// ── 홈 페이지 ────────────────────────────────
const Home = {
  currentFilter: 'all',
  currentDateFilter: null,

  render() {
    const user = App.currentUser;
    const matches = Matches.getAll();

    // 헤더 업데이트
    document.getElementById('homeGreeting').textContent =
      `안녕하세요, ${user?.name || '테니스인'}님 👋`;

    // 통계
    const myMatches = user ? Matches.getUserMatches(user.id) : { hosting: [], participating: [] };
    document.getElementById('homeStatHost').textContent = myMatches.hosting.length;
    document.getElementById('homeStatJoined').textContent = myMatches.participating.length;
    document.getElementById('homeStatOpen').textContent = matches.filter(m => m.status === 'recruiting' || m.status === 'closing').length;

    // 알림 배지
    App.updateNotifBadge();

    this.renderMatches();
  },

  renderMatches() {
    const matches = Matches.getAll();
    const filtered = matches.filter(m => {
      if (this.currentFilter === 'recruiting') return m.status === 'recruiting' || m.status === 'closing';
      if (this.currentFilter === 'confirmed') return m.status === 'confirmed';
      if (this.currentFilter === 'closed') return m.status === 'closed';
      if (this.currentFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        return m.date === today;
      }
      if (this.currentFilter === 'weekend') {
        const d = new Date(m.date + 'T00:00:00');
        return d.getDay() === 0 || d.getDay() === 6;
      }
      return true;
    });

    const list = document.getElementById('matchList');
    if (!list) return;

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${Icons.tennis}</div>
          <div class="empty-title">경기가 없어요</div>
          <div class="empty-body">아직 모집 중인 경기가 없습니다.<br>첫 번째 경기를 개설해보세요!</div>
          <button class="btn btn-primary btn-sm" onclick="App.navigate('create-match')">경기 개설하기</button>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(m => this.renderMatchCard(m)).join('');
  },

  renderMatchCard(m) {
    const status = Utils.getStatusLabel(m.status);
    const remaining = m.maxPlayers - m.participants.length;
    const filled = m.participants.length;
    const isHost = App.currentUser?.id === m.hostId;
    const userId = App.currentUser?.id;
    const isParticipant = m.participants.find(p => p.userId === userId);
    const isWaiting = m.waitlist.find(p => p.userId === userId);

    // 슬롯 도트
    const dots = Array.from({length: m.maxPlayers}, (_, i) => {
      const isFilled = i < filled;
      return `<div class="slot-dot ${isFilled ? 'filled' : ''}"></div>`;
    }).join('');

    // 대기자 배지
    const waitBadge = m.waitlist.length > 0
      ? `<span style="font-size:11px;color:var(--cc-blue);margin-left:4px;">+${m.waitlist.length}대기</span>`
      : '';

    // 내 상태 배지
    let myBadge = '';
    if (isHost) myBadge = `<span class="chip chip-active" style="padding:2px 8px;font-size:10px;">호스트</span>`;
    else if (isParticipant) myBadge = `<span class="chip" style="padding:2px 8px;font-size:10px;background:rgba(74,222,128,0.1);color:#4ADE80;border:1px solid rgba(74,222,128,0.3);">참가중</span>`;
    else if (isWaiting) myBadge = `<span class="chip" style="padding:2px 8px;font-size:10px;background:rgba(61,139,255,0.1);color:var(--cc-blue);border:1px solid rgba(61,139,255,0.3);">대기중</span>`;

    return `
      <div class="match-card" onclick="App.navigate('match-detail', {matchId: '${m.id}'})">
        <div class="match-card-header">
          <div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span class="match-status-badge ${status.class}">${status.label}</span>
              <span style="font-size:11px;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,0.05);color:var(--cc-gray-400);">${m.level}</span>
              ${myBadge}
            </div>
            <div class="match-title">${m.title || m.venue}</div>
          </div>
        </div>
        <div class="match-info-row">${Icons.location} ${m.venue}</div>
        <div class="match-info-row">${Icons.calendar} ${Utils.formatDate(m.date)} &nbsp;${Icons.clock} ${Utils.formatTime(m.time)}</div>
        <div class="match-card-footer">
          <div class="match-slots">
            <div class="slot-dots">${dots}</div>
            <span style="font-size:12px;color:var(--cc-gray-400);margin-left:4px;">${filled}/${m.maxPlayers}${waitBadge}</span>
          </div>
          <div style="text-align:right;">
            <div class="match-price">${Utils.formatCost(m.perPersonCost)}</div>
            <div class="match-price-label">1인 참가비</div>
          </div>
        </div>
      </div>
    `;
  },

  setFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(c => {
      c.classList.toggle('chip-active', c.dataset.filter === filter);
      c.classList.toggle('chip-default', c.dataset.filter !== filter);
    });
    this.renderMatches();
  }
};

// ── 경기 상세 ─────────────────────────────────
const MatchDetail = {
  currentMatchId: null,

  render(data) {
    const matchId = data?.matchId || this.currentMatchId;
    if (!matchId) return;
    this.currentMatchId = matchId;

    const match = Matches.getById(matchId);
    if (!match) {
      App.showToast('경기를 찾을 수 없어요', 'error');
      App.navigate('home');
      return;
    }

    const user = App.currentUser;
    const isHost = user?.id === match.hostId;
    const isParticipant = match.participants.find(p => p.userId === user?.id);
    const isWaiting = match.waitlist.find(p => p.userId === user?.id);
    const remaining = match.maxPlayers - match.participants.length;
    const status = Utils.getStatusLabel(match.status);

    const container = document.getElementById('matchDetailContent');
    if (!container) return;

    // 참가자 슬롯 UI
    const slots = Array.from({length: match.maxPlayers}, (_, i) => {
      const p = match.participants[i];
      if (p) {
        return `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--cc-border);">
            <div class="avatar avatar-sm">${p.userName[0]}</div>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:600;">${p.userName}</div>
              <div style="font-size:11px;color:var(--cc-gray-600);">${Utils.timeAgo(p.appliedAt)} 신청</div>
            </div>
            ${p.userId === match.hostId ? `<span style="font-size:10px;color:var(--cc-lime);font-weight:700;background:rgba(200,255,0,0.1);padding:2px 8px;border-radius:999px;">호스트</span>` : ''}
            ${match.paymentStatus?.[p.userId] ? `<span style="font-size:10px;color:#4ADE80;font-weight:700;">입금완료</span>` : (match.status === 'confirmed' ? `<span style="font-size:10px;color:var(--cc-orange);font-weight:700;">입금대기</span>` : '')}
          </div>
        `;
      } else {
        return `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--cc-border);">
            <div class="avatar avatar-sm" style="background:var(--cc-border);opacity:0.5;"></div>
            <div style="font-size:13px;color:var(--cc-gray-600);">빈 자리</div>
          </div>
        `;
      }
    }).join('');

    // 대기자 목록
    const waitlistHtml = match.waitlist.length > 0 ? `
      <div style="margin-top:12px;">
        <div class="section-title">대기자 목록</div>
        ${match.waitlist.map((p, i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--cc-border);">
            <div style="width:24px;height:24px;background:rgba(61,139,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--cc-blue);">${i+1}</div>
            <div class="avatar avatar-sm" style="background:linear-gradient(135deg,#3D8BFF,#6BB3FF);">${p.userName[0]}</div>
            <div style="flex:1;font-size:14px;font-weight:500;">${p.userName}</div>
            <div style="font-size:11px;color:var(--cc-gray-600);">${Utils.timeAgo(p.appliedAt)}</div>
          </div>
        `).join('')}
      </div>
    ` : '';

    // CTA 버튼 결정
    let ctaHtml = '';
    if (!user) {
      ctaHtml = `<button class="btn btn-primary btn-full" onclick="App.navigate('login')">로그인하고 신청하기</button>`;
    } else if (isHost) {
      if (match.status === 'confirmed') {
        ctaHtml = `
          <button class="btn btn-green btn-full" onclick="App.navigate('host-dash', {matchId:'${match.id}'})">
            ${Icons.users} 호스트 대시보드 →
          </button>
        `;
      } else {
        ctaHtml = `
          <div style="display:flex;gap:8px;">
            <button class="btn btn-secondary" style="flex:1;" onclick="App.navigate('host-dash', {matchId:'${match.id}'})">
              ${Icons.users} 관리하기
            </button>
            <button class="btn btn-primary" style="flex:1;" onclick="MatchDetail.confirmMatch('${match.id}')">
              ✅ 경기 확정
            </button>
          </div>
        `;
      }
    } else if (isParticipant) {
      if (match.status === 'confirmed') {
        const paid = match.paymentStatus?.[user.id];
        if (paid) {
          ctaHtml = `
            <div style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);border-radius:12px;padding:16px;text-align:center;">
              <div style="font-size:20px;margin-bottom:4px;">✅</div>
              <div style="font-weight:700;color:#4ADE80;">입금 완료</div>
              <div style="font-size:13px;color:var(--cc-gray-400);margin-top:4px;">참가비 입금이 확인됐어요</div>
            </div>
          `;
        } else {
          ctaHtml = `
            <button class="btn btn-kakao btn-full btn-lg" onclick="App.navigate('payment', {matchId:'${match.id}'})">
              ${Icons.kakao} 카카오페이로 송금하기 (${Utils.formatCost(match.perPersonCost)})
            </button>
          `;
        }
      } else {
        ctaHtml = `
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:12px;padding:12px;text-align:center;font-size:13px;color:#4ADE80;">
              ✅ 신청 완료 • 확정 후 결제 안내가 올 예정이에요
            </div>
            <button class="btn btn-danger btn-full btn-sm" onclick="MatchDetail.cancelApplication('${match.id}')">
              신청 취소
            </button>
          </div>
        `;
      }
    } else if (isWaiting) {
      const waitPos = match.waitlist.findIndex(p => p.userId === user.id) + 1;
      ctaHtml = `
        <div class="waiting-banner">
          <div>
            <div class="waiting-number">${waitPos}</div>
            <div style="font-size:10px;color:var(--cc-blue);margin-top:2px;">대기 순번</div>
          </div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:600;">대기 중이에요</div>
            <div style="font-size:12px;color:var(--cc-gray-400);margin-top:2px;">취소자 발생 시 자동으로 승격돼요</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="MatchDetail.cancelWaiting('${match.id}')">취소</button>
        </div>
      `;
    } else if (match.status === 'confirmed' || match.status === 'closed') {
      ctaHtml = `
        <button class="btn btn-secondary btn-full" disabled>모집 마감됐어요</button>
      `;
    } else {
      ctaHtml = `
        <button class="btn btn-primary btn-full btn-lg" onclick="MatchDetail.apply('${match.id}')">
          🎾 참가 신청하기 (${Utils.formatCost(match.perPersonCost)})
        </button>
      `;
      if (match.participants.length >= match.maxPlayers) {
        ctaHtml = `
          <button class="btn btn-secondary btn-full btn-lg" onclick="MatchDetail.applyWaiting('${match.id}')">
            ⏳ 대기자 등록하기
          </button>
        `;
      }
    }

    container.innerHTML = `
      <!-- 히어로 섹션 -->
      <div class="match-detail-hero">
        <div class="match-host-row">
          <div class="avatar avatar-sm">${match.hostName[0]}</div>
          <div>
            <div class="host-label">호스트</div>
            <div style="font-size:13px;font-weight:600;">${match.hostName}</div>
          </div>
          <div style="margin-left:auto;">
            <span class="match-status-badge ${status.class}">${status.label}</span>
          </div>
        </div>
        <div class="match-detail-title">${match.title || match.venue}</div>
        <div class="detail-info-grid">
          <div class="detail-info-item">
            <div class="detail-info-label">${Icons.calendar} 날짜</div>
            <div class="detail-info-value" style="font-size:14px;">${Utils.formatDate(match.date)}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">${Icons.clock} 시간</div>
            <div class="detail-info-value" style="font-size:14px;">${Utils.formatTime(match.time)} · ${match.duration}분</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">${Icons.users} 인원</div>
            <div class="detail-info-value">${match.participants.length}<span style="font-size:13px;color:var(--cc-gray-400);">/${match.maxPlayers}명</span></div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">${Icons.won} 참가비</div>
            <div class="detail-info-value" style="color:var(--cc-lime);">${Utils.formatCost(match.perPersonCost)}</div>
          </div>
        </div>
      </div>

      <!-- 장소 정보 -->
      <div class="section">
        <div class="card" style="padding:var(--space-md);">
          <div style="font-size:12px;color:var(--cc-gray-600);margin-bottom:8px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">📍 장소</div>
          <div style="font-size:15px;font-weight:600;">${match.venue}</div>
          <div style="font-size:13px;color:var(--cc-gray-400);margin-top:4px;">${match.address || ''}</div>
          ${match.address ? `<button class="btn btn-secondary btn-sm" style="margin-top:12px;width:100%;" onclick="window.open('https://map.kakao.com/link/search/${encodeURIComponent(match.address)}')">🗺 지도에서 보기</button>` : ''}
        </div>
      </div>

      <!-- 레벨 & 메모 -->
      <div class="section" style="padding-top:0;">
        <div class="card" style="padding:var(--space-md);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <span style="font-size:12px;color:var(--cc-gray-600);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">🎾 레벨</span>
            <span style="font-size:14px;font-weight:700;color:${Utils.getLevelColor(match.level)};">${match.level}</span>
          </div>
          ${match.note ? `
            <div style="font-size:12px;color:var(--cc-gray-600);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">📝 메모</div>
            <div style="font-size:14px;color:var(--cc-gray-200);line-height:1.6;">${match.note}</div>
          ` : ''}
        </div>
      </div>

      <!-- 비용 계산 -->
      <div class="section" style="padding-top:0;">
        <div class="cost-calculator">
          <div class="cost-row">
            <span style="color:var(--cc-gray-400);">코트 총비용</span>
            <span style="font-weight:600;">${Utils.formatCost(match.totalCost)}</span>
          </div>
          <div class="cost-row">
            <span style="color:var(--cc-gray-400);">모집 인원</span>
            <span style="font-weight:600;">${match.maxPlayers}명</span>
          </div>
          <div class="cost-row">
            <span style="font-weight:700;">1인 참가비</span>
            <span class="cost-total">${Utils.formatCost(match.perPersonCost)}</span>
          </div>
        </div>
      </div>

      <!-- 참가자 목록 -->
      <div class="section" style="padding-top:0;">
        <div class="card" style="padding:var(--space-md);">
          <div class="section-title" style="margin-bottom:8px;">참가자 (${match.participants.length}/${match.maxPlayers})</div>
          ${slots}
          ${waitlistHtml}
        </div>
      </div>

      <!-- CTA -->
      <div class="section" style="padding-top:0;">
        ${ctaHtml}
      </div>

      <div style="height:20px;"></div>
    `;
  },

  apply(matchId) {
    const user = App.currentUser;
    if (!user) { App.navigate('login'); return; }

    const result = Matches.apply(matchId, user.id, user.name);
    if (result.success) {
      if (result.type === 'joined') {
        App.showToast(`✅ 신청 완료! ${result.position}번째 참가자에요`, 'success');
        App.addNotification({
          type: 'applied',
          title: '🎾 신청 완료!',
          body: '경기 신청이 완료됐어요. 호스트 확정 후 결제 안내가 올 예정이에요.',
          matchId
        });
      } else {
        App.showToast(`⏳ 대기 ${result.position}번 등록됐어요`, 'info');
      }
    } else {
      const msgs = {
        already_applied: '이미 신청하셨어요',
        already_waiting: '이미 대기 중이에요',
        closed: '모집이 마감됐어요'
      };
      App.showToast(msgs[result.reason] || '신청 중 오류가 발생했어요', 'error');
    }
    this.render({ matchId });
  },

  applyWaiting(matchId) {
    this.apply(matchId);
  },

  cancelApplication(matchId) {
    const user = App.currentUser;
    if (!user) return;
    if (!confirm('정말 신청을 취소하시겠어요?')) return;
    const ok = Matches.cancel(matchId, user.id);
    if (ok) {
      App.showToast('신청이 취소됐어요', 'info');
    }
    this.render({ matchId });
  },

  cancelWaiting(matchId) {
    this.cancelApplication(matchId);
  },

  confirmMatch(matchId) {
    const match = Matches.getById(matchId);
    if (!match) return;
    if (match.participants.length < 2) {
      App.showToast('최소 2명 이상이어야 확정할 수 있어요', 'error');
      return;
    }
    if (!confirm(`${match.participants.length}명으로 경기를 확정할까요?`)) return;
    Matches.confirmMatch(matchId);
    App.showToast('🎾 경기가 확정됐어요! 참가자들에게 알림이 갔어요', 'success');
    this.render({ matchId });
  }
};

// ── 경기 개설 ─────────────────────────────────
const CreateMatch = {
  render() {
    const form = document.getElementById('createMatchForm');
    if (form) {
      // 오늘 날짜를 기본값으로
      const today = new Date().toISOString().split('T')[0];
      const dateInput = document.getElementById('matchDate');
      if (dateInput && !dateInput.value) dateInput.min = today;
    }
    this.updateCalculator();
  },

  updateCalculator() {
    const total = parseInt(document.getElementById('totalCost')?.value) || 0;
    const players = parseInt(document.getElementById('maxPlayers')?.value) || 1;
    const per = players > 0 ? Math.ceil(total / players) : 0;

    const perEl = document.getElementById('perPersonCost');
    const calcEl = document.getElementById('costCalculator');

    if (perEl) perEl.textContent = Utils.formatCost(per);
    if (calcEl) {
      calcEl.innerHTML = `
        <div class="cost-row">
          <span style="color:var(--cc-gray-400);">코트 총비용</span>
          <span style="font-weight:600;">${Utils.formatCost(total)}</span>
        </div>
        <div class="cost-row">
          <span style="color:var(--cc-gray-400);">모집 인원</span>
          <span style="font-weight:600;">${players}명</span>
        </div>
        <div class="cost-row">
          <span style="font-weight:700;">1인 참가비</span>
          <span class="cost-total">${Utils.formatCost(per)}</span>
        </div>
      `;
    }
  },

  submit() {
    const user = App.currentUser;
    if (!user) { App.navigate('login'); return; }

    const venue    = document.getElementById('venue')?.value?.trim();
    const address  = document.getElementById('address')?.value?.trim();
    const date     = document.getElementById('matchDate')?.value;
    const time     = document.getElementById('matchTime')?.value;
    const duration = parseInt(document.getElementById('duration')?.value) || 120;
    const maxPlayers = parseInt(document.getElementById('maxPlayers')?.value) || 4;
    const totalCost  = parseInt(document.getElementById('totalCost')?.value) || 0;
    const level    = document.getElementById('level')?.value;
    const title    = document.getElementById('matchTitle')?.value?.trim();
    const note     = document.getElementById('note')?.value?.trim();

    if (!venue || !date || !time || !totalCost) {
      App.showToast('필수 항목을 모두 입력해주세요', 'error');
      return;
    }

    const perPersonCost = Math.ceil(totalCost / maxPlayers);

    const matchData = {
      hostId: user.id,
      hostName: user.name,
      title: title || `${venue} 번개 테니스 🎾`,
      venue, address, date, time, duration,
      maxPlayers, totalCost, perPersonCost,
      level: level || '중급',
      note
    };

    const match = Matches.create(matchData);
    // 호스트 자동 참가
    match.participants.push({
      userId: user.id,
      userName: user.name,
      appliedAt: new Date().toISOString(),
      confirmed: true
    });
    Matches.update(match.id, { participants: match.participants });

    App.showToast('🎾 경기가 개설됐어요!', 'success');
    App.addNotification({
      type: 'created',
      title: '✅ 경기 개설 완료',
      body: `${match.title} 경기가 개설됐어요. 참가자를 기다려봐요!`,
      matchId: match.id
    });

    // 폼 초기화 후 홈으로
    document.getElementById('createMatchForm')?.reset();
    App.navigate('home');
  }
};

// ── 호스트 대시보드 ───────────────────────────
const HostDash = {
  currentMatchId: null,

  render(data) {
    const matchId = data?.matchId || this.currentMatchId;
    if (!matchId) { App.navigate('my-matches'); return; }
    this.currentMatchId = matchId;

    const match = Matches.getById(matchId);
    if (!match) return;

    const user = App.currentUser;
    if (match.hostId !== user?.id) {
      App.showToast('호스트만 접근 가능해요', 'error');
      App.navigate('home');
      return;
    }

    const container = document.getElementById('hostDashContent');
    if (!container) return;

    const paidCount = Object.values(match.paymentStatus || {}).filter(Boolean).length;
    const totalExpected = match.participants.length;
    const totalAmount = match.perPersonCost * totalExpected;
    const receivedAmount = match.perPersonCost * paidCount;

    const hostPm = Store.get(`payment_${user.id}`) || {};
    const hasPaymentInfo = !!(hostPm.kakaoLink || hostPm.accountNumber);

    container.innerHTML = `
      ${!hasPaymentInfo ? `
      <!-- 결제 수단 미등록 경고 -->
      <div style="background:rgba(255,112,67,0.1);border:1px solid rgba(255,112,67,0.3);border-radius:0;padding:14px var(--space-md);display:flex;align-items:center;gap:12px;">
        <div style="font-size:20px;flex-shrink:0;">⚠️</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:#FF7043;margin-bottom:2px;">결제 수단이 등록되지 않았어요</div>
          <div style="font-size:12px;color:var(--cc-gray-400);">참가자들이 송금할 수 없어요. 카카오페이 링크 또는 계좌를 등록해주세요.</div>
        </div>
        <button class="btn btn-sm" style="flex-shrink:0;background:#FF7043;color:#fff;border:none;" onclick="App.navigate('account-settings')">등록하기</button>
      </div>
      ` : ''}

      <!-- 경기 요약 -->
      <div class="section">
        <div style="font-size:20px;font-weight:800;margin-bottom:4px;">${match.title || match.venue}</div>
        <div class="match-info-row">${Icons.calendar} ${Utils.formatDate(match.date)} ${Utils.formatTime(match.time)}</div>
        <div class="match-info-row">${Icons.location} ${match.venue}</div>
        <div style="margin-top:12px;">
          <span class="match-status-badge ${Utils.getStatusLabel(match.status).class}">${Utils.getStatusLabel(match.status).label}</span>
        </div>
      </div>

      <div class="divider" style="margin:0;"></div>

      <!-- 통계 -->
      <div class="section">
        <div class="grid-3">
          <div class="stat-card">
            <div class="stat-value" style="color:var(--cc-lime);">${match.participants.length}</div>
            <div class="stat-label">참가자</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:var(--cc-blue);">${match.waitlist.length}</div>
            <div class="stat-label">대기자</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:#4ADE80;">${paidCount}</div>
            <div class="stat-label">입금완료</div>
          </div>
        </div>
      </div>

      ${match.status === 'confirmed' ? `
      <!-- 수금 현황 -->
      <div class="section" style="padding-top:0;">
        <div class="card" style="padding:var(--space-md);">
          <div class="section-title">💰 수금 현황</div>
          <div style="margin-bottom:12px;">
            <div class="progress-bar" style="height:10px;margin-bottom:8px;">
              <div class="progress-fill" style="width:${totalExpected ? (paidCount/totalExpected*100) : 0}%;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px;">
              <span style="color:var(--cc-gray-400);">${paidCount}/${totalExpected}명 입금</span>
              <span style="color:var(--cc-lime);font-weight:700;">${Utils.formatCost(receivedAmount)} / ${Utils.formatCost(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- 참가자 관리 -->
      <div class="section" style="padding-top:0;">
        <div class="card" style="padding:var(--space-md);">
          <div class="section-title">참가자 목록</div>
          ${match.participants.map((p, i) => {
            const paid = match.paymentStatus?.[p.userId];
            return `
              <div class="participant-item">
                <div class="avatar avatar-sm">${p.userName[0]}</div>
                <div class="participant-info">
                  <div class="participant-name">
                    ${p.userName}
                    ${p.userId === match.hostId ? ' <span style="font-size:10px;color:var(--cc-lime);">(호스트)</span>' : ''}
                  </div>
                  <div class="participant-meta">${Utils.timeAgo(p.appliedAt)} 신청</div>
                </div>
                ${match.status === 'confirmed' ? `
                  <button class="btn btn-sm ${paid ? 'btn-secondary' : 'btn-green'}" onclick="HostDash.togglePayment('${match.id}','${p.userId}')">
                    ${paid ? '✅ 완료' : '입금확인'}
                  </button>
                ` : `
                  ${p.userId !== match.hostId ? `
                    <button class="btn btn-danger btn-sm" onclick="HostDash.removeParticipant('${match.id}','${p.userId}')">
                      제외
                    </button>
                  ` : ''}
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      ${match.waitlist.length > 0 ? `
      <!-- 대기자 -->
      <div class="section" style="padding-top:0;">
        <div class="card" style="padding:var(--space-md);">
          <div class="section-title">⏳ 대기자 목록</div>
          ${match.waitlist.map((p, i) => `
            <div class="participant-item">
              <div style="width:24px;height:24px;background:rgba(61,139,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--cc-blue);">${i+1}</div>
              <div class="avatar avatar-sm" style="background:linear-gradient(135deg,#3D8BFF,#6BB3FF);">${p.userName[0]}</div>
              <div class="participant-info">
                <div class="participant-name">${p.userName}</div>
                <div class="participant-meta">${Utils.timeAgo(p.appliedAt)} 대기</div>
              </div>
              <button class="btn btn-green btn-sm" onclick="HostDash.promoteWaiting('${match.id}','${p.userId}')">승격</button>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- 액션 버튼 -->
      <div class="section" style="padding-top:0;">
        ${match.status !== 'confirmed' ? `
          <button class="btn btn-primary btn-full btn-lg" onclick="HostDash.confirmMatch('${match.id}')">
            ✅ 경기 확정하기
          </button>
        ` : `
          <div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:20px;margin-bottom:4px;">🎾</div>
            <div style="font-weight:700;color:#4ADE80;">경기 확정 완료</div>
            <div style="font-size:13px;color:var(--cc-gray-400);margin-top:4px;">참가비 수금을 확인해주세요</div>
          </div>
        `}
      </div>

      <div style="height:20px;"></div>
    `;
  },

  togglePayment(matchId, userId) {
    const match = Matches.getById(matchId);
    if (!match) return;
    const current = match.paymentStatus?.[userId] || false;
    Matches.setPaymentStatus(matchId, userId, !current);
    App.showToast(current ? '입금 확인 취소됨' : '✅ 입금 확인됐어요!', current ? 'info' : 'success');
    this.render({ matchId });
  },

  removeParticipant(matchId, userId) {
    if (!confirm('이 참가자를 제외할까요?')) return;
    Matches.cancel(matchId, userId);
    App.showToast('참가자가 제외됐어요', 'info');
    this.render({ matchId });
  },

  promoteWaiting(matchId, userId) {
    const match = Matches.getById(matchId);
    if (!match) return;
    if (match.participants.length >= match.maxPlayers) {
      App.showToast('정원이 꽉 찼어요. 먼저 참가자를 제외해주세요', 'error');
      return;
    }
    const waitIdx = match.waitlist.findIndex(p => p.userId === userId);
    if (waitIdx === -1) return;
    const promoted = match.waitlist.splice(waitIdx, 1)[0];
    promoted.waitPosition = undefined;
    match.participants.push(promoted);
    Matches.update(matchId, { participants: match.participants, waitlist: match.waitlist });
    App.showToast('✅ 대기자가 참가자로 승격됐어요', 'success');
    this.render({ matchId });
  },

  confirmMatch(matchId) {
    const match = Matches.getById(matchId);
    if (!match) return;
    if (match.participants.length < 2) {
      App.showToast('최소 2명 이상이어야 확정할 수 있어요', 'error');
      return;
    }
    if (!confirm(`${match.participants.length}명으로 경기를 확정할까요?\n\n확정 후 참가자들에게 결제 안내가 전송됩니다.`)) return;
    Matches.confirmMatch(matchId);
    App.showToast('🎾 경기가 확정됐어요!', 'success');
    this.render({ matchId });
  }
};

// ── 내 경기 ───────────────────────────────────
const MyMatches = {
  currentTab: 'participating',

  render() {
    const user = App.currentUser;
    if (!user) { App.navigate('login'); return; }

    const matches = Matches.getUserMatches(user.id);
    this.renderTab(this.currentTab, matches);
  },

  setTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.my-matches-tab').forEach(t => {
      t.classList.toggle('chip-active', t.dataset.tab === tab);
      t.classList.toggle('chip-default', t.dataset.tab !== tab);
    });
    const user = App.currentUser;
    if (user) this.renderTab(tab, Matches.getUserMatches(user.id));
  },

  renderTab(tab, matches) {
    const list = document.getElementById('myMatchList');
    if (!list) return;

    const data = tab === 'hosting' ? matches.hosting : matches.participating;

    if (data.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${Icons.tennis}</div>
          <div class="empty-title">${tab === 'hosting' ? '개설한 경기가 없어요' : '신청한 경기가 없어요'}</div>
          <div class="empty-body">${tab === 'hosting' ? '첫 번째 경기를 개설해보세요!' : '주변 경기를 둘러보고 신청해보세요!'}</div>
          <button class="btn btn-primary btn-sm" onclick="App.navigate('${tab === 'hosting' ? 'create-match' : 'home'}')">
            ${tab === 'hosting' ? '경기 개설하기' : '경기 찾아보기'}
          </button>
        </div>
      `;
      return;
    }

    const user = App.currentUser;
    list.innerHTML = data.map(m => {
      const status = Utils.getStatusLabel(m.status);
      const isHost = m.hostId === user?.id;
      const isParticipant = m.participants.find(p => p.userId === user?.id);
      const isWaiting = m.waitlist.find(p => p.userId === user?.id);
      const paid = m.paymentStatus?.[user?.id];

      let statusBadge = '';
      if (isHost) statusBadge = `<span style="font-size:11px;color:var(--cc-lime);font-weight:700;">호스트</span>`;
      else if (isWaiting) statusBadge = `<span style="font-size:11px;color:var(--cc-blue);font-weight:700;">대기중 ${m.waitlist.findIndex(p=>p.userId===user?.id)+1}번</span>`;
      else if (m.status === 'confirmed' && !paid) statusBadge = `<span style="font-size:11px;color:var(--cc-orange);font-weight:700;">입금 필요</span>`;
      else if (m.status === 'confirmed' && paid) statusBadge = `<span style="font-size:11px;color:#4ADE80;font-weight:700;">입금완료</span>`;

      return `
        <div class="match-card" onclick="App.navigate('${isHost ? 'host-dash' : 'match-detail'}', {matchId:'${m.id}'})">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <span class="match-status-badge ${status.class}">${status.label}</span>
            ${statusBadge}
          </div>
          <div class="match-title" style="margin-bottom:6px;">${m.title || m.venue}</div>
          <div class="match-info-row">${Icons.location} ${m.venue}</div>
          <div class="match-info-row">${Icons.calendar} ${Utils.formatDate(m.date)} ${Utils.formatTime(m.time)}</div>
          <div class="match-card-footer">
            <span style="font-size:13px;color:var(--cc-gray-400);">${m.participants.length}/${m.maxPlayers}명</span>
            <div class="match-price" style="font-size:16px;">${Utils.formatCost(m.perPersonCost)}</div>
          </div>
        </div>
      `;
    }).join('');
  }
};

// ── 알림 ─────────────────────────────────────
const Notifications = {
  render() {
    const notifs = App.notifications;
    const container = document.getElementById('notifList');
    if (!container) return;

    // 전체 읽음 처리
    App.notifications.forEach(n => n.read = true);
    Store.set('notifications', App.notifications);
    App.updateNotifBadge();

    if (notifs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${Icons.bell}</div>
          <div class="empty-title">알림이 없어요</div>
          <div class="empty-body">경기 신청, 확정, 결제 안내 등<br>중요한 소식이 여기에 와요</div>
        </div>
      `;
      return;
    }

    const typeConfig = {
      applied:   { icon: '🎾', bg: 'rgba(200,255,0,0.1)' },
      confirmed: { icon: '✅', bg: 'rgba(74,222,128,0.1)' },
      promoted:  { icon: '🚀', bg: 'rgba(61,139,255,0.1)' },
      created:   { icon: '🎊', bg: 'rgba(200,255,0,0.1)' },
      payment:   { icon: '💳', bg: 'rgba(255,112,67,0.1)' },
      cancelled: { icon: '❌', bg: 'rgba(255,71,87,0.1)' }
    };

    container.innerHTML = notifs.map(n => {
      const config = typeConfig[n.type] || { icon: '🔔', bg: 'rgba(255,255,255,0.05)' };
      return `
        <div class="notification-item ${n.read ? '' : 'unread'}" onclick="${n.matchId ? `App.navigate('match-detail',{matchId:'${n.matchId}'})` : ''}">
          <div class="notif-icon" style="background:${config.bg};">${config.icon}</div>
          <div class="notif-content">
            <div class="notif-title">${n.title}</div>
            <div class="notif-body">${n.body}</div>
            <div class="notif-time">${Utils.timeAgo(n.time)}</div>
          </div>
        </div>
      `;
    }).join('');
  }
};

// ── 프로필 ────────────────────────────────────
const Profile = {
  render() {
    const user = App.currentUser;
    if (!user) { App.navigate('login'); return; }

    const myMatches = Matches.getUserMatches(user.id);
    const totalPlayed = myMatches.participating.filter(m => m.status === 'confirmed').length;
    const totalHosted = myMatches.hosting.length;
    const trustScore = user.trustScore || 100;

    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileHandle').textContent = `@${user.phone?.slice(-4) || '0000'}`;
    document.getElementById('profileAvatar').textContent = user.name[0];
    document.getElementById('profileTrust').textContent = `⭐ 신뢰도 ${trustScore}점`;
    document.getElementById('profileMatchCount').textContent = totalPlayed;
    document.getElementById('profileHostCount').textContent = totalHosted;
    document.getElementById('profileJoinDate').textContent =
      new Date(user.createdAt || Date.now()).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' }) + ' 가입';
  }
};

// ── 결제 페이지 ──────────────────────────────
const Payment = {
  currentMatchId: null,

  render(data) {
    const matchId = data?.matchId || this.currentMatchId;
    if (!matchId) return;
    this.currentMatchId = matchId;

    const match = Matches.getById(matchId);
    const user = App.currentUser;
    if (!match || !user) return;

    const container = document.getElementById('paymentContent');
    if (!container) return;

    document.getElementById('paymentTitle').textContent = match.title || match.venue;

    container.innerHTML = `
      <!-- 금액 -->
      <div style="text-align:center;padding:var(--space-xl) var(--space-md);">
        <div style="font-size:14px;color:var(--cc-gray-400);margin-bottom:8px;">송금할 금액</div>
        <div class="payment-amount">${Utils.formatCost(match.perPersonCost)}</div>
        <div style="font-size:13px;color:var(--cc-gray-600);margin-top:8px;">호스트: ${match.hostName}</div>
      </div>

      <!-- 경기 정보 요약 -->
      <div class="section">
        <div class="card" style="padding:var(--space-md);">
          <div style="font-size:12px;color:var(--cc-gray-600);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">경기 정보</div>
          <div class="match-info-row">${Icons.calendar} ${Utils.formatDate(match.date)} ${Utils.formatTime(match.time)}</div>
          <div class="match-info-row">${Icons.location} ${match.venue}</div>
          <div class="match-info-row">${Icons.users} ${match.participants.length}명 참가</div>
        </div>
      </div>

      <!-- 안내 -->
      <div class="section" style="padding-top:0;">
        <div style="background:rgba(255,232,18,0.05);border:1px solid rgba(255,232,18,0.2);border-radius:12px;padding:var(--space-md);">
          <div style="font-size:13px;color:var(--cc-kakao);font-weight:700;margin-bottom:8px;">💛 카카오페이 송금 안내</div>
          <div style="font-size:13px;color:var(--cc-gray-400);line-height:1.7;">
            아래 버튼을 누르면 카카오페이 앱으로 이동합니다.<br>
            <strong style="color:var(--cc-white);">호스트 ${match.hostName}</strong>에게 <strong style="color:var(--cc-lime);">${Utils.formatCost(match.perPersonCost)}</strong>를 송금해주세요.<br>
            <span style="font-size:11px;color:var(--cc-gray-600);">* 실제 서비스에서는 자동 연동됩니다</span>
          </div>
        </div>
      </div>

      <!-- 결제 수단 -->
      ${(() => {
        const pm = Store.get(`payment_${match.hostId}`) || {};
        const hasKakao = !!pm.kakaoLink;
        const hasBank = !!pm.accountNumber;

        let html = '';

        if (hasKakao) {
          html += `
          <div class="section" style="padding-top:0;">
            <button class="btn btn-kakao btn-full btn-lg" onclick="window.open('${pm.kakaoLink}','_blank');Payment.confirmManual('${match.id}')">
              ${Icons.kakao} &nbsp; 카카오페이로 ${Utils.formatCost(match.perPersonCost)} 송금하기
            </button>
          </div>
          `;
        }

        if (hasBank) {
          html += `
          <div class="section" style="padding-top:0;">
            <div style="background:rgba(74,222,128,0.05);border:1px solid rgba(74,222,128,0.2);border-radius:12px;padding:var(--space-md);">
              <div style="font-size:13px;color:#4ADE80;font-weight:700;margin-bottom:12px;">🏦 계좌 이체</div>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:12px;color:var(--cc-gray-400);">은행</span>
                  <span style="font-size:14px;font-weight:700;">${pm.bank}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:12px;color:var(--cc-gray-400);">계좌번호</span>
                  <span style="font-size:14px;font-weight:700;font-family:'Inter',monospace;letter-spacing:1px;">${pm.accountNumber}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:12px;color:var(--cc-gray-400);">예금주</span>
                  <span style="font-size:14px;font-weight:700;">${pm.accountHolder}</span>
                </div>
              </div>
              <button class="btn btn-secondary btn-sm" style="margin-top:14px;width:100%;"
                onclick="navigator.clipboard?.writeText('${pm.accountNumber}').then(()=>App.showToast('계좌번호가 복사됐어요','success'))">
                계좌번호 복사
              </button>
            </div>
          </div>
          `;
        }

        if (!hasKakao && !hasBank) {
          html += `
          <div class="section" style="padding-top:0;">
            <button class="btn btn-kakao btn-full btn-lg" onclick="Payment.processPayment('${match.id}')">
              ${Icons.kakao} &nbsp; 카카오페이로 ${Utils.formatCost(match.perPersonCost)} 송금하기
            </button>
          </div>
          `;
        }

        html += `
        <div class="section" style="padding-top:0;">
          <div style="text-align:center;margin-bottom:10px;font-size:12px;color:var(--cc-gray-600);">
            이미 송금하셨나요?
          </div>
          <button class="btn btn-secondary btn-full" onclick="Payment.confirmManual('${match.id}')">
            ✅ 송금했어요 (수동 확인)
          </button>
        </div>
        `;

        return html;
      })()}

      <div style="height:40px;"></div>
    `;
  },

  processPayment(matchId) {
    const match = Matches.getById(matchId);
    if (!match) return;

    // 실제 환경에서는 카카오페이 딥링크로 이동
    // 데모에서는 바로 처리
    App.showToast('카카오페이 앱으로 연결 중...', 'info', 1500);
    setTimeout(() => {
      this.confirmManual(matchId);
    }, 1500);
  },

  confirmManual(matchId) {
    const user = App.currentUser;
    if (!user) return;
    Matches.setPaymentStatus(matchId, user.id, true);
    App.showToast('✅ 입금이 확인됐어요!', 'success');
    App.addNotification({
      type: 'payment',
      title: '💳 입금 완료',
      body: '참가비 입금이 완료됐어요. 경기 당일 즐거운 시간 되세요! 🎾',
      matchId
    });
    App.navigate('match-detail', { matchId });
  }
};

// ── 커뮤니티 목록 ─────────────────────────────
const Community = {
  render() {
    const user = App.currentUser;
    if (!user) { App.navigate('login'); return; }

    const myCommunities = Communities.getUserCommunities(user.id);
    const container = document.getElementById('communityContent');
    if (!container) return;

    container.innerHTML = `
      <!-- 액션 버튼 -->
      <div style="padding:var(--space-md);display:flex;gap:8px;">
        <button class="btn btn-primary" style="flex:1;" onclick="Community.showCreate()">
          + 새 커뮤니티
        </button>
        <button class="btn btn-secondary" style="flex:1;" onclick="Community.showJoin()">
          코드로 참여
        </button>
      </div>

      <!-- 초대 코드 입력 영역 (숨김) -->
      <div id="joinArea" style="display:none;padding:0 var(--space-md) var(--space-md);">
        <div class="card" style="padding:var(--space-md);">
          <div style="font-size:14px;font-weight:700;margin-bottom:12px;">초대 코드 입력</div>
          <div style="display:flex;gap:8px;">
            <input type="text" id="inviteCodeInput" class="form-input" placeholder="YTPARK" maxlength="10"
              style="flex:1;text-transform:uppercase;font-family:'Inter',monospace;font-weight:700;letter-spacing:2px;">
            <button class="btn btn-green" onclick="Community.joinWithCode()">참여</button>
          </div>
        </div>
      </div>

      <!-- 커뮤니티 생성 영역 (숨김) -->
      <div id="createArea" style="display:none;padding:0 var(--space-md) var(--space-md);">
        <div class="card" style="padding:var(--space-md);">
          <div style="font-size:14px;font-weight:700;margin-bottom:12px;">새 커뮤니티 만들기</div>
          <div class="form-group">
            <label class="form-label">커뮤니티 이름</label>
            <input type="text" id="newCommName" class="form-input" placeholder="예: 강남 번개 테니스" maxlength="20">
          </div>
          <div class="form-group">
            <label class="form-label">설명 <span style="color:var(--cc-gray-600);font-size:11px;">(선택)</span></label>
            <input type="text" id="newCommDesc" class="form-input" placeholder="간단한 소개를 입력해주세요" maxlength="50">
          </div>
          <button class="btn btn-primary btn-full" onclick="Community.create()">커뮤니티 만들기</button>
        </div>
      </div>

      <!-- 내 커뮤니티 목록 -->
      <div style="padding:0 var(--space-md);">
        <div class="section-title" style="margin-bottom:12px;">내 커뮤니티 (${myCommunities.length})</div>
        ${myCommunities.length === 0 ? `
          <div class="empty-state" style="padding:40px 0;">
            <div class="empty-icon">🎾</div>
            <div class="empty-title">아직 커뮤니티가 없어요</div>
            <div class="empty-body">커뮤니티를 만들거나 초대 코드로 참여해보세요!</div>
          </div>
        ` : myCommunities.map(c => {
          const matchCount = Communities.getMatches(c.id).length;
          const memberCount = c.memberIds.length;
          const isOwner = c.ownerId === user.id;
          return `
            <div class="match-card" style="margin-bottom:12px;" onclick="App.navigate('community-detail', {communityId:'${c.id}'})">
              <div style="display:flex;align-items:flex-start;gap:12px;">
                <div style="width:48px;height:48px;background:linear-gradient(135deg,rgba(200,255,0,0.2),rgba(200,255,0,0.05));border:1px solid rgba(200,255,0,0.2);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">🎾</div>
                <div style="flex:1;min-width:0;">
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                    <div style="font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name}</div>
                    ${isOwner ? `<span style="font-size:10px;color:var(--cc-lime);font-weight:700;background:rgba(200,255,0,0.1);padding:1px 6px;border-radius:999px;flex-shrink:0;">운영자</span>` : ''}
                  </div>
                  ${c.description ? `<div style="font-size:12px;color:var(--cc-gray-400);margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.description}</div>` : ''}
                  <div style="display:flex;gap:12px;">
                    <span style="font-size:12px;color:var(--cc-gray-600);">👥 ${memberCount}명</span>
                    <span style="font-size:12px;color:var(--cc-gray-600);">🎾 경기 ${matchCount}개</span>
                    <span style="font-size:12px;color:var(--cc-gray-600);font-family:'Inter',monospace;font-weight:700;letter-spacing:1px;">${c.inviteCode}</span>
                  </div>
                </div>
                <svg width="16" height="16" fill="none" stroke="var(--cc-gray-600)" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:4px;"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="height:24px;"></div>
    `;
  },

  showCreate() {
    const createArea = document.getElementById('createArea');
    const joinArea = document.getElementById('joinArea');
    if (!createArea) return;
    const isVisible = createArea.style.display !== 'none';
    createArea.style.display = isVisible ? 'none' : 'block';
    if (joinArea) joinArea.style.display = 'none';
  },

  showJoin() {
    const joinArea = document.getElementById('joinArea');
    const createArea = document.getElementById('createArea');
    if (!joinArea) return;
    const isVisible = joinArea.style.display !== 'none';
    joinArea.style.display = isVisible ? 'none' : 'block';
    if (createArea) createArea.style.display = 'none';
    if (!isVisible) setTimeout(() => document.getElementById('inviteCodeInput')?.focus(), 100);
  },

  create() {
    const user = App.currentUser;
    if (!user) return;
    const name = document.getElementById('newCommName')?.value?.trim();
    const description = document.getElementById('newCommDesc')?.value?.trim();
    if (!name) { App.showToast('커뮤니티 이름을 입력해주세요', 'error'); return; }

    const community = Communities.create({ name, description, ownerId: user.id, ownerName: user.name });
    App.showToast(`"${community.name}" 커뮤니티가 만들어졌어요! 초대코드: ${community.inviteCode}`, 'success', 4000);
    this.render();
  },

  joinWithCode() {
    const user = App.currentUser;
    if (!user) return;
    const code = document.getElementById('inviteCodeInput')?.value?.trim();
    if (!code) { App.showToast('초대 코드를 입력해주세요', 'error'); return; }

    const result = Communities.join(code, user.id, user.name);
    if (result.success) {
      App.showToast(`"${result.community.name}" 에 참여했어요! 🎾`, 'success');
      this.render();
    } else {
      const msgs = { notfound: '코드를 찾을 수 없어요', already: '이미 참여 중인 커뮤니티예요' };
      App.showToast(msgs[result.reason] || '참여 중 오류가 발생했어요', 'error');
    }
  }
};

// ── 커뮤니티 상세 ──────────────────────────────
const CommunityDetail = {
  currentCommunityId: null,

  render(data) {
    const communityId = data?.communityId || this.currentCommunityId;
    if (!communityId) { App.navigate('community'); return; }
    this.currentCommunityId = communityId;

    const community = Communities.getById(communityId);
    if (!community) {
      App.showToast('커뮤니티를 찾을 수 없어요', 'error');
      App.navigate('community');
      return;
    }

    const user = App.currentUser;
    const isOwner = community.ownerId === user?.id;
    const matches = Communities.getMatches(communityId);
    const memberCount = community.memberIds.length;

    // 헤더 타이틀 업데이트
    const titleEl = document.getElementById('commDetailTitle');
    if (titleEl) titleEl.textContent = community.name;

    const container = document.getElementById('communityDetailContent');
    if (!container) return;

    // 멤버 아바타 (최대 5명 표시)
    const memberNames = community.memberNames || {};
    const memberAvatars = community.memberIds.slice(0, 5).map(id => {
      const name = memberNames[id] || '?';
      return `<div class="avatar avatar-sm" style="margin-left:-8px;border:2px solid var(--cc-card);">${name[0]}</div>`;
    }).join('');

    // 경기 목록 렌더
    const matchesHtml = matches.length === 0 ? `
      <div class="empty-state" style="padding:32px 0;">
        <div class="empty-icon">🎾</div>
        <div class="empty-title">경기가 없어요</div>
        <div class="empty-body">이 커뮤니티에서 첫 번째 경기를 개설해보세요!</div>
      </div>
    ` : matches.map(m => {
      const status = Utils.getStatusLabel(m.status);
      const filled = m.participants.length;
      const dots = Array.from({length: m.maxPlayers}, (_, i) =>
        `<div class="slot-dot ${i < filled ? 'filled' : ''}"></div>`
      ).join('');
      return `
        <div class="match-card" style="margin-bottom:12px;" onclick="App.navigate('match-detail', {matchId:'${m.id}'})">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span class="match-status-badge ${status.class}">${status.label}</span>
            <span style="font-size:11px;color:var(--cc-gray-400);padding:2px 8px;border-radius:999px;background:rgba(255,255,255,0.05);">${m.level}</span>
          </div>
          <div class="match-title" style="margin-bottom:6px;">${m.title || m.venue}</div>
          <div class="match-info-row">${Icons.location} ${m.venue}</div>
          <div class="match-info-row">${Icons.calendar} ${Utils.formatDate(m.date)} &nbsp;${Icons.clock} ${Utils.formatTime(m.time)}</div>
          <div class="match-card-footer">
            <div class="match-slots">
              <div class="slot-dots">${dots}</div>
              <span style="font-size:12px;color:var(--cc-gray-400);margin-left:4px;">${filled}/${m.maxPlayers}</span>
            </div>
            <div class="match-price">${Utils.formatCost(m.perPersonCost)}</div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <!-- 커뮤니티 히어로 -->
      <div style="padding:var(--space-md);">
        <div class="card" style="padding:var(--space-md);">
          <div style="display:flex;align-items:flex-start;gap:16px;">
            <div style="width:56px;height:56px;background:linear-gradient(135deg,rgba(200,255,0,0.2),rgba(200,255,0,0.05));border:1px solid rgba(200,255,0,0.2);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">🎾</div>
            <div style="flex:1;">
              <div style="font-size:18px;font-weight:800;margin-bottom:4px;">${community.name}</div>
              ${community.description ? `<div style="font-size:13px;color:var(--cc-gray-400);margin-bottom:8px;">${community.description}</div>` : ''}
              <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
                <div style="display:flex;margin-left:8px;">${memberAvatars}</div>
                <span style="font-size:13px;color:var(--cc-gray-400);">멤버 ${memberCount}명</span>
              </div>
            </div>
          </div>

          <!-- 초대 코드 -->
          <div style="margin-top:16px;padding:12px;background:rgba(200,255,0,0.05);border:1px dashed rgba(200,255,0,0.25);border-radius:12px;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:11px;color:var(--cc-gray-600);margin-bottom:2px;">초대 코드</div>
              <div style="font-size:20px;font-weight:900;font-family:'Inter',monospace;color:var(--cc-lime);letter-spacing:4px;">${community.inviteCode}</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="CommunityDetail.copyInviteCode('${community.inviteCode}')">
              복사
            </button>
          </div>
        </div>
      </div>

      <!-- 멤버 목록 -->
      <div style="padding:0 var(--space-md) var(--space-md);">
        <div class="card" style="padding:var(--space-md);">
          <div class="section-title" style="margin-bottom:12px;">멤버 (${memberCount}명)</div>
          ${community.memberIds.map(id => {
            const name = memberNames[id] || '알 수 없음';
            const isCommOwner = id === community.ownerId;
            const isMe = id === user?.id;
            return `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--cc-border);">
                <div class="avatar avatar-sm">${name[0]}</div>
                <div style="flex:1;font-size:14px;font-weight:500;">
                  ${name} ${isMe ? '<span style="font-size:11px;color:var(--cc-gray-600);">(나)</span>' : ''}
                </div>
                ${isCommOwner ? `<span style="font-size:10px;color:var(--cc-lime);font-weight:700;background:rgba(200,255,0,0.1);padding:2px 8px;border-radius:999px;">운영자</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 이 커뮤니티의 경기 -->
      <div style="padding:0 var(--space-md);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div class="section-title">커뮤니티 경기 (${matches.length})</div>
          <button class="btn btn-primary btn-sm" onclick="App.navigate('create-match')">+ 개설</button>
        </div>
        ${matchesHtml}
      </div>

      ${isOwner ? `
      <!-- 운영자 전용 -->
      <div style="padding:var(--space-md);">
        <div class="card" style="padding:var(--space-md);border-color:rgba(200,255,0,0.2);">
          <div style="font-size:12px;color:var(--cc-lime);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">운영자 메뉴</div>
          <button class="btn btn-danger btn-full btn-sm" onclick="CommunityDetail.deleteCommunity('${community.id}')">
            커뮤니티 삭제
          </button>
        </div>
      </div>
      ` : `
      <div style="padding:var(--space-md);">
        <button class="btn btn-secondary btn-full btn-sm" onclick="CommunityDetail.leaveCommunity('${community.id}')">
          커뮤니티 탈퇴
        </button>
      </div>
      `}

      <div style="height:24px;"></div>
    `;
  },

  copyInviteCode(code) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        App.showToast(`초대 코드 ${code} 복사됐어요!`, 'success');
      });
    } else {
      App.showToast(`초대 코드: ${code}`, 'info');
    }
  },

  leaveCommunity(communityId) {
    const user = App.currentUser;
    if (!user) return;
    if (!confirm('정말 이 커뮤니티를 탈퇴할까요?')) return;

    const communities = Communities.getAll();
    const idx = communities.findIndex(c => c.id === communityId);
    if (idx === -1) return;

    communities[idx].memberIds = communities[idx].memberIds.filter(id => id !== user.id);
    if (communities[idx].memberNames) delete communities[idx].memberNames[user.id];
    Store.set('communities', communities);

    App.showToast('커뮤니티를 탈퇴했어요', 'info');
    App.navigate('community');
  },

  deleteCommunity(communityId) {
    const user = App.currentUser;
    if (!user) return;
    const community = Communities.getById(communityId);
    if (!community || community.ownerId !== user.id) return;
    if (!confirm(`"${community.name}" 커뮤니티를 삭제할까요?\n이 작업은 되돌릴 수 없어요.`)) return;

    const communities = Communities.getAll().filter(c => c.id !== communityId);
    Store.set('communities', communities);

    App.showToast('커뮤니티가 삭제됐어요', 'info');
    App.navigate('community');
  }
};

// ── 결제 수단 관리 ───────────────────────────
const AccountSettings = {
  BANKS: ['국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행', '카카오뱅크', '토스뱅크', 'SC제일은행', '씨티은행', '새마을금고', '수협은행'],

  get(userId) {
    return Store.get(`payment_${userId}`) || {};
  },

  render() {
    const user = App.currentUser;
    if (!user) { App.navigate('login'); return; }

    const pm = this.get(user.id);
    const container = document.getElementById('accountSettingsContent');
    if (!container) return;

    const bankOptions = this.BANKS.map(b =>
      `<option value="${b}" ${pm.bank === b ? 'selected' : ''}>${b}</option>`
    ).join('');

    container.innerHTML = `
      <div style="padding:var(--space-md);">

        <!-- ① 카카오페이 송금 링크 -->
        <div style="font-size:12px;color:var(--cc-gray-600);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">💛 카카오페이 송금 링크</div>
        <div class="card" style="padding:var(--space-md);margin-bottom:var(--space-md);">
          ${pm.kakaoLink ? `
          <div style="background:rgba(255,232,18,0.08);border:1px solid rgba(255,232,18,0.25);border-radius:10px;padding:12px;margin-bottom:14px;display:flex;align-items:center;gap:10px;">
            <div style="font-size:20px;flex-shrink:0;">✅</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;color:var(--cc-kakao);font-weight:700;margin-bottom:2px;">등록됨</div>
              <div style="font-size:11px;color:var(--cc-gray-400);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${pm.kakaoLink}</div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="AccountSettings.removeKakao()" style="flex-shrink:0;">삭제</button>
          </div>
          ` : ''}
          <div class="form-group" style="margin-bottom:10px;">
            <label class="form-label">${pm.kakaoLink ? '링크 변경' : '송금 링크 URL'}</label>
            <input type="url" id="kakao_link" class="form-input"
              placeholder="https://qr.kakaopay.com/..."
              value="${pm.kakaoLink || ''}">
          </div>
          <div style="background:rgba(255,232,18,0.05);border-radius:8px;padding:10px 12px;margin-bottom:12px;">
            <div style="font-size:12px;color:var(--cc-kakao);font-weight:700;margin-bottom:4px;">링크 가져오는 방법</div>
            <div style="font-size:12px;color:var(--cc-gray-400);line-height:1.7;">
              카카오페이 앱 → 송금 → 내 송금 링크 → 링크 복사
            </div>
          </div>
          <button class="btn btn-kakao btn-full" onclick="AccountSettings.saveKakao()">
            카카오페이 링크 저장
          </button>
        </div>

        <!-- ② 계좌 이체 -->
        <div style="font-size:12px;color:var(--cc-gray-600);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">🏦 계좌 이체 정보</div>
        <div class="card" style="padding:var(--space-md);margin-bottom:var(--space-md);">
          ${pm.accountNumber ? `
          <div style="background:rgba(74,222,128,0.05);border:1px solid rgba(74,222,128,0.2);border-radius:10px;padding:12px;margin-bottom:14px;">
            <div style="font-size:12px;color:#4ADE80;font-weight:700;margin-bottom:8px;">✅ 등록된 계좌</div>
            <div style="font-size:15px;font-weight:700;">${pm.bank}</div>
            <div style="font-size:14px;font-family:'Inter',monospace;letter-spacing:1px;margin-top:4px;">${pm.accountNumber}</div>
            <div style="font-size:12px;color:var(--cc-gray-400);margin-top:4px;">예금주 ${pm.accountHolder}</div>
          </div>
          ` : ''}
          <div class="form-group">
            <label class="form-label">은행</label>
            <select id="acct_bank" class="form-input">
              <option value="">은행 선택</option>
              ${bankOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">계좌번호</label>
            <input type="text" id="acct_number" class="form-input"
              placeholder="예: 1234-56-7890123"
              value="${pm.accountNumber || ''}"
              inputmode="numeric">
          </div>
          <div class="form-group">
            <label class="form-label">예금주</label>
            <input type="text" id="acct_holder" class="form-input"
              placeholder="이름을 입력해주세요"
              value="${pm.accountHolder || ''}">
          </div>
          <button class="btn btn-primary btn-full" onclick="AccountSettings.saveBank()">
            계좌 정보 저장
          </button>
          ${pm.accountNumber ? `
          <button class="btn btn-danger btn-full" style="margin-top:8px;" onclick="AccountSettings.removeBank()">
            계좌 삭제
          </button>
          ` : ''}
        </div>

        <!-- 안내 -->
        <div class="card" style="padding:var(--space-md);">
          <div style="font-size:12px;color:var(--cc-gray-600);font-weight:700;margin-bottom:8px;">💡 안내</div>
          <div style="font-size:13px;color:var(--cc-gray-400);line-height:1.8;">
            • 카카오페이 링크 등록 시 참가자가 버튼 하나로 바로 송금 가능해요<br>
            • 계좌 이체 정보는 카카오페이가 없는 참가자를 위한 백업 수단이에요<br>
            • 둘 다 등록하면 결제 화면에 모두 표시돼요
          </div>
        </div>

        <div style="height:24px;"></div>
      </div>
    `;
  },

  saveKakao() {
    const user = App.currentUser;
    if (!user) return;
    const link = document.getElementById('kakao_link')?.value?.trim();
    if (!link) { App.showToast('링크를 입력해주세요', 'error'); return; }
    if (!link.startsWith('http')) { App.showToast('올바른 URL을 입력해주세요', 'error'); return; }
    const pm = this.get(user.id);
    pm.kakaoLink = link;
    Store.set(`payment_${user.id}`, pm);
    App.showToast('✅ 카카오페이 링크가 저장됐어요', 'success');
    this.render();
  },

  removeKakao() {
    if (!confirm('카카오페이 링크를 삭제할까요?')) return;
    const user = App.currentUser;
    if (!user) return;
    const pm = this.get(user.id);
    delete pm.kakaoLink;
    Store.set(`payment_${user.id}`, pm);
    App.showToast('카카오페이 링크가 삭제됐어요', 'info');
    this.render();
  },

  saveBank() {
    const user = App.currentUser;
    if (!user) return;
    const bank = document.getElementById('acct_bank')?.value;
    const accountNumber = document.getElementById('acct_number')?.value?.trim();
    const accountHolder = document.getElementById('acct_holder')?.value?.trim();
    if (!bank || !accountNumber || !accountHolder) {
      App.showToast('모든 항목을 입력해주세요', 'error');
      return;
    }
    const pm = this.get(user.id);
    pm.bank = bank;
    pm.accountNumber = accountNumber;
    pm.accountHolder = accountHolder;
    Store.set(`payment_${user.id}`, pm);
    App.showToast('✅ 계좌 정보가 저장됐어요', 'success');
    this.render();
  },

  removeBank() {
    if (!confirm('계좌 정보를 삭제할까요?')) return;
    const user = App.currentUser;
    if (!user) return;
    const pm = this.get(user.id);
    delete pm.bank;
    delete pm.accountNumber;
    delete pm.accountHolder;
    Store.set(`payment_${user.id}`, pm);
    App.showToast('계좌 정보가 삭제됐어요', 'info');
    this.render();
  }
};

window.Home = Home;
window.MatchDetail = MatchDetail;
window.CreateMatch = CreateMatch;
window.HostDash = HostDash;
window.MyMatches = MyMatches;
window.Notifications = Notifications;
window.Profile = Profile;
window.Payment = Payment;
window.Community = Community;
window.CommunityDetail = CommunityDetail;
window.AccountSettings = AccountSettings;
