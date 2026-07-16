import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',textAlign:'center',padding:'2rem'}}>
      <h1 style={{fontSize:'4rem',margin:0,color:'var(--accent,#f0642f)'}}>404</h1>
      <p style={{fontSize:'1.25rem',margin:'0.5rem 0'}}>Page not found</p>
      <p style={{color:'#666',maxWidth:'400px'}}>The page you are looking for does not exist or has been moved.</p>
      <Link href="/" style={{marginTop:'1rem',padding:'0.75rem 1.5rem',background:'var(--accent,#f0642f)',color:'#fff',borderRadius:'8px',textDecoration:'none',fontWeight:600}}>Back to home</Link>
    </div>
  );
}