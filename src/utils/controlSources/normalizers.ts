import type { ControlAction, ControlDomain, ControlEnvelope, ControlPayload, ControlRequest } from '../../types'
import { WIDGET_PATCH_REQUEST_KEY } from '../../types'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function toControlRequest(v: unknown, opts: { requireId: boolean }): ControlRequest | null {
  if (!isRecord(v)) return null
  const key = String(v.key ?? '').trim()
  if (!key) return null
  const idRaw = String(v.id ?? '').trim()
  if (opts.requireId && !idRaw) return null
  return { key, id: idRaw || undefined, params: v.params }
}

function toPayload(v: unknown): ControlPayload | null {
  if (!isRecord(v)) return null
  const kind = v.kind
  if (kind === 'command') {
    const req = toControlRequest(v.request, { requireId: true })
    if (!req) return null
    return { kind: 'command', request: req }
  }
  if (kind === 'property') {
    const req = toControlRequest(v.request, { requireId: true })
    if (!req) return null
    return { kind: 'property', request: req }
  }
  if (kind === 'camera') {
    const req = toControlRequest(v.request, { requireId: false })
    if (!req) return null
    return { kind: 'camera', request: req }
  }
  if (kind === 'widget') {
    if (isRecord(v.request)) {
      const r = v.request
      const key = String(r.key ?? '').trim()
      const id = String(r.id ?? '').trim()
      if (!key || !id) return null
      const par = r.params
      if (!isRecord(par)) return null
      const patch = par.patch
      if (!isRecord(patch)) return null
      return {
        kind: 'widget',
        request: {
          key,
          id,
          params: { patch, refresh: par.refresh !== false }
        }
      }
    }
    const targetId = String(v.id ?? '').trim()
    const patch = isRecord(v.patch) ? v.patch : null
    if (!targetId || !patch) return null
    return {
      kind: 'widget',
      request: {
        key: WIDGET_PATCH_REQUEST_KEY,
        id: targetId,
        params: { patch, refresh: v.refresh !== false }
      }
    }
  }
  const command = toControlRequest(v, { requireId: true })
  if (command) return { kind: 'command', request: command }
  return null
}

function toDomain(v: unknown): ControlDomain | null {
  return v === '2d' || v === '3d' ? v : null
}

function toAction(v: unknown): ControlAction | null {
  return v === 'command' || v === 'property' || v === 'camera' || v === 'chart' || v === 'other' ? v : null
}

export function normalizeControlEnvelope(sourceId: string, input: unknown): ControlEnvelope | null {
  const sid = String(sourceId ?? '').trim()
  if (!sid) return null

  if (!isRecord(input) || !isRecord(input.payload) || !isRecord(input.header)) return null
  const payload = toPayload(input.payload)
  if (!payload) return null
  const domain = toDomain(input.header.domain)
  const action = toAction(input.header.action)
  if (!domain || !action) return null
  return {
    sourceId: String(input.sourceId ?? sid),
    timestamp: Number.isFinite(Number(input.timestamp)) ? Number(input.timestamp) : Date.now(),
    traceId: typeof input.traceId === 'string' ? input.traceId : undefined,
    priority: Number.isFinite(Number(input.priority)) ? Number(input.priority) : undefined,
    header: { domain, action },
    payload
  }
}

export function toControlEnvelope(sourceId: string, header: { domain: ControlDomain; action: ControlAction }, payload: ControlPayload): ControlEnvelope {
  return {
    sourceId,
    timestamp: Date.now(),
    header,
    payload
  }
}

