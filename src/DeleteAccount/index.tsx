import { Link } from "wouter";
import {
  DELETE_ACCOUNT_EMAIL,
  DELETE_ACCOUNT_MAILTO,
  DELETED_DATA,
  RETAINED_DATA,
} from "./deleteAccountContent";

/**
 * Public account deletion page, required by Google Play: it must open without login and without
 * the app installed. Deletion is requested by email.
 */
export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen w-full bg-brand-bg px-6 py-16 font-['Inter',sans-serif] text-text-secondary">
      <article className="mx-auto flex max-w-[640px] flex-col gap-8">
        <header className="flex flex-col gap-4">
          <h1 className="font-['Poppins'] text-[32px] font-semibold leading-10 text-brand-dark">
            Eliminar tu cuenta de Lila
          </h1>
          <p className="text-base leading-6">
            Puedes pedir que eliminemos tu cuenta de la app Lila (Lila Care S.A.S.) y tus datos,
            aunque ya no tengas la app instalada.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="font-['Poppins'] text-xl font-semibold leading-7 text-brand-dark">
            Cómo pedirlo
          </h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-base leading-6">
            <li>
              Escribe desde el correo con el que te registraste a{" "}
              <a href={DELETE_ACCOUNT_MAILTO} className="text-brand-primary underline">
                {DELETE_ACCOUNT_EMAIL}
              </a>
              .
            </li>
            <li>Usa el asunto «Eliminar mi cuenta».</li>
            <li>
              Te responderemos a ese mismo correo para confirmar la solicitud y avisarte cuando
              esté hecha, dentro de los plazos de la Ley 1581 de 2012.
            </li>
          </ol>
          <p className="text-sm leading-5">No nos envíes tu contraseña ni información de salud.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-['Poppins'] text-xl font-semibold leading-7 text-brand-dark">
            Qué se elimina
          </h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-base leading-6">
            {DELETED_DATA.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-base leading-6">La eliminación no se puede deshacer.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-['Poppins'] text-xl font-semibold leading-7 text-brand-dark">
            Qué se conserva
          </h2>
          <p className="text-base leading-6">{RETAINED_DATA}</p>
        </section>

        <p className="text-sm leading-5">
          <Link href="/terms" className="text-brand-primary underline">
            Términos y política de privacidad
          </Link>
        </p>
      </article>
    </main>
  );
}
