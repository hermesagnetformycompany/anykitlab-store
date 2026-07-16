'use client';

import Link from 'next/link';

export default function Error({reset}: {error: Error & {digest?: string}; reset: () => void}) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',textAlign:'center',padding:'2rem'}}>
      <h1 style={{fontSize:'2rem',margin:0,color:'var(--accent,#f0642f)'}}>Something went wrong</h1>
      <p style={{color:'#666',maxWidth:'400px',margin:'0.5rem 0 1rem'}}>An unexpected error occurred. Please try again.</p>
      <div style={{display:'flex',gap:'0.75rem'}}>
        <button onClick={reset} style={{padding:'0.75rem 1.5rem',background:'var(--accent,#f0642f)',color:'#fff',border:'none',borderRadius:'8px',fontWeight:600,cursor:'pointer'}}>Try again</button>
        <Link href="/" style={{padding:'0.75rem 1.5rem',border:'1px solid #ddd',borderRadius:'8px',textDecoration:'none',fontWeight:600,color:'inherit'}}>Back to home</Link>
      </div>
    </div>
  );
}