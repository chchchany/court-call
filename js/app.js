/* ============================================
   COURTCALL APP.JS - 라우팅 + 공통 유틸리티
   ============================================ */

// ── 앱 상태 ──────────────────────────────────
const App = {
  currentPage: null,
  currentUser: null,
  notifications: [],
  historyStack: [],
  currentData: {},

  init() {
    this.currentUser = Auth.getCurrentUser();
    this.loadNotifications();
    this.setupNavigation();
    this.setupToast();

    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page') || (this.currentUser ? 'home' : 'onboarding');
    this.navigate(page);
  },

  navigate(pageId, data = {}, pushHistory = true) {
    // 히스토리 스택에 현재 페이지 push
    if (pushHistory && this.currentPage && this.currentPage !== pageId) {
      this.historyStack.push({ page: this.currentPage, data: this.currentData });
    }
    this.currentData = data;

    // 모든 페이지 숨기기
    document.querySelectorAll('.page, .page-no-nav').forEach(p => {
      p.classList.remove('active');
    });

    // 바텀 네비 숨기기/보이기
    const bottomNav = document.getElementById('bottomNav');
    const noNavPages = ['onboarding', 'login', 'signup', 'payment'];
    if (noNavPages.includes(pageId)) {
      bottomNav?.classList.add('hidden');
    } else {
      bottomNav?.classList.remove('hidden');
    }

    // 페이지 표시
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
      targetPage.classList.add('active');
      this.currentPage = pageId;
      this.updateNavActive(pageId);
      // 페이지별 렌더 함수 호출
      this.renderPage(pageId, data);
    }
  },

  goBack() {
    if (this.historyStack.length > 0) {
      const prev = this.historyStack.pop();
      this.navigate(prev.page, prev.data, false);
    } else {
      this.navigate('home', {}, false);
    }
  },

  renderPage(pageId, data) {
    switch(pageId) {
      case 'home':              Home.render(); break;
      case 'create-match':      CreateMatch.render(data); break;
      case 'match-detail':      MatchDetail.render(data); break;
      case 'host-dash':         HostDash.render(data); break;
      case 'my-matches':        MyMatches.render(); break;
      case 'notifications':     Notifications.render(); break;
      case 'profile':           Profile.render(); break;
      case 'payment':           Payment.render(data); break;
      case 'community':         Community.render(); break;
      case 'community-detail':  CommunityDetail.render(data); break;
      case 'account-settings':  AccountSettings.render(); break;
      case 'court-alert':       CourtAlert.render(); break;
    }
  },

  updateNavActive(pageId) {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageId);
    });
  },

  setupNavigation() {
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('[data-page]');
      if (navItem && navItem.dataset.page) {
        e.preventDefault();
        this.navigate(navItem.dataset.page);
      }
    });
  },

  setupToast() {
    if (!document.getElementById('toastContainer')) {
      const container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
  },

  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const icons = {
      success: `<svg width="18" height="18" fill="none" stroke="#4ADE80" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>`,
      error:   `<svg width="18" height="18" fill="none" stroke="#FF4757" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      info:    `<svg width="18" height="18" fill="none" stroke="#3D8BFF" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      warning: `<svg width="18" height="18" fill="none" stroke="#FF7043" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icons[type] || icons.info}<span style="font-size:14px;font-weight:500;">${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  loadNotifications() {
    this.notifications = Store.get('notifications') || [];
  },

  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  },

  addNotification(notif) {
    notif.id = Date.now();
    notif.time = new Date().toISOString();
    notif.read = false;
    this.notifications.unshift(notif);
    Store.set('notifications', this.notifications);
    this.updateNotifBadge();
  },

  updateNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if (badge) {
      const count = this.getUnreadCount();
      badge.style.display = count > 0 ? 'block' : 'none';
    }
  }
};

// ── 로컬 스토리지 래퍼 ──────────────────────
const Store = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(`cc_${key}`));
    } catch { return null; }
  },
  set(key, val) {
    localStorage.setItem(`cc_${key}`, JSON.stringify(val));
  },
  remove(key) {
    localStorage.removeItem(`cc_${key}`);
  }
};

// ── 인증 ────────────────────────────────────
const Auth = {
  getCurrentUser() {
    return Store.get('currentUser');
  },
  login(userData) {
    Store.set('currentUser', userData);
    App.currentUser = userData;
  },
  logout() {
    Store.remove('currentUser');
    App.currentUser = null;
    App.navigate('onboarding');
  },
  register(userData) {
    const users = Store.get('users') || [];
    const exists = users.find(u => u.phone === userData.phone);
    if (exists) return false;
    userData.id = `user_${Date.now()}`;
    userData.createdAt = new Date().toISOString();
    userData.trustScore = 100;
    userData.matchCount = 0;
    userData.noShowCount = 0;
    users.push(userData);
    Store.set('users', users);
    return userData;
  }
};

// ── 경기 데이터 관리 ─────────────────────────
const Matches = {
  getAll() {
    return Store.get('matches') || [];
  },

  getById(id) {
    return this.getAll().find(m => m.id === id);
  },

  create(matchData) {
    const matches = this.getAll();
    matchData.id = `match_${Date.now()}`;
    matchData.createdAt = new Date().toISOString();
    matchData.participants = [];
    matchData.waitlist = [];
    matchData.status = 'recruiting'; // recruiting, closing, closed, confirmed
    matchData.paymentStatus = {}; // userId -> bool
    matches.unshift(matchData);
    Store.set('matches', matches);
    return matchData;
  },

  update(id, updates) {
    const matches = this.getAll();
    const idx = matches.findIndex(m => m.id === id);
    if (idx !== -1) {
      matches[idx] = { ...matches[idx], ...updates };
      Store.set('matches', matches);
      return matches[idx];
    }
    return null;
  },

  apply(matchId, userId, userName) {
    const match = this.getById(matchId);
    if (!match) return { success: false, reason: 'notfound' };

    // 이미 참가/대기 중인지 확인
    if (match.participants.find(p => p.userId === userId)) {
      return { success: false, reason: 'already_applied' };
    }
    if (match.waitlist.find(p => p.userId === userId)) {
      return { success: false, reason: 'already_waiting' };
    }
    if (match.status === 'confirmed' || match.status === 'closed') {
      return { success: false, reason: 'closed' };
    }

    const entry = {
      userId,
      userName,
      appliedAt: new Date().toISOString(),
      confirmed: false
    };

    if (match.participants.length < match.maxPlayers) {
      match.participants.push(entry);
      // 마감 임박 체크 (80% 이상)
      if (match.participants.length >= match.maxPlayers * 0.8) {
        match.status = 'closing';
      }
      if (match.participants.length >= match.maxPlayers) {
        match.status = 'closed';
      }
      this.update(matchId, { participants: match.participants, status: match.status });
      return { success: true, type: 'joined', position: match.participants.length };
    } else {
      match.waitlist.push({ ...entry, waitPosition: match.waitlist.length + 1 });
      this.update(matchId, { waitlist: match.waitlist });
      return { success: true, type: 'waiting', position: match.waitlist.length };
    }
  },

  cancel(matchId, userId) {
    const match = this.getById(matchId);
    if (!match) return false;

    const participantIdx = match.participants.findIndex(p => p.userId === userId);
    if (participantIdx !== -1) {
      match.participants.splice(participantIdx, 1);
      // 대기자 승격
      if (match.waitlist.length > 0) {
        const promoted = match.waitlist.shift();
        promoted.waitPosition = undefined;
        match.participants.push(promoted);
        // 승격 알림 추가
        App.addNotification({
          type: 'promoted',
          title: '🎾 대기 → 참가 확정!',
          body: `${match.title || match.venue} 경기에 참가가 확정됐어요!`,
          matchId
        });
      }
      match.status = match.participants.length >= match.maxPlayers ? 'closed' :
                     match.participants.length >= match.maxPlayers * 0.8 ? 'closing' : 'recruiting';
      this.update(matchId, { participants: match.participants, waitlist: match.waitlist, status: match.status });
      return true;
    }
    return false;
  },

  confirmMatch(matchId) {
    const match = this.getById(matchId);
    if (!match) return false;
    this.update(matchId, { status: 'confirmed' });
    // 참가자들에게 알림
    match.participants.forEach(p => {
      App.addNotification({
        type: 'confirmed',
        title: '✅ 경기 확정!',
        body: `${match.title || match.venue} 경기가 확정됐어요. 참가비를 송금해주세요!`,
        matchId,
        amount: match.perPersonCost
      });
    });
    return true;
  },

  setPaymentStatus(matchId, userId, paid) {
    const match = this.getById(matchId);
    if (!match) return false;
    const ps = match.paymentStatus || {};
    ps[userId] = paid;
    this.update(matchId, { paymentStatus: ps });
    return true;
  },

  getUserMatches(userId) {
    const all = this.getAll();
    return {
      hosting:      all.filter(m => m.hostId === userId),
      participating: all.filter(m =>
        m.participants.find(p => p.userId === userId) ||
        m.waitlist.find(p => p.userId === userId)
      )
    };
  },

  SEED_VERSION: 'v4',

  seedDemoData() {
    if (Store.get('seed_version') === this.SEED_VERSION) return;

    const n = Date.now();
    const d = 86400000;

    const demoMatches = [
      // ① 차니 개설 · 모집중 (1/6)
      {
        id: 'match_demo1',
        hostId: 'user_demo', hostName: '차니',
        title: '노들섬 주말 번개 테니스',
        venue: '노들섬 테니스코트', address: '서울시 용산구 이촌동 302',
        date: '2026-06-28', time: '15:00', duration: 120,
        maxPlayers: 6, totalCost: 108000, perPersonCost: 18000,
        level: '중급', genderType: 'open', communityId: 'comm_demo1',
        note: '주말 오후 여유롭게! 라켓 지참 필수',
        status: 'recruiting',
        createdAt: new Date(n - 1800000).toISOString(),
        participants: [
          { userId: 'user_demo', userName: '차니', appliedAt: new Date(n - 1800000).toISOString(), confirmed: true }
        ],
        waitlist: [], paymentStatus: {}
      },
      // ② 차니 개설 · 마감 임박 (4/5) — 참가신청자 여러 명
      {
        id: 'match_demo2',
        hostId: 'user_demo', hostName: '차니',
        title: '여의도 저녁 번개',
        venue: '한강공원 여의도 테니스코트', address: '서울시 영등포구 여의도동',
        date: '2026-06-20', time: '19:30', duration: 90,
        maxPlayers: 5, totalCost: 75000, perPersonCost: 15000,
        level: '초중급', genderType: 'open', communityId: 'comm_demo1',
        note: '초보자 환영! 신청 서둘러요',
        status: 'closing',
        createdAt: new Date(n - 7200000).toISOString(),
        participants: [
          { userId: 'user_demo',  userName: '차니',     appliedAt: new Date(n - 7200000).toISOString(), confirmed: true  },
          { userId: 'u2',         userName: '서울러',   appliedAt: new Date(n - 6000000).toISOString(), confirmed: false },
          { userId: 'u3',         userName: '라켓맨',   appliedAt: new Date(n - 5000000).toISOString(), confirmed: false },
          { userId: 'u4',         userName: '스매시퀸', appliedAt: new Date(n - 4000000).toISOString(), confirmed: false }
        ],
        waitlist: [], paymentStatus: {}
      },
      // ③ 차니 개설 · 마감 (4/4) + 대기자 2명
      {
        id: 'match_demo3',
        hostId: 'user_demo', hostName: '차니',
        title: '마포 번개 (마감)',
        venue: '망원 테니스코트', address: '서울시 마포구 망원동 468',
        date: '2026-06-21', time: '10:00', duration: 120,
        maxPlayers: 4, totalCost: 80000, perPersonCost: 20000,
        level: '중급', genderType: 'mixed', communityId: 'comm_demo1',
        note: '주말 오전 번개! 마감됐어요',
        status: 'closed',
        createdAt: new Date(n - d).toISOString(),
        participants: [
          { userId: 'user_demo', userName: '차니',     appliedAt: new Date(n - d).toISOString(),       confirmed: true  },
          { userId: 'u2',        userName: '서울러',   appliedAt: new Date(n - d + 3600000).toISOString(), confirmed: false },
          { userId: 'u3',        userName: '라켓맨',   appliedAt: new Date(n - d + 7200000).toISOString(), confirmed: false },
          { userId: 'u5',        userName: '드라이버', appliedAt: new Date(n - d + 9000000).toISOString(), confirmed: false }
        ],
        waitlist: [
          { userId: 'u6', userName: '대기자A', appliedAt: new Date(n - d + 10000000).toISOString(), waitPosition: 1 },
          { userId: 'u7', userName: '대기자B', appliedAt: new Date(n - d + 11000000).toISOString(), waitPosition: 2 }
        ],
        paymentStatus: {}
      },
      // ④ 차니 개설 · 확정 (과거 경기, 4/4, 입금 완료)
      {
        id: 'match_demo4',
        hostId: 'user_demo', hostName: '차니',
        title: '영등포 번개 (확정)',
        venue: '영등포 공원 테니스코트', address: '서울시 영등포구 여의도동 44',
        date: '2026-06-14', time: '19:00', duration: 120,
        maxPlayers: 4, totalCost: 80000, perPersonCost: 20000,
        level: '중급', genderType: 'open', communityId: 'comm_demo1',
        note: '지난 번개 경기',
        status: 'confirmed',
        createdAt: new Date(n - d * 7).toISOString(),
        participants: [
          { userId: 'user_demo', userName: '차니',     appliedAt: new Date(n - d * 7).toISOString(), confirmed: true },
          { userId: 'u2',        userName: '서울러',   appliedAt: new Date(n - d * 6).toISOString(), confirmed: true },
          { userId: 'u3',        userName: '라켓맨',   appliedAt: new Date(n - d * 6).toISOString(), confirmed: true },
          { userId: 'u4',        userName: '스매시퀸', appliedAt: new Date(n - d * 5).toISOString(), confirmed: true }
        ],
        waitlist: [],
        paymentStatus: { 'user_demo': true, 'u2': true, 'u3': true, 'u4': true }
      },
      // ⑤ 테니스왕 개설 · 마감 임박 · 차니 참가중 (5/6)
      {
        id: 'match_demo5',
        hostId: 'user_demo2', hostName: '테니스왕',
        title: '강남 저녁 번개',
        venue: '강남 구민체육센터', address: '서울시 강남구 논현동 11',
        date: '2026-06-22', time: '19:30', duration: 90,
        maxPlayers: 6, totalCost: 120000, perPersonCost: 20000,
        level: '초중급', genderType: 'open', communityId: 'comm_demo2',
        note: '초보자도 환영!',
        status: 'closing',
        createdAt: new Date(n - d * 3).toISOString(),
        participants: [
          { userId: 'user_demo2', userName: '테니스왕', appliedAt: new Date(n - d * 3).toISOString(),     confirmed: true  },
          { userId: 'user_demo',  userName: '차니',     appliedAt: new Date(n - d * 2).toISOString(),     confirmed: false },
          { userId: 'u2',         userName: '서울러',   appliedAt: new Date(n - d * 2 + 3600000).toISOString(), confirmed: false },
          { userId: 'u3',         userName: '라켓맨',   appliedAt: new Date(n - d + 3600000).toISOString(),     confirmed: false },
          { userId: 'u4',         userName: '스매시퀸', appliedAt: new Date(n - 72000000).toISOString(),         confirmed: false }
        ],
        waitlist: [], paymentStatus: {}
      },
      // ⑥ 테니스왕 개설 · 마감 · 차니 대기 1번 (4/4 + 대기 2명)
      {
        id: 'match_demo6',
        hostId: 'user_demo2', hostName: '테니스왕',
        title: '반포 번개 (마감 + 대기)',
        venue: '반포한강공원 테니스코트', address: '서울시 서초구 반포동',
        date: '2026-06-25', time: '18:00', duration: 120,
        maxPlayers: 4, totalCost: 80000, perPersonCost: 20000,
        level: '중급', genderType: 'open',
        note: '자리 나면 연락드려요',
        status: 'closed',
        createdAt: new Date(n - d * 4).toISOString(),
        participants: [
          { userId: 'user_demo2', userName: '테니스왕', appliedAt: new Date(n - d * 4).toISOString(), confirmed: true  },
          { userId: 'u2',         userName: '서울러',   appliedAt: new Date(n - d * 3).toISOString(), confirmed: false },
          { userId: 'u3',         userName: '라켓맨',   appliedAt: new Date(n - d * 3).toISOString(), confirmed: false },
          { userId: 'u4',         userName: '스매시퀸', appliedAt: new Date(n - d * 2).toISOString(), confirmed: false }
        ],
        waitlist: [
          { userId: 'user_demo', userName: '차니',    appliedAt: new Date(n - d).toISOString(),          waitPosition: 1 },
          { userId: 'u5',        userName: '드라이버', appliedAt: new Date(n - d + 3600000).toISOString(), waitPosition: 2 }
        ],
        paymentStatus: {}
      },
      // ⑦ 코트퀸 개설 · 확정 · 4/4 입금중
      {
        id: 'match_demo7',
        hostId: 'user_demo3', hostName: '코트퀸',
        title: '송파 주말 아침 테니스',
        venue: '석촌호수 테니스코트', address: '서울시 송파구 석촌동 5',
        date: '2026-06-21', time: '08:00', duration: 120,
        maxPlayers: 4, totalCost: 60000, perPersonCost: 15000,
        level: '상급', genderType: 'female',
        note: '상급자 우선 모집',
        status: 'confirmed',
        createdAt: new Date(n - d * 2).toISOString(),
        participants: [
          { userId: 'user_demo3', userName: '코트퀸', appliedAt: new Date(n - d * 2).toISOString(), confirmed: true },
          { userId: 'u8',         userName: '에이스', appliedAt: new Date(n - d).toISOString(),     confirmed: true },
          { userId: 'u9',         userName: '발리킹', appliedAt: new Date(n - d).toISOString(),     confirmed: true },
          { userId: 'u10',        userName: '서브퀸', appliedAt: new Date(n - d).toISOString(),     confirmed: true }
        ],
        waitlist: [],
        paymentStatus: { 'user_demo3': true, 'u8': true, 'u9': false, 'u10': false }
      },
      // ⑧ 서울러 개설 · 모집중 (comm_demo1 소속)
      {
        id: 'match_demo8',
        hostId: 'u2', hostName: '서울러',
        title: '영등포 아침 번개',
        venue: '영등포 공원 테니스코트', address: '서울시 영등포구 여의도동 44',
        date: '2026-06-19', time: '07:00', duration: 90,
        maxPlayers: 4, totalCost: 60000, perPersonCost: 15000,
        level: '초급', genderType: 'open', communityId: 'comm_demo1',
        note: '이른 아침 번개 조아',
        status: 'recruiting',
        createdAt: new Date(n - 3600000 * 2).toISOString(),
        participants: [
          { userId: 'u2', userName: '서울러', appliedAt: new Date(n - 3600000 * 2).toISOString(), confirmed: true }
        ],
        waitlist: [], paymentStatus: {}
      }
    ];

    Store.set('matches', demoMatches);
    Store.set('seed_version', this.SEED_VERSION);

    // 결제 수단 시딩
    Store.set('payment_user_demo2', {
      kakaoLink: 'https://qr.kakaopay.com/FZHx2L3Kv',
      bank: '카카오뱅크',
      accountNumber: '3333-01-1234567',
      accountHolder: '테니스왕'
    });
    Store.set('payment_user_demo3', {
      kakaoLink: 'https://qr.kakaopay.com/Ej8nR9mQp',
      bank: '신한은행',
      accountNumber: '110-123-456789',
      accountHolder: '코트퀸'
    });
  }
};

// ── 성별 유틸리티 ─────────────────────────────
const GenderUtils = {
  labels: { open: '오픈', male: '남성만', female: '여성만', mixed: '혼복' },
  icons:  { open: '👥', male: '♂', female: '♀', mixed: '⚤' },
  cssClass: { open: 'gender-open', male: 'gender-male', female: 'gender-female', mixed: 'gender-mixed' },
  getLabel(type) { return this.labels[type] || '오픈'; },
  getIcon(type)  { return this.icons[type]  || '👥'; },
  getClass(type) { return this.cssClass[type] || 'gender-open'; }
};

// ── 온도 유틸리티 ─────────────────────────────
const TemperatureUtils = {
  DEFAULT: 36.5,

  calculate(user) {
    let temp = this.DEFAULT;
    temp += (user.matchCount  || 0) * 0.3;
    temp += (user.hostCount   || 0) * 0.5;
    temp -= (user.noShowCount || 0) * 1.0;
    return parseFloat(Math.max(33, Math.min(42, temp)).toFixed(1));
  },

  getColor(temp) {
    if (temp < 35)  return '#3D8BFF';
    if (temp < 37)  return '#4ADE80';
    if (temp < 39)  return '#FF7043';
    return '#FF4757';
  },

  getLabel(temp) {
    if (temp < 35)  return '차가워요 🥶';
    if (temp < 36.5) return '보통이에요';
    if (temp < 38)  return '따뜻해요 😊';
    if (temp < 40)  return '뜨거워요 🔥';
    return '초열정! 🔥🔥';
  },

  getWidth(temp) {
    return Math.max(0, Math.min(100, ((temp - 33) / 9) * 100));
  },

  render(label, temp) {
    const color = this.getColor(temp);
    const width = this.getWidth(temp);
    return `
      <div class="temperature-row">
        <div style="font-size:12px;color:var(--cc-gray-400);width:60px;flex-shrink:0;">${label}</div>
        <div class="temperature-bar-track" style="flex:1;">
          <div class="temperature-bar-fill" style="width:${width}%;background:${color};"></div>
        </div>
        <div class="temperature-value" style="color:${color};">${temp}°</div>
      </div>
    `;
  }
};

// ── 커뮤니티 데이터 관리 ──────────────────────
const Communities = {
  getAll() { return Store.get('communities') || []; },

  getById(id) { return this.getAll().find(c => c.id === id); },

  create(data) {
    const communities = this.getAll();
    const community = {
      id: `comm_${Date.now()}`,
      name: data.name,
      description: data.description || '',
      ownerId: data.ownerId,
      ownerName: data.ownerName,
      inviteCode: Math.random().toString(36).substr(2, 6).toUpperCase(),
      memberIds: [data.ownerId],
      memberNames: { [data.ownerId]: data.ownerName },
      createdAt: new Date().toISOString()
    };
    communities.push(community);
    Store.set('communities', communities);
    return community;
  },

  join(inviteCode, userId, userName) {
    const communities = this.getAll();
    const idx = communities.findIndex(c => c.inviteCode === inviteCode.toUpperCase().trim());
    if (idx === -1) return { success: false, reason: 'notfound' };
    if (communities[idx].memberIds.includes(userId)) return { success: false, reason: 'already' };
    communities[idx].memberIds.push(userId);
    communities[idx].memberNames = communities[idx].memberNames || {};
    communities[idx].memberNames[userId] = userName;
    Store.set('communities', communities);
    return { success: true, community: communities[idx] };
  },

  getUserCommunities(userId) {
    return this.getAll().filter(c => c.memberIds.includes(userId));
  },

  getMatches(communityId) {
    return Matches.getAll().filter(m => m.communityId === communityId);
  },

  seedDemoData(userId, userName) {
    if (Store.get('seed_version') === Matches.SEED_VERSION && this.getAll().length > 0) return;
    const demos = [
      {
        id: 'comm_demo1',
        name: '영등포 번개 테니스',
        description: '영등포/여의도 주변 번개 테니스 모임! 주 2-3회 진행해요 🎾',
        ownerId: 'user_demo',
        ownerName: '차니',
        inviteCode: 'YTPARK',
        memberIds: [userId, 'user_demo2', 'u2', 'u3'],
        memberNames: { [userId]: userName, 'user_demo2': '테니스왕', 'u2': '서울러', 'u3': '라켓맨' },
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString()
      },
      {
        id: 'comm_demo2',
        name: '강남 테니스 클럽',
        description: '강남구 테니스 동호회. 초중급 환영!',
        ownerId: 'user_demo2',
        ownerName: '테니스왕',
        inviteCode: 'GANGNAM',
        memberIds: ['user_demo2', 'u2', 'u4', 'u5'],
        memberNames: { 'user_demo2': '테니스왕', 'u2': '서울러', 'u4': '스매시퀸', 'u5': '드라이버' },
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
      }
    ];
    Store.set('communities', demos);
  }
};

// ── 대체자 요청 관리 ──────────────────────────
const Substitutes = {
  getAll() { return Store.get('substitutes') || []; },

  getByMatch(matchId) { return this.getAll().filter(s => s.matchId === matchId); },

  getOpenByMatch(matchId) { return this.getByMatch(matchId).filter(s => s.status === 'open'); },

  create(matchId, requesterId, requesterName) {
    const subs = this.getAll();
    const existing = subs.find(s => s.matchId === matchId && s.requesterId === requesterId && s.status === 'open');
    if (existing) return { success: false, reason: 'already' };
    const sub = {
      id: `sub_${Date.now()}`,
      matchId,
      requesterId,
      requesterName,
      replacerId: null,
      replacerName: null,
      status: 'open',
      createdAt: new Date().toISOString()
    };
    subs.push(sub);
    Store.set('substitutes', subs);
    return { success: true, sub };
  },

  accept(subId, replacerId, replacerName) {
    const subs = this.getAll();
    const idx = subs.findIndex(s => s.id === subId);
    if (idx === -1 || subs[idx].status !== 'open') return false;
    subs[idx].replacerId = replacerId;
    subs[idx].replacerName = replacerName;
    subs[idx].status = 'filled';
    Store.set('substitutes', subs);
    // 실제로 참가자 교체 처리
    const match = Matches.getById(subs[idx].matchId);
    if (match) {
      const pIdx = match.participants.findIndex(p => p.userId === subs[idx].requesterId);
      if (pIdx !== -1) {
        match.participants[pIdx] = {
          userId: replacerId,
          userName: replacerName,
          appliedAt: new Date().toISOString(),
          confirmed: false
        };
        Matches.update(subs[idx].matchId, { participants: match.participants });
      }
    }
    return subs[idx];
  },

  cancel(subId) {
    const subs = this.getAll();
    const idx = subs.findIndex(s => s.id === subId);
    if (idx === -1) return false;
    subs[idx].status = 'cancelled';
    Store.set('substitutes', subs);
    return true;
  }
};

window.GenderUtils = GenderUtils;
window.TemperatureUtils = TemperatureUtils;
window.Communities = Communities;
window.Substitutes = Substitutes;

// ── 유틸리티 ─────────────────────────────────
const Utils = {
  formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  },

  formatTime(timeStr) {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour < 12 ? '오전' : '오후';
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${ampm} ${h12}:${m}`;
  },

  formatCost(amount) {
    return amount.toLocaleString('ko-KR') + '원';
  },

  timeAgo(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const min  = Math.floor(diff / 60000);
    const hour = Math.floor(diff / 3600000);
    const day  = Math.floor(diff / 86400000);
    if (min < 1)   return '방금';
    if (min < 60)  return `${min}분 전`;
    if (hour < 24) return `${hour}시간 전`;
    return `${day}일 전`;
  },

  getStatusLabel(status) {
    const map = {
      recruiting: { label: '모집중', class: 'badge-recruiting', dot: '🟢' },
      closing:    { label: '마감 임박', class: 'badge-closing', dot: '🟡' },
      closed:     { label: '마감', class: 'badge-closed', dot: '⚫' },
      confirmed:  { label: '확정', class: 'badge-confirmed', dot: '✅' }
    };
    return map[status] || map.recruiting;
  },

  getLevelColor(level) {
    const map = {
      '초급': '#4ADE80',
      '초중급': '#86EFAC',
      '중급': '#C8FF00',
      '중상급': '#FFD700',
      '상급': '#FF7043'
    };
    return map[level] || '#9CA3AF';
  },

  makeKakaoPayLink(amount, hostName) {
    // 카카오페이 송금 딥링크 (실제 환경에서는 실제 링크 사용)
    return `kakaopay://send?amount=${amount}&name=${encodeURIComponent(hostName)}`;
  }
};

// ── SVG 아이콘 라이브러리 ────────────────────
const Icons = {
  home: `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
  tennis: `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  plus: `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  bell: `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  user: `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  back: `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`,
  location: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  calendar: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  clock: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  users: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  won: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  check: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  x: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  settings: `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  logout: `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  arrow: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>`,
  star: `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  trash: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  kakao: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#3A1D00"><path d="M12 3C6.477 3 2 6.477 2 10.88c0 2.667 1.62 5.014 4.08 6.432-.15.56-.538 2.03-.617 2.345-.097.39.142.384.3.28.124-.083 1.966-1.336 2.763-1.878.467.065.944.1 1.474.1 5.523 0 10-3.477 10-7.88S17.523 3 12 3z"/></svg>`,
  info: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  trophy: `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>`,
  shield: `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
};

window.App = App;
window.Auth = Auth;
window.Store = Store;
window.Matches = Matches;
window.Utils = Utils;
window.Icons = Icons;
