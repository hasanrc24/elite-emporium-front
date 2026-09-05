import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, Clock3, Headphones, Mail, MapPin, Phone, RotateCcw } from 'lucide-react';

export function Footer({ locale, menu }) {
  const bn = locale === 'bn';
  return <footer className="mt-24">
    <div className="border-y border-[var(--color-border)] bg-white"><div className="container grid gap-x-8 gap-y-5 py-8 sm:grid-cols-2 lg:grid-cols-4"><Trust icon={BadgeCheck} title={bn ? 'নিরাপদ কেনাকাটা' : 'Secure payments'} text={bn ? 'বিশ্বস্ত পেমেন্ট' : '100% safe checkout'} /><Trust icon={RotateCcw} title={bn ? 'সহজ রিটার্ন' : 'Easy returns'} text={bn ? '৭ দিনের মধ্যে' : 'Within 7 days'} /><Trust icon={Headphones} title={bn ? 'সহায়তা' : 'Customer support'} text={bn ? 'আমরা পাশে আছি' : 'Real help when needed'} /><Trust icon={Clock3} title={bn ? 'মানসম্পন্ন পণ্য' : 'Quality products'} text={bn ? 'যাচাইকৃত মান' : 'Carefully selected'} /></div></div>
    <div className="bg-[#171a1b] text-white">
      <div className="container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.35fr_.65fr_.7fr_.8fr]">
        <div><div className="text-sm font-bold tracking-[.14em]">ELITE EMPORIUM</div><p className="mt-4 max-w-sm text-xs leading-6 text-white/55">{bn ? 'স্টাইল, মান ও আরামের জন্য বাছাই করা আধুনিক পোশাক।' : 'Subscribe for early access, styling notes, and new arrivals.'}</p><form className="mt-5 flex max-w-sm"><label className="sr-only" htmlFor="footer-email">Email</label><input id="footer-email" type="email" className="!min-h-10 !rounded-r-none !border-white/15 !bg-white/10 !text-white placeholder:!text-white/35" placeholder="Enter your email" /><button type="submit" aria-label="Subscribe" className="grid min-w-11 place-items-center rounded-r-[var(--radius-sm)] bg-[var(--color-primary)]"><Mail size={16} /></button></form><p className="mt-5 text-xs text-white/45">Follow us · Facebook · Instagram · YouTube</p></div>
        <FooterColumn title={bn ? 'দোকান' : 'Shop'}><Link href={`/${locale}/shop`}>All products</Link><Link href={`/${locale}/shop?sale=true`}>Sale</Link><Link href={`/${locale}/wishlist`}>Wishlist</Link></FooterColumn>
        <FooterColumn title={bn ? 'ক্রেতা সহায়তা' : 'Customer care'}>{menu?.items?.length ? menu.items.slice(0, 6).map((item) => <Link key={item.id} href={item.url?.startsWith('https://') ? item.url : `/${locale}${item.url || ''}`}>{item.label}</Link>) : <><Link href={`/${locale}/contact`}>Contact us</Link><Link href={`/${locale}/track-order`}>Track order</Link><Link href={`/${locale}/returns`}>Returns & exchanges</Link></>}</FooterColumn>
        <FooterColumn title={bn ? 'আমাদের সম্পর্কে' : 'About us'}><Link href={`/${locale}/page/about`}>Our story</Link><p className="flex items-start gap-2 text-white/55"><MapPin size={14} className="mt-1 shrink-0" />Dhaka, Bangladesh</p><a className="flex items-center gap-2" href="tel:+8801700000000"><Phone size={14} />+880 1700-000000</a></FooterColumn>
      </div>
      <div className="border-t border-white/10 py-5"><div className="container flex flex-wrap items-center justify-between gap-4 text-[11px] text-white/45"><p>© {new Date().getFullYear()} Elite Emporium. All rights reserved.</p><div className="flex items-center gap-2"><span className="rounded bg-white px-2 py-1 font-bold text-[#16357a]">VISA</span><span className="rounded bg-white px-2 py-1 font-bold text-[#d72458]">bKash</span><span className="rounded bg-white px-2 py-1 font-bold text-[#e17818]">Nagad</span></div><div className="flex gap-4"><Link href={`/${locale}/page/privacy-policy`}>Privacy</Link><Link href={`/${locale}/page/terms`}>Terms</Link></div></div></div>
    </div>
  </footer>;
}

function FooterColumn({ title, children }) { return <div><h2 className="text-[11px] font-bold uppercase tracking-[.13em] text-white/45">{title}</h2><div className="mt-4 grid gap-2.5 text-xs text-white/70 [&>a]:transition [&>a:hover]:text-white">{children}</div></div>; }

function Trust({ icon: Icon, title, text }) { return <div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-[.75rem] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Icon size={18} /></span><div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-[var(--color-muted)]">{text}</p></div></div>; }
