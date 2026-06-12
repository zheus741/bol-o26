/** Loader da marca — anéis concêntricos girando (eco do AMPLIFY). */
export function Loader({ label = 'Carregando…', full = false }: { label?: string; full?: boolean }) {
  return (
    <div className={full ? 'loader loader--full' : 'loader'} role="status" aria-live="polite">
      <span className="loader-ring" aria-hidden />
      {label && <span className="loader-label anton">{label}</span>}
    </div>
  )
}
