import type { CameraRequest, CommandRequest, ControlAction, ControlDomain, ControlEnvelope, ControlPayload, PropertyRequest } from '../../types'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function toCommandRequest(v: unknown): CommandRequest | null {
  if (!isRecord(v)) return null
  const key = String(v.key ?? '').trim()
  const id = String(v.id ?? '').trim()
  if (!key || !id) return null
  return { key, id, params: v.params }
}

function toPropertyRequest(v: unknown): PropertyRequest | null {
  if (!isRecord(v)) return null
  const key = String(v.key ?? '').trim()
  const id = String(v.id ?? '').trim()
  if (!key || !id) return null
  return { key, id, params: v.params }
}

function toCameraRequest(v: unknown): CameraRequest | null {
  if (!isRecord(v)) return null
  const key = String(v.key ?? '').trim()
  if (!key) return null
  const id = String(v.id ?? '').trim()
  return { key, id: id || undefined, params: v.params }
}

function toPayload(v: unknown): ControlPayload | null {
  if (!isRecord(v)) return null
  const kind = v.kind
  if (kind === 'command') {
    const req = toCommandRequest(v.request)
    if (!req) return null
    return { kind: 'command', request: req }
  }
  if (kind === 'property') {
    const req = toPropertyRequest(v.request)
    if (!req) return null
    return { kind: 'property', request: req }
  }
  if (kind === 'camera') {
    const req = toCameraRequest(v.request)
    if (!req) return null
    return { kind: 'camera', request: req }
  }
  if (kind === 'widget') {
    const widgetId = String(v.widgetId ?? '').trim()
    const patch = isRecord(v.patch) ? v.patch : null
    if (!widgetId || !patch) return null
    return { kind: 'widget', widgetId, patch, refresh: v.refresh !== false }
  }
  const command = toCommandRequest(v)
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

