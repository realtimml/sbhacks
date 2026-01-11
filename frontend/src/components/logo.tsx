import logoSvg from '../assets/logo.svg'

export default function Logo() {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <img src={logoSvg} alt="hound.ai logo" className="w-8 h-8" />
      <span className="font-serif text-[28px] font-normal text-[#393939] leading-none tracking-tight">
        hound.ai
      </span>
    </div>
  )
}
