// One shared decorative asset for Home and Tour Programs; never exposed as content.
export default function Botanical({className=''}) {
  return <img className={`home-botanical ${className}`} src="/images/decoration/palm-frond.webp" alt="" aria-hidden="true" width="1024" height="1024" loading="lazy"/>
}
