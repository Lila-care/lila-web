import { useRef } from 'react'
import { Dialog } from 'radix-ui'
import { describeUpgradeGate, type UpgradeGate } from './upgradeGate'

interface UpgradeGateModalProps {
  gate: UpgradeGate
  onClose: () => void
}

// Radix Dialog: focus trap, Esc and outside click close, focus starts on the main CTA.
export default function UpgradeGateModal({ gate, onClose }: UpgradeGateModalProps) {
  const copy = describeUpgradeGate(gate)
  const primaryRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4">
          <Dialog.Content
            aria-describedby="upgrade-gate-body"
            onOpenAutoFocus={(e) => {
              e.preventDefault()
              primaryRef.current?.focus()
            }}
            style={{
              background: '#1a1a1a',
              border: '1px solid #2e2e2e',
              borderRadius: '24px',
              fontFamily: "'Poppins', system-ui, sans-serif",
            }}
            data-testid="upgrade-gate-modal"
            data-reason={gate.reason}
            className="pointer-events-auto w-full max-w-sm p-8 flex flex-col items-center text-center gap-5 focus:outline-none"
          >
            <img src="/sello_vinotinto.svg" alt="Lila" className="w-16 h-16" />

            <Dialog.Title
              className="text-xl font-bold leading-tight"
              style={{ color: '#F8EAFE' }}
            >
              {copy.title}
            </Dialog.Title>

            <p
              id="upgrade-gate-body"
              className="text-sm leading-relaxed"
              style={{ color: '#828282' }}
            >
              {copy.body}
            </p>

            <button
              ref={primaryRef}
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-colors duration-[180ms] focus-visible:ring-2 focus-visible:ring-[#F8EAFE] focus:outline-none"
              style={{ background: '#7e3565', color: '#F8EAFE' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#92407a'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#7e3565'
              }}
            >
              {copy.primary}
            </button>

            <button
              onClick={onClose}
              className="text-sm underline transition-opacity hover:opacity-70"
              style={{ color: '#828282' }}
            >
              {copy.secondary}
            </button>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
