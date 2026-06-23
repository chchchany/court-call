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
      ? `<span style="font-size:11px;color:var(--color-info-fg);margin-left:4px;">+${m.waitlist.length}대기</span>`
      : '';

    // 내 상태 배지
    let myBadge = '';
    if (isHost) myBadge = `<span class="chip chip-active" style="padding:2px 8px;font-size:10px;">호스트</span>`;
    else if (isParticipant) myBadge = `<span class="chip" style="padding:2px 8px;font-size:10px;background:rgba(74,222,128,0.1);color:#4ADE80;border:1px solid rgba(74,222,128,0.3);">참가중</span>`;
    else if (isWaiting) myBadge = `<span class="chip" style="padding:2px 8px;font-size:10px;background:rgba(61,139,255,0.1);color:var(--color-info-fg);border:1px solid rgba(61,139,255,0.3);">대기중</span>`;

    return `
      <div class="match-card" onclick="App.navigate('match-detail', {matchId: '${m.id}'})">
        <div class="match-card-header">
          <div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span class="match-status-badge ${status.class}">${status.label}</span>
              <span style="font-size:11px;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,0.05);color:var(--color-ink3);">${m.level}</span>
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
            <span style="font-size:12px;color:var(--color-ink3);margin-left:4px;">${filled}/${m.maxPlayers}${waitBadge}</span>
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
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--color-border);">
            <div class="avatar avatar-sm">${p.userName[0]}</div>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:600;">${p.userName}</div>
              <div style="font-size:11px;color:var(--color-ink4);">${Utils.timeAgo(p.appliedAt)} 신청</div>
            </div>
            ${p.userId === match.hostId ? `<span style="font-size:10px;color:var(--color-lime);font-weight:700;background:rgba(200,255,0,0.1);padding:2px 8px;border-radius:999px;">호스트</span>` : ''}
            ${match.paymentStatus?.[p.userId] ? `<span style="font-size:10px;color:#4ADE80;font-weight:700;">입금완료</span>` : (match.status === 'confirmed' ? `<span style="font-size:10px;color:var(--color-warning-fg);font-weight:700;">입금대기</span>` : '')}
          </div>
        `;
      } else {
        return `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--color-border);">
            <div class="avatar avatar-sm" style="background:var(--color-border);opacity:0.5;"></div>
            <div style="font-size:13px;color:var(--color-ink4);">빈 자리</div>
          </div>
        `;
      }
    }).join('');

    // 대기자 목록
    const waitlistHtml = match.waitlist.length > 0 ? `
      <div style="margin-top:12px;">
        <div class="section-title">대기자 목록</div>
        ${match.waitlist.map((p, i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--color-border);">
            <div style="width:24px;height:24px;background:rgba(61,139,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--color-info-fg);">${i+1}</div>
            <div class="avatar avatar-sm" style="background:linear-gradient(135deg,#3D8BFF,#6BB3FF);">${p.userName[0]}</div>
            <div style="flex:1;font-size:14px;font-weight:500;">${p.userName}</div>
            <div style="font-size:11px;color:var(--color-ink4);">${Utils.timeAgo(p.appliedAt)}</div>
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
              <div style="font-size:13px;color:var(--color-ink3);margin-top:4px;">참가비 입금이 확인됐어요</div>
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
            <div style="font-size:10px;color:var(--color-info-fg);margin-top:2px;">대기 순번</div>
          </div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:600;">대기 중이에요</div>
            <div style="font-size:12px;color:var(--color-ink3);margin-top:2px;">취소자 발생 시 자동으로 승격돼요</div>
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
            <div class="detail-info-value">${match.participants.length}<span style="font-size:13px;color:var(--color-ink3);">/${match.maxPlayers}명</span></div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">${Icons.won} 참가비</div>
            <div class="detail-info-value" style="color:var(--color-lime);">${Utils.formatCost(match.perPersonCost)}</div>
          </div>
        </div>
      </div>

      <!-- 장소 정보 -->
      <div class="section">
        <div class="card" style="padding:var(--space-md);">
          <div style="font-size:12px;color:var(--color-ink4);margin-bottom:8px;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">📍 장소</div>
          <div style="font-size:15px;font-weight:600;">${match.venue}</div>
          <div style="font-size:13px;color:var(--color-ink3);margin-top:4px;">${match.address || ''}</div>
          ${match.address ? `<button class="btn btn-secondary btn-sm" style="margin-top:12px;width:100%;" onclick="window.open('https://map.kakao.com/link/search/${encodeURIComponent(match.address)}')">🗺 지도에서 보기</button>` : ''}
        </div>
      </div>

      <!-- 레벨 & 메모 -->
      <div class="section" style="padding-top:0;">
        <div class="card" style="padding:var(--space-md);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <span style="font-size:12px;color:var(--color-ink4);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">🎾 레벨</span>
            <span style="font-size:14px;font-weight:700;color:${Utils.getLevelColor(match.level)};">${match.level}</span>
          </div>
          ${match.note ? `
            <div style="font-size:12px;color:var(--color-ink4);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">📝 메모</div>
            <div style="font-size:14px;color:var(--color-ink2);line-height:1.6;">${match.note}</div>
          ` : ''}
        </div>
      </div>

      <!-- 비용 계산 -->
      <div class="section" style="padding-top:0;">
        <div class="cost-calculator">
          <div class="cost-row">
            <span style="color:var(--color-ink3);">코트 총비용</span>
            <span style="font-weight:600;">${Utils.formatCost(match.totalCost)}</span>
          </div>
          <div class="cost-row">
            <span style="color:var(--color-ink3);">모집 인원</span>
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
          <span style="color:var(--color-ink3);">코트 총비용</span>
          <span style="font-weight:600;">${Utils.formatCost(total)}</span>
        </div>
        <div class="cost-row">
          <span style="color:var(--color-ink3);">모집 인원</span>
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
          <div style="font-size:12px;color:var(--color-ink3);">참가자들이 송금할 수 없어요. 카카오페이 링크 또는 계좌를 등록해주세요.</div>
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
            <div class="stat-value" style="color:var(--color-lime);">${match.participants.length}</div>
            <div class="stat-label">참가자</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:var(--color-info-fg);">${match.waitlist.length}</div>
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
              <span style="color:var(--color-ink3);">${paidCount}/${totalExpected}명 입금</span>
              <span style="color:var(--color-lime);font-weight:700;">${Utils.formatCost(receivedAmount)} / ${Utils.formatCost(totalAmount)}</span>
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
                    ${p.userId === match.hostId ? ' <span style="font-size:10px;color:var(--color-lime);">(호스트)</span>' : ''}
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
              <div style="width:24px;height:24px;background:rgba(61,139,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--color-info-fg);">${i+1}</div>
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
            <div style="font-size:13px;color:var(--color-ink3);margin-top:4px;">참가비 수금을 확인해주세요</div>
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
      if (isHost) statusBadge = `<span style="font-size:11px;color:var(--color-lime);font-weight:700;">호스트</span>`;
      else if (isWaiting) statusBadge = `<span style="font-size:11px;color:var(--color-info-fg);font-weight:700;">대기중 ${m.waitlist.findIndex(p=>p.userId===user?.id)+1}번</span>`;
      else if (m.status === 'confirmed' && !paid) statusBadge = `<span style="font-size:11px;color:var(--color-warning-fg);font-weight:700;">입금 필요</span>`;
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
            <span style="font-size:13px;color:var(--color-ink3);">${m.participants.length}/${m.maxPlayers}명</span>
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
        <div style="font-size:14px;color:var(--color-ink3);margin-bottom:8px;">송금할 금액</div>
        <div class="payment-amount">${Utils.formatCost(match.perPersonCost)}</div>
        <div style="font-size:13px;color:var(--color-ink4);margin-top:8px;">호스트: ${match.hostName}</div>
      </div>

      <!-- 경기 정보 요약 -->
      <div class="section">
        <div class="card" style="padding:var(--space-md);">
          <div style="font-size:12px;color:var(--color-ink4);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">경기 정보</div>
          <div class="match-info-row">${Icons.calendar} ${Utils.formatDate(match.date)} ${Utils.formatTime(match.time)}</div>
          <div class="match-info-row">${Icons.location} ${match.venue}</div>
          <div class="match-info-row">${Icons.users} ${match.participants.length}명 참가</div>
        </div>
      </div>

      <!-- 안내 -->
      <div class="section" style="padding-top:0;">
        <div style="background:rgba(255,232,18,0.05);border:1px solid rgba(255,232,18,0.2);border-radius:12px;padding:var(--space-md);">
          <div style="font-size:13px;color:var(--color-kakao);font-weight:700;margin-bottom:8px;">💛 카카오페이 송금 안내</div>
          <div style="font-size:13px;color:var(--color-ink3);line-height:1.7;">
            아래 버튼을 누르면 카카오페이 앱으로 이동합니다.<br>
            <strong style="color:var(--color-ink);">호스트 ${match.hostName}</strong>에게 <strong style="color:var(--color-lime);">${Utils.formatCost(match.perPersonCost)}</strong>를 송금해주세요.<br>
            <span style="font-size:11px;color:var(--color-ink4);">* 실제 서비스에서는 자동 연동됩니다</span>
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
                  <span style="font-size:12px;color:var(--color-ink3);">은행</span>
                  <span style="font-size:14px;font-weight:700;">${pm.bank}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:12px;color:var(--color-ink3);">계좌번호</span>
                  <span style="font-size:14px;font-weight:700;font-family:'Inter',monospace;letter-spacing:1px;">${pm.accountNumber}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:12px;color:var(--color-ink3);">예금주</span>
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
          <div style="text-align:center;margin-bottom:10px;font-size:12px;color:var(--color-ink4);">
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
            <label class="form-label">설명 <span style="color:var(--color-ink4);font-size:11px;">(선택)</span></label>
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
                    ${isOwner ? `<span style="font-size:10px;color:var(--color-lime);font-weight:700;background:rgba(200,255,0,0.1);padding:1px 6px;border-radius:999px;flex-shrink:0;">운영자</span>` : ''}
                  </div>
                  ${c.description ? `<div style="font-size:12px;color:var(--color-ink3);margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.description}</div>` : ''}
                  <div style="display:flex;gap:12px;">
                    <span style="font-size:12px;color:var(--color-ink4);">👥 ${memberCount}명</span>
                    <span style="font-size:12px;color:var(--color-ink4);">🎾 경기 ${matchCount}개</span>
                    <span style="font-size:12px;color:var(--color-ink4);font-family:'Inter',monospace;font-weight:700;letter-spacing:1px;">${c.inviteCode}</span>
                  </div>
                </div>
                <svg width="16" height="16" fill="none" stroke="var(--color-ink4)" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:4px;"><polyline points="9 18 15 12 9 6"/></svg>
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
      return `<div class="avatar avatar-sm" style="margin-left:-8px;border:2px solid var(--color-card);">${name[0]}</div>`;
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
            <span style="font-size:11px;color:var(--color-ink3);padding:2px 8px;border-radius:999px;background:rgba(255,255,255,0.05);">${m.level}</span>
          </div>
          <div class="match-title" style="margin-bottom:6px;">${m.title || m.venue}</div>
          <div class="match-info-row">${Icons.location} ${m.venue}</div>
          <div class="match-info-row">${Icons.calendar} ${Utils.formatDate(m.date)} &nbsp;${Icons.clock} ${Utils.formatTime(m.time)}</div>
          <div class="match-card-footer">
            <div class="match-slots">
              <div class="slot-dots">${dots}</div>
              <span style="font-size:12px;color:var(--color-ink3);margin-left:4px;">${filled}/${m.maxPlayers}</span>
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
              ${community.description ? `<div style="font-size:13px;color:var(--color-ink3);margin-bottom:8px;">${community.description}</div>` : ''}
              <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
                <div style="display:flex;margin-left:8px;">${memberAvatars}</div>
                <span style="font-size:13px;color:var(--color-ink3);">멤버 ${memberCount}명</span>
              </div>
            </div>
          </div>

          <!-- 초대 코드 -->
          <div style="margin-top:16px;padding:12px;background:rgba(200,255,0,0.05);border:1px dashed rgba(200,255,0,0.25);border-radius:12px;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:11px;color:var(--color-ink4);margin-bottom:2px;">초대 코드</div>
              <div style="font-size:20px;font-weight:900;font-family:'Inter',monospace;color:var(--color-lime);letter-spacing:4px;">${community.inviteCode}</div>
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
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--color-border);">
                <div class="avatar avatar-sm">${name[0]}</div>
                <div style="flex:1;font-size:14px;font-weight:500;">
                  ${name} ${isMe ? '<span style="font-size:11px;color:var(--color-ink4);">(나)</span>' : ''}
                </div>
                ${isCommOwner ? `<span style="font-size:10px;color:var(--color-lime);font-weight:700;background:rgba(200,255,0,0.1);padding:2px 8px;border-radius:999px;">운영자</span>` : ''}
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
          <div style="font-size:12px;color:var(--color-lime);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">운영자 메뉴</div>
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
        <div style="font-size:12px;color:var(--color-ink4);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">💛 카카오페이 송금 링크</div>
        <div class="card" style="padding:var(--space-md);margin-bottom:var(--space-md);">
          ${pm.kakaoLink ? `
          <div style="background:rgba(255,232,18,0.08);border:1px solid rgba(255,232,18,0.25);border-radius:10px;padding:12px;margin-bottom:14px;display:flex;align-items:center;gap:10px;">
            <div style="font-size:20px;flex-shrink:0;">✅</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;color:var(--color-kakao);font-weight:700;margin-bottom:2px;">등록됨</div>
              <div style="font-size:11px;color:var(--color-ink3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${pm.kakaoLink}</div>
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
            <div style="font-size:12px;color:var(--color-kakao);font-weight:700;margin-bottom:4px;">링크 가져오는 방법</div>
            <div style="font-size:12px;color:var(--color-ink3);line-height:1.7;">
              카카오페이 앱 → 송금 → 내 송금 링크 → 링크 복사
            </div>
          </div>
          <button class="btn btn-kakao btn-full" onclick="AccountSettings.saveKakao()">
            카카오페이 링크 저장
          </button>
        </div>

        <!-- ② 계좌 이체 -->
        <div style="font-size:12px;color:var(--color-ink4);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">🏦 계좌 이체 정보</div>
        <div class="card" style="padding:var(--space-md);margin-bottom:var(--space-md);">
          ${pm.accountNumber ? `
          <div style="background:rgba(74,222,128,0.05);border:1px solid rgba(74,222,128,0.2);border-radius:10px;padding:12px;margin-bottom:14px;">
            <div style="font-size:12px;color:#4ADE80;font-weight:700;margin-bottom:8px;">✅ 등록된 계좌</div>
            <div style="font-size:15px;font-weight:700;">${pm.bank}</div>
            <div style="font-size:14px;font-family:'Inter',monospace;letter-spacing:1px;margin-top:4px;">${pm.accountNumber}</div>
            <div style="font-size:12px;color:var(--color-ink3);margin-top:4px;">예금주 ${pm.accountHolder}</div>
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
          <div style="font-size:12px;color:var(--color-ink4);font-weight:700;margin-bottom:8px;">💡 안내</div>
          <div style="font-size:13px;color:var(--color-ink3);line-height:1.8;">
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

// ── 코트 취소 알림 설정 ───────────────────────────
const CourtAlert = {
  _state: {
    alertOn: true,
    courts: [],      // 장소(venue) 기준 중복 제거된 코트 목록
    allSlots: [],    // API에서 받은 전체 슬롯 (폴링용)
    loading: false,
    error: null,
    search: '',
    areaFilter: [],
    selectedIds: [], // place_name 기준으로 선택
    days: [],
    timeStart: '07:00',
    timeEnd: '22:00',
    lastStatuses: {}, // svcId → 마지막 상태 (변경 감지용)
    pollTimer: null,
    lastFetched: null,
  },

  AREAS: ['강남구','강동구','강서구','관악구','광진구','구로구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구'],
  DAYS: ['일','월','화','수','목','금','토'],
  TIME_OPTIONS: ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'],
  POLL_INTERVAL: 5 * 60 * 1000, // 5분

  // 데모 코트 목록 — 장소(venue) 단위, 날짜/시간 없음
  DEMO_COURTS: [
    { svc_id:'잠실한강공원',       court_name:'잠실 한강공원 테니스장',     place_name:'잠실한강공원',       area:'송파구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'여의도한강공원',     court_name:'여의도 한강공원 테니스장',   place_name:'여의도한강공원',     area:'영등포구', svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'반포한강공원',       court_name:'반포 한강공원 테니스장',     place_name:'반포한강공원',       area:'서초구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'뚝섬한강공원',       court_name:'뚝섬 한강공원 테니스장',    place_name:'뚝섬한강공원',       area:'광진구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'망원한강공원',       court_name:'망원 한강공원 테니스장',     place_name:'망원한강공원',       area:'마포구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'목동종합운동장',     court_name:'목동 종합운동장 테니스장',   place_name:'목동종합운동장',     area:'양천구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'광나루한강공원',     court_name:'광나루 한강공원 테니스장',   place_name:'광나루한강공원',     area:'광진구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'노원구민체육센터',   court_name:'노원 공릉 테니스장',         place_name:'노원구민체육센터',   area:'노원구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'강서한강공원',       court_name:'강서 한강공원 테니스장',     place_name:'강서한강공원',       area:'강서구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'용산가족공원',       court_name:'용산 가족공원 테니스장',     place_name:'용산가족공원',       area:'용산구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'성동구민체육센터',   court_name:'성동구 테니스장',            place_name:'성동구민체육센터',   area:'성동구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'강남구민체육센터',   court_name:'강남 구민체육센터 테니스장', place_name:'강남구민체육센터',   area:'강남구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'서초학생체육관',     court_name:'서초 학생체육관 테니스장',   place_name:'서초학생체육관',     area:'서초구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'은평체육문화센터',   court_name:'은평 체육문화센터 테니스장', place_name:'은평체육문화센터',   area:'은평구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'서대문구민체육센터', court_name:'서대문구 테니스장',          place_name:'서대문구민체육센터', area:'서대문구', svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'마포구민체육관',     court_name:'마포 체육관 테니스장',       place_name:'마포구민체육관',     area:'마포구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'방학체육관',         court_name:'도봉구 방학 테니스장',       place_name:'방학체육관',         area:'도봉구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'동작구민체육센터',   court_name:'동작구 테니스장',            place_name:'동작구민체육센터',   area:'동작구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'관악구민체육센터',   court_name:'관악구 봉천 테니스장',       place_name:'관악구민체육센터',   area:'관악구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'강동구민체육관',     court_name:'강동구 테니스장',            place_name:'강동구민체육관',     area:'강동구',   svc_url:'https://yeyak.seoul.go.kr' },
    { svc_id:'목동운동장',         court_name:'목동 테니스장 (YCS)',        place_name:'목동운동장',         area:'양천구',   svc_url:'https://www.ycs.or.kr' },
  ],

  async render() {
    this._loadSettings();
    if (!this._state.courts.length) {
      this._state.loading = true;
      this._renderContent();
      await this._fetchCourts();
      this._state.loading = false;
    }
    this._renderContent();
    // 알림 ON + API 키 있으면 폴링 시작
    if (this._state.alertOn && Store.get('seoul_api_key')) {
      this._startPolling();
    }
  },

  _loadSettings() {
    const s  = Store.get('court_alert') || {};
    const st = this._state;
    st.alertOn     = s.alertOn     ?? true;
    st.selectedIds = s.selectedIds ?? [];
    st.days        = s.days        ?? [];
    st.timeStart   = s.timeStart   ?? '07:00';
    st.timeEnd     = s.timeEnd     ?? '22:00';
    // 이전 상태 복원 (변경 감지 연속성)
    const saved = Store.get('court_alert_statuses') || {};
    if (Object.keys(saved).length) st.lastStatuses = saved;
  },

  saveSettings() {
    const st = this._state;
    Store.set('court_alert', {
      alertOn:     st.alertOn,
      selectedIds: st.selectedIds,
      days:        st.days,
      timeStart:   st.timeStart,
      timeEnd:     st.timeEnd,
    });
    if (st.alertOn && Store.get('seoul_api_key')) {
      this._startPolling();
      this._requestNotifPermission();
    } else {
      this._stopPolling();
    }
    App.addNotification({
      type: 'info',
      title: '🔔 코트 취소 알림 설정 완료',
      body: '조건에 맞는 취소 자리가 생기면 알림을 드릴게요!',
    });
    App.showToast('알림 설정이 저장됐어요! 취소 자리가 나면 알려드릴게요 🎾', 'success');
  },

  async _requestNotifPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
      this._renderContent();
    }
  },

  // ── 서울시 API 페치 ───────────────────────────
  async _fetchCourts() {
    const apiKey = Store.get('seoul_api_key');
    if (!apiKey) {
      this._state.courts   = this.DEMO_COURTS;
      this._state.allSlots = [];
      this._state.error    = 'demo';
      return;
    }
    try {
      const seoulUrl = `http://openapi.seoul.go.kr:8088/${apiKey}/json/ListPublicReservationSport/1/1000/테니스`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(seoulUrl)}`;
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 12000);
      const res  = await fetch(proxyUrl, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rows = data?.ListPublicReservationSport?.row ?? [];
      if (!rows.length) throw new Error('빈 응답');

      // 전체 슬롯 저장
      this._state.allSlots = rows.map(r => ({
        svc_id:     r.SVCID,
        place_name: r.PLACENM,
        area:       r.AREANM,
        status:     r.REVSTATUS,
        start_dt:   r.SVCOPNBGNDT,
        svc_url:    r.SVCURL,
      }));

      // 처음 로드 시 현재 상태를 기준점으로 저장
      this._state.allSlots.forEach(s => {
        if (this._state.lastStatuses[s.svc_id] === undefined) {
          this._state.lastStatuses[s.svc_id] = s.status;
        }
      });
      Store.set('court_alert_statuses', this._state.lastStatuses);

      // place_name 기준 중복 제거 → venue 목록
      const seen = new Set();
      this._state.courts = [];
      this._state.allSlots.forEach(s => {
        if (!seen.has(s.place_name)) {
          seen.add(s.place_name);
          this._state.courts.push({
            svc_id:     s.place_name,
            court_name: s.place_name,
            place_name: s.place_name,
            area:       s.area,
            svc_url:    s.svc_url,
          });
        }
      });

      this._state.error       = null;
      this._state.lastFetched = new Date();
    } catch {
      this._state.courts   = this.DEMO_COURTS;
      this._state.allSlots = [];
      this._state.error    = 'api_error';
    }
  },

  // ── 5분 폴링 ──────────────────────────────────
  _startPolling() {
    if (this._state.pollTimer) return; // 이미 실행 중
    this._state.pollTimer = setInterval(() => CourtAlert._poll(), this.POLL_INTERVAL);
  },

  _stopPolling() {
    if (this._state.pollTimer) {
      clearInterval(this._state.pollTimer);
      this._state.pollTimer = null;
    }
  },

  async _poll() {
    const st = this._state;
    if (!st.alertOn) return;
    const apiKey = Store.get('seoul_api_key');
    if (!apiKey) return;

    try {
      const seoulUrl = `http://openapi.seoul.go.kr:8088/${apiKey}/json/ListPublicReservationSport/1/1000/테니스`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(seoulUrl)}`;
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 12000);
      const res  = await fetch(proxyUrl, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!res.ok) return;
      const data = await res.json();
      const rows = data?.ListPublicReservationSport?.row ?? [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newAlerts = [];

      rows.forEach(r => {
        const svcId     = r.SVCID;
        const newStatus = r.REVSTATUS;
        const oldStatus = st.lastStatuses[svcId];

        // 이전에 마감/불가였다가 이제 접수중으로 바뀐 슬롯 → 취소 자리
        if (oldStatus !== undefined && oldStatus !== '접수중' && newStatus === '접수중') {
          const slotDate = r.SVCOPNBGNDT ? new Date(r.SVCOPNBGNDT) : null;

          // 오늘 이전 날짜는 무시
          if (slotDate && slotDate < today) {
            st.lastStatuses[svcId] = newStatus;
            return;
          }

          // 요일 필터
          const dayOk = !st.days.length || (slotDate && st.days.includes(slotDate.getDay()));

          // 시간 필터
          const hour   = slotDate ? `${String(slotDate.getHours()).padStart(2,'0')}:00` : null;
          const timeOk = !hour || (hour >= st.timeStart && hour <= st.timeEnd);

          // 코트 필터 (place_name 기준)
          const venueOk = !st.selectedIds.length || st.selectedIds.includes(r.PLACENM);

          if (dayOk && timeOk && venueOk) {
            newAlerts.push({ name: r.SVCNM, place: r.PLACENM, area: r.AREANM, date: slotDate, url: r.SVCURL });
          }
        }

        st.lastStatuses[svcId] = newStatus;
      });

      Store.set('court_alert_statuses', st.lastStatuses);
      st.lastFetched = new Date();

      // 페이지에 있으면 마지막 확인 시간 업데이트
      const indicator = document.getElementById('courtAlertLastFetch');
      if (indicator) indicator.textContent = `마지막 확인: ${this._fmtTime(st.lastFetched)}`;

      if (newAlerts.length) this._sendAlerts(newAlerts);
    } catch { /* 폴링 실패는 무시 */ }
  },

  _sendAlerts(alerts) {
    alerts.forEach(a => {
      const dayStr = a.date
        ? `${a.date.getMonth()+1}/${a.date.getDate()}(${this.DAYS[a.date.getDay()]}) ${String(a.date.getHours()).padStart(2,'0')}:00`
        : '';
      const body = `${a.place}${dayStr ? ' · ' + dayStr : ''}에 취소 자리가 생겼어요!`;
      App.addNotification({ type: 'court_alert', title: '🎾 취소 자리 발생!', body });
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification('🎾 코트 취소 자리 발생!', { body, tag: a.url });
        n.onclick = () => window.open(a.url, '_blank');
      }
    });
    App.showToast(`🎾 취소 자리 ${alerts.length}개! 알림을 확인하세요`, 'success');
  },

  _fmtTime(d) {
    if (!d) return '-';
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  },

  _getFiltered() {
    const { courts, search, areaFilter } = this._state;
    const q = search.trim().toLowerCase();
    return courts.filter(c => {
      const okArea   = !areaFilter.length || areaFilter.includes(c.area);
      const okSearch = !q || c.court_name.toLowerCase().includes(q) || c.area.includes(q) || (c.place_name||'').toLowerCase().includes(q);
      return okArea && okSearch;
    });
  },

  _renderContent() {
    const el = document.getElementById('courtAlertContent');
    if (!el) return;
    const st = this._state;

    const listEl      = document.getElementById('courtAlertList');
    const savedScroll = listEl ? listEl.scrollTop : 0;

    if (st.loading) {
      el.innerHTML = `<div style="padding:16px;">
        <div class="skeleton" style="height:72px;border-radius:14px;margin-bottom:12px;"></div>
        <div class="skeleton" style="height:48px;border-radius:14px;margin-bottom:12px;"></div>
        <div class="skeleton" style="height:300px;border-radius:14px;margin-bottom:12px;"></div>
        <div class="skeleton" style="height:80px;border-radius:14px;"></div>
      </div>`;
      return;
    }

    const notifGranted = 'Notification' in window && Notification.permission === 'granted';
    const notifDenied  = 'Notification' in window && Notification.permission === 'denied';

    el.innerHTML = `<div style="padding:0 16px 32px;">

      <!-- 알림 ON/OFF -->
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--color-card);border:1px solid var(--color-border);border-radius:16px;padding:16px 20px;margin-bottom:12px;">
        <div>
          <div style="font-size:15px;font-weight:700;">취소 알림 받기</div>
          <div style="font-size:12px;color:var(--color-ink3);margin-top:2px;">서울시 공공 테니스장 취소 자리 실시간 알림</div>
        </div>
        <button onclick="CourtAlert.toggleAlert()" style="padding:8px 20px;border-radius:999px;border:1.5px solid ${st.alertOn ? 'var(--color-lime)' : 'var(--color-border)'};background:${st.alertOn ? 'rgba(200,255,0,0.1)' : 'transparent'};color:${st.alertOn ? 'var(--color-lime)' : 'var(--color-ink3)'};font-weight:800;font-size:14px;cursor:pointer;">
          ${st.alertOn ? 'ON' : 'OFF'}
        </button>
      </div>

      <!-- 상태 배너 -->
      ${st.error === 'demo' ? `
        <div style="display:flex;align-items:center;gap:10px;background:rgba(61,139,255,0.08);border:1px solid rgba(61,139,255,0.2);border-radius:12px;padding:11px 14px;margin-bottom:12px;">
          <span style="font-size:13px;color:#3D8BFF;flex:1;">ℹ️ 데모 코트 목록 표시 중 — 실시간 알림은 서울시 API 키가 필요해요</span>
          <button onclick="CourtAlert.showApiKeyInput()" style="font-size:12px;color:var(--color-lime);font-weight:700;background:none;border:none;cursor:pointer;white-space:nowrap;">키 등록 →</button>
        </div>
      ` : st.error === 'api_error' ? `
        <div style="background:rgba(255,71,87,0.08);border:1px solid rgba(255,71,87,0.2);border-radius:12px;padding:11px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
          <span style="font-size:13px;color:var(--color-danger-fg);flex:1;">⚠️ API 연결 실패 — 데모 코트 표시 중</span>
          <button onclick="CourtAlert.refresh()" style="font-size:12px;color:var(--color-ink3);background:none;border:none;cursor:pointer;">🔄 재시도</button>
        </div>
      ` : `
        <div style="display:flex;align-items:center;gap:8px;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:12px;padding:11px 14px;margin-bottom:12px;">
          <div style="width:7px;height:7px;border-radius:50%;background:#4ADE80;flex-shrink:0;${st.alertOn ? 'animation:pulse 2s infinite;' : ''}"></div>
          <span style="font-size:13px;color:#4ADE80;font-weight:600;flex:1;">${st.alertOn ? '5분마다 모니터링 중' : '알림 꺼짐'} · ${st.courts.length}개 코트</span>
          <span id="courtAlertLastFetch" style="font-size:11px;color:var(--color-ink3);">${st.lastFetched ? '확인: ' + this._fmtTime(st.lastFetched) : ''}</span>
          <button onclick="CourtAlert.refresh()" style="font-size:12px;color:var(--color-ink3);background:none;border:none;cursor:pointer;padding:0 4px;">🔄</button>
        </div>
      `}

      <!-- 브라우저 알림 권한 -->
      ${!notifGranted && !notifDenied ? `
        <div style="display:flex;align-items:center;gap:10px;background:rgba(200,255,0,0.05);border:1px solid rgba(200,255,0,0.2);border-radius:12px;padding:11px 14px;margin-bottom:16px;">
          <span style="font-size:13px;flex:1;">🔔 브라우저 알림 허용 시 앱 밖에서도 즉시 알림을 받을 수 있어요</span>
          <button onclick="CourtAlert.requestNotifPermission()" style="font-size:12px;color:var(--color-lime);font-weight:700;background:none;border:none;cursor:pointer;white-space:nowrap;">허용 →</button>
        </div>
      ` : notifGranted ? `
        <div style="font-size:12px;color:var(--color-ink3);margin-bottom:16px;">🔔 브라우저 알림 허용됨</div>
      ` : ''}

      <!-- 코트 선택 -->
      <div style="margin-bottom:24px;">
        <div class="section-title" style="margin-bottom:12px;">📍 알림 받을 코트 <span style="font-size:12px;font-weight:400;color:var(--color-ink3);">(미선택 시 전체)</span></div>

        <div style="overflow-x:auto;padding-bottom:8px;margin-bottom:10px;-webkit-overflow-scrolling:touch;">
          <div style="display:flex;gap:6px;width:max-content;">
            ${this.AREAS.map(a => {
              const on = st.areaFilter.includes(a);
              return `<button onclick="CourtAlert.toggleArea('${a}')" style="padding:5px 12px;border-radius:999px;border:1.5px solid ${on ? 'var(--color-lime)' : 'var(--color-border)'};background:${on ? 'rgba(200,255,0,0.1)' : 'var(--color-card)'};color:${on ? 'var(--color-lime)' : 'var(--color-ink3)'};font-size:12px;font-weight:600;white-space:nowrap;cursor:pointer;">${a}</button>`;
            }).join('')}
          </div>
        </div>

        <div style="position:relative;margin-bottom:10px;">
          <svg style="position:absolute;left:14px;top:50%;transform:translateY(-50%);pointer-events:none;" width="15" height="15" fill="none" stroke="var(--color-ink3)" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="courtAlertSearch" type="text" class="form-input" placeholder="테니스장 이름 검색..." value="${this._esc(st.search)}" style="padding-left:40px;">
        </div>

        <div id="courtAlertSelCount"></div>
        <div id="courtAlertList" style="display:flex;flex-direction:column;gap:7px;max-height:280px;overflow-y:auto;"></div>
      </div>

      <!-- 요일 선택 -->
      <div style="margin-bottom:24px;">
        <div class="section-title" style="margin-bottom:12px;">📅 원하는 요일 <span style="font-size:12px;font-weight:400;color:var(--color-ink3);">(미선택 시 매일)</span></div>
        <div style="display:flex;gap:8px;">
          ${this.DAYS.map((d, i) => {
            const on = st.days.includes(i);
            return `<button onclick="CourtAlert.toggleDay(${i})" style="width:40px;height:40px;border-radius:50%;border:1.5px solid ${on ? 'var(--color-lime)' : 'var(--color-border)'};background:${on ? 'rgba(200,255,0,0.1)' : 'var(--color-card)'};color:${on ? 'var(--color-lime)' : 'var(--color-ink3)'};font-size:13px;font-weight:700;cursor:pointer;">${d}</button>`;
          }).join('')}
        </div>
      </div>

      <!-- 시간 선택 -->
      <div style="margin-bottom:24px;">
        <div class="section-title" style="margin-bottom:12px;">⏰ 원하는 시간대</div>
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;color:var(--color-ink3);font-weight:600;margin-bottom:8px;">시작</div>
          <div style="overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;">
            <div style="display:flex;gap:6px;width:max-content;">
              ${this.TIME_OPTIONS.filter(t => t <= st.timeEnd).map(t => {
                const on = st.timeStart === t;
                return `<button onclick="CourtAlert.setTimeStart('${t}')" style="padding:6px 14px;border-radius:999px;border:1.5px solid ${on ? 'var(--color-lime)' : 'var(--color-border)'};background:${on ? 'rgba(200,255,0,0.1)' : 'var(--color-card)'};color:${on ? 'var(--color-lime)' : 'var(--color-ink3)'};font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">${t}</button>`;
              }).join('')}
            </div>
          </div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--color-ink3);font-weight:600;margin-bottom:8px;">종료</div>
          <div style="overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;">
            <div style="display:flex;gap:6px;width:max-content;">
              ${this.TIME_OPTIONS.filter(t => t >= st.timeStart).map(t => {
                const on = st.timeEnd === t;
                return `<button onclick="CourtAlert.setTimeEnd('${t}')" style="padding:6px 14px;border-radius:999px;border:1.5px solid ${on ? 'var(--color-lime)' : 'var(--color-border)'};background:${on ? 'rgba(200,255,0,0.1)' : 'var(--color-card)'};color:${on ? 'var(--color-lime)' : 'var(--color-ink3)'};font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">${t}</button>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>

      ${this._renderSummary()}

      <button onclick="CourtAlert.saveSettings()" class="btn btn-primary btn-full btn-lg" style="margin-top:4px;">
        🔔 알림 설정 저장
      </button>
    </div>`;

    this._renderCourtList();

    const newListEl = document.getElementById('courtAlertList');
    if (newListEl && savedScroll) newListEl.scrollTop = savedScroll;

    const searchEl = document.getElementById('courtAlertSearch');
    if (searchEl) {
      searchEl.addEventListener('input', e => { if (!e.isComposing) CourtAlert.setSearch(e.target.value); });
      searchEl.addEventListener('compositionend', e => CourtAlert.setSearch(e.target.value));
    }
  },

  _renderSummary() {
    const st  = this._state;
    const sel = st.selectedIds.map(id => (st.courts.find(c => c.svc_id === id)?.court_name || id));
    const courtTxt = !sel.length    ? '전체 코트' : sel.length <= 2 ? sel.join(', ') : `${sel[0]} 외 ${sel.length - 1}개`;
    const dayTxt   = !st.days.length ? '매일'     : st.days.map(d => this.DAYS[d]).join(' · ');
    const timeTxt  = `${st.timeStart} ~ ${st.timeEnd}`;
    return `
      <div style="background:rgba(200,255,0,0.04);border:1px solid rgba(200,255,0,0.18);border-radius:16px;padding:16px;margin-bottom:16px;">
        <div style="font-size:11px;color:var(--color-lime);font-weight:800;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">현재 설정 요약</div>
        <div style="font-size:13px;line-height:2.1;">
          <div>🏟 <span style="color:var(--color-ink3);">코트</span> &nbsp;<strong>${courtTxt}</strong></div>
          <div>📅 <span style="color:var(--color-ink3);">요일</span> &nbsp;<strong>${dayTxt}</strong></div>
          <div>⏰ <span style="color:var(--color-ink3);">시간</span> &nbsp;<strong>${timeTxt}</strong></div>
        </div>
        <div style="margin-top:10px;font-size:11px;color:var(--color-ink4);">오늘 이후 날짜에 취소 자리가 생기면 즉시 알림을 드려요</div>
      </div>`;
  },

  _renderCourtList() {
    const listEl  = document.getElementById('courtAlertList');
    const countEl = document.getElementById('courtAlertSelCount');
    if (!listEl) return;
    const st       = this._state;
    const filtered = this._getFiltered();
    listEl.innerHTML = filtered.length === 0
      ? `<div style="text-align:center;padding:40px 0;color:var(--color-ink3);font-size:14px;">검색 결과가 없어요</div>`
      : filtered.map(c => {
          const sel = st.selectedIds.includes(c.svc_id);
          return `<button onclick="CourtAlert.toggleCourt('${c.svc_id}')" style="display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:12px;border:1.5px solid ${sel ? 'var(--color-lime)' : 'var(--color-border)'};background:${sel ? 'rgba(200,255,0,0.04)' : 'var(--color-card)'};cursor:pointer;text-align:left;width:100%;">
            <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${sel ? 'var(--color-lime)' : 'var(--color-border)'};background:${sel ? 'var(--color-lime)' : 'transparent'};flex-shrink:0;display:flex;align-items:center;justify-content:center;">
              ${sel ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0A1628" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:700;color:var(--color-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.court_name}</div>
              <div style="font-size:11px;color:var(--color-ink3);margin-top:1px;">${c.area}</div>
            </div>
          </button>`;
        }).join('');
    if (countEl) {
      countEl.innerHTML = st.selectedIds.length
        ? `<div style="font-size:12px;color:var(--color-lime);font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:8px;">
             ✓ ${st.selectedIds.length}개 코트 선택됨
             <button onclick="CourtAlert.clearSel()" style="color:var(--color-ink3);font-size:11px;background:none;border:none;cursor:pointer;">전체 해제</button>
           </div>`
        : '';
    }
  },

  _esc(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  toggleAlert() {
    this._state.alertOn = !this._state.alertOn;
    if (this._state.alertOn && Store.get('seoul_api_key')) {
      this._startPolling();
    } else {
      this._stopPolling();
    }
    this._renderContent();
  },

  toggleArea(area) {
    const arr = this._state.areaFilter;
    this._state.areaFilter = arr.includes(area) ? arr.filter(a => a !== area) : [...arr, area];
    this._renderContent();
  },

  setSearch(val) { this._state.search = val; this._renderCourtList(); },

  toggleCourt(id) {
    const arr = this._state.selectedIds;
    this._state.selectedIds = arr.includes(id) ? arr.filter(s => s !== id) : [...arr, id];
    this._renderCourtList();
  },

  clearSel() { this._state.selectedIds = []; this._renderCourtList(); },

  toggleDay(day) {
    const arr = this._state.days;
    this._state.days = arr.includes(day) ? arr.filter(d => d !== day) : [...arr, day];
    this._renderContent();
  },

  setTimeStart(t) {
    this._state.timeStart = t;
    if (t > this._state.timeEnd) this._state.timeEnd = t;
    this._renderContent();
  },

  setTimeEnd(t) {
    this._state.timeEnd = t;
    if (t < this._state.timeStart) this._state.timeStart = t;
    this._renderContent();
  },

  async refresh() {
    this._state.courts  = [];
    this._state.loading = true;
    this._renderContent();
    await this._fetchCourts();
    this._state.loading = false;
    this._renderContent();
  },

  async requestNotifPermission() {
    await this._requestNotifPermission();
  },

  showApiKeyInput() {
    const key = prompt('서울시 공공데이터 API 키를 입력하세요.\n발급: https://data.seoul.go.kr → 로그인 → API 신청');
    if (key && key.trim()) {
      Store.set('seoul_api_key', key.trim());
      this.refresh();
    }
  },
};

window.CourtAlert = CourtAlert;
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
