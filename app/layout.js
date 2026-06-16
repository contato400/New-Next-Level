import { Analytics } from "@vercel/analytics/next"
import Script from "next/script"
import ScarcityBanner from "./ScarcityBanner"

export const metadata = {
  title: 'Sessão Estratégica - NextLevel Formed',
  description: 'Agende sua sessão estratégica gratuita e descubra como alcançar seus objetivos.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {/* Meta Pixel Code */}
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','402956308839839');fbq('track','PageView');`,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=402956308839839&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {/* End Meta Pixel Code */}
        <ScarcityBanner />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
