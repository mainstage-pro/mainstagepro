'use client'

import { useEffect, useRef, useState } from 'react'

interface UndoToastProps {
  message: string
  onUndo: () => void
  onConfirm: () => void
  duration?: number
}

type UndoToastState = UndoToastProps & { id: string }

let _toastState: UndoToastState | null = null
let _listeners: Array<(state: UndoToastState | null) => void> = []

function _notify(state: UndoToastState | null) {
  _toastState = state
  _listeners.forEach(fn => fn(state))
}

/** Muestra el toast de deshacer. Retorna el id del toast. */
export function showUndoToast(props: UndoToastProps): string {
  const id = Math.random().toString(36).slice(2)
  _notify({ ...props, id })
  return id
}

/** Coloca este componente una sola vez en el layout raíz del módulo. */
export function UndoToastContainer() {
  const [toast, setToast]       = useState<UndoToastState | null>(null)
  const [progress, setProgress] = useState(100)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef    = useRef<number>(0)

  useEffect(() => {
    const listener = (state: UndoToastState | null) => {
      if (timerRef.current)    clearTimeout(timerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)

      if (!state) { setToast(null); setProgress(100); return }

      const duration = state.duration ?? 5000
      setToast(state)
      setProgress(100)
      startRef.current = Date.now()

      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startRef.current
        const pct = Math.max(0, 100 - (elapsed / duration) * 100)
        setProgress(pct)
        if (pct <= 0 && intervalRef.current) clearInterval(intervalRef.current)
      }, 40)

      timerRef.current = setTimeout(() => {
        state.onConfirm()
        setToast(null)
        setProgress(100)
      }, duration)
    }

    _listeners.push(listener)
    return () => { _listeners = _listeners.filter(fn => fn !== listener) }
  }, [])

  function handleUndo() {
    if (timerRef.current)    clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    toast?.onUndo()
    setToast(null)
    setProgress(100)
    _notify(null)
  }

  function handleDismiss() {
    if (timerRef.current)    clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    toast?.onConfirm()
    setToast(null)
    setProgress(100)
    _notify(null)
  }

  if (!toast) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-80">
      <div
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideInUp 0.25s ease-out' }}
      >
        {/* Countdown bar */}
        <div className="h-[3px] bg-[#1a1a1a]">
          <div
            className="h-full bg-[#c9a96a]"
            style={{ width: `${progress}%`, transition: 'none' }}
          />
        </div>
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-sm">✓</span>
            <span className="text-sm text-gray-200">{toast.message}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleUndo}
              className="text-[#c9a96a] text-xs font-semibold hover:text-[#d4b060] transition-colors"
            >
              Deshacer
            </button>
            <button
              onClick={handleDismiss}
              className="text-gray-600 hover:text-gray-400 text-sm transition-colors leading-none"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
