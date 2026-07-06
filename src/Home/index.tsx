import { Link } from 'wouter'
import principal from '/sello_vinotinto.svg'

function Home() {
  return (
    <>
      <div className='home-container'>
        <img src={principal} className="logo" alt="purple seal" />
        <h1 className="text-5xl leading-[1.1]">Página en construcción</h1>
        <p className="terms-link">
          <Link href="/terms">Visita nuestros Términos y Condiciones</Link>
        </p>
      </div>
    </>
  )
}
export default Home