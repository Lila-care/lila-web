import type { ReactNode } from "react";
import { Link } from "wouter";
import sealBadge from "../assets/landing/seal-lila-badge.svg";
import { SectionContainer } from "./LandingPrimitives";

const LINK_CLASS =
  "text-sm font-normal! leading-5 text-[#b793c6] hover:text-white!";
const TEXT_CLASS = "text-sm leading-5 text-[#b793c6]";

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-[13px] font-medium leading-[18px] text-white">{title}</p>
      <ul className="flex flex-col items-start gap-3">{children}</ul>
    </div>
  );
}

export default function LandingFooter() {
  return (
    <footer className="bg-[color:var(--brand-primary-dark)]">
      <SectionContainer className="flex flex-col gap-10 pb-10 pt-12 md:pt-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <img src={sealBadge} alt="" width={44} height={44} />
              <span className="font-['Poppins'] text-xl font-semibold leading-7 text-white">
                Lila Care
              </span>
            </div>
            <p className="max-w-[300px] text-sm leading-5 text-[#b793c6]">
              Autoconocimiento del ciclo, con tus datos protegidos.
            </p>
          </div>
          <nav
            aria-label="Pie de página"
            className="flex flex-col gap-8 sm:flex-row sm:flex-wrap lg:gap-16"
          >
            <Column title="Producto">
              <li><a href="#how-it-works" className={LINK_CLASS}>Cómo funciona</a></li>
              <li><a href="#plans" className={LINK_CLASS}>Planes</a></li>
              <li><a href="#privacy" className={LINK_CLASS}>Privacidad</a></li>
            </Column>
            <Column title="Legal">
              <li><span className={TEXT_CLASS}>Política de tratamiento de datos</span></li>
              <li><Link href="/terms" className={LINK_CLASS}>Términos y condiciones</Link></li>
            </Column>
            <Column title="Contacto">
              <li><span className={TEXT_CLASS}>Soporte</span></li>
              <li>
                <a href="https://www.instagram.com/lila.careapp" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                  Instagram @lila.careapp
                </a>
              </li>
              <li>
                <a href="https://www.tiktok.com/@lila.care" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                  TikTok @lila.care
                </a>
              </li>
            </Column>
          </nav>
        </div>
        <hr className="h-px border-0 bg-[#b793c6] opacity-30" />
        <div className="flex flex-col gap-2 text-xs leading-4 text-[#b793c6] md:flex-row md:justify-between md:gap-6">
          <p>© 2026 Lila Care · Medellín, Colombia</p>
          <p className="md:text-right">
            Lila es una herramienta de autoconocimiento y no reemplaza la consulta médica.
          </p>
        </div>
      </SectionContainer>
    </footer>
  );
}
