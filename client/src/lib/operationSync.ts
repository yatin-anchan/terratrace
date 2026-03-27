type OperationRefreshDetail = {
  operationId: string
  reason?: string
  at: number
}

const EVENT_NAME = 'terratrace:operation-refresh'

export function emitOperationRefresh(operationId: string, reason?: string) {
  const detail: OperationRefreshDetail = {
    operationId,
    reason,
    at: Date.now(),
  }

  window.dispatchEvent(new CustomEvent<OperationRefreshDetail>(EVENT_NAME, { detail }))
}

export function subscribeOperationRefresh(
  operationId: string,
  callback: (detail: OperationRefreshDetail) => void
) {
  const handler = (event: Event) => {
    const custom = event as CustomEvent<OperationRefreshDetail>
    if (custom.detail?.operationId === operationId) {
      callback(custom.detail)
    }
  }

  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}