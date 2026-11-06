/** Fırsatın rozeti: kullanıcının yüklediği ikon. Boyutu kapsayıcıdan (className) alır. */
export function DealBadge({ url, className = 'size-10' }: { url: string; className?: string }) {
  return <img src={url} alt="" className={`${className} shrink-0 object-contain drop-shadow-sm`} />;
}
