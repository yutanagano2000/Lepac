import { http, HttpResponse } from 'msw'

// テスト用のモックデータ
export const mockProjects = [
  {
    id: 1,
    managementNumber: '0001',
    manager: 'テスト担当',
    client: 'テストクライアント',
    projectNumber: 'P0001',
    completionMonth: '2026-02',
    prefecture: '広島県',
    address: '広島市中区1-1-1',
  },
  {
    id: 2,
    managementNumber: '0002',
    manager: 'テスト担当2',
    client: 'テストクライアント2',
    projectNumber: 'P0002',
    completionMonth: '2026-03',
    prefecture: '岡山県',
    address: '岡山市北区2-2-2',
  },
]

export const mockOrganizations = [
  { id: 1, name: 'Person Energy', code: 'person-energy' },
  { id: 2, name: 'ROOTS', code: 'roots' },
  { id: 3, name: 'エクソル', code: 'exsol' },
  { id: 4, name: '双日', code: 'sojitz' },
]

export const mockTodos = [
  {
    id: 1,
    projectId: 1,
    content: 'テストTODO1',
    dueDate: '2026-02-10',
    createdAt: '2026-02-01T00:00:00.000Z',
    completedAt: null,
  },
  {
    id: 2,
    projectId: 1,
    content: 'テストTODO2（期限切れ）',
    dueDate: '2026-01-01',
    createdAt: '2025-12-01T00:00:00.000Z',
    completedAt: null,
  },
]

// フィードバックのモックデータ
export const mockFeedbacks = [
  {
    id: 1,
    content: 'テストフィードバック1',
    status: 'pending',
    likes: 5,
    replies: null,
    userId: 1,
    userName: 'テストユーザー',
    pagePath: '/projects',
    pageTitle: '案件一覧',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 2,
    content: 'テストフィードバック2',
    status: 'in_progress',
    likes: 3,
    replies: '対応中です',
    userId: 2,
    userName: 'テストユーザー2',
    pagePath: '/dashboard',
    pageTitle: 'ダッシュボード',
    createdAt: '2026-02-02T00:00:00.000Z',
  },
]

export const handlers = [
  // 認証関連
  http.get('/api/auth/session', () => {
    return HttpResponse.json({
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        organizationId: 1,
      },
      expires: '2099-12-31T23:59:59.999Z',
    })
  }),

  http.post('/api/auth/callback/credentials', async ({ request }) => {
    const body = await request.formData()
    const username = body.get('username')
    const password = body.get('password')

    if (username === 'admin' && password === 'password') {
      return HttpResponse.json({ ok: true })
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }),

  // 組織関連
  http.get('/api/organizations', () => {
    return HttpResponse.json(mockOrganizations)
  }),

  http.put('/api/user/organization', async ({ request }) => {
    const body = await request.json() as { organizationId: number }
    if (body.organizationId && body.organizationId > 0) {
      return HttpResponse.json({ success: true })
    }
    return HttpResponse.json({ error: 'Invalid organization ID' }, { status: 400 })
  }),

  // 案件関連
  http.get('/api/projects', () => {
    return HttpResponse.json(mockProjects)
  }),

  http.get('/api/projects/:id', ({ params }) => {
    const project = mockProjects.find((p) => p.id === Number(params.id))
    if (project) {
      return HttpResponse.json(project)
    }
    return HttpResponse.json({ error: 'Project not found' }, { status: 404 })
  }),

  http.post('/api/projects', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    if (!body.managementNumber || !body.client) {
      return HttpResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }
    return HttpResponse.json({ id: 999, ...body }, { status: 201 })
  }),

  http.patch('/api/projects/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const project = mockProjects.find((p) => p.id === Number(params.id))
    if (!project) {
      return HttpResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    return HttpResponse.json({ ...project, ...body })
  }),

  http.delete('/api/projects/:id', ({ params }) => {
    const project = mockProjects.find((p) => p.id === Number(params.id))
    if (!project) {
      return HttpResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    return HttpResponse.json({ success: true })
  }),

  // 工事関連
  http.get('/api/construction', () => {
    return HttpResponse.json({
      projects: mockProjects.map((p) => ({
        ...p,
        deliveryLocation: null,
        mountOrderDate: null,
        mountDeliveryScheduled: null,
        mountDeliveryStatus: null,
        panelOrderDate: null,
        panelDeliveryScheduled: null,
        panelDeliveryStatus: null,
        constructionAvailableDate: null,
        loadTestStatus: null,
        loadTestDate: null,
        pileStatus: null,
        pileDate: null,
      })),
      count: mockProjects.length,
    })
  }),

  http.patch('/api/construction/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ success: true, project: { id: Number(params.id), ...body } })
  }),

  // ダッシュボード
  http.get('/api/dashboard', () => {
    return HttpResponse.json({
      overdueTodos: { count: 1, items: [mockTodos[1]] },
      todayTodos: { count: 0, items: [] },
      thisWeekTodos: { count: 1, items: [mockTodos[0]] },
      projectAlerts: { count: 0, totalAlerts: 0, items: [] },
      activeProjects: { count: 2, items: mockProjects },
      recentProjects: { items: mockProjects },
      completionAlerts: { redCount: 0, yellowCount: 0, items: [] },
      siteInvestigationAlerts: { redCount: 0, yellowCount: 0, items: [] },
    })
  }),

  // TODO関連
  http.get('/api/todos', () => {
    return HttpResponse.json(mockTodos)
  }),

  http.post('/api/todos', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    if (!body.content || !body.dueDate) {
      return HttpResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }
    return HttpResponse.json({ id: 999, ...body }, { status: 201 })
  }),

  http.patch('/api/todos/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const todo = mockTodos.find((t) => t.id === Number(params.id))
    if (!todo) {
      return HttpResponse.json({ error: 'Todo not found' }, { status: 404 })
    }
    return HttpResponse.json({ ...todo, ...body })
  }),

  // フィードバック関連
  http.get('/api/feedbacks', () => {
    return HttpResponse.json(mockFeedbacks)
  }),

  http.get('/api/feedbacks/:id', ({ params }) => {
    const id = params.id as string
    // ID検証
    if (!/^\d+$/.test(id)) {
      return HttpResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }
    const numId = Number(id)
    if (numId <= 0) {
      return HttpResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }
    const feedback = mockFeedbacks.find((f) => f.id === numId)
    if (!feedback) {
      return HttpResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }
    return HttpResponse.json(feedback)
  }),

  http.post('/api/feedbacks', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    if (!body.content) {
      return HttpResponse.json({ error: 'content is required' }, { status: 400 })
    }
    return HttpResponse.json({
      id: 999,
      content: body.content,
      status: 'pending',
      likes: 0,
      ...body,
    }, { status: 201 })
  }),

  http.put('/api/feedbacks/:id', async ({ params, request }) => {
    const id = params.id as string
    if (!/^\d+$/.test(id)) {
      return HttpResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }
    const numId = Number(id)
    const feedback = mockFeedbacks.find((f) => f.id === numId)
    if (!feedback) {
      return HttpResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json() as Record<string, unknown>
    } catch {
      return HttpResponse.json({ error: '無効なJSONです' }, { status: 400 })
    }

    // ステータスバリデーション
    const allowedStatuses = ['pending', 'in_progress', 'completed', 'rejected']
    if (body.status && !allowedStatuses.includes(body.status as string)) {
      return HttpResponse.json({ error: '無効なステータス値です' }, { status: 400 })
    }

    // repliesの長さバリデーション
    if (body.replies && typeof body.replies === 'string' && body.replies.length > 10000) {
      return HttpResponse.json({ error: 'repliesは10000文字以内の文字列である必要があります' }, { status: 400 })
    }

    return HttpResponse.json({ ...feedback, ...body })
  }),

  http.post('/api/feedbacks/:id/like', ({ params }) => {
    const id = params.id as string
    if (!/^\d+$/.test(id)) {
      return HttpResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }
    const numId = Number(id)
    const feedback = mockFeedbacks.find((f) => f.id === numId)
    if (!feedback) {
      return HttpResponse.json({ error: 'フィードバックが見つかりません' }, { status: 404 })
    }
    return HttpResponse.json({ id: numId, likes: feedback.likes + 1 })
  }),

  http.delete('/api/feedbacks/:id', ({ params }) => {
    const id = params.id as string
    if (!/^\d+$/.test(id)) {
      return HttpResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }
    const numId = Number(id)
    const feedback = mockFeedbacks.find((f) => f.id === numId)
    if (!feedback) {
      return HttpResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }
    return HttpResponse.json({ success: true })
  }),
]
