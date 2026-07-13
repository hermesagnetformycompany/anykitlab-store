import type {Metadata,Viewport} from 'next';import {DM_Sans,Manrope} from 'next/font/google';import './globals.css';import './reference.css';import './home-reference.css';import './admin-v2.css';import './scale.css';import './polish.css';import {AppShell} from '@/components/site';
const display=DM_Sans({subsets:['latin'],variable:'--font-display',weight:['500','600','700']});const body=Manrope({subsets:['latin'],variable:'--font-body'});
export const viewport:Viewport={width:'device-width',initialScale:1};
export const metadata:Metadata={title:{default:'AnyKit Lab — Templates for brands that move',template:'%s — AnyKit Lab'},description:'Editable Canva template kits for ambitious small brands.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable}`}><body><AppShell>{children}</AppShell></body></html>}
