import { useEffect, useState, type ReactNode } from 'react'
import { motion, useScroll, useSpring, type Variants } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

const ENTREE: Variants = {
  cache: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
}

/** Fait apparaître son contenu en glissant vers le haut quand il entre à l'écran. */
export function Apparait({ children, delai = 0, className = '' }: { children: ReactNode; delai?: number; className?: string }) {
  return (
    <motion.div className={className} initial="cache" whileInView="visible" viewport={{ once: true, margin: '-60px' }}
      variants={ENTREE} transition={{ delay: delai }}>
      {children}
    </motion.div>
  )
}

/** Grille dont les éléments apparaissent l'un après l'autre. */
export function Cascade({ children, className = '', pas = 0.07 }: { children: ReactNode; className?: string; pas?: number }) {
  return (
    <motion.div className={className} initial="cache" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
      variants={{ visible: { transition: { staggerChildren: pas } } }}>
      {children}
    </motion.div>
  )
}
export function CascadeElement({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} variants={ENTREE}>{children}</motion.div>
}

/** Fine barre rouge en haut de l'écran qui suit la lecture de la page. */
export function BarreLecture() {
  const { scrollYProgress } = useScroll()
  const x = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 })
  return <motion.div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-rouge-500" style={{ scaleX: x }} />
}

/** Vrai dès que la page a défilé de plus de `seuil` pixels. */
export function useDefile(seuil = 8) {
  const [d, setD] = useState(false)
  useEffect(() => {
    const f = () => setD(window.scrollY > seuil)
    f(); window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [seuil])
  return d
}

/** Bouton « remonter en haut » qui apparaît après un long défilement. */
export function RetourHaut({ bas = false }: { bas?: boolean }) {
  const visible = useDefile(700)
  return (
    <motion.button aria-label="Remonter en haut de la page" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      initial={false} animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.6, pointerEvents: visible ? 'auto' : 'none' }}
      className={`fixed right-4 z-30 grid h-11 w-11 place-items-center rounded-full bg-encre-900 text-white shadow-lg hover:bg-rouge-600 transition-colors ${bas ? 'bottom-24 md:bottom-6' : 'bottom-6'}`}>
      <ArrowUp size={18} />
    </motion.button>
  )
}
