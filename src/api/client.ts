const API_BASE: string = import.meta.env.VITE_API_BASE_URL || ''

export interface ChatRequestBody {
  message: string
  sessionId?: string | null
  image_search?: boolean
  image_data?: string | null
}

export interface ProductCard {
  id?: string
  title?: string
  price?: number
  rating?: number
  category?: string
  image_url?: string
  imgURL?: string
  imgUrl?: string
  product_url?: string
  productURL?: string
  description?: string
}

interface ChatResponseFlex {
  message?: string
  response?: string
  text?: string
  reply?: string
  sessionId?: string
  session_id?: string
  products?: ProductCard[]
}

export async function chat(request: ChatRequestBody): Promise<{ reply: string; sessionId?: string; products: ProductCard[] }> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status} ${res.statusText}`)
  }

  const data: ChatResponseFlex = await res.json()
  const reply = data.message ?? data.response ?? data.text ?? data.reply ?? ''
  const sessionId = data.sessionId ?? data.session_id
  const products = Array.isArray(data.products) ? data.products : []
  return { reply, sessionId, products }
}

type ProductSearchResponseFlex = {
  result1?: string
  result2?: string
  first?: string
  second?: string
  a?: string
  b?: string
  results?: string[]
}

export async function searchProducts(query: string): Promise<{ result1: string; result2: string }> {
  const res = await fetch(`${API_BASE}/search/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    throw new Error(`Product search failed: ${res.status} ${res.statusText}`)
  }
  const data: ProductSearchResponseFlex = await res.json()
  const result1 = data.result1 ?? data.first ?? data.a ?? data.results?.[0] ?? ''
  const result2 = data.result2 ?? data.second ?? data.b ?? data.results?.[1] ?? ''
  return { result1, result2 }
}

export async function searchImage(file: File): Promise<{ results: unknown; filename: string }> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${API_BASE}/search/image`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    throw new Error(`Image search failed: ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as { results?: unknown; filename?: string }
  return { results: data.results ?? null, filename: data.filename ?? file.name }
}

export async function health(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`)
    return res.ok
  } catch {
    return false
  }
}


