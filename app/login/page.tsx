'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      setErr('Incorrect password')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '13px',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--accent)', marginBottom: '8px',
          }}>The S.W.A.D.E.S Style</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '32px',
            fontWeight: 300, color: 'var(--ink)', lineHeight: 1.2,
          }}>Dispatch<br /><em>Dashboard</em></h1>
        </div>

        <div className="card">
          <form onSubmit={handleLogin}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500,
              color: 'var(--muted)', marginBottom: '6px',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
              textTransform: 'uppercase' }}>
              Team Password
            </label>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="Enter password"
              autoFocus
              style={{ width: '100%', marginBottom: '16px' }}
            />
            {err && (
              <div style={{ color: 'var(--accent)', fontSize: '13px',
                marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>
                {err}
              </div>
            )}
            <button type="submit" className="btn btn-primary"
              disabled={loading || !pw}
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px',
          color: 'var(--muted)', fontSize: '12px' }}>
          Contact your admin if you've forgotten the password.
        </p>
      </div>
    </div>
  )
}
