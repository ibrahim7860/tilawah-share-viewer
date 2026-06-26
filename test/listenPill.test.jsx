import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ListenPill from '../src/components/ListenPill.jsx'

describe('ListenPill', () => {
  it('idle (nothing playing) shows only the exit control', () => {
    render(<ListenPill isActive={false} isPlaying={false} onStop={vi.fn()} onPlayPause={vi.fn()} onExit={vi.fn()} />)
    expect(screen.getByLabelText('Exit listen mode')).toBeTruthy()
    expect(screen.queryByLabelText('Stop playback')).toBeNull()
    expect(screen.queryByLabelText('Pause')).toBeNull()
  })

  it('active + playing shows stop, pause, exit and fires callbacks', () => {
    const onStop = vi.fn(); const onPlayPause = vi.fn(); const onExit = vi.fn()
    render(<ListenPill isActive isPlaying onStop={onStop} onPlayPause={onPlayPause} onExit={onExit} />)
    fireEvent.click(screen.getByLabelText('Stop playback'))
    fireEvent.click(screen.getByLabelText('Pause'))
    fireEvent.click(screen.getByLabelText('Exit listen mode'))
    expect(onStop).toHaveBeenCalledTimes(1)
    expect(onPlayPause).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('while loading shows a spinner + exit, no transport controls', () => {
    const { container } = render(<ListenPill loading isActive={false} isPlaying={false} onStop={vi.fn()} onPlayPause={vi.fn()} onExit={vi.fn()} />)
    expect(container.querySelector('.audio-spinner')).toBeTruthy()
    expect(screen.getByLabelText('Exit listen mode')).toBeTruthy()
    expect(screen.queryByLabelText('Stop playback')).toBeNull()
  })

  it('active + paused shows a resume control', () => {
    render(<ListenPill isActive isPlaying={false} onStop={vi.fn()} onPlayPause={vi.fn()} onExit={vi.fn()} />)
    expect(screen.getByLabelText('Resume')).toBeTruthy()
    expect(screen.queryByLabelText('Pause')).toBeNull()
  })

  it('a drag past the threshold swallows the trailing click (button does not fire)', () => {
    const onStop = vi.fn()
    const { container } = render(<ListenPill isActive isPlaying onStop={onStop} onPlayPause={vi.fn()} onExit={vi.fn()} />)
    const pill = container.querySelector('.listen-pill')
    const stop = screen.getByLabelText('Stop playback')
    fireEvent.pointerDown(pill, { clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(pill, { clientX: 140, clientY: 110, pointerId: 1 })
    fireEvent.pointerUp(pill, { clientX: 140, clientY: 110, pointerId: 1 })
    fireEvent.click(stop)
    expect(onStop).not.toHaveBeenCalled()
  })
})
